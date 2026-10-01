# 0UNKLORDE // STUDENT OS — Product & Implementation Plan

## Context

The user is a university student who wants a single long-term web application to run their entire
academic + portfolio life across all 4 years of college. It must combine academic management
(years → semesters → courses → grades/materials/assignments), a portfolio system (orgs,
projects, achievements, certificates, skills), a universal "+ ADD ANYTHING" upload with
AI-assisted classification and a human-confirmation review inbox, global search, analytics,
and a personal timeline. The attached `.md` explicitly asks for a **serious, scalable product
plan first — no application code yet.** Two character references set the visual direction:
**Shu** (Arknights: indigo/gold/warm-ivory, Japanese ink-wash editorial, calm and premium) as
the primary identity, and **Silver Wolf** (Honkai: Star Rail: cyber glitch, pastel cube accents)
as a *subtle secondary* influence on interactive elements only.

The intended outcome is a real, functional web app over time — not a static mockup — so the
architecture is designed for a Supabase backend even though the first build ships a polished
frontend on mock data. This document is the deliverable of this turn; it maps 1:1 to the 22
outputs the spec requested.

Stack (from AGENTS.md): React 19 + Vite + Tailwind CSS v4, tokens in `src/index.css`, no config
file. Charts via Recharts. Routing via react-router. State via React Query-style local store or
Zustand (see §17). Backend deferred to Supabase.

---

## 1. Product overview

A "Student Operating System": one connected product, not a bundle of pages. Two data domains —
**Academic** and **Portfolio** — that are linked (a course project can surface in the portfolio;
a certificate can attach to a course *and* an org) but never mixed. Every long-lived interaction
funnels through two verbs: **Add anything** (upload → AI classify → confirm) and **Find anything**
(global search). Designed to accrete data for 4 years without reorganization.

## 2. Information architecture

- **Academic domain**: Year (1–4) → Semester (1–2) → Course → {Grades, Assignments, Exams,
  Materials, Notes, Files}. Cumulative + semester GPA roll up this tree.
- **Portfolio domain**: flat, tag/category-driven collection (Orgs, Committees, Volunteering,
  Projects, Competitions, Achievements, Certifications, Skills), each CV-taggable.
- **Cross-cutting systems**: Universal Upload + AI Inbox, Global Search, Timeline, Analytics,
  Certificate Vault, CV Inventory, Settings (grading scales, themes).
- **Linking layer**: any file/certificate/skill can relate to entities in either domain via a
  join table, so the domains stay separate but connected.

## 3. Page / route structure

```
/                     Dashboard ("What do I need to know today?")
/academics            Year/Semester overview (progress, GPA per period)
/academics/:year/:sem Semester view (course cards, total SKS, semester GPA, sort/filter, + Add Course)
/course/:id           Course detail — tabs: Overview, Grades, Grade Simulator, Assignments,
                      Exams, Materials, Notes, Files, Tasks
/materials            Lecture Material Archive (tree: year→sem→course→week→material)
/portfolio            Portfolio grid/list (filter by category, CV-ready)
/portfolio/:id        Portfolio entry detail
/certificates         Certificate Vault (searchable/filterable)
/cv                   CV Inventory (everything marked "Include in CV")
/timeline             Personal academic journey
/analytics            Charts (GPA trend, distribution, workload, portfolio growth)
/inbox                AI Inbox (pending uploads needing confirmation)
/search?q=            Global search results
/settings             Grading scales, grade-point maps, theme (Shu / Silver Wolf / Minimal)
```

## 4. Navigation structure

- **Persistent left sidebar** (collapsible, smooth transition): Dashboard, Academics, Materials,
  Portfolio, Certificates, CV Inventory, Timeline, Analytics — grouped as ACADEMIC / PORTFOLIO /
  INSIGHTS.
- **Top bar**: global search field (⌘K command palette), AI Inbox badge (pending count),
  the **+ ADD ANYTHING** primary button, profile/identity card (Shu artwork), theme switch.
- **Breadcrumbs** inside the academic tree for deep navigation.

## 5. Database entities

`User`, `AcademicYear`, `Semester`, `Course`, `GradeComponent`, `GradeEntry`, `Assignment`,
`Exam`, `Material` (with `week`/`topic`), `Note`, `FileAsset`, `PortfolioEntry`, `Certificate`,
`Skill`, `Organization`, `Achievement`, `TimelineEvent`, `Upload` (AI inbox item with
`status`, `confidence`, `extracted` JSON), `GradingScale` + `GradePoint`, `EntityLink` (polymorphic
join), `Theme`/settings. Every record carries `createdAt`, `updatedAt`, `userId`.

