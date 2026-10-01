PHASE 2C — CROSS-DOMAIN DATA INTEGRATION

We are now continuing development of:

0UNKLORDE // STUDENT OS

Phase 1 = UI + core functionality
Phase 2A = Central Data Architecture
Phase 2B = Semester & Course Management
Phase 2B.5 = Add Anything + theme stabilization
Phase 2B.6 = Dashboard Task List

Phase 2C is focused on CROSS-DOMAIN INTEGRATION.

IMPORTANT:
Do not redesign the UI.
Do not change the visual language.
Do not introduce a new design system.
Do not start Phase 3.
Do not replace the existing architecture unnecessarily.

The goal is to make the existing domains actually work together through a single source of truth.

==================================================
1. CORE PRINCIPLE
==================================================

The following entities must be properly connected:

Semester
Course
Assessment / Grade
Task
Material
Note

Relationship:

Semester
  ↓
Course
  ├── Assessments / Grades
  ├── Tasks
  ├── Materials
  └── Notes

Avoid duplicated records.

If a task belongs to a course, it should reference the course rather than storing a second independent copy of the course information.

If a task is created from + Add Anything, it must appear in:
- Dashboard Task List
- Tasks page
- relevant Course page if it has a course relationship

All views must read from the same underlying data.

==================================================
2. COURSE ↔ TASK
==================================================

Tasks should support:

- task id
- title
- description
- courseId (optional)
- semesterId
- due date
- priority
- type
- status
- completed
- createdAt
- updatedAt

If courseId exists:
- show course name/code on Dashboard Task List
- show course information on Tasks page
- show the task on the corresponding Course page

If courseId does not exist:
- treat it as a general/personal task
- do not force it into a course

Do NOT duplicate course data inside the task object.

Example:

{
  id: "task-001",
  title: "Finish Quiz 1",
  courseId: "IDIS1011A",
  semesterId: "Y1S1",
  dueDate: "...",
  completed: false
}

NOT:

{
  courseName: "...",
  courseCode: "...",
  ...
}

Course information must be resolved through selectors.

==================================================
3. COURSE ↔ ASSESSMENT / GRADE
==================================================

Assessments must belong to a specific course.

Support:

- assessment id
- courseId
- name
- type
- score mode
- score
- letterGrade
- weight
- maxScore
- status
- bonus
- notes

Maintain the distinction between:

numericScore

and

letterGrade

VERY IMPORTANT:

If the user enters:

"B+"

do NOT convert it into an invented numeric score.

Store:

letterGrade: "B+"

and leave numericScore empty/null.

If the user enters:

"88.73"

store the numeric score.

Example:

{
  assessmentId: "id-q1",
  courseId: "IDIS1011A",
  name: "Quiz 1",
  numericScore: 88.73,
  letterGrade: null
}

Another valid record:

{
  courseId: "IDIS1011A",
  letterGrade: "B+",
  numericScore: null
}

The existing editable grade scale may later be used when GPA or grade interpretation is required.

Do not fabricate numerical equivalents for letter grades.

==================================================
4. ADD ANYTHING → GRADE
==================================================

Extend the existing + Add Anything flow so that grade-related input can connect to existing course/assessment data.

Examples:

"Quiz 1 IDIS 88.73"

"IDIS Quiz 1 = 88.73"

Expected interpretation:

Type:
Grade

Course:
IDIS1011A

Assessment:
Quiz 1

Score:
88.73

If the assessment already exists:
→ update the existing assessment

Do NOT create a duplicate assessment.

If it does not exist:
→ create a new assessment under the correct course.

For letter grade input:

"IDIS = B+"

or

"IDIS B+"

Expected:

Course:
IDIS1011A

Letter Grade:
B+

Numeric score:
null

Do NOT invent a numerical score.

If full natural-language AI parsing is not implemented yet, keep the parsing layer modular and use the existing structured/manual flow rather than faking AI.

==================================================
5. COURSE ↔ TASK ↔ ASSESSMENT
==================================================

Introduce an optional relationship:

task.assessmentId

This allows a task to represent work related to a specific assessment.

Example:

Task:
"Finish Quiz 1"

courseId:
IDIS1011A

assessmentId:
id-q1

This relationship should be optional.

A normal personal task does not need an assessmentId.

An assignment preparation task can have both:

courseId
assessmentId

This will allow future features such as:

"Quiz 1"
→ associated task
→ associated grade

without creating duplicate entities.

==================================================
6. COURSE ↔ MATERIAL
==================================================

Materials should optionally reference:

courseId
semesterId
week

Example:

{
  id: "mat-001",
  title: "Week 4 Lecture Slides",
  courseId: "IDIS1011A",
  semesterId: "Y1S1",
  week: 4
}

Materials should appear:

- in Materials page
- under the relevant Course page
- under the correct semester

Do NOT create a separate duplicate course record inside Materials.

If courseId is missing, the material can remain unassigned.

==================================================
7. COURSE ↔ NOTES
==================================================

Notes should support optional:

courseId
semesterId
week
relatedTaskId
relatedAssessmentId

This allows notes to be attached to:

- a course
- a specific week
- a task
- an assessment

But all relationships are optional.

Do not force every note to belong to a course.

==================================================
8. TASK PAGE ↔ DASHBOARD TASK LIST
==================================================

The Dashboard Task List created in Phase 2B.6 must be derived from the same task data used by the Tasks page.

Required behavior:

Create task
→ appears in Tasks page
→ appears in Dashboard Task List

Check task
→ status changes everywhere

Uncheck task
→ status changes everywhere

