-- Drop the room_type column from rooms table
ALTER TABLE public.rooms DROP COLUMN room_type CASCADE;

-- Drop the enum type
DROP TYPE IF EXISTS room_type_enum CASCADE;
