/*
  # Add profile picture to users table

  1. Changes
    - Add profile_picture column to users table
    - Add storage bucket for profile pictures
  
  2. Security
    - Maintain existing RLS policies
    - Add storage bucket policies
*/

-- Add profile_picture column if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture text;

-- Create storage bucket for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('profile_pictures', 'profile_pictures')
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile_pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile_pictures' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Profile pictures are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile_pictures');