## 6. Relationships between entities

- Year 1—* Semester 1—* Course 1—* {GradeComponent, Assignment, Exam, Material, Note, FileAsset}.
- GradeComponent 1—* GradeEntry; Course *—1 GradingScale.
- PortfolioEntry *—* Skill; PortfolioEntry *—* Certificate; PortfolioEntry *—1 Organization.
- **EntityLink** (polymorphic: `sourceType/sourceId` ↔ `targetType/targetId`) connects across
  domains: certificate↔course, project(portfolio)↔course, file↔any. This is what keeps academic
  and portfolio "connected but not mixed."
- TimelineEvent references any entity (type+id) to render a unified journey.
- Upload → on confirm, spawns the appropriate typed record(s) + optional TimelineEvent + links.

## 7. Upload & AI classification workflow

`+ ADD ANYTHING` → file(s) staged as `Upload(status=analyzing)` → (mocked now) classifier returns
`{type, extracted fields, confidence, suggested links}` → item lands in **AI Inbox**
(`status=needs_review`) → user sees a review card (Type, Course, Assessment, Score, Confidence %)
with **[Confirm] [Edit] [Discard]** → on confirm, a typed record is written and the raw file kept
as a `FileAsset`. AI never writes academic data silently; confirmation is mandatory. Architecture
leaves a clean seam (`classifyUpload(file): Promise<Classification>`) to swap the mock for a real
model/edge function later. Same flow serves grades, certificates, and materials.

## 8. Academic data model

**Fixed structure, selectively seeded.** All 4 years × 2 semesters always exist as functional
sections; only **Year 1 · Semester 1** ships pre-populated (see §8a). Every other semester renders
an empty state with a **+ Add Course** action.

`Course` fields: `code`, `name`, `sks` (credits), `lecturer`, `room`, `schedule`, `description`,
`status` (active/completed/planned), plus owned collections: `GradeComponent[]`, `Assignment[]`,
`Exam[]`, `Material[]`, `Note[]`, `FileAsset[]`, `Task[]`. Grading is **per-course and fully
customizable** — never one universal formula (see §10). Semester GPA = credit-weighted mean of
course final grade-points; cumulative GPA = credit-weighted across semesters. Grade-point mapping
lives in a configurable `GradingScale`/`GradePoint` (see §10) editable in Settings.

The **"Moodle Class Demo"** is explicitly excluded — it is never seeded and must not count toward
GPA, course counts, SKS totals, or workload.

## 8a. Seed data — Year 1 · Semester 1 (real, user-provided)

Eight active courses seeded verbatim (only code / name / SKS are known — do **not** invent grades,
lecturers, schedules, or deadlines; those fields render empty states until entered):

| # | Code | Name | SKS |
|---|------|------|-----|
| 1 | IBDA1001 | Pengantar Dunia Digital | 3 |
| 2 | IBDA1011 | Pengantar Algoritma dan Pemrograman | 3 |
| 3 | IDIS1011A | Pemikiran dan Pembelajaran Kristen | 2 |
| 4 | MATH1061 | Kalkulus I | 3 |
| 5 | PHED1014 | Pendidikan Jasmani I | 1 |
| 6 | PHYS1011 | Fisika I | 3 |
| 7 | PHYS1011L | Lab Fisika I | 1 |
| 8 | THEO1011A | Survei Teologi Reformed I (A) | 2 |

**Total = 8 courses · 18 SKS.** Each seeded course auto-receives the default grade template (§10)
and empty Materials/Assignments/Tasks/Notes/Files sections, so it is immediately ready for entry.

## 9. Portfolio data model

`PortfolioEntry`: title, category, date, organization, role, description, skills[], evidence
files[], relatedCertificates[], relatedProjects[], `cvReady` boolean. Certificates and skills are
first-class entities reused across entries; `cvReady` items feed the CV Inventory.

## 10. Grade calculation architecture (fully customizable, bonus-aware)

