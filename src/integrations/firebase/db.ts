// Firestore wrapper to provide Supabase-like API for database operations
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    Timestamp,
    QueryConstraint,
  } from 'firebase/firestore';
  import { db } from './client';
  
  // Helper to convert Firestore timestamp to ISO string
  const convertTimestamp = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
      return data.map(convertTimestamp);
    }
    if (typeof data === 'object' && data !== null) {
      const converted: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value instanceof Timestamp) {
          converted[key] = value.toDate().toISOString();
        } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          converted[key] = convertTimestamp(value);
        } else {
          converted[key] = value;
        }
      }
      return converted;
    }
    return data;
  };
  
  // Query builder class - makes it thenable for async/await
  class QueryBuilder {
    private collectionName: string;
    private constraints: QueryConstraint[] = [];
    private orConditions?: { field: string; value: any }[];
  
    constructor(collectionName: string) {
      this.collectionName = collectionName;
    }
  
    select(fields?: string) {
      // Fields parameter is ignored in Firestore (we get all fields)
      return this;
    }
  
    eq(field: string, value: any) {
      this.constraints.push(where(field, '==', value));
      return this;
    }
  
    in(field: string, values: any[]) {
      // Firestore supports 'in' operator for up to 10 values
      if (values.length > 10) {
        // For more than 10 values, we'll need to split into multiple queries
        // For now, we'll store this for in-memory filtering
        (this as any).inConditions = (this as any).inConditions || [];
        (this as any).inConditions.push({ field, values });
      } else if (values.length > 0) {
        this.constraints.push(where(field, 'in', values));
      }
      return this;
    }
  
    ilike(field: string, value: string) {
      // Firestore doesn't support case-insensitive search natively
      // Store the ilike condition for in-memory filtering
      (this as any).ilikeConditions = (this as any).ilikeConditions || [];
      (this as any).ilikeConditions.push({ field, value: value.toLowerCase() });
      return this;
    }
  
    or(condition: string) {
      // Parse Supabase OR conditions: "field1.eq.value1,field2.eq.value2"
      const parts = condition.split(',');
      this.orConditions = [];
  
      parts.forEach((part) => {
        const match = part.match(/(\w+)\.eq\.(.+)/);
        if (match) {
          this.orConditions!.push({ field: match[1], value: match[2] });
        }
      });
  
      return this;
    }
  
    order(field: string, options?: { ascending?: boolean }) {
      this.constraints.push(orderBy(field, options?.ascending === false ? 'desc' : 'asc'));
      return this;
    }
  
    async execute(): Promise<{ data: any[] | null; error: any }> {
      try {
        let data: any[] = [];
  
        // Handle OR conditions
        if (this.orConditions && this.orConditions.length > 0) {
          // For OR queries, fetch all and filter in memory
          // Note: This is not ideal for large datasets - consider using Firestore's 'in' operator
          // or multiple queries for production
          const snapshot = await getDocs(collection(db, this.collectionName));
          data = snapshot.docs.map((d) => ({
            id: d.id,
            ...convertTimestamp(d.data()),
          }));
  
          // Filter in memory
          data = data.filter((item: any) => {
            return this.orConditions!.some((pair) => {
              const itemValue = item[pair.field];
              return itemValue === pair.value || String(itemValue) === String(pair.value);
            });
          });
  
          // Apply orderBy if present
          const orderConstraint = this.constraints.find((c: any) => c.type === 'orderBy');
          if (orderConstraint) {
            const { field, direction } = orderConstraint as any;
            data.sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              if (direction === 'desc') {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
              }
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            });
          }
        } else {
          // Regular query with constraints
          const q = query(collection(db, this.collectionName), ...this.constraints);
          const snapshot = await getDocs(q);
          data = snapshot.docs.map((d) => ({
            id: d.id,
            ...convertTimestamp(d.data()),
          }));
  
          // Apply ilike filters in memory (case-insensitive search)
          if ((this as any).ilikeConditions) {
            const ilikeConditions = (this as any).ilikeConditions;
            data = data.filter((item: any) => {
              return ilikeConditions.every((condition: { field: string; value: string }) => {
                const fieldValue = String(item[condition.field] || '').toLowerCase();
                return fieldValue.includes(condition.value);
              });
            });
          }
  
          // Apply in filters in memory (if more than 10 values)
          if ((this as any).inConditions) {
            const inConditions = (this as any).inConditions;
            data = data.filter((item: any) => {
              return inConditions.every((condition: { field: string; values: any[] }) => {
                return condition.values.includes(item[condition.field]);
              });
            });
          }
        }
  
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    }
  
    // Make it thenable for async/await
    then(onFulfilled?: (value: { data: any[] | null; error: any }) => any) {
      return this.execute().then(onFulfilled);
    }
  
    async single() {
      try {
        const q = query(collection(db, this.collectionName), ...this.constraints);
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          return { data: null, error: null };
        }
        const doc = snapshot.docs[0];
        const data = { id: doc.id, ...convertTimestamp(doc.data()) };
        return { data, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    }
  }
  
  // Main database wrapper
  export const firebaseDb = {
    from: (collectionName: string) => {
      return {
        select: (fields?: string) => {
          const builder = new QueryBuilder(collectionName);
          builder.select(fields);
          return builder;
        },
        insert: async (data: any[]) => {
          try {
            const results = await Promise.all(
              data.map((item) => {
                const { id, ...itemData } = item;
                // Convert ISO strings to Firestore timestamps if needed
                const firestoreData: any = {};
                for (const [key, value] of Object.entries(itemData)) {
                  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                    // Try to parse as date
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      firestoreData[key] = Timestamp.fromDate(date);
                    } else {
                      firestoreData[key] = value;
                    }
                  } else {
                    firestoreData[key] = value;
                  }
                }
                firestoreData.created_at = Timestamp.now();
                return addDoc(collection(db, collectionName), firestoreData);
              })
            );
            return { data: results, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        },
        update: (data: any) => {
          // Return a chainable object that supports .eq() for filtering
          return {
            eq: async (field: string, value: any) => {
              try {
                let docRef: any;
                
                // If updating by 'id', use the document ID directly
                if (field === 'id') {
                  docRef = doc(db, collectionName, value);
                  // Verify document exists
                  const docSnapshot = await getDoc(docRef);
                  if (!docSnapshot.exists()) {
                    return { data: null, error: { message: 'Document not found' } };
                  }
                } else {
                  // Find document by field value
                  const q = query(collection(db, collectionName), where(field, '==', value));
                  const snapshot = await getDocs(q);
                  
                  if (snapshot.empty) {
                    return { data: null, error: { message: 'Document not found' } };
                  }
                  
                  // Use the first matching document
                  docRef = doc(db, collectionName, snapshot.docs[0].id);
                }
  
                // Convert ISO strings to Firestore timestamps if needed
                const firestoreData: any = {};
                for (const [key, value] of Object.entries(data)) {
                  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      firestoreData[key] = Timestamp.fromDate(date);
                    } else {
                      firestoreData[key] = value;
                    }
                  } else {
                    firestoreData[key] = value;
                  }
                }
                
                await updateDoc(docRef, firestoreData);
                return { data: { id: docRef.id }, error: null };
              } catch (error: any) {
                return { data: null, error: { message: error.message } };
              }
            },
          };
        },
        delete: async (id: string) => {
          try {
            await deleteDoc(doc(db, collectionName, id));
            return { data: { id }, error: null };
          } catch (error: any) {
            return { data: null, error: { message: error.message } };
          }
        },
      };
    },
  
    // Real-time subscription (similar to Supabase channels)
    channel: (channelName: string) => {
      let unsubscribeFn: (() => void) | null = null;
      const channelObj: any = {
        channelName,
        unsubscribe: () => {
          if (unsubscribeFn) {
            unsubscribeFn();
          }
        },
      };
  
      return {
        on: (
          eventType: string,
          config: {
            event: string;
            schema?: string;
            table: string;
            filter?: string;
          },
          callback: (payload: any) => void
        ) => {
          if (eventType === 'postgres_changes') {
            // Parse filter: "field=eq.value"
            const filterMatch = config.filter?.match(/(\w+)=eq\.(.+)/);
            let q;
            
            if (filterMatch) {
              const field = filterMatch[1];
              const value = filterMatch[2];
              q = query(
                collection(db, config.table),
                where(field, '==', value),
                orderBy('created_at', 'asc')
              );
            } else {
              // Default: listen to all changes in the collection
              q = query(collection(db, config.table), orderBy('created_at', 'asc'));
            }
  
            unsubscribeFn = onSnapshot(q, (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && (config.event === '*' || config.event === 'INSERT')) {
                  callback({
                    new: { id: change.doc.id, ...convertTimestamp(change.doc.data()) },
                    old: null,
                  });
                } else if (change.type === 'modified' && (config.event === '*' || config.event === 'UPDATE')) {
                  callback({
                    new: { id: change.doc.id, ...convertTimestamp(change.doc.data()) },
                    old: change.doc.metadata.hasPendingWrites ? null : { id: change.doc.id },
                  });
                } else if (change.type === 'removed' && (config.event === '*' || config.event === 'DELETE')) {
                  callback({
                    new: null,
                    old: { id: change.doc.id, ...convertTimestamp(change.doc.data()) },
                  });
                }
              });
            });
          }
  
          // Return channel object with subscribe method (chainable API)
          return {
            ...channelObj,
            subscribe: () => {
              return channelObj;
            },
          };
        },
      };
    },
  
    removeChannel: (channel: any) => {
      if (channel && channel.unsubscribe) {
        channel.unsubscribe();
      }
    },
  };