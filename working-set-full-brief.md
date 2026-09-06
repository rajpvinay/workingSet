# Working Set — Complete Project Brief

*Handoff document for continuing this project (in Claude Code, or a new Claude chat). Attach this at the start of the session together with the latest prototype file (`workout-companion-v11.jsx`). This brief is the source of truth: when code and brief disagree, fix one of them on purpose.*

*Current prototype: **v11**. Last updated to reflect v8–v11.*

---

## 1. Purpose and vision

**Working Set is an in-workout companion, not a retrospective tracker.** Plenty of apps log workouts after the fact; this one helps *during* — selecting exercises, remembering what you lifted last time, timing rest, and producing a clean record when you're done.

**Why it exists:** if the app handles the bookkeeping of a workout, the builder reclaims attention and time for other parts of life, where the most important decisions get made. The app automates mechanics and keeps the user present in the workout.

**Who it's for:** Vinay is the builder and the primary user. It may later be shared with friends, but decisions optimize for one real user's workout experience, not hypothetical mass-market users.

**Builder profile:** extensive AI experience at work (content, slides, synthesis; 1–2 simple workflow agents), not a professional developer. Explain technical tradeoffs in plain terms; give one recommendation with rationale rather than menus of options; bias toward something usable in the next workout.

**Account decision (made deliberately):** this is a personal project, built and hosted entirely on personal accounts (Claude, GitHub, Vercel, Supabase) — never on work accounts, for IP, control, and policy reasons.

---

## 2. Product principles (distilled from eleven iterations)

1. **The user is the author.** The app never prescribes anything — not which exercises, not how many, not how many sets, not how long the workout should take. Early versions had auto-built plans, priority ordering, time budgets, and suggested counts; all were deliberately removed. Any future "smart" suggestions must be opt-in and never pre-select.
2. **Reference over analysis.** Mid-workout, the user needs "you did 105 lb last time; your best is 110" — not dashboards. (This is why the trend sparklines were removed in v8: they read as a dashboard. Last-time and personal-best remain, as plain reference.) Deep analysis belongs in the summary and history, if anywhere.
3. **Honest measurement.** The record reflects only what actually happened: duration is first-logged-set to last-logged-set (not door to door, not planned time); skipped exercises vanish from the record; set counts are always actuals.
4. **Minimal friction under gym conditions.** Sweaty hands, phone on a bench, between sets: touch-first controls over keyboards, touch targets ≥48px, glanceable numerals, as few taps as possible. The weight control is a thumb-scrollable ruler, not a keyboard entry.
5. **Gym reality is chaotic.** Machines are taken, minds change. Any part of the plan must be changeable mid-workout without losing logged work — swap, remove, skip, or **add** an exercise on the fly.
6. **Plays well with the ecosystem.** Complements trackers like Whoop rather than replacing them; export/integration matters.

---

## 3. Functional requirements (current behavior, v11)

### 3.1 Home / setup
- Multi-select from 8 muscle groups: Back, Chest, Shoulders, Biceps, Triceps, Legs, Core, Light cardio. Plain toggles — selecting a group only reveals its exercise list next; nothing is picked for the user, and no order/priority badges appear on groups.
- Rest timer toggle, **default off** (opt-in). When off, a manual start remains available mid-workout.
- History button in the header.
- No duration question. (Removed: "how long do you have" and all time estimates.)

### 3.2 Exercise picker
- Shows the full exercise library for each selected group (nothing preselected).
- Exercises done in the most recent session containing that group sort to the top with a "Last time" badge.
- Tap to pick; **pick order = workout order**, shown as numbered badges on picked rows only.
- Each row shows the last-time value (e.g., "Last time 105 lb x 10" / "Last time 20 min" / "New, no history yet"). **No sparkline** (removed v8). No set-count or exercise-count prescriptions anywhere.
- Per-group "N picked" counter; sticky footer with the Start button (disabled at zero picks).
- **Add your own exercise** per group: name + typical weight in lb (0 = bodyweight). Cardio groups take name only. New exercises join the group's list from then on and are added to the current picks.

