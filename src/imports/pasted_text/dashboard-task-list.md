PHASE 2B.6 — DASHBOARD TASK LIST

Phase 2A, Phase 2B, and the previous stabilization pass are complete and approved.

Do NOT start Phase 2C yet.

The "+ Add Anything" system can now create Tasks, but newly created tasks currently do not have a clear visible destination on the Dashboard.

This phase adds a small Dashboard task surface.

DO NOT redesign the Dashboard.

==================================================
GOAL
==================================================

Add a compact "Tasks" section to the Dashboard.

Place it BELOW the existing "Academic Progress" section.

The area below Academic Progress currently has available space, so use that space rather than restructuring the existing Dashboard.

The new section should make Tasks created through "+ Add Anything" immediately visible.

==================================================
TASK DATA
==================================================

The Dashboard must read Tasks from the existing centralized task data/state.

DO NOT create a separate Dashboard-only task list.

A task created through "+ Add Anything" must automatically appear here.

A task created elsewhere in the application must also appear here.

There must be ONE source of truth for Tasks.

==================================================
TASK INFORMATION
==================================================

Each Dashboard task item should show:

1. Task title
2. Related course/code if available
3. Deadline / due date
4. Completion status

Optional small metadata may include:

- priority
- task type

Do not overcrowd the Dashboard.

Example:

Quiz 2 — Kalkulus I
MATH1061 · Quiz
Due Sep 25

==================================================
TASK COMPLETION
==================================================

Each task must have a checkbox.

Unchecked:

☐ Task

Checked:

☑ Task

IMPORTANT:

Checking a task MUST NOT immediately remove it from the Dashboard.

Instead:

- keep the task visible
- mark it as completed
- apply subtle completed styling
- show completed status
- preserve the task data

The user must be able to uncheck it again.

Do NOT automatically filter completed tasks out immediately after checking.

==================================================
DELETE
==================================================

Provide a delete action for each task.

Delete should NOT be triggered accidentally by checking the checkbox.

Use an appropriate existing interaction pattern.

If the current application already has a confirmation modal for destructive actions, reuse it.

After deletion:

- remove the task from the centralized task data
- Dashboard updates automatically
- Tasks page updates automatically
- do not leave stale task references

==================================================
SORTING
==================================================

For the Dashboard, prioritize:

1. incomplete tasks
2. nearest deadline first

Completed tasks should remain visible but appear after active tasks.

If no tasks exist:

Show a clean empty state such as:

"No tasks yet"

with a subtle hint:

"Add a task from + Add Anything."

Do not make the empty state oversized.

==================================================
OVERDUE TASKS
==================================================

If a task is incomplete and its due date has passed:

show a subtle "Overdue" indicator.

Do not use excessive red styling.

The task should remain in the list until completed or deleted.

==================================================
TASK COUNT
==================================================

The Tasks section header may optionally show:

Tasks · 3 open

or another compact count.

The count should represent incomplete tasks.

Do not count completed tasks as open tasks.

==================================================
VIEW ALL
==================================================

If the existing Tasks page/route exists, add:

"View All →"

to the Tasks section header.

It should navigate to the existing Tasks page.

Do not create a duplicate Tasks page.

==================================================
VISUAL DESIGN
==================================================

Match the existing Dashboard exactly.

Use the existing:

- Card
- typography
- spacing
- badges
- buttons
- icons
- theme tokens
- light/dark theme system

Do NOT redesign the Dashboard.

The new section must work in:

- Shu / Light Mode
- Silver Wolf / Dark Mode

Do not introduce new colors outside the existing design system.

==================================================
RESPONSIVE BEHAVIOR
==================================================

The task section should remain usable on smaller screens.

Do not allow long task titles or course names to break the layout.

==================================================
INTEGRATION TEST
==================================================

Test this exact flow:

1. Open Dashboard.
2. Open "+ Add Anything".
3. Create a Task.
4. Save it.
5. Return to Dashboard.
6. Task appears in Tasks section.
7. Deadline is displayed.
8. Course is displayed if provided.
9. Click checkbox.
10. Task remains visible.
11. Task changes to completed state.
12. Click checkbox again.
13. Task becomes incomplete.
14. Delete the task.
15. Task disappears.
16. Open Tasks page.
17. Confirm the same task state is reflected there.

IMPORTANT:

Dashboard Tasks and Tasks page must use the same underlying task data.

Do NOT create duplicated task state.

==================================================
PRESERVE EXISTING FEATURES
==================================================

Verify:

- Dashboard hero
- live WIB clock
- Semester Courses
- Academic Progress
- theme switching
- hero artwork crossfade
- course grade system
- Add Anything
- course CRUD
- semester management

continue working.

Build must remain clean.

==================================================
STOP CONDITION
==================================================

This is ONLY the Dashboard Task List phase.

Do NOT start Phase 2C automatically.

After implementation, report:

- where the Task section was added
- how Tasks are sourced
- how completion works
- how deletion works
- how Add Anything-created tasks appear
- whether Tasks page and Dashboard share the same data
- any remaining issues