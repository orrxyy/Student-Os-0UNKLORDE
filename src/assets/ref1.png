Continue from the existing 0UNKLORDE // STUDENT OS implementation.

Do NOT rebuild the application from scratch.
Do NOT replace the existing UI architecture.
Do NOT remove existing functionality or mock data.
Treat the current implementation as the foundation and refine it.

The current UI is already visually satisfying. This phase focuses on:
1. visual theme system,
2. Shu / Silver Wolf visual identity,
3. grade-system improvements,
4. dashboard class schedule/calendar,
5. small branding refinements.

I am attaching exactly 5 artwork references. Use ONLY these uploaded artworks for the character artwork system. Do not invent or search for additional character images.

==================================================
1. BRANDING
==================================================

Replace all remaining references to:

"Moonlit Allen"

with:

"0UNKLORDE"

The product name should consistently be:

"0UNKLORDE // STUDENT OS"

Do not change the overall branding structure or layout unnecessarily.

==================================================
2. TWO VISUAL PERSONAS / THEMES
==================================================

Create two complete visual themes.

LIGHT MODE — SHU
- Shu is the primary visual identity.
- This should feel bright, elegant, calm, academic, premium and slightly Japanese/editorial.
- Use an ivory/off-white foundation rather than pure white.
- Use muted greens, sage, warm neutrals and subtle blue accents inspired by Shu.
- Keep contrast and readability appropriate for a productivity application.
- Avoid making the interface look like an anime fan page.

DARK MODE — SILVER WOLF
- Silver Wolf is the secondary visual identity.
- This should feel dark, futuristic, cyber, slightly playful and premium.
- Use deep navy/charcoal as the foundation.
- Use violet, electric blue, lavender and subtle pink/cyan accents inspired by Silver Wolf.
- Avoid excessive neon or visual noise.

IMPORTANT:
Light/Dark mode must change the actual design system, not simply invert the background.

Update:
- background
- surfaces/cards
- borders
- typography contrast
- buttons
- hover states
- active states
- charts
- progress indicators
- badges
- navigation
- shadows/glows
- calendar colors
- interactive states

Maintain accessibility and readability.

==================================================
3. THEME SWITCHER
==================================================

Add a polished Light ↔ Dark theme switcher.

The conceptual mapping is:

☀ Shu = Light Mode
🌙 Silver Wolf = Dark Mode

Do not use a generic boring checkbox if a more polished segmented/toggle control can be created.

Theme switching should have a subtle transition:
- background transition
- surface transition
- accent transition
- artwork crossfade

Keep the animation fast and professional.

Do NOT make the entire application perform an excessive animation when switching themes.

==================================================
4. SHU / SILVER WOLF ARTWORK SYSTEM
==================================================

The uploaded 5 artworks are the ONLY artwork references for this feature.

Create an artwork area in the existing sidebar/lower-left area where the current Shu visual appears.

Behavior:

LIGHT MODE:
- Display Shu artwork.

DARK MODE:
- Display Silver Wolf artwork.

The artwork should NOT dominate the dashboard.
It should feel like part of the OS identity.

Create an automatic artwork carousel:
- automatically changes every 5 seconds
- smooth crossfade
- manual previous/next controls
- pause automatic rotation while hovering over the artwork
- resume after leaving
- do not reload the entire page when changing artwork

If the five uploaded artworks contain different characters, correctly associate them with their intended Light/Dark theme based on the uploaded references.

Do not generate or fetch additional artwork.

==================================================
5. ARTWORK / AVATAR BUTTON → OS CONTROL CENTER
==================================================

The artwork/avatar should be interactive.

Do NOT make it a normal profile button.

Clicking it should open a compact:

"OS CONTROL CENTER"

This is a quick settings panel, not a profile page.

Include:

Appearance
- Light / Shu
- Dark / Silver Wolf

Artwork
- Auto Carousel ON/OFF
- Previous / Next

Motion
- Animation ON/OFF

Focus Mode can be represented as a future/placeholder control if the existing architecture supports it, but do not build an entire Focus Mode system in this phase.

The control center should be compact and unobtrusive.

==================================================
6. GRADE SYSTEM — IMPORTANT FUNCTIONAL REFINEMENT
==================================================

The existing grade system currently assumes one score per assessment component.

Change this into a more flexible assessment-group system.

Each grading component should support either:

A. SINGLE SCORE
or
B. MULTIPLE SCORES

Examples:

SINGLE SCORE:
- UTS
- UAS
- Final Project
- Final Reflection