### 3.3 Workout screen (the core)
- Header: exercise i of n, lifting clock (appears only after the first set is logged; counts from first set), End button (finishes anytime).
- Thin progress bar (completed exercises / total).
- Group label, exercise name, **Change** button.
- Reference block: "Last time X lb x R" (or "First time, no history yet") and "Personal best Y lb" in amber. **No sparkline** (removed v8).
- 2–3 short coaching cues per built-in exercise (e.g., bench press: "Arch your back, plant your feet"), shown as a compact left-bordered list. All ~70 built-ins have cues; custom exercises have none.
- **Hero weight readout** (76px numerals) with unit; shows "BW" at 0 lb. Below it: delta vs last time ("+5 lb vs last time" in green when positive) and an amber "Above your personal best" callout when applicable. (These live-during-workout comparisons stay — they are reference, per Principle 2. They were removed only from the end-of-workout summary.)
- **Precision scroller (replaces the old slider, v10–v11).** A horizontal tape/ruler you scroll to set the weight or minutes:
  - **1-unit resolution** (1 lb / 1 min), so odd values like 66 lb are reachable. Ticks every 1 unit, numbers every 10, with a fixed cobalt center line marking the selected value.
  - **Reference marks on the tape:** last-time weight is a grey tick, personal best is an amber tick — scroll onto them to match/beat. A `| last  | best` legend beneath names the values.
  - **Domain:** 0 (BW) up to the exercise's max + 100 lb of headroom (cardio: max + 15 min). This is a generous fixed range, not infinite — a ruler needs finite length. The tick strip is memoized so scrolling stays smooth on long-range machines.
  - **Input:** touch = native horizontal swipe (the phone target). Desktop also supported (v11): vertical mouse wheel scrubs horizontally, click-and-drag scrubs, and Arrow/Page/Home/End keys nudge when focused. Touch behavior is untouched by the desktop handlers.
