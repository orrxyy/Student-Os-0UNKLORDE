PHASE 2B.5 — UI STABILIZATION + UNIVERSAL ADD ANYTHING FOUNDATION

Phase 2B is complete and approved.

Do NOT start Phase 2C yet.

This phase has TWO focused goals:

1. Restore and establish the "+ Add Anything" universal data-entry entry point.
2. Fix the specific Dashboard theme bugs and improve theme/artwork transition smoothness.

Do NOT redesign the application.
Do NOT rewrite the Phase 2A architecture.
Do NOT rewrite the Phase 2B course management.
Do NOT introduce Supabase.
Do NOT build the full AI classification system yet.

==================================================
PART A — UNIVERSAL "+ ADD ANYTHING"
==================================================

The application previously had a planned global feature called:

"+ Add Anything"

This feature is NOT limited to file uploads.

It is intended to be the universal input point for the entire Student OS.

The user should eventually be able to add:

- grades
- assignments
- exams
- tasks
- materials
- notes
- certificates
- portfolio entries
- achievements
- organizations
- projects
- CV items
- files
- other student information

The future concept is:

+ Add Anything
        ↓
Input / upload anything
        ↓
AI understands the input
        ↓
Classify
        ↓
Extract structured data
        ↓
Show confidence / interpretation
        ↓
AI Inbox
        ↓
User confirms
        ↓
Save to the correct domain

The FULL AI implementation is NOT required in this phase.

However, the UI and data-entry foundation must be designed so that this future flow is possible.

==================================================
PART B — IMPORTANT: GRADE INPUT
==================================================

"+ Add Anything" MUST support grade entry as a first-class input type.

Do NOT make it only a file upload feature.

The user must be able to enter natural text such as:

"Quiz 1 IDIS 88.73"

or:

"IDIS Quiz 1 = 88.73"

or:

"Quiz 1 - IDIS - 88.73"

The future parser should be able to interpret this as:

Type:
Grade

Course:
IDIS1011A

Assessment:
Quiz 1

Score:
88.73

For now, if full AI parsing is not implemented, create a clean structured input foundation / placeholder that makes this intended behavior explicit.

Do not fake AI classification.

==================================================
PART C — LETTER GRADE INPUT
==================================================

The user must also be able to enter a grade WITHOUT knowing the numerical score.

Example:

"IDIS = B+"

or:

"IDIS B+"

This must be treated as a legitimate grade input.

The system must support:

Numeric grade:
88.73

AND

Letter grade:
B+

IMPORTANT:

If the user enters only:

"B+"

DO NOT automatically invent a numerical score such as 83.

Store the known letter grade as B+.

The existing editable grade scale should be used when the system needs to interpret a letter grade for GPA purposes.

The system must distinguish:

- numericScore
- letterGrade

Do not overwrite one with a fabricated value.

==================================================
PART D — DASHBOARD THEME BUGS
==================================================

There are specific theme-color bugs in the Dashboard "Semester Courses" section.

The course code badges/backgrounds are supposed to respond to the active theme.

IBDA course code already behaves correctly.

Use IBDA's working behavior as the reference implementation.

LIGHT MODE:
Course code badge should use the Light/Shu theme styling.

DARK MODE:
Course code badge should use the Dark/Silver Wolf theme styling.

CURRENT BUG #1:

These course codes are NOT switching correctly in Dark Mode:

- IDIS1011A
- PHED1014
- PHYS1011
- PHYS1011L
- THEO1011A

Their badge/background styling remains stuck in the Light theme.

Fix them so they respond dynamically to the active theme.

IMPORTANT:
Do not hardcode Dark Mode colors separately for individual courses.

Use the same theme-aware token/logic that makes IBDA work correctly.

CURRENT BUG #2:

MATH1061 is doing the opposite.

Its course code badge/background appears stuck in Dark Mode.

When switching to Light Mode, it remains visually dark.

Fix MATH1061 so it correctly responds to the active theme.

Again:

Do NOT create one-off hacks.

Find why IBDA works and why these other course badges do not.

Use a consistent theme-aware implementation.

