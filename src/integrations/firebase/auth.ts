// Firebase Auth wrapper to provide Supabase-like API
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './client';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './client';

// Session type to match Supabase's session structure
export interface Session {
  user: User & { emailVerified?: boolean };
  access_token?: string;
}

// Auth state change callback type
export type AuthStateChangeCallback = (event: string, session: Session | null) => void;

// Wrapper to match Supabase auth API
export const firebaseAuth = {
  // Get current session
  getSession: async (): Promise<{ data: { session: Session | null }; error: null }> => {
    try {
      const user = auth.currentUser;
      if (user) {
        return {
          data: {
            session: {
              user,
              access_token: await user.getIdToken(),
            },
          },
          error: null,
        };
      }
      return { data: { session: null }, error: null };
    } catch (error) {
      return { data: { session: null }, error: null };
    }
  },

  // Sign in with email and password
  signInWithPassword: async (credentials: { email: string; password: string }) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      return {
        data: {
          user: userCredential.user,
          session: {
            user: userCredential.user,
            access_token: await userCredential.user.getIdToken(),
          },
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { user: null, session: null },
        error: {
          message: error.message || 'Failed to sign in',
          status: error.code,
        },
      };
    }
  },

  // Sign up with email and password
  signUp: async (credentials: {
    email: string;
    password: string;
    options?: {
      emailRedirectTo?: string;
      data?: {
        first_name?: string;
        last_name?: string;
      };
    };
  }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      // Create user profile in Firestore
      if (credentials.options?.data) {
        await setDoc(doc(db, 'profiles', userCredential.user.uid), {
          user_id: userCredential.user.uid,
          first_name: credentials.options.data.first_name || '',
          last_name: credentials.options.data.last_name || '',
          email: credentials.email,
          created_at: new Date().toISOString(),
        });
      }

      return {
        data: {
          user: userCredential.user,
          session: {
            user: userCredential.user,
            access_token: await userCredential.user.getIdToken(),
          },
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: { user: null, session: null },
        error: {
          message: error.message || 'Failed to sign up',
          status: error.code,
        },
      };
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Failed to sign out',
          status: error.code,
        },
      };
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback: AuthStateChangeCallback) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const session: Session = {
          user,
          access_token: await user.getIdToken(),
        };
        callback('SIGNED_IN', session);
      } else {
        callback('SIGNED_OUT', null);
      }
    });

    return {
      data: { subscription: { unsubscribe } },
    };
  },

};

