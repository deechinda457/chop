do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recipes'
      and policyname = 'Users can update own recipes'
  ) then
    create policy "Users can update own recipes"
      on public.recipes for update
      using (auth.uid() = created_by)
      with check (auth.uid() = created_by);
  end if;
end
$$;
