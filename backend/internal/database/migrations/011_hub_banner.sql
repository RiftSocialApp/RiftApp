-- Add banner_url column to hubs table for server banner customization
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS banner_url TEXT;