MULTIPLE SCORES:
- Quiz
- Homework
- Assignments
- Labs
- Practical work

When creating/editing an assessment component, allow:

Assessment:
[ component name ]

Weight:
[ XX % ]

Scoring mode:
○ Single Score
● Multiple Scores

If Multiple Scores is selected, allow the user to add multiple individual scores.

Example:

Quiz — 24%

Quiz 1    76
Quiz 2    82
Quiz 3    90
Quiz 4    75
Quiz 5    88
Quiz 6    91

Average:
83.7

The calculated result of the assessment group should then contribute to the final course grade according to its weight.

For Multiple Scores, provide a calculation method:

- Average
- Sum
- Best Score
- Weighted Average

Default to Average.

For Single Score, simply use the entered score directly.

IMPORTANT:
Do not assume every course uses the same grading structure.

Each COURSE must be able to have its own grading configuration.

The user must be able to:
- add assessment components
- delete components
- rename components
- change weights
- change Single/Multiple scoring mode
- add/remove individual scores
- change calculation method
- edit the grading scale

==================================================
7. DEFAULT CIT GRADE SCALE
==================================================

Do NOT leave the grading scale empty.

Use this as the default grade scale:

A   = 91.00–100.00
A-  = 86.00–90.99
B+  = 81.00–85.00
B   = 76.00–80.00
B-  = 71.00–75.00
C+  = 61.00–70.99
C   = 51.00–60.00
C-  = 46.00–50.99
D   = 41.00–45.00
F   = 0.00–40.99

The grade scale must remain editable.

Do not hard-code the scale in a way that prevents future customization.

==================================================
8. DASHBOARD — WEEKLY CLASS SCHEDULE
==================================================

Add a useful weekly class schedule/calendar section to the main Dashboard.

Use the existing Semester 1 course schedule data already present in the project.

Display the user's actual classes by day and time.

Semester 1 classes:

MONDAY
08:00–09:00
PHED1014 — Pendidikan Jasmani I

TUESDAY
08:00–10:00
PHYS1011 — Fisika I

10:00–11:00
MATH1061 — Kalkulus I

14:00–17:00
IBDA1001 — Pengantar Dunia Digital

18:00–20:00
THEO1011 — Survei Teologi Reformed I

WEDNESDAY
08:00–10:00
IBDA1011 — Pengantar Algoritma dan Pemrograman

13:00–15:00
IDIS1011 — Pemikiran dan Pembelajaran Kristen

THURSDAY
08:00–10:00
MATH1061 — Kalkulus I

14:00–17:00
IBDA1011L — Lab Pengantar Algoritma dan Pemrograman

FRIDAY
08:00–09:00
PHYS1011 — Fisika I

13:00–16:00
PHYS1011L — Praktikum Fisika I

IMPORTANT:
Ignore Chapel completely.
Do not display Chapel as an academic class.

The Dashboard calendar should be a compact weekly overview, not a giant Google Calendar clone.

Show:
- day
- time
- course
- room when available
- recognizable course accent/color

Provide an action such as:

"Open Full Calendar →"

which can lead to the existing/future calendar view.

The schedule should be data-driven so that changing course schedule data later updates the dashboard calendar.

==================================================
9. PRESERVE CURRENT UI QUALITY
==================================================

The current interface is already visually satisfying.

Therefore:
- preserve the existing layout where possible
- preserve existing sidebar structure
- preserve existing cards
- preserve existing typography hierarchy
- preserve existing navigation
- do not redesign unrelated pages
- do not introduce unnecessary components
- do not turn the dashboard into an anime-themed interface

The anime references should function as a sophisticated visual identity layer over a serious student productivity system.

==================================================
10. CURRENTLY OUT OF SCOPE
==================================================

Do NOT implement these fully yet:

- AI document classification
- real file upload processing
- functional global search
- functional "Add Anything"
- functional Inbox
- Supabase/backend
- authentication
- real cloud storage
- full Focus Mode implementation

Keep existing placeholders where appropriate.

==================================================
11. IMPLEMENTATION PRINCIPLE
==================================================

Before modifying anything, inspect the existing implementation and reuse its current components, data structures and styling system.

Build on top of the existing Phase 1 work.

After implementation:
1. verify the app renders successfully
2. verify Light/Dark switching works
3. verify artwork carousel works
4. verify grade calculations work
5. verify multiple-score assessments work
6. verify the CIT grade scale works
7. verify the weekly class schedule appears correctly
8. ensure there are no runtime/build errors

Do not stop at a static mockup if the existing architecture supports functional interactions.