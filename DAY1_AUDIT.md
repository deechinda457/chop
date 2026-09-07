# Day 1 Audit — Nav Structure & Schema vs. Target Model

Date: 2026-08-17
Scope: Phase A, Day 1 (audit only — no code changes made).

## 1. Current nav vs. target 3-tab model

Current tabs (`app/(tabs)/_layout.tsx`): **Home, Search, Pantry, Saved, History** — plus standalone
routes reachable off them: `app/shopping.tsx`, `app/planner.tsx`, `app/profile/*`, `app/plans/index.tsx`,
`app/cook/[id].tsx`, `app/recipe/[id].tsx`, `app/completion/[id].tsx`.

| Current | Backing component | Target | Notes |
|---|---|---|---|
| Home | `HomeScreenParity` | **Home** | Only a `*Parity` version exists — no redesigned `HomeScreen.tsx` sitting unwired. Day 2 is a build, not a swap. |
| Search | `SearchScreenParity` | **Explore** | A newer `SearchScreen.tsx` already exists alongside the Parity one but isn't wired into the route — check on Day 5 whether it's reusable before building fresh. |
| Pantry | `PantryScreen` (not Parity) | **Kitchen** (Have side) | Already reads/writes `pantryService.ts` → `pantry_items`. |
| *(standalone route, not a tab)* `shopping.tsx` | `ShoppingScreen` | **Kitchen** (Need side) | Not currently a tab at all — reached some other way off Pantry/Home. Backed by `shoppingService.ts` → `shopping_lists`/`shopping_list_items`. |
| Saved | `SavedRecipesScreen` | **Explore** | Folds in per spec. |
| History | inline in `history.tsx` (no Parity split) | **Explore** | Folds in per spec. |
| `planner.tsx` (standalone) | `PlannerScreen` + `PlannerScreenParity` | **Explore** | Also has an unwired non-Parity version. |

**Note:** the Kitchen merge (Day 3) is really merging **Pantry (a tab)** with **Shopping (a standalone
route, never a tab)** — CLAUDE.md's phrasing ("merge `pantry.tsx` + `shopping.tsx`") still holds, just
note Shopping isn't currently nav-level.

**Have/Need modeling gap:** there's no existing unified concept today. `pantry_items` (have) and
`shopping_list_items` (need) are two separate tables and two separate services with no linkage. The
spec's automatic movement behavior (accepting a meal → missing items go to Need; scanning/checking off
→ item moves to Have) doesn't exist in either service yet — this is real restructuring work for Day 3,
not a UI-only toggle over existing data.

## 2. Schema drift — tracked migrations vs. service code

The only tracked migration (`supabase/migrations/20260516_recipe_os_core.sql`) does **not** match the
columns the live service code actually reads and writes. This is the same failure class as the
onboarding `user_health_profiles` bug: code assumes a shape the tracked migration doesn't back.

### `pantry_items`

| Migration column | Service code uses | Mismatch |
|---|---|---|
| `quantity_value` | `quantity` (`pantryService.ts:42,58`) | different column name |
| `expiry` (text), `days_left` (int) | `expiry_date` (`pantryService.ts:44,60`) | migration has two derived text/int fields; service writes a single date column that doesn't exist |
| `status` — **check constraint** limited to `'danger' \| 'warning' \| 'safe'` | service writes `'expired' \| 'low' \| 'available'` (`pantryService.ts:19-23`) | writes would violate the migration's check constraint on every upsert |

### `shopping_lists`

| Migration column | Service code uses | Mismatch |
|---|---|---|
| `kind`, `recipe_id`, `recipe_title` | `name` (`shoppingService.ts:80`) | `name` doesn't exist in the migration; `kind`/`recipe_title` never written by the service |

### `shopping_list_items`

| Migration column | Service code uses | Mismatch |
|---|---|---|
| `list_id` | `shopping_list_id` (`shoppingService.ts:19,87,90,105`) | different column name |
| `checked` | `is_checked` (`shoppingService.ts:34,48,97`) | different column name |
| *(no equivalent)* | `source`, `sort_order` (`shoppingService.ts:98-99`) | columns not defined anywhere in tracked migrations |
| *(no relation)* | `.select('*, recipes(title)')` (`shoppingService.ts:19`) | assumes a foreign-key relation to a `recipes` table that has no tracked migration at all (see below) |

### `recipes` table — no tracked migration at all