==================================================
PART E — PRESERVE COURSE IDENTITY
==================================================

Do NOT remove the existing subject/course color identity.

The goal is:

COURSE IDENTITY
+
THEME-AWARE PRESENTATION

For example:

MATH can retain its existing indigo identity.

IBDA can retain its existing sage identity.

Other subjects can retain their existing identities.

But the actual background/badge treatment must adapt correctly between:

Shu / Light
and
Silver Wolf / Dark

Do not flatten all courses into one generic color.

==================================================
PART F — THEME TRANSITION SMOOTHNESS
==================================================

The current Light ↔ Dark theme transition feels too abrupt.

Improve the transition so it feels more polished and premium.

Use a subtle fade / crossfade approach.

The transition should smoothly animate:

- page background
- cards
- borders
- text colors
- badges
- buttons
- relevant theme tokens
- artwork

IMPORTANT:

Do NOT introduce excessive animation.

The transition should feel like a premium OS theme transition, not a flashy effect.

Keep it fast and subtle.

==================================================
PART G — HERO ARTWORK TRANSITION
==================================================

The Dashboard hero artwork currently switches immediately.

This should become a smooth crossfade.

Current mapping must remain:

LIGHT MODE:
ref4.png

DARK MODE:
ref6.png

When switching:

Light → Dark

ref4.png should fade out while ref6.png fades in.

Dark → Light

ref6.png should fade out while ref4.png fades in.

Do NOT simply apply opacity to the entire hero container in a way that causes layout flicker.

Prefer a proper layered crossfade if compatible with the current implementation:

Layer A:
current artwork

Layer B:
next artwork

Crossfade opacity.

Preserve:

- hero dimensions
- overlay
- text
- layout
- artwork positioning
- responsive behavior

The artwork should NOT jump, resize, or flash during the transition.

==================================================
PART H — ARTWORK CAROUSEL COMPATIBILITY
==================================================

Do not break the existing artwork carousel behavior.

The existing artwork system includes:

- automatic carousel
- manual previous/next
- hover pause
- resume behavior

Theme switching must remain compatible with it.

If the current architecture already separates:

theme
and
artwork carousel state

preserve that separation.

Do not rebuild the entire artwork system.

==================================================
PART I — ACCESSIBILITY / CONTRAST
==================================================

After fixing the theme transitions, verify:

Light Mode:
- course badges readable
- course codes readable
- hero text readable

Dark Mode:
- course badges readable
- course codes readable
- hero text readable
- Active Semester readable
- 18 SKS readable

Do not sacrifice readability for the transition effect.

==================================================
PART J — NO VISUAL REDESIGN
==================================================

The current UI is APPROVED.

Do NOT:

- redesign Dashboard
- change card layouts
- change typography
- change spacing
- change navigation
- change sidebar
- change course card structure
- change existing subject identities
- change Shu visual identity
- change Silver Wolf visual identity

Only fix the identified issues and restore the missing Add Anything entry point.

==================================================
PART K — VERIFICATION
==================================================

Verify:

ADD ANYTHING:
1. Entry point is visible.
2. It is accessible from the intended global location.
3. It supports the concept of adding more than files.
4. Grade is explicitly supported as an input type.
5. Numeric grade input is supported conceptually.
6. Letter grade input is supported conceptually.
7. Letter grades do not get fabricated numerical scores.
8. Future AI parsing can be connected without redesigning the flow.

THEME:
9. IBDA still works.
10. IDIS switches correctly.
11. PHED switches correctly.
12. PHYS1011 switches correctly.
13. PHYS1011L switches correctly.
14. THEO1011A switches correctly.
15. MATH switches correctly.
16. Light → Dark transition is smooth.
17. Dark → Light transition is smooth.
18. Hero artwork crossfades.
19. Light hero uses ref4.png.
20. Dark hero uses ref6.png.
21. No layout jump occurs.
22. Existing artwork carousel still works.
23. Existing live WIB clock still works.
24. Existing grade engine still works.
25. Existing Phase 2A/2B functionality still works.

Build must remain clean.

Stop after this phase.

Do NOT start Phase 2C automatically.