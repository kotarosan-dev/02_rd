-- Add 'completed' to valid appointment statuses
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE appointments
ADD CONSTRAINT valid_status
CHECK (status = ANY (ARRAY['pending', 'confirmed', 'cancelled', 'completed']::text[]));