Delete task
→ disappears from both Dashboard and Tasks page

Change due date
→ updates everywhere

Change priority
→ updates everywhere

Change course
→ course label updates everywhere

No duplicated Dashboard-only task state.

==================================================
9. COURSE PAGE INTEGRATION
==================================================

Course pages should now become a central hub for that course.

A Course page should be able to expose existing related data:

ACADEMICS / GRADES
- assessments
- scores
- grade status

TASKS
- tasks belonging to this course

MATERIALS
- materials belonging to this course

NOTES
- notes belonging to this course

Do not redesign the entire Course page.

Use existing components and patterns.

If some sections are not yet implemented, use existing EmptyState components rather than inventing new UI.

==================================================
10. SEMESTER INTEGRATION
==================================================

Every course-related entity should preserve semester context.

Use:

semesterId

rather than relying on the currently selected semester as hidden state.

Changing activeSemesterId must only change what is currently viewed.

It must NOT move or mutate unrelated data.

Example:

A task belonging to Y1S1 remains Y1S1 even when the user switches active semester to Y1S2.

The same applies to:

- courses
- assessments
- materials
- notes

==================================================
11. COURSE DELETE / MOVE SAFETY
==================================================

Preserve the behavior implemented in Phase 2B.

Deleting a course must correctly handle related data.

If related entities are embedded inside the course object:
→ preserve the existing atomic deletion behavior.

If relationships are reference-based:
→ remove or safely invalidate references.

Never leave broken orphan references such as:

task.courseId = deleted-course-id

without handling the relationship.

Moving a course to another semester must preserve its:

- assessments
- tasks
- materials
- notes

while updating its semester relationship consistently.

==================================================
12. SELECTORS
==================================================

Continue using the centralized selector architecture from Phase 2A.

Do NOT make individual pages independently filter raw store data if an existing selector can provide the data.

Create or extend selectors where necessary.

Examples:

selectCourseTasks(courseId)
selectCourseAssessments(courseId)
selectCourseMaterials(courseId)
selectCourseNotes(courseId)

selectSemesterTasks(semesterId)
selectSemesterMaterials(semesterId)

Selectors should derive data rather than creating duplicate state.

==================================================
13. DATA CONSISTENCY
==================================================

After implementation, verify:

A task created through + Add Anything:
→ Dashboard
→ Tasks
→ Course page

all show the same task.

A grade entered through the grade system:
→ Course page
→ Academic Progress
→ relevant grade/assessment view

all use the same assessment data.

A material assigned to a course:
→ Materials page
→ Course page

both show the same material.

A task deleted:
→ disappears everywhere.

A course deleted:
→ related references are handled safely.

==================================================
14. DASHBOARD
==================================================

Do not redesign the Dashboard.

Preserve:

- Hero artwork
- Shu / Silver Wolf theme system
- live WIB clock
- Semester Courses
- Academic Progress
- Task List
- all existing theme transitions
- artwork crossfade
- active semester logic

Only connect existing Dashboard components to centralized data where necessary.

==================================================
15. EXISTING FUNCTIONALITY MUST REMAIN WORKING
==================================================

Do not regress:

- Semester CRUD
- Course CRUD
- Course schedule builder
- active semester switching
- grade system
- customizable grading components
- bonus grading
- numeric and letter grade distinction
- Dashboard Task List
- + Add Anything
- theme switching
- Shu artwork
- Silver Wolf artwork
- live clock
- responsive layout

==================================================
16. IMPLEMENTATION DISCIPLINE
==================================================

Before changing data structures:

1. Inspect the current store/types/selectors.
2. Reuse existing structures wherever possible.
3. Only introduce new fields when necessary.
4. Avoid duplicate state.
5. Preserve migration compatibility with existing localStorage data.

If a migration is required:
→ implement it safely.

Do not reset existing user data.

==================================================
17. ACCEPTANCE TEST
==================================================

Test the following exact workflow:

TEST A — TASK

+ Add Anything
→ create:

"Finish IDIS Quiz 1"

assign course:
IDIS1011A

assign due date

Result:

Dashboard Task List shows it.

Tasks page shows it.

IDIS1011A Course page shows it.

Checking the task updates all three.

Unchecking updates all three.

Deleting removes it from all three.

--------------------------------------------------

TEST B — GRADE

Create/update:

"Quiz 1 IDIS 88.73"

Result:

Course:
IDIS1011A

Assessment:
Quiz 1

Numeric score:
88.73

No duplicate Quiz 1 should be created if it already exists.

--------------------------------------------------

TEST C — LETTER GRADE

Input:

"IDIS = B+"

Result:

Course:
IDIS1011A

Letter Grade:
B+

numericScore:
null

No invented numerical score.

--------------------------------------------------

TEST D — MATERIAL

Create a material:

"Week 4 Lecture Slides"

assign:
IDIS1011A
Week 4

Result:

Visible in Materials.

Visible in IDIS1011A Course page.

Only one underlying material record.

--------------------------------------------------

TEST E — SEMESTER

Switch active semester from Y1S1 to Y1S2.

Y1S1 data remains intact.

Y1S2 can be empty.

Switch back to Y1S1.

All existing Y1S1 data remains intact.

==================================================
18. FINAL REPORT

When finished, report:

1. Data relationships added
2. New/updated types
3. New/updated selectors
4. Store changes
5. Migration changes, if any
6. Pages/components connected
7. Tests performed
8. Any known limitations

IMPORTANT:
STOP AFTER PHASE 2C.

Do not automatically begin Phase 2D or Phase 3.