# CramPiler — Documentation

*A smart filter between a chaotic university calendar and a student's daily
focus. Instead of showing what's due, it calculates exactly what to do next.*

This documents the system as it actually exists in the codebase reviewed
(`crampiler-projectV2`), not as originally proposed — every section below was
verified against the real source files.

---

## 1. Architecture overview

```
crampiler-projectV2/
├── GUIDE.md               ← setup, troubleshooting, known issues
├── DOCUMENTATION.md       ← this file
├── dev.sh                 ← starts backend + frontend together
├── .gitignore
├── backend/                ← Spring Boot 3 + MongoDB Atlas
│   └── src/main/java/com/crampiler/
│       ├── CramPilerApplication.java
│       ├── model/         Assignment, Course, Subtask
│       ├── repository/    AssignmentRepository, CourseRepository
│       ├── service/       BlackboardSyncService, ScheduledPollerService, VelocityScoringService
│       ├── controller/    TaskController, CourseController
│       └── dto/           AssignmentRequest, CompleteRequest, SubtaskUpdateRequest, SyncRequest
│   └── src/test/java/com/crampiler/
│       └── VelocityScoringServiceTest.java
└── frontend/               ← React + Vite + Tailwind
    └── src/
        ├── App.jsx          top-level state, optimistic updates, undo
        ├── api.js           fetch wrapper for every backend endpoint
        ├── lib.js           formatting, scoring-adjacent, and date helpers
        ├── theme.js         dark/light mode persistence
        ├── toast.js         toast pub/sub event bus
        ├── data/
        │   ├── courseTypeTemplates.js   6 syllabus-type weight templates
        │   └── programTemplates.js      Program → Year → Semester → Courses
        └── components/     17 components (listed in section 4)
```

Three-tier design: React/Vite client → Spring Boot REST API → MongoDB Atlas.
The client never talks to Atlas directly.

---

## 2. The Velocity Priority Engine

Implemented in `VelocityScoringService.java`. The formula:

```
        W × (1 + D)
    V = ───────────
             H
```

- **W (Weight)** — the course's syllabus percentage for the task's category
  (e.g. `40` for a 40%-of-grade exam), read from `Course.categoryWeights`
  (stored as a 0–1 fraction, multiplied by 100 here).
- **D (Deficit)** — fraction of incomplete subtasks: `0.0` = all done,
  `1.0` = nothing done. A task with **zero subtasks** is treated as `1.0`
  (not started) — this is a deliberate design choice, verified in code.
- **H (Hours)** — hours remaining until the deadline. No due date defaults
  to a low-urgency 30 days out.

**Overdue handling** (`H <= 0`):
- **Default (Critical Override):** `V` is pinned to a flat `999`, and the
  task is flagged `overdue`. The UI renders it in red and locks it at the
  top regardless of weight or subtask progress.
- **If `latePenaltyEnabled` is true on that task:** the override is
  skipped. Instead `W` decays 10% per full day late
  (`Duration.between(dueDate, now).toDays() + 1`, floored at 0), and `H` is
  floored at 0.5 hours so the formula stays finite. The score shrinks over
  time instead of staying pinned.

**Completed tasks** are short-circuited to `V = 0`, `overdue = false`, and
excluded from the active Priority Pool entirely (see §3).

This exact behavior — including the overdue override, the late-penalty
decay math, and the "no subtasks = D of 1.0" rule — is locked in by
`VelocityScoringServiceTest.java` (7 tests, all passing against a
hand-verified worked example).

---

## 3. Backend feature-by-feature

### 3.1 Task lifecycle (`Assignment` model + `TaskController`)
- Tasks can be created manually (`POST /api/tasks`) or synced in from
  Blackboard (see §3.3).
- Fields: `title`, `dueDate`, `courseCode`, `category`, `completed`,
  `completedAt` (set/cleared automatically whenever `completed` flips —
  this is what streak/weekly stats are computed from, not `dueDate`),
  `latePenaltyEnabled`, plus the transient computed `velocityScore` and
  `overdue`.
- **Active vs. Archive split:** `GET /api/tasks/velocity` returns only
  incomplete tasks, scored and sorted descending — this is the literal
  Priority Pool the frontend Dashboard renders. `GET /api/tasks/completed`
  returns the Archive. `GET /api/tasks` returns everything (used by the
  Calendar, which needs to show completed tasks too, struck through).
- Completing a task (`PUT /api/tasks/{id}/complete`) also force-completes
  every subtask on it, and vice versa — completing all subtasks
  auto-completes the parent (`PUT /api/tasks/{id}/subtasks`).

### 3.2 Subtasks (`Subtask` model, nested in `Assignment`)
- Add, toggle, or delete individually via
  `PUT /api/tasks/{id}/subtasks` and `DELETE /api/tasks/{id}/subtasks/{sid}`.
- Every subtask toggle recalculates the parent's Deficit (D) on the next
  fetch — this is the mechanism behind "checking a box changes the ranking."

### 3.3 Blackboard sync (`BlackboardSyncService`, `ScheduledPollerService`)
- Fetches a private `.ics` URL via `java.net.http.HttpClient`, parses it
  with the `biweekly` library.
