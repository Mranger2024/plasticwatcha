import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFile = async (
  file: File | Blob,
  path: string,
  onProgress?: (progress: number) => void
) => {
  const fileExt = (file as File).name ? (file as File).name.split('.').pop() : (file.type ? file.type.split('/')[1] : 'jpg');
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
  const filePath = `${path}/${fileName}`;

  // Create a new XMLHttpRequest to track upload progress
  const { data, error } = await supabase.storage
    .from('contributions')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Simulate progress completion if callback provided
  if (onProgress) {
    onProgress(100);
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from('contributions')
    .getPublicUrl(filePath);

  return publicUrl;
};