- Fine adjust: −step / +step buttons (jump by the exercise's plate-sized step; floor 0, ceiling = the scroller ceiling). Reps stepper (1–30) for weight exercises; hidden for cardio.
- **Log set** button (labels: "Log set N" / "Log X min"). Logged sets render as chips ("105 x 10", "BW x 12", "18 min").
- **Add an exercise** button (below Next/Skip, v8): opens the same sheet as Change but *adds* rather than swaps — see 3.4.
- Rest: auto-starts after a logged set only if the toggle is on; otherwise a "Start rest timer (1:30)" button. Timer is a bottom overlay: countdown, shrinking bar, +30 sec, Skip; ends with a brief "Rest done. Go." state (~2.4s) then auto-dismisses. Hidden while the Change/Add sheet is open.
- Advance: "Next exercise" / "Finish workout" requires ≥1 logged set; a quiet "Skip" is offered otherwise.

### 3.4 Change / Add sheet (mid-workout flexibility)
- One shared sheet with two modes:
  - **Change** (from the Change button): swaps the current exercise.
  - **Add** (from the "Add an exercise" button, v8): adds an exercise without swapping.
- The workout's own muscle groups are listed expanded; **every other muscle group** appears under "Other muscle groups" as collapsed rows with Show/Hide toggles. Every group section has the same **Add your own exercise** form.
- **Change rules:**
  - No sets logged on the current exercise → replaced in place.
  - Sets already logged → the current exercise stays with its sets; the new one is inserted immediately after and becomes current.
  - "Remove from workout, move on" appears only when no sets are logged on the current exercise. Removing the last remaining exercise ends the workout.
- **Add rule (v9):** the added exercise **slots in immediately after the current exercise** (becomes the next one up), without touching the current exercise or its logged sets. (Note: adding two in a row means the second takes the "next up" slot ahead of the first — an open question if add-order preservation is ever wanted; see Section 8.)
- Swapping/adding an exercise from a group outside the original selection **adds that group to the workout** — label, summary, history entry, and the sheet's expanded sections all update.
- Creating a custom exercise inside the sheet swaps or adds it straight in (matching the mode).

### 3.5 Summary (end of workout)
- Stats: **minutes (first set to last set)**, total sets, total volume (lb; Σ weight×reps).
- Per-exercise lines: exercise name, set count, and **the full set list rendered as chips** (every set, e.g., `115 x 8` `135 x 8` `135 x 6` or `BW x 12`; cardio as `20 min`). (v8: replaced the old "top set only" line; **removed the "vs last / vs best" deltas** here — the summary is a record, not a comparison.) Exercises with no logged sets (skipped) are omitted entirely. Graceful empty state if nothing was logged.
- **Copyable plain-text recap** ("For your other trackers") for tagging the activity in Whoop or elsewhere; now lists every set per exercise. Clipboard write with try/catch and a "Copied" confirmation.
- "Saved to your history" note; buttons: New workout, View history.

### 3.6 History
- Day list: `MM/DD/YYYY — Groups label`, exercise count, duration. Tap for detail.
- Detail: date, groups, stats (minutes / sets / volume), and per-exercise rows showing set counts and **the full set list as chips** (v8, matched to the summary for consistency).
- Finished workouts are prepended. History powers the picker's "Last time" highlighting, and finishing a workout appends each exercise's top value to its trend history (capped at 8 points) and raises its PB when beaten — so deltas next session are correct.

---

## 4. Non-functional requirements

- **Mobile-first:** single column, max width ~430px, designed for one-handed phone use at a gym. Touch targets ≥48px; primary action reachable by thumb.
- **Glanceability:** the weight readout must be readable from a few feet away; everything else stays quiet.
- **Design system** (worth preserving — it's distinctive):
  - Palette: floor `#171512` (warm charcoal, rubber gym floor), surface `#211E1A`, raised `#2B2620`, line `#3A342C`, chalk `#EFE9DD` (primary text), dust `#9C9284` (secondary), cobalt `#4E79E8` (primary action/current), amber `#E3A93C` (rest timer, PB), sage `#8CB474` (progress, positive deltas), plus dim variants for tinted panels.
  - Typography: system font stack, heavy weights (700–800), tight letter-spacing on numerals, `tabular-nums` everywhere numbers appear. One bold hero element (the weight readout); everything else quiet.
  - Motion: only in response to actions (press scale, timer bar); honors `prefers-reduced-motion`.
- **Accessibility:** aria-labels on steppers/badges, `role="switch"` on the toggle, `role="status"` on the rest timer. The precision scroller uses `role="slider"` with `aria-valuemin/max/now/valuetext` and full keyboard control (arrows/page/home/end); a focus ring is shown on the scroller. The −/+ buttons remain a fully accessible fallback for setting weight.
- **Tone of copy:** sentence case, plain verbs, no exclamation-mark cheerleading, no prescriptive language.

---

## 5. Technical requirements and current implementation

### 5.1 Current prototype (Phase 1)
- **Single-file React component** (`workout-companion-v11.jsx`): default export, hooks only (`useState`, `useEffect`, `useRef`, `useMemo`), no external state libraries, no router (screen state machine: `setup | pick | workout | summary | history | historyDetail`).
- Styling: Tailwind **core** utility classes for layout + inline styles for all custom colors (no Tailwind config available in artifacts); one `<style>` tag holding scrollbar-hiding/focus CSS for the ruler (`.ws-ruler`) and press/reduced-motion rules (`.ws-press`).
- The weight control is a self-contained `WeightScroller` component (horizontal scroll-snap ruler; memoized ticks; wheel/pointer-drag/keyboard handlers for desktop; native touch scroll on phone).
- Rendered as a Claude artifact. **Artifact constraints that shaped the code (these lift once it's a real app):** no `localStorage`/`sessionStorage` (all state in memory; refresh resets to seeded mock data), no HTML `<form>` tags (buttons with onClick only), no arbitrary Tailwind values.
- Mock data: ~70 exercises across 8 groups, each with name, slider min/max/step, a derived 5-point history, target-rep reference, per-exercise rest seconds, and cues; 5 seeded past workouts (most recent 09/03/2026 Back + Biceps) that power History and last-time highlighting.

### 5.2 Data model (carry this into the real backend)
- **Exercise:** `{ name, min, max, step, history: number[] (recent top values, capped 8), reps (last/target reps reference), rest (sec), kind: "weight" | "cardio", group, pb, cues: string[], start (custom initial weight), custom?: true }`. Note `min`/`max`/`step` now drive only the −/+ buttons and seed the scroller ceiling; logged weights are integers at 1-lb precision and are no longer restricted to `step` multiples.
- **Workout (history entry):** `{ date: "YYYY-MM-DD" (local time, not UTC), groups: string[], durMin, entries: [{ id, name, kind, sets }] }`
- **Set:** `{ w, r }` for weight (w = 0 means bodyweight), `{ min }` for cardio.
- Summary is computed **before** rolling session results into exercise history/PB, so deltas always compare against the pre-workout baseline.

### 5.3 Target production stack (Phases 2–3)
- React app scaffolded with **Vite** (Next.js acceptable, but Vite is the lead choice — it's the simplest fit for a single-screen app), built via **Claude Code**; local phone testing with `npm run dev -- --host` over shared Wi-Fi; **GitHub** repo; **Vercel** for auto-deploy on push; a web manifest + icons for a clean add-to-home-screen/PWA install.
- **Supabase** for persistence: workout history, custom exercises, per-exercise trend/PB, user settings (rest toggle). Auth only becomes necessary when a friend joins.

### 5.4 Deployment/testing learnings (already established)
- A `.jsx` file is source code — it cannot be opened from email or a phone directly; it needs a rendering environment (Claude artifact or a scaffolded app).
- Fastest prototype test path: render as an artifact in the personal account, publish to a public link, open on phone. (Public links have no access control; fine for a mock-data prototype. On Pro/Max a public link is the only share option and needs no sign-in; on Team/Enterprise public sharing may be disabled by org owners — another reason this lives on a personal account.)
- **Add to Home Screen does NOT work cleanly for a published artifact:** the published page is hosted on claude.ai and carries claude.ai's own web-app manifest, so installing to the home screen launches claude.ai's start URL, not the artifact. Interim workaround on iOS: an Apple **Shortcuts** "Open URL" shortcut pinned to the home screen (opens the exact artifact URL, though in a normal Safari tab, not standalone).
- **Phase 3 resolves this cleanly:** once deployed to your own Vercel domain with its own manifest + icons, Add to Home Screen installs a real standalone PWA that opens straight into Working Set. This supersedes the Shortcuts workaround.
- The precision scroller is touch-first; it is awkward with a desktop mouse *by nature* of horizontal scrolling. v11 added wheel/drag/keyboard support so it's usable for development on a computer, but the phone remains the design target — confirm scroll/snap feel on a real device.

---

## 6. Edge cases and business rules (hard-won; preserve these)

1. **Bodyweight (0 lb):** custom exercises accept 0 as typical weight; the scroller floor is 0; 0 displays as "BW" everywhere (hero, chips, last/PB lines, summary, history, recap). Bodyweight can progress into weighted territory on the same scroller. **Beware JavaScript falsy-zero bugs:** use `??`/explicit parsing and `Math.max(0, …)`, never `value || default`, for weights (this bit us twice historically: `Number(x) || 50` and `ex.start || mid`).
2. **BW volume:** zero-weight sets contribute 0 to volume because the app doesn't know the user's bodyweight. Open improvement: ask bodyweight once and count it.
3. **No-history exercises:** no last-time tick and no PB tick on the scroller, "First time, no history yet" text, no delta; the value starts at the custom typical weight (or range midpoint fallback). First logged top value becomes the PB.
4. **Swap semantics:** logged sets are never lost. In-place replacement only when nothing is logged; otherwise insert-after and advance.
5. **Add semantics (v9):** an added exercise is spliced in at `idx + 1` (right after the current one) and does not change the current index; current sets are untouched.
6. **Remove semantics:** only offered when nothing is logged on the current exercise; removing the final exercise triggers finish. `finish()` takes the plan array as an argument to avoid stale-state bugs.
7. **Duration:** 0 minutes if no sets were logged; otherwise `max(1, round((lastSetAt − firstSetAt)/60s))`. The lifting clock in the header appears only after the first set. Labels say "first set to last" so the number is unambiguous.
8. **History entries** are only created when at least one set was logged; the empty-workout summary still renders gracefully.
9. **Skipped exercises** never appear in summary, recap, or history.
10. **Cardio:** minutes scroller, no reps stepper, no rest timer; `max` of logged durations used as the day's figure.
11. **Rest timer:** +30s extends both remaining and total (bar math stays correct); "Rest done. Go." auto-dismisses after ~2.4s; suppressed while the Change/Add sheet is open; cancelled on advance/swap/finish.
12. **Dates** use local time, not `toISOString()` (UTC would mis-date late-evening workouts in New York).
13. **Scroller domain & precision (v10–v11):** domain is 0 → `max(ex.max, ex.pb ?? 0) + 100` for weight, `max(ex.max, 45) + 15` for cardio; resolution is 1 unit. `ex.step` is used only by the −/+ buttons, not the scroller. Ticks are memoized on `[count, min, max, step, lastVal, pb]` (not on the live value) for scroll performance; positioning the strip to an externally-set value is skipped while the user is actively scrolling to avoid fighting the finger.
14. **Custom exercise ranges:** weight — `min` 0, `step` 5, `max = max(100, ceil(w*2/25)*25)`; cardio — 5–40 min, `step` 1. (These seed the scroller ceiling and the −/+ step.)

---

## 7. Roadmap

- **Phase 1 — Prototype (done):** v11 artifact; gym-test via published link / Claude app; iterate on friction. **← current**
- **Phase 2 — Persistence (next):** Supabase; real history, custom exercises, and PBs that survive reloads; remove mock seed data; this unlocks the app's core promise since most remaining limitations are "in-memory only."
- **Phase 3 — Deploy:** Claude Code scaffolds Vite + Tailwind around the component; GitHub → Vercel auto-deploy; home-screen install via own domain + manifest. Iteration loop becomes: describe change → test locally → push → live at the gym. *(Recommended order: do the deploy first — it's a fast win and fixes the home-screen problem — then layer Supabase on.)*
- **Phase 4 — Whoop:** keep the manual recap copy; research Whoop's developer API — specifically whether third parties can *write* workouts or only read data; if write isn't supported, consider bridging via Apple Health / Google Fit.

## 8. Open questions (update as resolved)

- Capture bodyweight once to make BW sets count toward volume?
- **Add-order for multiple mid-workout adds:** each add currently takes the "next up" slot (so two adds land in reverse order). Preserve add-order instead?
- Reordering exercises mid-workout (currently only swap/remove/skip/add)?
- Editing or deleting a mistakenly logged set (no undo today)?
- kg support (lb-only today)?
- User-adjustable rest durations (currently fixed per exercise)?
- Cues for custom exercises (user-entered or generated)?
- Precision scroller: is 1-lb the right resolution, and does the snap/momentum feel right on-device? Fallback in back pocket: a tap-to-type number field + the −/+ buttons if the ruler ever becomes a cross-browser maintenance drag.
- Whoop API write capability (Phase 4 research task)?
- Screen-lock behavior for the rest timer as a web app (Wake Lock API?)?
- Friend/multi-user support: auth model, data separation, any sharing?
- Any future recommendation features must respect Principle 1: suggest, never pre-select.

## 9. Version log (context for "why is it built this way")

- **v1:** predefined workout combos, time-budgeted auto plans, always-on rest timer.
- **v2:** user-composed muscle-group combos with priority order; opt-in rest timer; ~70-exercise library; swap on plan screen.
- **v3:** removed auto-built plans entirely — user picks every exercise; pick order = train order; skipped exercises dropped from summary.
- **v4:** mid-workout Change (swap/remove, logged sets preserved); PB alongside last-time; custom exercises; 2–3 cues per exercise; last-time highlighting in picker; History tab with day detail; session results roll into trends/PBs.
- **v5:** stripped all remaining prescription (no auto-selection, no order badges, no suggested counts); removed duration question and estimates; duration = first-to-last logged set; custom creation inside the Change sheet.
- **v6:** bodyweight support (0 = BW) and the falsy-zero fixes.
- **v7:** Change sheet spans all muscle groups (others collapsed); swapped-in groups join the workout's label and history.
- **v8:** removed the trend sparklines (picker rows + workout reference block); added a mid-workout "Add an exercise" sheet (additive, not a swap); summary and history detail show the **full set list** (not just the top set) and dropped the "vs last / vs best" deltas from the summary. (Also briefly introduced a "flexible slider" range, superseded by v10.)
- **v9:** mid-workout adds slot in immediately after the current exercise (not appended to the end).
- **v10:** replaced the weight/minutes **slider** with a horizontal **precision scroll ruler** (1-unit resolution; last-time grey / PB amber ticks; domain 0 → max + headroom; −/+ buttons keep plate-sized steps).
- **v11:** the scroller now also works with a desktop mouse (wheel → horizontal, click-drag, arrow/Page/Home-End keys); touch on phones unchanged.

## 10. How to continue — getting started with the real app (Phases 2–3)

**Goal:** turn the v11 artifact into a deployed, installable, persistent app. Recommended tool: **Claude Code** (it runs on your machine with file access, so it can scaffold, run, and deploy the project for you). If you'd rather avoid the terminal, use the **Code tab in the Claude desktop app** instead.

**Recommended order: deploy first (fast win + fixes the home-screen problem), then add persistence.**

### Step 1 — Line up accounts and tools (all personal, all free tiers)
- Accounts: **GitHub** (code), **Vercel** (hosting), **Supabase** (database). You already have Claude Pro/Max.
- Install **Node.js LTS** from nodejs.org — Claude Code itself doesn't need it, but Vite (the app framework) does to run and build.
- Install **Claude Code** (native installer, no extra dependencies) or open the **Code** tab in the Claude desktop app.

### Step 2 — Scaffold the app around v11
- Make a new empty folder, start Claude Code there, and attach **this brief** + **`workout-companion-v11.jsx`**.
- Kickoff message to paste:
  > "This is my Working Set project — the brief has full context and is the source of truth, especially the product principles (Section 2) and the Section 6 edge cases. Scaffold a Vite + React + Tailwind app with `workout-companion-v11.jsx` as the main screen, keeping the component faithful to start. Get it running locally and help me test on my phone over wifi. Don't add persistence yet — we'll do Supabase as a separate step."
- Test on your phone over Wi-Fi with `npm run dev -- --host`.

### Step 3 — Put it on GitHub + Vercel
- Have Claude Code initialize the repo and push to a new **private** GitHub repo.
- Connect that repo to **Vercel** for auto-deploy. You now have a real URL that redeploys on every push.

### Step 4 — Make it a true home-screen app
- Have Claude Code add a **web manifest + icons** so Add to Home Screen installs it standalone and full-screen. Because it's now your own domain with its own manifest, the icon opens straight into Working Set — the clean fix for the published-artifact problem (no Shortcuts workaround needed).

### Step 5 — Add persistence with Supabase (Phase 2)
- Create a Supabase project. Have Claude Code move the in-memory data — exercises, workout history, per-exercise trends/PBs, and the rest-timer setting — into the database (read on load, write on save), and **remove the mock seed data**.
- Preserve the data model in Section 5.2 and every rule in Section 6 during the port — especially bodyweight/falsy-zero handling and swap/add semantics.
- Add login only when a friend actually joins.

### Step 6 — Iterate from the gym
- The loop becomes: tell Claude Code the change → it edits the code → push → Vercel redeploys → live on your phone.

**Keep the brief current:** when a step lands (deploy done, Supabase live), update Section 7 status and Section 5.4, and resolve items in Section 8. Bring this brief into each new Claude Code session so the hard-won behaviors survive the port. Keep the versioning convention for further prototype iterations (v12, v13…) with a header comment listing each change.
