// Main Firebase client export - mimics Supabase client structure
import { firebaseAuth } from './auth';
import { firebaseDb } from './db';

// Create a Supabase-like client object
export const supabase = {
  auth: firebaseAuth,
  from: firebaseDb.from,
  channel: firebaseDb.channel,
  removeChannel: firebaseDb.removeChannel,
};

// Also export individual services if needed
export { auth, db } from './client';
export { firebaseAuth, firebaseDb };

