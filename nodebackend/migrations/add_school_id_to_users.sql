-- Migration to add school_id to users table
-- This should be run on your PostgreSQL database

-- Add school_id column to users table
ALTER TABLE users ADD COLUMN school_id INTEGER;

-- Add foreign key constraint to reference schools table
ALTER TABLE users ADD CONSTRAINT fk_users_school_id 
    FOREIGN KEY (school_id) REFERENCES schools(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_school_id ON users(school_id);

-- Update existing users to have a default school (optional - adjust as needed)
-- You can run this after creating some schools
-- UPDATE users SET school_id = 1 WHERE school_id IS NULL;

-- Optionally make school_id NOT NULL after assigning schools to existing users
-- ALTER TABLE users ALTER COLUMN school_id SET NOT NULL;
