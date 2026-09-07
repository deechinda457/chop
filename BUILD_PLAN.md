# Chop (recipe-os-native) — Revised Build Calendar (21 Days)

**Why 21, not 18:** the approved navy/cream/amber design system needs to be applied app-wide, not just Home/Kitchen/Explore/Cook Mode (+2 days for screens nothing else touches: Onboarding, Profile + sub-pages, Completion). The new budgeting feature adds its own day since it touches both Profile and Kitchen (+1 day). Where a screen is already being touched for structural reasons (nav restructure, Kitchen merge, recipe detail, billing), the re-skin happens in the same pass — no extra days added there.

**Claude Code usage rhythm (same as before):** 2 focused sessions per coding day, specific written task per session, 1 non-coding day roughly every 4-5 days, check `/status` occasionally to confirm subscription billing.

**Design system reference (apply throughout, not just where flagged below):** navy `#14213D`→`#0B1226` gradient (dark) / cream `#FDF6E9` (light) backgrounds, amber `#E8A317`/`#F2B84B` as the one accent, Poppins for headlines, Inter for body/UI, ~16-20px corner radius on cards/buttons, the steam-into-checkmark signature motif reused quietly across loading states/empty states/completions — not just the logo and Cook Mode.

---

## Day 0 — Pre-Audit Hotfixes (before Day 1 starts)
*Goal: the app needs to be usable enough to test at all before the real rebuild begins. These are blocking bugs/config, not scheduled feature work.*

| Task | Why it's urgent |
|---|---|
| Fix onboarding completion flow getting stuck after "Get Started" | Blocks all testing — the app can't currently be used past onboarding at all |
| Configure Supabase Authentication → Email Templates + SMTP Settings (branded sender, e.g. via Resend) | Not blocking for dev testing, but cheap to fix now and shouldn't wait 21 days — dashboard config, not code |

---

## Phase A — Structural Alignment (Days 1-4)
*Goal: nav and data model match the locked spec before any new feature work sits on top of the old structure. Design system is applied here as part of the same rebuild, not a separate pass.*

| Day | Focus | Task |
|---|---|---|
| 1 | Audit | Map current 5-tab structure (Home, Search, Pantry, Saved, History) and existing Supabase schema against the target 3-tab model (Home / Kitchen / Explore). Confirm which existing tables/services map cleanly to unified Have/Need vs. need restructuring. |
| 2 | Nav restructure + Home design | Collapse to Home / Kitchen / Explore. Strip Home down to hero-card container. Avatar/profile icon on Home only. **Apply the full design system**: hero card, Cook/Swap/Skip hierarchy, secondary scrollable rows, "days sorted" badge — matching the approved mockup exactly. |
| 3 | Kitchen merge + design | Merge `pantry.tsx` + `shopping.tsx` into one unified Kitchen screen with sticky Have/Need toggle; wire to `pantryService.ts` / `shoppingService.ts`. Floating bottom-right "+" FAB expanding to Camera/Barcode/Voice/Type manually. **Apply design system**: confidence-dot pantry rows, need-check list, consistent card styling per the mockup. |
| 4 | **Non-coding day** | Manually test the new nav shell + visual system end to end, light and dark mode. Quick check: confirm whether the 3 tables with RLS enabled but zero policies (`collection_recipes`, `meal_plan_slots`, `shopping_list_items`) are currently breaking anything in testing — RLS being on with no policy attached blocks all non-service-role access to those tables right now. Start homeland-dish seeding in parallel (open-source dataset check + founder anchor recipes). |

---

## Phase B — Recipe Engine Swap (Days 5-9)
*Goal: Spoonacular is the live primary source; AI-generated recipes/plans are retired, not just supplemented. Explore and Recipe Detail get the design system applied as part of this same work.*

