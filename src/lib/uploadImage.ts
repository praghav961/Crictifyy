import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadImage(file: File, path: string): Promise<string> {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
  const fullPath = `${path}/${fileName}`;
  
  const storageRef = ref(storage, fullPath);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
