PHASE 2A — CENTRAL DATA ARCHITECTURE

The UI and existing functionality are now considered STABLE and APPROVED.

Do NOT redesign the UI.
Do NOT change the visual style.
Do NOT rebuild existing pages.
Do NOT modify the current grading UI unless absolutely necessary for data integration.

Your job in this phase is to establish a clean central data architecture underneath the existing UI.

IMPORTANT:
The current UI already works and should remain visually identical.

GOAL

Make the application data-driven instead of relying on scattered hardcoded values.

Create a single source of truth for the application's academic data.

ARCHITECTURE

Use a clean centralized state/data layer suitable for future Supabase integration.

The structure should conceptually support:

App
├── Academic
│   ├── Years
│   │   ├── Semester
│   │   │   ├── Courses
│   │   │   │   ├── Assessments
│   │   │   │   ├── Materials
│   │   │   │   ├── Tasks
│   │   │   │   └── Notes
│   │
├── Tasks
├── Materials
├── Portfolio
├── Certificates
├── CV Inventory
├── Timeline
└── Settings

ACADEMIC HIERARCHY

Support:

Year 1
  Semester 1
  Semester 2

Year 2
  Semester 1
  Semester 2

Year 3
  Semester 1
  Semester 2

Year 4
  Semester 1
  Semester 2

Only Year 1 Semester 1 currently contains real course data.

All future semesters should exist structurally but remain empty.

CURRENT ACTIVE SEMESTER

Year 1 — Semester 1

Courses:

1.
Code: IBDA1001
Name: Pengantar Dunia Digital
Credits: 3

2.
Code: IBDA1011
Name: Pengantar Algoritma dan Pemrograman
Credits: 3

3.
Code: IDIS1011A
Name: Pemikiran dan Pembelajaran Kristen
Credits: 2

4.
Code: MATH1061
Name: Kalkulus I
Credits: 3

5.
Code: PHED1014
Name: Pendidikan Jasmani I
Credits: 1

6.
Code: PHYS1011
Name: Fisika I
Credits: 3

7.
Code: PHYS1011L
Name: Lab Fisika I
Credits: 1

8.
Code: THEO1011A
Name: Survei Teologi Reformed I (A)
Credits: 2

TOTAL ACTIVE CREDITS = 18 SKS

IMPORTANT:

"Moodle Class Demo" is NOT an active course.

It must NOT contribute to:
- active course count
- SKS
- GPA
- workload
- academic statistics

SCHEDULE DATA

Preserve the existing class schedule and connect it to the corresponding course records.

Monday
08:00–09:00
PHED1014

Tuesday
08:00–10:00
PHYS1011

Tuesday
10:00–11:00
MATH1061

Tuesday
14:00–17:00
IBDA1001

Tuesday
18:00–20:00
THEO1011A

Wednesday
08:00–10:00
IBDA1011

Wednesday
13:00–15:00
IDIS1011A

Thursday
08:00–10:00
MATH1061

Thursday
14:00–17:00
IBDA1011L

Friday
08:00–09:00
PHYS1011

Friday
13:00–16:00
PHYS1011L

Do NOT add Chapel to the academic schedule.

DATA MODEL

Each course should have a stable unique ID.

Conceptually:

Course:
- id
- code
- name
- credits
- year
- semester
- lecturer
- room
- schedule
- gradingConfig
- assessments
- materials
- tasks
- notes
- status

Do not duplicate course information in multiple places.

If the Dashboard, Academics, Calendar, Analytics, or Course Detail pages need course information, they should read from the centralized course data.

SEMESTER DATA

Each semester should contain:

- id
- year
- semesterNumber
- courses
- status

The active semester should be derivable from application state instead of hardcoded separately on every page.

GLOBAL ACADEMIC DERIVED DATA

Create derived selectors/helpers for:

- active semester
- active courses
- active credits
- course count
- semester credits
- semester GPA
- cumulative GPA
- today's classes
- upcoming academic deadlines

Do not duplicate calculations across components.

GRADING INTEGRATION

The existing grading engine is already approved.

Do NOT redesign it.

Instead, make its data accessible through the central course model.

The following should remain supported:

- custom grading components
- component weights
- single score
- multiple scores
- average
- sum
- best score
- weighted average
- bonus components
- incomplete assessments
- editable grade scale
- weighted grade calculation
- letter grade calculation

Existing grading behavior must remain unchanged.

DATA PERSISTENCE

For this phase, use the application's existing client-side persistence/state mechanism if one already exists.

Do NOT introduce Supabase yet.

However, structure the data so it can later be migrated to Supabase without redesigning the application's domain model.

BACKWARD COMPATIBILITY

Existing pages and features must continue working.

After introducing the central data layer:

- Dashboard should still look identical.
- Academics should still look identical.
- Course pages should still look identical.
- Grades should still work.
- Analytics should still work.
- Materials should still work.
- Tasks should still work.
- Portfolio should still work.
- Theme system should still work.
- Live clock should still work.

Do not make visual changes.

IMPLEMENTATION RULES

1. Inspect the existing implementation first.
2. Reuse existing types and utilities where possible.
3. Do not create duplicate parallel data systems.
4. Do not rewrite stable components unnecessarily.
5. Do not change the current visual design.
6. Do not add placeholder UI just to demonstrate the architecture.
7. Keep the architecture modular and readable.
8. Avoid unnecessary dependencies.
9. Preserve existing routes.
10. Preserve existing functionality.

VERIFICATION

After implementation verify:

1. Active semester = Year 1 Semester 1.
2. Active course count = 8.
3. Active credits = 18 SKS.
4. Moodle Class Demo is excluded.
5. Schedule data matches the provided schedule.
6. Chapel is excluded.
7. Existing grade calculations still work.
8. Existing course pages still render.
9. Dashboard still renders.
10. Analytics still renders.
11. Tasks still render.
12. Materials still render.
13. Portfolio still renders.
14. Theme switching still works.
15. Live clock still works.
16. No visual redesign occurred.
17. No duplicate academic data source remains.

This is an ARCHITECTURE PHASE.

Do not move on to Supabase, authentication, AI ingestion, or major new features yet.

Finish by reporting:
- what central data structures were created
- what existing pages were connected
- what calculations/selectors were centralized
- any compatibility issues found