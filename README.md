# CramPiler — Guide

---

## 1. What CramPiler is

A priority-scheduling app for students. It doesn't show you what's due
soonest — it calculates a Velocity Score for every task
(`V = W × (1 + D) / H`: syllabus weight, times one plus your unfinished-
subtask fraction, divided by hours remaining) so a 40%-weighted exam due
in 3 days correctly outranks a 5%-weighted quiz due tomorrow. See
`DOCUMENTATION.md` for the full mechanics, every feature, and the API
reference.

---

## 2. Project structure

```
crampiler-projectV2/
├── GUIDE.md            ← you are here
├── DOCUMENTATION.md    ← full feature + architecture reference
├── dev.sh              ← ./dev.sh starts backend + frontend together
├── backend/            ← Spring Boot 3 + MongoDB Atlas
└── frontend/           ← React + Vite + Tailwind
```

---

## 3. Setup

**Prerequisites:** Java 17/21, Maven (`mvn -v` to check; `brew install maven`
on Mac if missing), Node.js 18+, a MongoDB Atlas account, `git`.

**Atlas (one-time):**
1. Free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. *Database Access* → add a database user.
3. *Network Access* → add your IP, or `0.0.0.0/0` for local dev.
4. *Connect → Drivers* → copy the connection string.

**Configure the backend — do NOT put the real password directly in
`application.properties` again** (that's what caused §0). Two safe options:

- **Environment variable:** keep `application.properties` as
  `spring.data.mongodb.uri=${MONGODB_URI:mongodb://localhost:27017/crampiler}`,
  and add `export MONGODB_URI="your-real-connection-string"` to `~/.zshrc`
  (Mac/zsh). Open a **new** terminal window afterward so it takes effect.
  If you run the app via an IDE (VS Code's Java runner, IntelliJ), fully
  quit and reopen it after editing `.zshrc` — IDEs don't always inherit a
  shell profile edited while they were already open.
- **Local properties file (simpler, avoids the IDE-inheritance issue):**
  create `backend/src/main/resources/application-local.properties`
  (already in `.gitignore`) with just the real
  `spring.data.mongodb.uri=...` line, then run with
  `SPRING_PROFILES_ACTIVE=local mvn spring-boot:run`.

**Run everything:**
```bash
./dev.sh
```
or in two terminals:
```bash
cd backend && mvn spring-boot:run
cd frontend && npm install && npm run dev
```
Open **http://localhost:5173**.

**First-time data:**
1. **Settings tab** → paste your Blackboard `.ics` URL → Sync now.
2. **Courses tab** → either add courses one at a time (with a "Syllabus
   type" picked from the dropdown — Paired/Math/GED/Other/PATHFIT/Lab —
   to auto-fill the right category weights), or use the
   Program/Year/Semester picker to bulk-add a whole term from
   `frontend/src/data/programTemplates.js`.
3. Check the **Unassigned tasks** panel at the top of Courses — synced
   tasks land there since the real Blackboard feed has no course field
   (see `DOCUMENTATION.md` §3.3). Assign them individually or in bulk.
4. **Dashboard** → your tasks, ranked by Velocity Score.

---

## 4. Everything added since the original build

This is the running list of feature rounds, for orientation if you're
coming back to this project after time away:

- **Core rebuild:** renamed GradeVelocity → CramPiler; full CRUD on tasks,
  subtasks, and courses; a Calendar tab; a redesigned dark-brown/forest-
  green UI with progressive disclosure (Hero Card → Runner-Ups → Upcoming
  Radar); the exact `V = W(1+D)/H` formula with Critical Override and
  Dynamic Late Penalty.
- **Trust & correctness pass:** course-code uniqueness (backend-enforced,
  409 on collision), a weight-sum warning banner, backend unit tests for
  the scoring engine, a bulk "Unassigned tasks" reassignment panel,
  streaks/weekly-completion stats, per-course progress rollups.
- **Polish pass:** optimistic UI updates (instant checkbox flips, instant
  delete with a 5-second Undo toast instead of a confirm dialog), a toast
  notification system, simple pop-up animations (fade/scale/slide).
- **Dark theme:** CSS-variable-backed palette swap, persisted, pre-paint
  (no flash), with a dedicated overlay color so modal backdrops don't
  invert.
- **Institution syllabus system:** 6 real grading-structure templates
  (Paired Lecture/Lab, Math, GED, Other, PATHFIT, Lab) computed from the
  institution's actual nested percentages and flattened into single
  weights; per-course custom categories (add/remove freely, e.g. "Prelim"
  for a lecture-only course); a Program → Year → Semester curriculum
  seeder.
- **Dashboard filtering:** a settings menu (gear icon next to the page
  title) to hide overdue tasks or filter by course.
- **Performance & bug fixes:** eliminated an N+1 database query (course
  lookups were happening once *per task* instead of once per request —
  this was the main cause of the Courses tab feeling slow); fixed two
  React `useEffect` dependency bugs that were silently kicking users out
  of edit mode mid-typing whenever a background poll refreshed the data
  underneath them (`TaskDrawer.jsx`, `TaskFormModal.jsx`).

---

## 5. Known issues

See `DOCUMENTATION.md` §6 for the full list found during this audit
(a stale-dropdown bug in the Unassigned panel, a latent null-pointer risk
in the course lookup map, redundant refetching on bulk-assign, and an
unused CORS-origin config property that could mislead a future deploy).
None are urgent; all are documented with a suggested fix direction rather
than patched, since this pass was scoped to documentation only.

The one **urgent** item is §0 above — that one isn't a code bug, it's an
exposed live credential, and it's already been treated as such in this
guide's ordering.

---

## 6. Troubleshooting quick reference

| Symptom | Cause | Fix |
|---|---|---|
| `command not found: mvn` | Maven not installed | `brew install maven` (Mac) |
| `Port 8080 was already in use` | Old backend instance still running | `lsof -i :8080` → `kill -9 <PID>` |
| `MongoSocketOpenException ... localhost:27017` | Using the local-Mongo fallback, not your real URI | Confirm your env var or `application-local.properties` is actually set, restart |
| `bad auth: authentication failed` | Wrong/rotated Atlas password | Reset password in Atlas → Database Access, update your config |
| `Connect timed out` to all Atlas shard servers | IP not whitelisted, VPN/firewall blocking port 27017, or cluster paused | Check Network Access, try a different network, check cluster status |
| `ECONNREFUSED` on every `/api/*` call in the Vite terminal | Backend isn't running (often because it crashed on the Atlas issue above) | Fix the backend first, then just reload the frontend |
| Courses tab loads slowly | The N+1 query bug (now fixed — confirm your `TaskController.java` has `allCoursesByCode()`) | See DOCUMENTATION.md §6 if it recurs |
| Editing a task/course reverts to view mode while typing | The `useEffect` dependency bug (now fixed — confirm `[task?.id]` in `TaskDrawer.jsx`, `[open]` in `TaskFormModal.jsx`) | See DOCUMENTATION.md §6 |
| `git push` fails with "Invalid username or token" | GitHub no longer accepts account passwords for git | Generate a Personal Access Token (Settings → Developer settings) and use it as the password |

---

## 7. Deploying beyond localhost

- **Backend:** Render/Railway/Fly.io — set `MONGODB_URI` as an environment
  variable in their dashboard, never in a committed file.
- **Frontend:** `npm run build` → deploy `frontend/dist/` to Netlify/Vercel,
  pointing `frontend/src/api.js`'s `BASE` at your deployed backend URL.
- **Before going public:** actually restrict CORS (see DOCUMENTATION.md §6,
  item 4 — right now it's wide open) and consider whether you need
  authentication, since CramPiler currently has none — anyone with the
  live URL sees and can edit the same data.
