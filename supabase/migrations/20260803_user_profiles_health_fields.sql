-- user_health_profiles was never migrated in, but userService.ts and the
-- onboarding flow both read/write it. Fold those fields into user_profiles
-- instead of creating the missing table, since it's a 1:1 relationship.
alter table public.user_profiles
  add column if not exists diet_type text,
  add column if not exists allergies text[] not null default '{}',
  add column if not exists health_goals text,
  add column if not exists measurement_units text,
  add column if not exists default_servings integer;
