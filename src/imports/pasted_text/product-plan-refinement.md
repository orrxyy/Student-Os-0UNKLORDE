Make another targeted refinement to the existing product plan before we build.

Do NOT rebuild the entire architecture from scratch.

I want the first semester to be pre-populated with my actual current courses, while future semesters remain ready for manual entry.

==================================================
1. PRE-POPULATE YEAR 1 — SEMESTER 1
==================================================

Set the initial academic period as:

Year 1
→ Semester 1

Pre-populate these 8 active courses:

1. IBDA1001 — Pengantar Dunia Digital — 3 SKS
2. IBDA1011 — Pengantar Algoritma dan Pemrograman — 3 SKS
3. IDIS1011A — Pemikiran dan Pembelajaran Kristen — 2 SKS
4. MATH1061 — Kalkulus I — 3 SKS
5. PHED1014 — Pendidikan Jasmani I — 1 SKS
6. PHYS1011 — Fisika I — 3 SKS
7. PHYS1011L — Lab Fisika I — 1 SKS
8. THEO1011A — Survei Teologi Reformed I (A) — 2 SKS

These should appear immediately when opening:

Academics
→ Year 1
→ Semester 1

and on the relevant dashboard sections.

Do NOT add "Moodle Class Demo" as an active course. It is only a demonstration course and should not affect GPA, academic statistics, course counts, or workload calculations.

==================================================
2. FUTURE SEMESTERS
==================================================

Keep the complete academic structure:

Year 1
- Semester 1
- Semester 2

Year 2
- Semester 1
- Semester 2

Year 3
- Semester 1
- Semester 2

Year 4
- Semester 1
- Semester 2

Only Year 1 Semester 1 should be populated initially.

All other semesters should exist as empty but functional sections.

The user must be able to add courses manually to future semesters.

Each semester should have:

+ Add Course

Each course should support:

- Course code
- Course name
- SKS / credits
- Lecturer
- Room
- Schedule
- Course description
- Grade system
- Materials
- Assignments
- Exams
- Notes
- Files
- Tasks
- Course status

==================================================
3. GRADE SYSTEM MUST BE FULLY CUSTOMIZABLE
==================================================

This is a critical requirement.

Different university courses can have completely different grading structures.

Therefore, NEVER hard-code one universal grading formula.

Every course must have its own independent Grade System.

Example:

Calculus could use:

Quiz 20%
Midterm 30%
Final 50%

while another course could use:

Assignment 20%
Quiz 15%
UTS 25%
UAS 40%

and another course could use something completely different.

The user must be able to:

- Add assessment component
- Delete assessment component
- Rename assessment component
- Change percentage / weight
- Change maximum score
- Enter score
- Mark component as bonus
- Change component order
- Add notes
- Save the grading template

==================================================
4. IMPORTANT: SUPPORT BONUS COMPONENTS
==================================================

The grading engine MUST support grading structures where the total weight can exceed 100%.

For example:

Attendance: 0%
Quiz (6x): 24%
Final Reflection: 8%
UTS: 34%
UAS: 34%
EKDM (Bonus): +1%

Total possible weight = 101%

Do NOT automatically normalize the weights back to 100%.

A component marked as "Bonus" should be treated separately from normal weighted components.

The UI should clearly distinguish:

Regular components
and
Bonus components.

For example:

Regular Weight:
100%

Potential Bonus:
+1%

Maximum Possible:
101%

The system must allow the user to configure whether bonus points are:

- added to the final score
- capped at a maximum
- simply displayed as additional points

This setting should be configurable per course.

==================================================
5. DEFAULT GRADE TEMPLATE
==================================================

The Grade System must NOT start completely empty.

Every newly created course should automatically receive a sensible editable default template.

Use a generic default template such as:

Assignments — 20%
Quizzes — 20%
Midterm / UTS — 25%
Final / UAS — 35%

Total = 100%

This is ONLY a starting template.

The user must be able to completely modify it for each course.

The existing pre-populated courses should also receive this default template initially, so every course is immediately ready for grade entry.

Do NOT assume that this template represents the actual university grading system.

It is simply the default starting configuration.

==================================================
6. GRADE CALCULATION
==================================================

The grade engine should distinguish between:

- Weight
- Maximum score
- Actual score
- Weighted contribution
- Bonus contribution
- Current score
- Projected score
- Final score

Example:

Quiz = 80/100
Weight = 20%

Contribution = 16 points.

If a component has not been completed yet, do not treat it as zero.

Instead show:

Completed:
60% of grading structure

Remaining:
40%

Current weighted score:
XX

Projected score:
XX

This prevents incomplete courses from appearing artificially low.

==================================================
7. GRADE SCALE MUST ALSO BE CUSTOMIZABLE
==================================================

Do not hard-code only one A/B/C/D/F system.

Create a configurable Grade Scale per academic system.

Example default:

A  = 4.0
A- = 3.7
B+ = 3.3
B  = 3.0
B- = 2.7
C+ = 2.3
C  = 2.0
C- = 1.7
D  = 1.0
F  = 0.0

The user must be able to edit:

- Letter grade
- Minimum score
- Maximum score
- Grade point

The system should allow a university-specific grading scale to be configured later.

==================================================
8. COURSE DASHBOARD
==================================================

Each course should have its own dashboard/detail page.

For example:

MATH1061 — Kalkulus I

Overview:
- Current grade
- Current weighted score
- Projected grade
- Credits
- Lecturer
- Schedule
- Progress

Tabs/sections:

Overview
Grades
Grade Simulator
Assignments
Exams
Materials
Notes
Files
Tasks

The same structure should work for every course.

==================================================
9. SEMESTER OVERVIEW
==================================================

Year 1 → Semester 1 should display all 8 courses.

Include:

- Course cards
- Total SKS
- Semester GPA
- Current average
- Upcoming deadlines
- Upcoming exams
- Course progress

Allow sorting/filtering by:

- Course name
- Course code
- SKS
- Current grade
- Progress
- Upcoming deadline

==================================================
10. COURSE CREATION EXPERIENCE
==================================================

When the user clicks:

+ Add Course

show a simple form:

Course Code
Course Name
SKS
Lecturer
Schedule
Room

Then automatically create:

- Course page
- Default Grade System
- Materials section
- Assignments section
- Tasks section
- Notes section
- Files section

The user should NOT need to manually configure all these sections.

==================================================
11. DASHBOARD SHOULD USE REAL INITIAL DATA
==================================================

The initial dashboard should not look like an empty generic template.

Use the actual Year 1 Semester 1 courses as mock data.

The dashboard should be able to show:

Current Semester:
Year 1 — Semester 1

Courses:
8

Total SKS:
18

and course-related widgets based on the initial course data.

Do not invent actual grades, assignments, lecturers, or schedules that the user has not provided.

Where data is not yet available, show an appropriate empty state such as:

"No grades entered yet."

"No upcoming deadline."

"No materials uploaded."

==================================================
12. PRESERVE ALL PREVIOUS REQUIREMENTS
==================================================

Keep all previous architecture decisions:

- 4-year academic hierarchy
- 8 semesters
- Academic domain
- Portfolio domain
- Certificates
- CV Inventory
- Organizations
- Volunteering
- Projects
- Achievements
- Skills
- Timeline
- Tasks
- Quick Capture
- Universal Upload
- AI classification
- AI Inbox
- Human confirmation
- Global Search
- Analytics
- Data import/export
- Supabase-ready architecture
- Shu as primary visual inspiration
- Silver Wolf as subtle secondary influence

Do not build the application yet.

Update the product plan only.

At the end, summarize the changes made and confirm that the plan is ready for the first build.