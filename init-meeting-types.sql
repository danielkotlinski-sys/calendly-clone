-- Create meeting_types table for Vercel Postgres
-- Run this in your Vercel Postgres console

CREATE TABLE IF NOT EXISTS meeting_types (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  duration INTEGER NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_meeting_types_user_id ON meeting_types(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_types_slug ON meeting_types(user_id, slug);