`recipeService.ts`, `aiService.ts`, and `serviceUtils.ts` depend heavily on a `recipes` table with
columns including `title`, `description`, `image_urls`, `cook_time_mins`, `view_count`, `created_by` —
**this table is never created in `20260516_recipe_os_core.sql` or any other tracked migration.**
`supabase/migrations/20260602_recipe_media_backfill.sql` even alters a policy on `public.recipes`,
which only makes sense if the table already exists live — meaning it (and the current-shape
`pantry_items`/`shopping_*` columns above) were most likely created directly against the live database
(dashboard or a lost/unsync'd migration) and never captured back into the tracked migration history.

Supabase MCP is not yet connected in this environment, so live schema could not be verified directly
during this audit — the above is inferred from what the service code assumes.

## Action item

**Before Day 3's Kitchen merge begins, confirm the actual live Supabase schema** (via the dashboard or
once Supabase MCP is connected) rather than trusting the tracked migrations folder. Specifically
verify the real column names/types for `pantry_items`, `shopping_lists`, `shopping_list_items`, and
the existence/shape of `recipes` — then either back-fill a migration that documents the true live
schema, or correct the service code to match it. Building the unified Have/Need model on top of
columns that don't match production would repeat the same class of bug as the onboarding hotfix.

## Addendum (2026-08-17) — live schema verified, action item closed

Supabase MCP is configured for this project (`mcp.supabase.com`) but did not expose any callable tools
in this session — likely an incomplete OAuth handshake with the remote server, not a config problem.
Worked around it by probing the live PostgREST endpoint directly with the project's anon key (safe,
read-only: selected individual columns with `limit=1`/`limit=0` and confirmed table existence via the
`PGRST205`/404 vs. 200 response, no rows were written).

**Result: the mismatches above are a stale tracked-migration-file problem, not a service-code problem.**
The live database already has the column names the service code reads and writes:

| Table | Live columns confirmed | Matches service code? |
|---|---|---|
| `pantry_items` | `quantity`, `expiry_date`, `status`, `category`, `storage_location`, `user_id`, `name`, `created_at`, `updated_at` | Yes — matches `pantryService.ts` exactly, not the `20260516` migration |
| `shopping_lists` | `name`, `user_id`, `created_at` | Yes — matches `shoppingService.ts`, not the migration's `kind`/`recipe_id`/`recipe_title` |
| `shopping_list_items` | `shopping_list_id`, `is_checked`, `source`, `sort_order`, `recipe_id`, `name`, `quantity`, `unit`, `category`, `created_at` | Yes — matches `shoppingService.ts` exactly |
| `recipes` | `id`, `title`, `description`, `cuisine_type`, `meal_type`, `diet_tags`, `difficulty`, `prep_time_mins`, `cook_time_mins`, `total_time_mins`, `default_servings`, `equipment`, `image_urls`, `source_url`, `is_user_generated`, `created_by`, `view_count`, `save_count`, `created_at`, `updated_at` | Yes — table exists live (confirmed via a real returned row) despite having no tracked migration at all |
| `shopping_list_items` → `recipes` FK join | `select('*, recipes(title)')` | Confirmed working live (200, not a relation error) |

The `status` check-constraint's exact allowed values (`'expired'/'low'/'available'` per the service vs.
`'danger'/'warning'/'safe'` per the stale migration) could not be confirmed this way — reading columns is
safe via anon key, but confirming a CHECK constraint's contents requires either a service-role key,
`psql`, or working Supabase MCP tools, none of which were available. Given every other column across four
tables matches the service code and not the tracked migration, the constraint almost certainly does too,
but treat this one specific fact as unconfirmed until someone checks it directly (e.g. once Supabase MCP
OAuth is completed).

**Practical effect on Day 3:** the Kitchen merge can proceed against the current service code's column
assumptions without the schema-mismatch risk originally flagged — no data-model firefighting expected.
Separately, `supabase/migrations/20260516_recipe_os_core.sql` should eventually be replaced or
supplemented with a migration that documents the true live shape (including `recipes`, which currently
exists only in the live database), so the tracked history stops diverging from production. That's a
documentation/ops cleanup, not a blocker for Day 3.

Also verified while cross-checking `userService.ts` against live `user_profiles`: the two onboarding bugs
CLAUDE.md's "Known existing gaps" section listed as diagnosed-but-unfixed are already fixed in the current
code (confirmed by reading `userService.ts`, `OnboardingScreen.tsx`, `ProtectedRoute.tsx`, and the live
`user_profiles` columns). CLAUDE.md has been updated to reflect this. A full-codebase `Alert.alert()` sweep
found 4 remaining call sites (`OnboardingScreen.tsx`, `AuthContext.tsx`, `SearchScreenParity.tsx`,
`ShoppingScreen.tsx`) — smaller than the original "everywhere" framing suggested, still open, not yet
scheduled to a specific day in `BUILD_PLAN.md`.
