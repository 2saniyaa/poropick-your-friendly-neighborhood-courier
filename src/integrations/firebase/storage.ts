import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { storage } from './client';
import { db } from './client';

const AVATAR_PATH = (userId: string) => `profiles/${userId}/avatar`;

const UPLOAD_TIMEOUT_MS = 20000;

/**
 * Upload a profile photo and return its public URL.
 * Fails if upload takes longer than UPLOAD_TIMEOUT_MS.
 */
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required');
  }
  if (!file) {
    throw new Error('File is required');
  }
  if (!storage) {
    throw new Error('Firebase Storage is not initialized. Check VITE_FIREBASE_STORAGE_BUCKET in .env');
  }

  // Check if storage bucket is configured
  const bucket = storage.app.options.storageBucket;
  if (!bucket) {
    throw new Error('Storage bucket not configured. Set VITE_FIREBASE_STORAGE_BUCKET in your .env file (e.g., your-project.appspot.com)');
  }

  const path = AVATAR_PATH(userId);
  console.log('Uploading to path:', path, 'bucket:', bucket);
  const storageRef = ref(storage, path);
  
  try {
    console.log('Starting uploadBytes, file size:', file.size, 'type:', file.type);
    await uploadBytes(storageRef, file, { contentType: file.type });
    console.log('Upload complete, getting download URL...');
    const url = await getDownloadURL(storageRef);
    console.log('Download URL:', url);
    return url;
  } catch (error: any) {
    console.error('Storage upload error:', error);
    const errorCode = error?.code || '';
    const errorMessage = error?.message || 'Unknown error';
    
    // Check for CORS errors
    if (errorMessage.includes('CORS') || errorMessage.includes('preflight') || errorCode === 'storage/unknown' && errorMessage.includes('blocked')) {
      console.error('🔴 CORS ERROR DETECTED');
      console.error('To fix this, run the following command in your terminal:');
      console.error('gsutil cors set cors.json gs://poropick-e04d2.firebasestorage.app');
      console.error('Make sure you have Google Cloud SDK installed and are authenticated.');
      console.error('See SETUP_STORAGE_CORS.md for detailed instructions.');
      throw new Error('CORS error: Firebase Storage needs CORS configuration. Run: gsutil cors set cors.json gs://poropick-e04d2.firebasestorage.app (see SETUP_STORAGE_CORS.md for details)');
    }
    
    if (errorCode === 'storage/unauthorized' || errorCode === 'storage/canceled') {
      throw new Error('Storage access denied. Check Firebase Console → Storage → Rules. Add: match /profiles/{userId}/{allPaths=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }');
    } else if (errorCode === 'storage/quota-exceeded') {
      throw new Error('Storage quota exceeded. Contact support.');
    } else if (errorCode === 'storage/unauthenticated') {
      throw new Error('Not authenticated. Please log in again.');
    }
    throw new Error(`Upload failed: ${errorMessage} (code: ${errorCode})`);
  }
}

/**
 * Save photo_url to the user's profile in Firestore (create doc if missing).
 */
export async function saveProfilePhotoUrl(userId: string, photoUrl: string): Promise<void> {
  const profileRef = doc(db, 'profiles', userId);
  const snap = await getDoc(profileRef);
  if (!snap.exists()) {
    await setDoc(profileRef, { user_id: userId, photo_url: photoUrl });
  } else {
    await updateDoc(profileRef, { photo_url: photoUrl });
  }
}
