/**
 * Free storage alternatives for profile photos
 * 
 * Option 1: Cloudinary (25GB free, 25GB bandwidth/month)
 * Option 2: Base64 in Firestore (free but limited to ~1MB per photo)
 */

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './client';
import { supabase } from './index';

/**
 * Option 1: Upload to Cloudinary (FREE: 25GB storage, 25GB bandwidth/month)
 * Sign up at: https://cloudinary.com/users/register/free
 * Get your cloud name, upload preset, and API key from dashboard
 */
export async function uploadToCloudinary(file: File, cloudName: string, uploadPreset: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Cloudinary upload failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.secure_url; // Returns the image URL
}

/**
 * Option 2: Store as Base64 in Firestore (FREE but limited to ~1MB per photo)
 * Compresses image and stores as base64 string in Firestore
 */
export async function uploadAsBase64(userId: string, file: File): Promise<string> {
  // Compress image first to stay under Firestore 1MB limit
  const compressedFile = await compressImage(file, 0.7, 800); // 70% quality, max 800px width
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64String = reader.result as string;
      
      // Check size (Firestore limit is ~1MB for a field)
      if (base64String.length > 900000) { // ~900KB to be safe
        reject(new Error('Image too large even after compression. Please use a smaller image or Cloudinary.'));
        return;
      }
      
      // Store in Firestore
      const profileRef = doc(db, 'profiles', userId);
      const snap = await getDoc(profileRef);
      
      if (!snap.exists()) {
        await setDoc(profileRef, { 
          user_id: userId, 
          photo_base64: base64String,
          photo_url: null // Clear URL if using base64
        });
      } else {
        await updateDoc(profileRef, { 
          photo_base64: base64String,
          photo_url: null // Clear URL if using base64
        });
      }
      
      // Return data URL for immediate display
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });
}

/**
 * Compress image to reduce file size
 */
function compressImage(file: File, quality: number = 0.7, maxWidth: number = 800): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Resize if too large
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Save photo URL to profile (works with any storage solution)
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

/**
 * Get profile photo (base64 or URL) by user ID
 * Handles both document ID lookup and user_id field lookup
 */
export async function getProfilePhoto(userId: string): Promise<string | null> {
  try {
    // Try direct document ID lookup first (most efficient)
    const profileRef = doc(db, 'profiles', userId);
    const snap = await getDoc(profileRef);
    
    if (snap.exists()) {
      const data = snap.data();
      return data?.photo_base64 ?? data?.photo_url ?? null;
    }
    
    // Fallback: query by user_id field
    const { data } = await supabase
      .from("profiles")
      .select("photo_url, photo_base64")
      .eq("user_id", userId)
      .single();
    
    return data?.photo_base64 ?? data?.photo_url ?? null;
  } catch (err) {
    console.warn("Could not fetch profile photo:", err);
    return null;
  }
}