**Per-course, never universal.** Each `Course` owns its own editable grade template. A
`GradeComponent` = `{ id, name, weight, maxScore, score|null, isBonus, order, notes }`. The user can
add / delete / rename components, change weight & max score, enter scores, mark a component **bonus**,
reorder, add notes, and save the template. Weights are **never auto-normalized** — regular weight may
sum to 100% while bonus adds on top (e.g. regular 100% + `EKDM (Bonus) +1%` → max possible 101%).
Per-course `bonusMode`: `add` (added to final) | `cap` (capped at a max) | `display` (shown as extra
points only).

**Default template** (applied to every new *and* seeded course, fully editable, not the real
university scheme): Assignments 20% · Quizzes 20% · Midterm/UTS 25% · Final/UAS 35% = 100%.

**Configurable grade scale** — `GradingScale`/`GradePoint` `{ letter, minScore, maxScore, point }`,
default A=4.0, A-=3.7, B+=3.3, B=3.0, B-=2.7, C+=2.3, C=2.0, C-=1.7, D=1.0, F=0.0; every field
editable in Settings.

Pure functions in `src/lib/grades.ts` distinguish weight / maxScore / actual score / weighted
contribution / bonus contribution / current / projected / final: `contribution(comp)` (score/max ×
weight), `completedWeight(course)` / `remainingWeight(course)`, `currentWeightedScore(course)`
(**normalized over completed weight only — incomplete components are NOT treated as zero**),
`projectedFinal(course, assumptions)`, `bonusContribution(course)`, `letterGrade(score, scale)`,
`semesterGPA(courses, scale)`, `cumulativeGPA(semesters, scale)`. UI surfaces "Completed 60% /
Remaining 40%", Regular Weight, Potential Bonus, Maximum Possible. The **Grade Simulator** feeds
hypothetical scores into the same pure functions (no mutation) so "if I get 80 on the final…"
recomputes live.

## 11. Search architecture

Global index built client-side over all entities (title/body/tags/extracted text) with a
normalized `SearchDoc {id, type, title, snippet, route, keywords}`. First build: in-memory fuzzy
match (Fuse.js). Results grouped by entity type and deep-link to the owning route. Seam left for a
server-side full-text index (Supabase `tsvector` / pgvector for semantic) later.

## 12. Dashboard structure

Answer "What do I need to know today?" using **real seed data, not a generic empty template**:
header shows **Current Semester: Year 1 — Semester 1**, **Courses: 8**, **Total SKS: 18**, plus the
8 course widgets. Cards: Today's/Upcoming classes, Upcoming deadlines, Current & Semester GPA tiles,
Academic progress bar (years completed), Recent grades, Recent achievements, Portfolio growth
mini-stat, Recent uploads, AI Inbox summary, Weekly workload chart, Quick upload. Where user data
does not exist yet, show honest empty states ("No grades entered yet.", "No upcoming deadline.",
"No materials uploaded.") rather than invented grades/lecturers/schedules. Modular card grid so
cards can be added over 4 years without redesign.

## 12a. Course creation experience

**+ Add Course** (per semester) opens a short form: Course Code, Course Name, SKS, Lecturer,
Schedule, Room. On submit it auto-provisions the course page, the default grade template (§10), and
empty Materials / Assignments / Tasks / Notes / Files / Exams sections — no manual per-section setup.

## 13. Component system

- **Primitives**: Button, IconButton, Card, StatTile, Badge, Tabs, Modal/Drawer, Toast,
  Progress, Input/Select, Table, EmptyState, Skeleton — bespoke (no design-system kit installed).
- **Composed**: SidebarNav, TopBar, CommandPalette, UploadDropzone, AIInboxCard, GradeTable,
  GradeSimulatorPanel, CourseCard, MaterialTree, PortfolioCard, CertificateCard, TimelineRail,
  ChartCard (Recharts wrappers), IdentityCard (Shu artwork).
- Organized under `src/components/{ui,layout,academic,portfolio,upload,charts}`; data + logic in
  `src/lib`, mock data in `src/data`, types in `src/types`.

## 14. Interaction system

Subtle, polished motion: card hover-elevation, button press states, sidebar collapse transition,
progress fill animations, chart hover tooltips, upload "analyzing" shimmer → confidence reveal,
modal/drawer slide+fade, toast stack, loading skeletons, and considered empty/error/success
states. Silver Wolf influence appears only here — a faint pixel/glitch accent on focus rings,
cube motifs on loaders — never on content surfaces.

