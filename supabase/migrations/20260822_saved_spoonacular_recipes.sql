-- Spoonacular's terms forbid persisting full recipe content (ingredients, steps,
-- nutrition). saved_recipes.recipe_id has a hard FK into public.recipes(id), so it
-- can't hold Spoonacular's own numeric ids -- this is a separate, minimal table
-- for exactly the reference CLAUDE.md specifies: id + title + thumbnail only. Full
-- detail is re-fetched live from the spoonacular-recipe edge function on open.
create table public.saved_spoonacular_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spoonacular_id integer not null,
  title text not null,
  image_url text,
  saved_at timestamptz not null default now(),
  unique (user_id, spoonacular_id)
);

alter table public.saved_spoonacular_recipes enable row level security;

create policy "Users can manage own saved spoonacular recipes"
  on public.saved_spoonacular_recipes
  for all
  using (auth.uid() = user_id);
