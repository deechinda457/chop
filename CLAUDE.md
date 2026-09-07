# CLAUDE.md — Project Context for Chop (repo: recipe-os-native)

This file is read automatically by Claude Code at the start of every session in this repo. It holds the decisions already locked for this project — treat these as settled, not open for re-litigation mid-session. This file supersedes any earlier version — if something here conflicts with an assumption already in the code, this file wins.

## What this app is
Chop is a global, AI-assisted meal planning app solving one problem: daily decision fatigue over what to eat. One hero action (today's meal, already decided) leads; everything else (browsing, planning, nutrition detail) is secondary and one layer deeper. Modeled deliberately on Netflix's simplicity — hero decides, rows discover.

**Brand:** Chop. Tagline: "One Meal. One Decision. Sorted." Logo motif: a bowl with steam curling into a checkmark — the "decision sorted" signature. Reuse this motif quietly elsewhere too (loading states, empty states, Cook Mode's progress ring), not just the logo.

## Design system (applies app-wide, not just Cook Mode)
Do NOT use plain black/white/orange. Use this instead:
- **Dark mode**: navy gradient background `#14213D` → `#0B1226`, cream text `#FDF6E9`, slate secondary text `#9AA6C4`
- **Light mode**: warm cream background `#FDF6E9`, navy text `#14213D`, slate-dim secondary text `#6B7597`
- **Accent (both modes)**: amber `#E8A317` / amber-light `#F2B84B` — the one confident accent color for buttons, progress, active states. Don't introduce other accent colors unless functionally necessary (e.g., a green "Can Make Now" tag).
- **Typography**: Poppins (bold/semibold) for headlines and hero text; Inter for body text, labels, and buttons.
- **Cards/buttons**: consistent ~16-20px corner radius, subtle depth via soft shadows/gradients rather than flat color blocks.
- **Sticky headers**: only the top identity/utility bar stays fixed on scroll (matching Netflix's actual pattern — not the whole filter row). On Kitchen specifically, the Have/Need toggle is ALSO sticky (it's a primary control, not a decorative filter).

## Stack
- Expo (React Native), PWA-first
- Supabase (PostgreSQL) — **Chop's project is `recipe-os`, project ref/ID `tnznfkgrghgyyxlihwkf` (org `Mealvue`, org ID `dysdbzyeroxstydihdkq`, region eu-west-1), confirmed 2026-08-17 by matching `EXPO_PUBLIC_SUPABASE_URL` in `.env` against `mcp__supabase__list_projects` output.** The Supabase org also contains a second, unrelated project, `Deechinda's Project` (ref `kiufhqmsjsvrvktgnhul`) — **do not target this one**; always pass `project_id: tnznfkgrghgyyxlihwkf` explicitly to Supabase MCP tools rather than letting a call default or prompt-pick. The tracked migration at `supabase/migrations/20260516_recipe_os_core.sql` was **rewritten 2026-08-17 as a faithful snapshot of the live schema** (25 tables, introspected directly via MCP — columns, defaults, checks, FKs, the one real trigger/function `handle_new_user`, and actual RLS/policy state) after confirming the previous version was stale and missing ~19 tables entirely. It should no longer flag drift against live; if it does, re-introspect rather than assuming the file is right. Move to Supabase Pro tier ($25/mo) at actual launch, not before — Free tier auto-pauses after inactivity and isn't suitable for a live paid product.
- Gemini — used ONLY for: camera ingredient recognition, voice-input transcription (input only, no spoken output), pantry-based substitution/personalization. NOT for bulk recipe generation, NOT for live price search/grounding (see Budgeting section below).
  - **Always use Flash-Lite class models** for these calls, never Pro-tier — this keeps marginal AI cost near-zero as the user base scales (~$0.02/paying user/month at Flash-Lite pricing vs. 8-10x higher on Pro-tier models).
  - **Camera ingredient recognition must always show its guess and ask for confirmation before committing to the pantry** (e.g., "Looks like 1 derica of beans — correct?"). Vision models are known to struggle with poor lighting, mixed dishes, and underrepresented cuisines like Nigerian staples — never silently commit an AI guess.
- Spoonacular — primary recipe content source, supplemented by an owned "Homeland Dishes" collection for Nigerian/West African depth (seeded from open-source datasets under permissive licenses + founder-written anchor recipes + community submissions — see report Section 02 for full detail). **Use Spoonacular's free tier (~150 requests/day, no card required) for all development and testing.** Do NOT subscribe to the paid Cook plan ($29/month) until the actual go-live day — Spoonacular billing is month-to-month with no proration. If launch slips, keep waiting on free tier; never subscribe based on a calendar date alone.
- Paystack (NGN) + Stripe (USD) — dual currency billing
- Open Food Facts (or equivalent) — barcode/UPC lookup, zero AI cost

## Critical architectural decision — read before touching recipe code
**AI no longer generates recipes or meal plans.** Earlier code (`services/aiService.ts`, planner logic) may still have recipe discovery falling back to AI-generated recipes when nothing matches, and the meal planner using AI-generated weekly plans. **This is retired.** Replace both with Spoonacular-driven results plus pantry-matching logic. Gemini's role is scoped to vision, transcription, and personalization/substitution only — never generating a recipe's ingredients or instructions from scratch.

## Navigation — target structure (3 tabs)
Collapsing from the current 5 tabs (Home, Search, Pantry, Saved, History) to:
- **Home** — one hero action only: time/region-aware meal suggestion, Cook / Swap / Skip, optional "view full day" expansion, light scrollable rows below (Use It Up, Quick Tonight, Because You Cooked X). New users get popularity/diet-based fallback rows until real usage data exists — same screen structure, different content, never a different "new user mode" screen. **Avatar/profile-access icon appears here only** — not on Kitchen or Explore.
- **Kitchen** — replaces separate `pantry.tsx` + `shopping.tsx`. One list, two states: Have / Need, toggled at the top (sticky, per design system above). Items move automatically (accepting a meal → missing items go to Need; scanning/checking off → items go to Have). No separate "generate list" action. **The "+" input button floats bottom-right (FAB style)**, expanding to 4 options: Camera, Barcode, Voice, Type manually.
- **Explore** — folds in Search, Saved, History, meal planner. Category browsing, filters, search bar all live here — never on Home.

## Recipe Detail screen
This screen gets extra design care — hero image, clear meta row (time/cal/servings), the pantry-match line ("You already have 4 of 6 ingredients"), an ingredients list showing which items are already in Have vs. still Need, and a persistent "Start Cooking" button anchored at the bottom (not lost on scroll).

## Cook Mode — full spec
- **Entry point**: tapping "Start Cooking" shows a choice screen first — "Watch the full video" or "Follow step by step" — not a direct drop into steps. Video is a real, equal option, not buried.
- **Video architecture**: ONE whole-recipe video per recipe (sourced via Spoonacular's food-video-search endpoint, matched by recipe title — no separate YouTube API integration needed). There is NO per-step video content — that's not realistically sourceable from any API. A single "watch full video" icon sits in the step-flow top bar (available on every step equally, honestly labeled), switching to video mode and preserving step position when switching back.
- **Step screen**: circular progress ring (the logo motif reinterpreted — fills with amber gradient per step, resolves into the actual bowl-and-checkmark mark on completion), large glanceable step text with key amounts as amber pill chips, asymmetric controls (dominant amber "Next Step", quiet ghost "Back").
- **Mid-cook ingredient check**: a small list icon in the top bar opens a bottom sheet with the full ingredient list — doesn't lose step position underneath.
- **Completion screen**: the one moment of real celebration — animated logo mark, warm "Nicely done" message, star rating, "Save & Finish".
- Timer steps get their own quiet card (not just a number) to feel distinct from active hands-on steps.

## Saved recipes — storage rule
Do not cache full Spoonacular recipe content long-term (license terms restrict this). Store only recipe ID + title + thumbnail permanently; re-fetch full ingredients/instructions live from the API each time the user opens a saved recipe.

## Pantry rules
- Local/non-standard units (cups, derica, paint rubber, basin, bag, tin) are first-class — treat as approximate presence/quantity signals, not exact-gram conversions.
- Display pantry items as confidence level (full/half/low dots), not exact quantities.
- Items untouched for several days lower in confidence rather than being assumed gone or still full.

## Budgeting (new feature)
User can set a daily/weekly/monthly or per-recipe budget (Profile settings, same pattern as Diet Type/Allergies). When checking off a Need item as bought, an **optional** "how much did this cost?" prompt appears — never mandatory. App tallies logged spend against the set budget period (simple ledger, e.g. "₦9,200 of ₦15,000 this week"). This is user-logged actual spend only — **do NOT build automatic AI price estimation or live grocery-price search/grounding**. Most third-party grocery price APIs are unofficial retailer scrapers (same legal risk category as recipe scraping, already ruled out), and Gemini's search-grounding feature costs ~$14/1,000 queries — roughly 20x the entire rest of the app's Gemini budget combined. Real-time pricing is a flagged future item, not part of this build.

## Region detection &amp; localization
Use `expo-localization` (device timezone/locale/region — no API cost) to drive smart defaults, always overridable in Settings:
- Correct local time for the Home greeting (verify this already works correctly off device time before assuming it's broken).
- Default measurement unit suggestion (Local Nigerian units if device region is Nigeria, Imperial for US, Metric elsewhere) — never locked in, user can always change it.
- Default language suggestion based on device locale.

**Language setting vs. actual translation — these are different scopes.** Ship the Language picker in Settings now (small). Do NOT build full UI translation into Yoruba/Hausa/Igbo/French yet — that's substantial new content work requiring accurate (not machine-translated) strings for every screen. Non-English options should show "Coming soon" rather than a half-translated app. Full translation is a V2 item, validated by real founding-cohort demand first.

## Email — Supabase auth branding
Supabase's default `auth.signUp()` sends its own generic confirmation email unless configured otherwise. This needs dashboard configuration (not new code): customize templates under Authentication → Email Templates, and connect a real sending domain under Authentication → SMTP Settings (e.g. via Resend, which has a free tier covering a few thousand emails/month). Do before public launch, not required for internal dev testing.

## Family/Household tier
Up to 5 connected accounts under one subscription (Netflix-style cap). Billing shared; Kitchen/pantry data independent per account/location by default (members may be in different countries). Any account holder can temporarily share a specific Kitchen list (view + check-off access); either side can end access anytime; unattended shares auto-expire in 7-14 days. Backend service layer (`householdService.ts`) already exists — this phase is UI only.

## Pricing (already decided — do not change without explicit instruction)

**Standard pricing** (revised down from an earlier estimate after market research):
- Free: hero suggestion, manual-entry pantry only, basic Kitchen list
- Pro: ₦2,900/mo or ₦29,000/yr — $4.99/mo or $49.90/yr — camera/voice/barcode AI, full planning, cook-mode video, unlimited saved recipes
- Family: ₦4,800/mo or ₦48,000/yr — $7.99/mo or $79.90/yr — everything in Pro + up to 5 accounts

**Launch pricing — first 100 subscribers only**, then reverts to standard above:
- Pro: ₦1,999/mo or $2.99/mo
- Family: ₦3,300/mo or $5.49/mo
- This is capped by subscriber count, not a time window. Implement a subscriber counter that switches pricing automatically once the 100th subscriber is reached.

## Voice — scope for this build
Voice is input-only (speech-to-text for search). Do not build spoken/conversational output — that's a deferred V2 feature (hands-free Cook Mode navigation), not part of this build.

## Do NOT build in this phase (explicitly deferred to V2)
Push notification delivery/inbox, avatar/photo upload, deep household collaborative planning beyond basic shared billing + independent kitchens, nutrition tracking, recipe import from social media, community/UGC recipe sharing, hands-free Cook Mode voice output, AR tutorials, smart-kitchen/wearable integration, a "browse all recipes" top-level tab, tiered international pricing by country, real-time/AI-estimated grocery pricing. If it's not in the current build calendar, it waits — flag it instead of building it.

## Known existing gaps (verify still true before starting — last verified 2026-08-17)
- `cookModeService.getProgress()` is a stub — needs real persistence (not re-verified 2026-08-17, carried over from prior report)
- Camera scan results can be simulated when no real vision model is available — needs real Gemini vision wiring (with confirm-before-commit, per above) (not re-verified 2026-08-17, carried over from prior report)
- Several `*Parity` legacy screens coexist with newer implementations — consolidate once new flows are confirmed working, not before (not re-verified 2026-08-17, carried over from prior report)
- `scripts/progress.json` is empty — use it as a real milestone log going forward (not re-verified 2026-08-17, carried over from prior report)
- Plans screen is informational only — no real Paystack/Stripe checkout yet (not re-verified 2026-08-17, carried over from prior report)
- **[FIXED — verified 2026-08-17] Onboarding stuck bug**: previously diagnosed as `user_health_profiles` never being migrated while `userService.ts` assumed it existed. Current code no longer does this — `userService.ts` reads/writes `allergies`, `health_goals`, `default_servings` directly on `user_profiles`, and the live database has those columns on `user_profiles` (confirmed via PostgREST introspection). A `user_health_profiles` table does exist live, but it's now only used by `householdService.ts` for a legitimate household-member diet-type join, unrelated to the original bug. No action needed here.
- **[FIXED — verified 2026-08-17] Masked second bug**: previously diagnosed as `profile` in `AuthContext` never being refetched after onboarding, causing a bounce back to `/onboarding`. Current code (`components/onboarding/OnboardingScreen.tsx` `handleDone`) already calls `completeOnboarding()` (local store flag) and `await refreshProfile()` before `router.replace('/(tabs)')`. No action needed here.
- **[Systemic, partially open] `Alert.alert()` is a hard no-op on web** (`react-native-web/dist/exports/Alert/index.js` — `static alert() {}`). Since Chop is PWA-first, any code relying on `Alert.alert()` for error messages or confirmations silently fails on web with no visible feedback to the user. Full-codebase search (2026-08-17) found exactly 4 remaining call sites — smaller than originally scoped, not "everywhere": `components/onboarding/OnboardingScreen.tsx`, `context/AuthContext.tsx`, `components/search/SearchScreenParity.tsx`, `components/shopping/ShoppingScreen.tsx`. Replace with a proper cross-platform toast/modal component; re-run the search after any large refactor in case new call sites were added.

## Legal (non-code, but gates production billing)
Terms of Service, Privacy Policy, and refund/cancellation policy must be real and NDPA/GDPR-aware before Stripe/Paystack will approve full recurring billing. Do not treat as a post-launch cleanup item.

## Working style
- Keep changes scoped to the current phase/day's task — do not pull forward V2 items even if related code is nearby.
- When a fix reveals a larger structural issue, flag it rather than silently expanding scope.
- Prefer editing/consolidating existing services (`recipeService.ts`, `pantryService.ts`, `shoppingService.ts`, `plannerService.ts`, `householdService.ts`, `cookModeService.ts`, `aiService.ts`) over creating parallel new ones, to avoid recreating the current `*Parity` duplication problem.
- Full visual reference mockups exist (Home/Kitchen/Explore/Profile/Recipe Detail/Cook Mode) — match these for layout, spacing, and interaction patterns rather than improvising new ones.