- Upserts by iCalendar UID, so re-syncing updates existing tasks (title,
  due date) rather than duplicating them. Subtasks and completion state
  are preserved across re-syncs.
- **Verified limitation:** the actual institution `.ics` feed inspected
  during development has no `CATEGORIES`, `LOCATION`, or any course
  identifier — only `SUMMARY`, `DTSTART`, `DTEND`, `UID`. So
  `CourseCodeExtractor` always falls back to `"UNASSIGNED"` in practice.
  `CategoryClassifier` guesses a category from keywords in the title
  (`"midterm"`, `"final"`, `"quiz"`, `"lab"` → matching category, else
  `"Homework"`) — this is a coarse heuristic, not reliable institution-
  specific classification.
- `ScheduledPollerService` re-runs the sync hourly by default
  (`crampiler.sync.interval-ms`, default 3,600,000ms) if
  `crampiler.blackboard.ics-url` is configured; otherwise it's a no-op.
- `GET /api/sync/status` exposes `lastSyncedAt` / `lastError`, tracked
  in-memory on `BlackboardSyncService` (resets on backend restart — it's
  not persisted to the database).

### 3.4 Courses & syllabus weights (`Course` model, `CourseController`)
- `categoryWeights` is an arbitrary `Map<String, Double>` — any category
  name, any course. This is what makes the institution-specific syllabus
  types (§3.5) possible without any backend changes.
- `targetGrade` exists on the model but is **purely informational** — it
  is not read anywhere in `VelocityScoringService`. An earlier grade-
  deficit concept was removed from the formula; only subtask-based
  Deficit remains.
- **Course codes are enforced unique** at the backend (`409 Conflict` on
  create or rename collision) — this matters because the scoring engine
  looks courses up by code; a duplicate would silently corrupt scoring for
  every task in the shadowed course.

### 3.5 Institution syllabus types (`courseTypeTemplates.js`, frontend-only)
Six pre-computed, already-flattened weight templates matching the
institution's real grading structures (verified to each sum to exactly
1.0):

| Type | Structure |
|---|---|
| `paired` | Lecture 60% (OLA1-6 3% each, CO1-3 Summative 12% each, Coursera 6%) + Lab 40% (Exercise 1-4 4% each, CO1-3 Practical Exam 8% each) |
| `math` | Activities 30 / Long Quizzes 40 / Finals 30 |
| `ged` | CO1 35 / CO2 35 / CO3 30 |
| `other` | CO1-3 Exercises 15/15/10 (coursera folded in) + CO1-3 Summative 20/20/20 |
| `pathfit` | 10 Practical Exercises @ 7% + Quiz 5 + Midterms 10 + Finals 15 |
| `lab` | OLA 10 / Quizzes 25 / Labs 25 / Finals 40 |

These are applied either at course creation (a "Syllabus type" dropdown)
or retroactively via an "Apply a syllabus type…" control on an existing
course (with a confirmation dialog, since it overwrites all existing
categories).

### 3.6 Program/curriculum seeding (`programTemplates.js`, frontend-only)
A nested `Program → Year → Semester → Courses` structure. Each course
entry needs just `{ code, name, type }` (resolving to a
`courseTypeTemplates` weight map) or a fully custom `categoryWeights`.
The Courses tab has a cascading Program/Year/Semester picker that bulk-
creates that term's courses in one click, skipping any course code that
already exists.

---

## 4. Frontend feature-by-feature

### 4.1 Layout
Three-column progressive disclosure, collapsing on mobile:
- **Sidebar** (`Sidebar.jsx`) — Dashboard / Calendar / Courses / Settings
  nav, a live sync-status indicator (polls `/api/sync/status`), and the
  dark-mode toggle. Collapses to a bottom nav bar below the `md` breakpoint.
- **Center column** — the active tab's content.
- **Task Drawer** (`TaskDrawer.jsx`) — slides in from the right on desktop,
  becomes a bottom sheet on mobile. Opens on clicking any task.

### 4.2 Dashboard (`Dashboard.jsx` + `HeroCard`/`RunnerUpCard`/`RadarRow`)
- Fetches nothing itself — receives `activeTasks` (already sorted by
  `velocityScore` descending) and `completedTasks` from `App.jsx`.
- **Hero Card**: rank #1. **Runner-Ups**: ranks #2–3, side by side.
  **Upcoming Radar**: everything else, re-sorted chronologically (not by
  score) and visually dimmed.
- A streak strip (🔥 "N-day streak", "N done this week") computed from
  `completedAt` timestamps via `computeStreak()` / `completedThisWeek()`
  in `lib.js` — only rendered when non-zero.
- A collapsed "Completed (N)" section at the bottom (the Archive), so
  finished work doesn't clutter the active view but is still reachable.
- **Dashboard Settings menu** (`DashboardSettingsMenu.jsx`, gear icon next
  to the page title): toggle "Hide overdue activities," and per-course
  checkboxes (plus a "No course" entry) to filter which courses' tasks
  appear on the Dashboard. State lives in `App.jsx`, not persisted across
  reloads.