| Day | Focus | Task |
|---|---|---|
| 5 | Spoonacular integration + Explore design | Sign up for Spoonacular's **free tier** (no card required) — do not subscribe to the paid Cook plan yet. Connect the API and get live search results flowing into Explore. **Apply design system** to Explore: search bar, filter chips, recipe grid per the mockup. |
| 5b | **Carryover from Day 2** — finish Home screen content | Day 2 only shipped the empty hero-card container; the actual content was never completed or re-slotted anywhere else in this calendar (confirmed by re-reading Days 3-21 on 2026-08-23 — no other day mentions Home/hero). Build: Cook/Swap/Skip hierarchy, the "days sorted" badge, and the secondary scrollable rows (Use It Up, Quick Tonight, Because You Cooked X) per the approved mockup. New users get popularity/diet-based fallback rows until real usage data exists — same screen structure, different content, never a separate "new user mode" screen. |
| 6 | Retire AI-generation | Remove/disable the "AI creates a new recipe when nothing matches" path in recipe discovery and the AI-generated weekly plan logic in the planner — replace both with Spoonacular-driven results + pantry-matching logic. |
| 7 | Saved recipes + Recipe Detail design | Implement the reference/bookmark architecture (store ID + title + thumbnail only; live-fetch full content via `recipeService.ts` on open). **Apply design system** to the Recipe Detail screen: hero image, meta row, pantry-match line, ingredients list (Have vs. Need shown), persistent bottom "Start Cooking" bar. |
| 8 | Camera vision | Replace the simulated camera-scan fallback with real Gemini vision (Flash-Lite tier) ingredient recognition. **Always show the AI's guess and require user confirmation before committing to the pantry** — never silently commit an uncertain result. |
| 9 | **Non-coding day** | Test recipe search, saved recipes, and camera scan (including the confirm-before-commit step) end to end on device. Continue homeland-dish content work. |

---

## Phase B2 — Visual Redesign: Remaining Screens (Days 10-11)
*Goal: every screen matches the design system, including the ones nothing else in this calendar structurally touches.*

| Day | Focus | Task |
|---|---|---|
| 10 | Onboarding + Profile | Apply the full design system to the onboarding flow and Profile screen + its sub-pages (Edit Profile, Password, Diet Type, Allergies, Health Goals, Measurement Units, Language). Add `expo-localization` region detection to drive smart defaults (measurement units, language suggestion) and verify the Home greeting already uses correct device-local time. Language picker ships now; non-English options show "Coming soon" — full translation is V2. |
| 11 | Completion + polish pass | Apply design system to the Completion screen (recipe finish/rating). Sweep for any remaining old black/white/orange styling missed elsewhere; confirm the signature motif recurs in at least one empty state (e.g. empty Kitchen) and one loading state. |

---

## Phase C — Family, Billing, Budgeting &amp; Remaining AI (Days 12-17)
*Goal: revenue path is real, family tier has a working UI, barcode input is live, budgeting is live. Plans screen gets its design pass here since billing work touches it directly.*

| Day | Focus | Task |
|---|---|---|
| 12 | Barcode scanning | Add Open Food Facts (or equivalent) UPC/EAN lookup to the "+" input funnel alongside camera and voice. |
| 13 | Budgeting feature | Add budget setting (daily/weekly/monthly/per-recipe) to Profile settings, matching the Diet Type/Allergies pattern. In Kitchen, add an optional "how much did this cost?" prompt when checking off a Need item as bought. Build a simple tally view against the set budget period (e.g. "₦9,200 of ₦15,000 this week"). No AI price estimation, no live grocery-price search — logged spend only. |
| 14 | Household UI | Build the user-facing Family/Household flow on top of the existing `householdService.ts` — up to 5 accounts, shared billing, independent-by-default Kitchen, temporary list sharing with auto-expiry. Apply design system to this new UI from the start. |
| 15 | Billing — Paystack + Plans design | Wire real Paystack checkout for Free/Pro/Family tiers, replacing the informational-only Plans screen. Implement the founding-100 subscriber counter that automatically switches pricing from launch rates (₦1,999/$2.99 Pro, ₦3,300/$5.49 Family) to standard rates (₦2,900/$4.99 Pro, ₦4,800/$7.99 Family) once the 100th subscriber is reached. **Apply design system** to Plans while rebuilding it. |
| 16 | Billing — Stripe | Wire real Stripe checkout for international USD subscribers; confirm PPP-based Naira pricing displays correctly next to it. |
| 17 | **Non-coding day** | Finalize ToS, Privacy Policy, refund policy if not already done. Confirm CAC registration status. |

---

## Phase D — Finish &amp; Clean (Days 18-21)
*Goal: no stubs, no duplicate screens, tested and ready for the founding cohort.*

