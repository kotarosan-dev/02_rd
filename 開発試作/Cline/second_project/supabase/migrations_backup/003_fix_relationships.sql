-- Drop duplicate foreign key constraints
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_staff_id_fkey;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_service;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS fk_staff;

-- Add back the foreign key constraints with clear names
ALTER TABLE appointments
ADD CONSTRAINT appointments_service_id_fkey
FOREIGN KEY (service_id)
REFERENCES services(id)
ON DELETE RESTRICT;

ALTER TABLE appointments
ADD CONSTRAINT appointments_staff_id_fkey
FOREIGN KEY (staff_id)
REFERENCES staff(id)
ON DELETE RESTRICT;