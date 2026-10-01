PHASE 2B — SEMESTER & COURSE MANAGEMENT

Phase 2A is complete and approved.

The central data architecture is now stable:
- centralized academic data
- activeSemesterId as the single source of truth
- selectors in src/lib/selectors.ts
- persistence migration
- Dashboard connected to selectors

DO NOT redo Phase 2A.

DO NOT redesign the application.

DO NOT change the existing visual identity.

DO NOT rebuild stable functionality.

The goal of this phase is to make the existing Semester and Course data manageable by the user.

==================================================
PRIMARY GOAL
==================================================

Turn the existing academic data layer into a functional semester/course management system.

The user should be able to manage:

Year → Semester → Courses

while preserving the current UI and existing functionality.

==================================================
SEMESTER STRUCTURE
==================================================

Maintain the existing academic hierarchy:

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

Year 1 Semester 1 remains the current active semester.

Do not create fake academic data for future semesters.

Future semesters should remain empty but functional.

==================================================
COURSE CRUD
==================================================

Implement functional course management.

Support:

CREATE COURSE
- course code
- course name
- credits / SKS
- year
- semester
- lecturer
- room
- schedule
- status

EDIT COURSE
- every editable course field should be updateable

DELETE COURSE
- allow deletion with an appropriate confirmation step

IMPORTANT:
Deleting a course must correctly handle related data.

Do not leave orphaned:
- assessments
- grades
- tasks
- materials
- notes
- schedule entries

Use the existing data model and relationships.

Do not create duplicate course records.

==================================================
CURRENT COURSES
==================================================

Preserve these existing Year 1 Semester 1 courses:

IBDA1001
Pengantar Dunia Digital
3 SKS

IBDA1011
Pengantar Algoritma dan Pemrograman
3 SKS

IDIS1011A
Pemikiran dan Pembelajaran Kristen
2 SKS

MATH1061
Kalkulus I
3 SKS

PHED1014
Pendidikan Jasmani I
1 SKS

PHYS1011
Fisika I
3 SKS

PHYS1011L
Lab Fisika I
1 SKS

THEO1011A
Survei Teologi Reformed I (A)
2 SKS

Total:
18 SKS

"Moodle Class Demo" remains excluded from active academic data.

==================================================
SCHEDULE MANAGEMENT
==================================================

Course schedule must remain attached to the course record.

Support schedule fields such as:

- day
- start time
- end time
- room

A course may have multiple schedule entries.

Example:

MATH1061

Tuesday
10:00–11:00

Thursday
08:00–10:00

Do not duplicate the course itself just because it has multiple class meetings.

The Calendar and Dashboard should read schedule information from the course data.

==================================================
ACADEMIC DATA INTEGRITY
==================================================

When a course is edited:

- course cards update automatically
- Dashboard data updates automatically
- schedule updates automatically
- Calendar updates automatically
- GPA calculations remain connected
- workload/SKS calculations update
- course detail pages continue to reference the same course ID

When course credits change:

All derived SKS calculations should update automatically.

When a course moves to another semester:

It must belong to the new semester everywhere.

Do not leave stale references.

==================================================
ACTIVE SEMESTER
==================================================

Keep:

activeSemesterId

as the single source of truth.

If the user changes the active semester:

- Dashboard should reflect it
- active SKS should reflect it
- active courses should reflect it
- today's classes should reflect it
- upcoming academic information should reflect it

Do not create another active semester state.

==================================================
UI / UX
==================================================

Reuse the existing Academics UI.

Do not redesign the page.

If an existing "+" button, "Add Course" action, course menu, modal, drawer, or edit interaction exists, connect it to the real data layer.

If UI is missing for a required CRUD action, add the SMALLEST possible interaction needed.

Keep the current:

- typography
- spacing
- colors
- cards
- theme system
- Shu light mode
- Silver Wolf dark mode
- animations
- responsive behavior

No visual overhaul.

==================================================
VALIDATION
==================================================

Add sensible validation:

- course code cannot be empty
- course name cannot be empty
- credits must be a valid positive number
- duplicate course IDs must not be created
- required semester must exist

For course code duplication:

Prevent duplicate course codes within the same semester unless the existing architecture explicitly supports this.

==================================================
PERSISTENCE
==================================================

Changes must persist using the existing persistence mechanism.

Refresh the application and verify that:

- newly created courses remain
- edited courses remain edited
- deleted courses remain deleted
- schedule changes remain
- active semester remains correct

Do not introduce Supabase yet.

==================================================
COMPATIBILITY
==================================================

After implementation verify:

1. Dashboard still works.
2. Academics still works.
3. Course detail still works.
4. Grade engine still works.
5. GPA calculations still work.
6. Calendar still works.
7. Materials still work.
8. Tasks still work.
9. Analytics still works.
10. Portfolio still works.
11. Theme switching still works.
12. Live clock still works.
13. activeSemesterId remains the only active-semester state.
14. selectors remain the source of derived academic data.
15. No duplicate academic data system was introduced.

==================================================
IMPORTANT IMPLEMENTATION RULE
==================================================

Inspect the current code before changing anything.

Reuse existing:
- types
- state
- selectors
- components
- modals
- forms
- persistence utilities

Do not rewrite stable code simply to make it look cleaner.

Keep the change focused on Semester and Course Management.

==================================================
FINAL REPORT
==================================================

When finished, report:

1. What course CRUD functionality was implemented.
2. What semester functionality was implemented.
3. What existing UI components were reused.
4. How schedule data is stored.
5. How persistence works.
6. How related data is handled when a course is deleted or moved.
7. What existing features were verified.
8. Any limitations or edge cases discovered.

Do NOT proceed to Phase 2C automatically.
Stop after Phase 2B.