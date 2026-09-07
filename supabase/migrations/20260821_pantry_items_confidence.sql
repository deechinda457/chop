-- Adds a user-set supply-confidence tier to pantry_items, replacing the plan
-- to derive confidence from expiry/freshness data (status/expiry_date already
-- track spoilage risk, which is a different concept from "how much is left").
-- Confirmed live schema via introspection 2026-08-21: pantry_items had no
-- confidence column before this migration.
alter table public.pantry_items
  add column confidence text not null default 'full';

alter table public.pantry_items
  add constraint pantry_items_confidence_check
  check (confidence = any (array['full'::text, 'half'::text, 'low'::text]));