| Day | Focus | Task |
|---|---|---|
| 18 | Cook Mode — full rebuild | Build the entry-choice screen (Watch Video / Follow Steps), the step flow with the amber progress-ring signature motif, the mid-cook ingredients bottom sheet, the single top-bar "watch full video" icon (available every step, preserves position on return), and finish `cookModeService.getProgress()` for real persistence, replacing the current stub. |
| 19 | Cleanup + RLS policy pass | Remove/consolidate duplicate `*Parity` legacy screens now that the new flows are confirmed. Update `scripts/progress.json` as a real milestone log going forward. Full RLS policy pass on the 11 tables currently with RLS fully disabled (`households`, `household_members`, `push_subscriptions`, `notification_preferences`, `pantry_check_ins`, `pantry_check_in_responses`, `recipe_ingredients`, `recipe_steps`, `recipe_nutrition`, `ingredient_shelf_life`, `ingredient_substitutions`) — write and enable real ownership/access policies before these are exposed to real users. Placed here rather than the Day 11 design sweep since it's a backend/security hardening task, not a visual one, and belongs with the rest of the pre-launch "no stubs, ready for founding cohort" cleanup. |
| 20 | **Non-coding day** | Full manual QA pass: Home → Kitchen → Explore → Recipe Detail → Cook → Billing → Profile → Budgeting, on a real device, light and dark mode. Log every bug and any visual inconsistency found. |
| 21 | Bug fixing + launch prep | Fix QA findings. Confirm analytics/instrumentation (plan-creation rate, Kitchen usage, week-2 return tracking) is actually logging. **Upgrade Spoonacular from free tier to the paid Cook plan ($29/month) only on the actual day you release to the founding cohort** — not before. Prepare founding-cohort waitlist release. |

---

## Flagged for future scoping — not yet scheduled

Found during the 2026-09-07 Profile redesign pass. Each needs real scoping (and in two cases, backend work) before it can be slotted into a day — not estimated here, just recorded so they aren't lost.

- **Household & Family management screen.** CLAUDE.md specs this for Profile, but `householdService.ts` currently only has read-only methods (`getCurrentHousehold`, `getMembers`) — no invite/share/revoke. That's backend work first, then UI; not a quick add on top of Day 14's existing "Household UI" task, which assumed the write-side already existed.
- **Budgeting feature.** CLAUDE.md calls for a daily/weekly/monthly or per-recipe budget with logged actual spend against it (no AI price estimation, per the locked MVP scope) — matches Day 13's existing task, but no schema, service, or UI exists yet. Needs full scoping from scratch, not just implementation.
- **Notifications inbox/history.** A real place to view past notifications, separate from the notification-preference toggles (which got consolidated into one Profile row during the 2026-09-07 redesign). Likely surfaced via a bell icon on Home rather than buried in Profile. No schema or UI exists yet — distinct from the existing "push notification delivery/inbox" line below, which is about push delivery infrastructure, not an in-app history view.

## Design decisions to settle before launch

- **Profile's "Days Streak" stat card (and Home's matching streak badge)**: whether to keep it at all. It's computed in `userService.getStats()` from consecutive-day `cook_logs` entries, Duolingo-style (resets to 0 on a missed day). Argued for keeping since it's already Home's core daily-return mechanic, not something new; argued against since a reset-on-miss streak can feel like guilt-tripping, which cuts against Chop's "reduce decision fatigue, no pressure" positioning. Not resolved -- revisit before launch.

## Explicitly NOT in this calendar
Push notification delivery/inbox, avatar/photo upload, deep household collaborative planning (beyond basic shared billing + independent kitchens), automated test suite, hands-free Cook Mode voice output, nutrition tracking, recipe import from social, community/UGC features, tiered international pricing by country, real-time/AI-estimated grocery pricing. These remain V2 — revisit only once founding-cohort usage data justifies it.

## Billing timing — do not subscribe early
Day 21 assumes launch happens on schedule. **If launch slips past Day 21 for any reason, keep using the Spoonacular free tier and wait to subscribe until the actual go-live day** — never subscribe based on the calendar date alone. The whole point of staying on free tier through development is to align the paid clock with real usage, not a plan.

## If a phase runs long
Absorb the slip into the next non-coding day's slot rather than extending a coding session, or cut the lowest-priority item in that phase (e.g., barcode scanning can slip a few days past launch if Phase C is tight — camera + voice input already cover the "+" funnel without it).
