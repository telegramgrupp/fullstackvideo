/*
  # Add metadata for fake videos

  1. Changes
    - Add metadata column to storage.objects table for fake videos
    - Add function to validate video metadata
    - Add trigger to ensure metadata is present for fake videos
  
  2. Security
    - Maintain existing RLS policies
    - Add validation for required metadata fields
*/

-- Add check constraint to ensure fake videos have required metadata
CREATE OR REPLACE FUNCTION validate_fake_video_metadata()
RETURNS trigger AS $$
BEGIN
  IF NEW.bucket_id = 'fakevideos' THEN
    IF NOT (
      NEW.metadata ? 'gender' AND 
      NEW.metadata ? 'country' AND
      NEW.metadata->>'gender' IN ('male', 'female', 'other') AND
      NEW.metadata->>'country' ~ '^[A-Z]{2}$'
    ) THEN
      RAISE EXCEPTION 'Fake videos must have valid gender and country metadata';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for metadata validation
DROP TRIGGER IF EXISTS validate_fake_video_metadata_trigger ON storage.objects;
CREATE TRIGGER validate_fake_video_metadata_trigger
  BEFORE INSERT OR UPDATE ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION validate_fake_video_metadata();

-- Create fake videos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('fakevideos', 'fakevideos', true)
ON CONFLICT (id) DO NOTHING;

-- Add policies for fake videos bucket
CREATE POLICY "Fake videos are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'fakevideos');

CREATE POLICY "Only service role can manage fake videos"
ON storage.objects FOR ALL 
TO service_role
USING (bucket_id = 'fakevideos')
WITH CHECK (bucket_id = 'fakevideos');