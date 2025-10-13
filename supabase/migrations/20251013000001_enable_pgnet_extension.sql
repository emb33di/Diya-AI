-- Enable pg_net extension for making HTTP requests from database triggers
-- This is required for the admin notification system to work
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

