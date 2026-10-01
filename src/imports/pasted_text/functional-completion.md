The previous build only partially implemented the requested changes.

DO NOT redesign the current UI.
DO NOT rebuild the application.
DO NOT change the existing visual direction.
DO NOT work on Analytics or unrelated pages.

This turn is specifically a FUNCTIONAL COMPLETION pass.

Several requirements from the previous request were not implemented. Please inspect the current codebase and implement ONLY the following missing items.

==================================================
1. BRAND NAME — MUST FIX
==================================================

Replace every remaining visible instance of:

"Moonlit Allen"

with:

"0UNKLORDE"

The visible application branding must consistently say:

0UNKLORDE // STUDENT OS

Search the entire codebase for "Moonlit Allen" and replace all user-facing occurrences.

==================================================
2. LIGHT / DARK THEME SWITCHER — MUST EXIST
==================================================

There is currently NO visible theme switcher.

Add a clearly visible but elegant Light/Dark theme control.

Theme mapping:

☀ LIGHT = SHU
🌙 DARK = SILVER WOLF

The switcher must actually work.

When switching:
- Light mode uses the existing Shu-inspired palette.
- Dark mode uses the Silver Wolf-inspired palette.
- Backgrounds change.
- Cards/surfaces change.
- Borders change.
- Accent colors change.
- Buttons and interactive states change.
- Charts/components should respect the active theme.

Do NOT merely add a decorative button.

The selected theme must persist during navigation.

Place the switcher somewhere intuitive, preferably in the existing TopBar or OS Control Center.

==================================================
3. SHU / SILVER WOLF ARTWORK CONTROL
==================================================

The current artwork in the sidebar should become an interactive control.

Clicking the artwork must open a compact:

"OS CONTROL CENTER"

Do NOT make this a profile page.

The control center should contain:

Appearance
- Shu / Light
- Silver Wolf / Dark

Artwork
- Auto Carousel ON/OFF
- Previous
- Next

Motion
- Animation ON/OFF

The panel can be a popover/dropdown rather than a full page.

It must actually be clickable and functional.

==================================================
4. ARTWORK CAROUSEL — MUST WORK
==================================================

Use ONLY the 5 artwork assets already uploaded to the project.

Do not generate or fetch additional images.

Implement:

- automatic artwork rotation every 5 seconds
- smooth crossfade
- previous button
- next button
- pause on hover
- resume after hover
- Auto Carousel ON/OFF control

Light mode should prioritize Shu artwork.

Dark mode should prioritize Silver Wolf artwork.

If the current asset metadata/reference names are available, reuse them rather than importing duplicate files.

Do not reload the application when changing artwork.

==================================================
5. DASHBOARD WEEKLY CLASS CALENDAR — MUST EXIST
==================================================

The previous implementation did NOT add the requested dashboard calendar.

Add a compact weekly class schedule to the main Dashboard.

Use the existing course data, but make sure the following Semester 1 schedule is represented:

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
Do NOT include Chapel.
Chapel is not part of the academic schedule.

The dashboard calendar should be a compact "This Week" widget.

It should show:
- day
- time
- course code
- course name
- room if available

It should be data-driven from the course/schedule data rather than hardcoded only inside the UI.

Add:

"Open Full Calendar →"

as a navigation action if a calendar page already exists.

==================================================
6. GRADE SYSTEM — VERIFY AND FINISH
==================================================

The grade system must support MULTIPLE SCORES inside one assessment component.

Example:

Quiz — 24%

Quiz 1   76
Quiz 2   82
Quiz 3   90
Quiz 4   75
Quiz 5   88
Quiz 6   91

Average = 83.7

The user must be able to add/remove individual scores.

Each assessment component must support:

Single Score
OR
Multiple Scores

Single Score examples:
- UTS
- UAS
- Final Project

Multiple Score examples:
- Quiz
- Homework
- Assignment
- Lab

For Multiple Scores provide:

Calculation:
- Average
- Sum
- Best Score
- Weighted Average

Default = Average.

Each COURSE must have its own editable grading configuration.

The user must be able to:
- add component
- remove component
- rename component
- change weight
- change scoring mode
- add/remove scores
- change calculation method
- edit grade scale

==================================================
7. DEFAULT CIT GRADE SCALE
==================================================

Use this default grade scale:

A   91.00–100.00
A-  86.00–90.99
B+  81.00–85.00
B   76.00–80.00
B-  71.00–75.00
C+  61.00–70.99
C   51.00–60.00
C-  46.00–50.99
D   41.00–45.00
F   0.00–40.99

This must NOT be hardcoded as an uneditable display.

The user must be able to edit it later.

==================================================
8. IMPORTANT — DO NOT FAKE FUNCTIONALITY
==================================================

For this turn, functionality matters more than adding more visual polish.

Do not create buttons that only LOOK clickable.

If a control is added, connect it to actual state/action.

Specifically verify:
- theme switch works
- artwork click works
- artwork next/previous works
- carousel works
- carousel toggle works
- grade score adding works
- multiple-score calculation works
- dashboard schedule renders
- Moonlit Allen is completely replaced

==================================================
9. DO NOT IMPLEMENT THESE YET
==================================================

Leave these as placeholders:

- AI document classification
- real file upload processing
- global search
- Add Anything
- Inbox
- Supabase/backend
- authentication
- cloud storage
- full Focus Mode

==================================================
10. FINAL VERIFICATION
==================================================

After implementation, test the actual interactions.

Do not simply report "implemented".

Verify that:
1. Moonlit Allen no longer appears.
2. Theme switch visibly changes the application.
3. Shu/Silver Wolf artwork changes with theme.
4. Clicking artwork opens OS Control Center.
5. Carousel changes artwork every 5 seconds.
6. Manual previous/next works.
7. Dashboard weekly schedule appears.
8. Chapel is absent.
9. A grading component can contain multiple scores.
10. Multiple scores calculate correctly.
11. CIT grade scale exists by default and is editable.
12. The application still renders without runtime/build errors.

If any of these fail, fix them before finishing this turn.