# Supabase Schema

The native app services are currently written against the tables defined in
`migrations/20260516_recipe_os_core.sql`.

Expected tables:

- `user_profiles`
- `saved_recipes`
- `cooking_history`
- `pantry_items`
- `shopping_lists`
- `shopping_list_items`

Apply the migration in Supabase before testing remote state sync. The Expo app
expects `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` to be
available in the environment.