### 4.3 Calendar (`CalendarView.jsx`)
- Month grid with day cells showing up to 3 task chips (color-coded per
  course via a hash-based palette in `lib.js`; overdue tasks render in a
  fixed red regardless of course color).
- **Burnout Heatmap**: each week row is tinted (transparent / amber /
  red) based on `weekBurnout()` — the sum of syllabus weight (W) for every
  active task due that week. ≥50% = critical (red), ≥25% = watch (amber).
  This is capacity planning, separate from the Priority Engine's
  day-to-day ranking.
- Clicking a day shows/adds tasks due that day; the "Add task" modal opened
  from here pre-fills the due date to 11:59 PM that day.

### 4.4 Task Drawer (`TaskDrawer.jsx`)
- Read-only quick context: syllabus weight %, due date, velocity score,
  late-penalty status.
- Interactive checklist: add/toggle/delete subtasks inline.
- An "Edit" toggle reveals title/course/category/due-date fields plus the
  per-task Late Penalty checkbox.
- Mark-done and delete both route through `App.jsx`'s optimistic handlers
  (see §4.6), not direct API calls.
- Category dropdown (in both here and `TaskFormModal.jsx`) is **dynamic**:
  it lists the selected course's actual `categoryWeights` keys, falling
  back to `['Homework','Quiz','Midterm','Final']` only if the course has
  no categories yet.

### 4.5 Courses tab (`CoursesManager.jsx`)
- Add a course manually (code, name, target grade, optional syllabus
  type) or bulk-seed a term from `programTemplates.js`.
- Per-course: inline-editable code/name (commit on blur), target grade,
  a live "weighted %" indicator that turns **red with a warning banner**
  when categories don't sum to 100% (correctness matters here — an
  unbalanced course silently skews every task's score in it).
- Expandable category editor: add/remove arbitrary categories, drag
  weight sliders, or apply/replace with one of the 6 syllabus-type
  templates (confirmed via dialog if it would overwrite existing data).
- **Per-course progress rollup**: "`N`/`M` done" next to each course,
  computed from the same task list already fetched for the Unassigned
  panel (no extra request).
- **Unassigned Tasks panel** (`UnassignedTasksPanel.jsx`) at the top:
  since the real Blackboard feed can't identify a course (§3.3), synced
  tasks land under `UNASSIGNED`. This panel lists them with a bulk
  "assign N selected → course" action and a per-row quick-assign dropdown.

### 4.6 Optimistic updates, toasts, and undo (`App.jsx`, `toast.js`, `ToastContainer.jsx`)
- Toggling a task or subtask complete updates local state **immediately**,
  then confirms with the server in the background; a failed request rolls
  the UI back and shows a red error toast.
- Deleting a task removes it from the UI instantly and shows an "Undo"
  toast for 5 seconds; the actual `DELETE` call is deferred until the
  window expires, so Undo simply cancels the pending call and restores
  the task client-side — no data ever round-trips to the server on undo.
- `toast.js` is a minimal pub/sub (no React context) — any component can
  call `showToast()`; a single `<ToastContainer/>` mounted once in
  `App.jsx` is the only subscriber.

### 4.7 Dark mode (`theme.js`, `ThemeToggle.jsx`, CSS variables)
- Colors are CSS custom properties (`--color-ink`, `--color-paper`, etc.),
  swapped by toggling a `.dark` class on `<html>`. Tailwind's `darkMode:
  'class'` plus `rgb(var(--color-x) / <alpha-value>)` color definitions
  make `text-ink/60`-style opacity modifiers keep working in both themes.
- A guard script in `index.html` (before any React code runs) applies the
  stored/preferred theme class pre-paint, avoiding a flash of the wrong
  theme.
- A dedicated `overlay` color (fixed dark scrim, not tied to `ink`) is
  used for all modal/drawer backdrops specifically so they don't invert
  into a pale haze in dark mode.
- Persisted via `localStorage` (`crampiler-theme` key), independent of
  the OS `prefers-color-scheme` setting once the user has toggled it once.

---

## 5. Full API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tasks` | All tasks (active + completed), scored |
| GET | `/api/tasks/velocity` | Active tasks, sorted by Velocity Score desc |
| GET | `/api/tasks/completed` | The Archive |
| POST | `/api/tasks` | Create a task manually |
| PUT | `/api/tasks/{id}` | Update title/due date/course/category/late-penalty |
| DELETE | `/api/tasks/{id}` | Delete a task |
| PUT | `/api/tasks/{id}/complete` | Mark done/not done |
| PUT | `/api/tasks/{id}/subtasks` | Add or toggle a subtask |
| DELETE | `/api/tasks/{id}/subtasks/{subtaskId}` | Remove a subtask |
| POST | `/api/sync` | Manual Blackboard `.ics` sync |
| GET | `/api/sync/status` | Last sync time + last error |
| GET | `/api/courses` | List courses |
| POST | `/api/courses` | Create a course (409 on duplicate code) |
| PUT | `/api/courses/{id}` | Update a course (409 on rename collision) |
| PUT | `/api/courses/{id}/weights` | Update just the category weights |
| DELETE | `/api/courses/{id}` | Delete a course |