## 15. Design system (visual direction)

- **Base**: warm ivory / off-white; **Dark**: charcoal. **Primary**: muted sage/olive/lime.
  **Secondary**: deep navy/indigo (Shu). **Accent**: subtle blue/purple (used sparingly).
  Avoid neon. Tokens as CSS custom properties in `src/index.css` (Tailwind v4 `@theme`).
- **Typography**: editorial pairing — a refined serif/display for headings (Japanese-editorial
  feel) + a clean grotesque sans for UI/data. Wire via Google Fonts `@import` at top of
  `src/index.css`.
- **Motifs**: generous whitespace, thin rules, gold hairline accents, ink-wash hero imagery,
  restrained grid. Shu art used as hero/identity/decorative background — never blocking usability.
- **Theme system**: Shu / Silver Wolf / Minimal swap token values only; data unchanged.

## 16. Responsive strategy

Desktop-first dense dashboard that reflows: sidebar → bottom/hamburger nav on mobile; multi-column
card grids collapse to single column; GradeTable → stacked cards or horizontal scroll on narrow
screens; MaterialTree stays accordion. Sizing in `rem`/`clamp()`; layouts flex/grid `auto-fit`.

## 17. Backend architecture (deferred)

Target **Supabase**: Postgres (entities in §5), Auth (email/OAuth), Storage (uploaded files),
optional Edge Function for real AI classification, pgvector for semantic search. First build codes
against a typed data layer (`src/lib/api.ts`) returning promises from mock data, so swapping in the
Supabase client later touches one module. No backend implemented this phase.

## 18. MVP scope (first build)

Frontend on mock data: app shell (sidebar + topbar + routing + theme), Dashboard, Academics
tree + Course detail with working GradeTable and GPA calc, Grade Simulator, Materials archive
(tree browse), Portfolio grid + detail, Certificate Vault, CV Inventory toggles, Timeline,
Analytics (GPA trend, distribution, workload, portfolio growth), Global search, and the
**+ ADD ANYTHING → AI Inbox (mock classifier) → confirm** flow. Fully interactive, real
calculations, seeded realistic data (Calculus, Algorithms & Programming, Blood Donation Committee).

## 19. Phase 2 features

Real Supabase persistence + auth + file storage; real AI classification edge function; document
preview; server-side/full-text search; richer analytics; notifications/reminders for deadlines.

## 20. Phase 3 / future features

AI document analysis (auto summaries, key concepts, extracted formulas, predicted exam topics),
semantic search (pgvector), one-click CV generation from CV Inventory, additional themes,
collaboration/export, mobile app wrapper.

## 21. Risks & technical challenges

- AI classification accuracy → mitigated by mandatory human-confirm inbox (never silent writes).
- Scale to thousands of files → virtualized lists, indexed search, lazy loading, pagination.
- Configurable grading correctness → isolate in pure, unit-testable `grades.ts`.
- Data-model rigidity over 4 years → polymorphic `EntityLink` + additive schema.
- Theme swap breaking data → themes are token-only, verified by keeping one data source.
- Keeping domains "connected but not mixed" → strict domain separation + explicit link layer.

## 22. Recommended implementation order

1. Tokens, fonts, theme scaffolding in `src/index.css`; base UI primitives.
2. App shell: routing, SidebarNav, TopBar, layout, theme switch.
3. Types (`src/types`) + mock data (`src/data`) + data layer (`src/lib/api.ts`).
4. Academic tree → Course detail → GradeTable → `grades.ts` calc → Grade Simulator.
5. Dashboard cards wired to the data layer.
6. Materials archive, Portfolio, Certificate Vault, CV Inventory.
7. Upload → AI Inbox (mock classifier) → confirm pipeline.
8. Global search + command palette.
9. Timeline + Analytics charts.
10. Responsive pass + interaction/motion polish + empty/loading/error states.

## Verification (for the eventual build)

- `grades.ts` pure functions checked against the spec example (Calculus weights → current
  weighted score, projected final, letter, semester/cumulative GPA).
- Manual walkthrough of the `+ ADD ANYTHING` flow: upload → inbox → confirm creates the right
  typed record and shows in the owning page + timeline.
- Search "derivative" returns cross-entity results deep-linking correctly.
- Responsive check at mobile/tablet/desktop; theme switch preserves data.
- Vite dev server (already running on `$PORT`) renders each route without console errors.
