-- Drop the unique constraint index that prevents multiple pending requests for a room
DROP INDEX IF EXISTS public.idx_rental_requests_one_active_per_room;

-- Create a function to auto-reject other pending requests when one is approved
CREATE OR REPLACE FUNCTION auto_reject_other_requests()
RETURNS TRIGGER AS $$
BEGIN
  -- If the request status changed to 'approved'
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update all other pending requests for the same room to 'rejected'
    UPDATE public.rental_requests
    SET 
      status = 'rejected',
      owner_rejection_reason = 'Kamar sudah disewa oleh orang lain.',
      updated_at = NOW()
    WHERE room_id = NEW.room_id
      AND id != NEW.id
      AND status = 'pending';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_reject_requests ON public.rental_requests;
CREATE TRIGGER trigger_auto_reject_requests
AFTER UPDATE OF status ON public.rental_requests
FOR EACH ROW
EXECUTE FUNCTION auto_reject_other_requests();
