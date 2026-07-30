-- The active return/refund workflow uses return_requests, return_items, and refunds.
-- Historical rows were archived before this migration was applied.

BEGIN;

DROP TABLE IF EXISTS public.legacy_refund_requests;

COMMIT;
