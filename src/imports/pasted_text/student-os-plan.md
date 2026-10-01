I want to build a long-term personal academic and portfolio management web application called "0UNKLORDE // STUDENT OS".

IMPORTANT:
For this first step, DO NOT BUILD THE APPLICATION YET.

You are acting as a senior product architect, UX architect, and full-stack application planner.

Your task is to create a comprehensive implementation plan for the application before any code is written.

The application will be used by a university student throughout all 4 years of college.

CORE PURPOSE

This is not just a student dashboard.

It is a personal "Student Operating System" that combines:

1. Academic management
2. Class schedules
3. Grades and GPA tracking
4. Course materials / lecture archive
5. Assignments and deadlines
6. Certificates
7. Organizations and volunteering
8. Projects
9. Achievements
10. Skills
11. Portfolio / CV inventory
12. Personal academic timeline
13. Universal file upload with AI-assisted classification
14. Search across all academic and portfolio data

The application should be designed so that the student can continuously add information throughout four years without needing to reorganize the system later.

--------------------------------------------------
ACADEMIC HIERARCHY
--------------------------------------------------

The academic system must support:

YEAR 1
  Semester 1
  Semester 2

YEAR 2
  Semester 1
  Semester 2

YEAR 3
  Semester 1
  Semester 2

YEAR 4
  Semester 1
  Semester 2

Each semester contains courses.

Each course can contain:

- Course information
- Grades
- Grade components
- Grade weights
- Assignments
- Exams
- Lecture materials
- Notes
- Study resources
- Course-related files

The structure must make it easy to navigate:

Year → Semester → Course → Course Data

The system should also support cumulative GPA and semester GPA.

--------------------------------------------------
GRADE MANAGEMENT
--------------------------------------------------

The grade system must support weighted assessments.

Example:

Calculus

Quiz 1       10%    76
Quiz 2       10%    82
Assignment   20%    90
Midterm      25%    -
Final        35%    -

The application should calculate:

- Current weighted score
- Projected final score
- Estimated letter grade
- Semester GPA
- Cumulative GPA

Include a "Grade Simulator" concept where the student can test hypothetical future scores.

For example:

"If I get 80 on the final, what could my final course grade become?"

Do not hard-code a specific university grading scale yet. Design the system so grading scales and grade-point mappings can be configured.

--------------------------------------------------
UNIVERSAL UPLOAD
--------------------------------------------------

A major feature is a universal upload system.

The student should not have to manually choose:

"Upload Certificate"
"Upload Grade"
"Upload Lecture Material"

Instead, there should be one primary action:

"+ ADD ANYTHING"

The student can upload files such as:

- PDF
- DOCX
- XLSX
- CSV
- PNG
- JPG
- screenshots
- lecture slides
- certificates
- grade screenshots
- assignment documents
- project documentation

The system should conceptually analyze the uploaded file and classify it.

Possible classifications include:

- Grade / Assessment
- Certificate
- Lecture Material
- Assignment
- Project
- Organization / Volunteer Evidence
- Achievement
- Notes
- Other

The AI classification should NOT silently modify important academic data.

Instead, introduce an "AI Inbox" / review workflow:

UPLOAD
→ ANALYZE
→ CLASSIFY
→ EXTRACT INFORMATION
→ SHOW CONFIDENCE
→ USER CONFIRMS
→ SAVE TO DATABASE

Example:

"calculus_quiz_1.pdf"

Detected:
Type: Grade / Assessment
Course: Calculus
Assessment: Quiz 1
Score: 76/100
Confidence: 94%

Actions:
[Confirm]
[Edit]
[Discard]

The same workflow should work for certificates and lecture materials.

--------------------------------------------------
LECTURE MATERIAL ARCHIVE
--------------------------------------------------

The student wants to dump essentially all lecture materials into the system.

Materials should be organized automatically by:

Year
→ Semester
→ Course
→ Week / Topic
→ Material

Example:

Year 1
→ Semester 1
→ Algorithms & Programming
→ Week 05
→ Recursion.pdf

The system should support future AI-assisted functionality such as:

- document preview
- searchable content
- automatic summaries
- extracted key concepts
- extracted formulas
- important topics
- potential exam topics

These AI features should be planned architecturally but do not need to be fully implemented in the first build unless appropriate.

--------------------------------------------------
PORTFOLIO SYSTEM
--------------------------------------------------

The portfolio system should track:

- Organizations
- Committees
- Volunteering
- Projects
- Competitions
- Achievements
- Certifications
- Skills

Each portfolio entry should support:

Title
Category
Date
Organization
Role
Description
Skills
Evidence / files
Related certificates
Related projects
CV-ready toggle

Example:

Blood Donation Committee

Category:
Volunteer / Organization

Role:
Committee Member

Date:
September 2026

Evidence:
Certificate
Event Photos

CV Ready:
Yes

--------------------------------------------------
CERTIFICATE VAULT
--------------------------------------------------

Create a dedicated certificate archive.

Certificates should be searchable and filterable by:

- Year
- Semester
- Category
- Organization
- Date

The student should be able to upload a certificate and have the system suggest metadata automatically.

--------------------------------------------------
CV INVENTORY
--------------------------------------------------

Do NOT initially build a complete CV editor.

Instead create a structured "CV Inventory".

The student can mark experiences, projects, certificates, achievements and skills as:

[Include in CV]

This allows the portfolio database to become the source of truth for future CV creation.

--------------------------------------------------
DASHBOARD
--------------------------------------------------

The main dashboard should provide a high-level overview.

Possible sections:

- Current date
- Current semester
- Today's classes
- Upcoming classes
- Upcoming deadlines
- Current GPA
- Semester GPA
- Academic progress
- Recent grades
- Recent achievements
- Portfolio growth
- Recent uploads
- AI Inbox
- Weekly workload
- Quick upload

The dashboard should answer:

"What do I need to know today?"

--------------------------------------------------
ANALYTICS
--------------------------------------------------

Plan useful charts such as:

1. GPA trend over semesters
2. Grade distribution
3. Course performance
4. Academic workload
5. Portfolio / achievement growth over time

Avoid unnecessary decorative charts.

Every visualization should have a clear purpose.

--------------------------------------------------
SEARCH
--------------------------------------------------

Create a global search system.

The student should be able to search across:

- Courses
- Grades
- Lecture materials
- Assignments
- Certificates
- Projects
- Organizations
- Achievements
- Notes
- Uploaded files

Example query:

"derivative"

could return:

Calculus
Week 4 — Derivatives.pdf
Week 5 — Chain Rule.pdf
Derivative Notes
Quiz 2 — Derivatives

--------------------------------------------------
TIMELINE
--------------------------------------------------

Create a personal academic journey timeline.

Example:

2026

August
Started Calvin Institute of Technology

September
Joined Blood Donation Committee

September
Completed Programming Project

October
Received Certificate

The timeline should combine academic and portfolio milestones.

--------------------------------------------------
VISUAL DIRECTION
--------------------------------------------------

The visual identity should be inspired by the character Shu from Arknights.

Do NOT make it look like an anime fan website.

The design should feel like:

- premium academic dashboard
- Japanese editorial design
- modern productivity application
- subtle futuristic interface
- clean
- sophisticated
- calm
- functional

Use Shu as visual inspiration rather than making the character dominate the interface.

The student also likes Silver Wolf from Honkai: Star Rail.

Use Silver Wolf's cyber aesthetic only as a subtle secondary influence in interactive elements, accents, or optional theme variations.

Potential direction:

Primary:
muted sage / olive / lime

Base:
warm ivory / off-white

Dark:
charcoal

Secondary:
deep navy / indigo

Accent:
subtle blue / purple

Avoid excessive neon colors.

--------------------------------------------------
CHARACTER ART
--------------------------------------------------

Plan appropriate locations for character artwork.

Shu may appear as:

- dashboard hero artwork
- profile/identity card
- decorative side artwork
- subtle background element

Do not let character artwork interfere with usability.

Consider an optional theme system in the future:

Shu
Silver Wolf
Minimal

The underlying data must remain unchanged when switching themes.

--------------------------------------------------
INTERACTION DESIGN
--------------------------------------------------

Plan micro-interactions such as:

- hover states
- active states
- button transitions
- card elevation
- smooth sidebar transitions
- progress animations
- chart hover states
- upload processing states
- modal transitions
- toast notifications
- loading states
- empty states
- error states
- success states

Animations should feel polished and subtle rather than excessive.

--------------------------------------------------
TECHNICAL ARCHITECTURE
--------------------------------------------------

The final application is intended to become a functional web application rather than a static mockup.

Plan for:

- frontend architecture
- component architecture
- application state
- database structure
- file storage
- authentication
- data relationships
- upload pipeline
- AI classification pipeline
- search architecture
- scalable academic hierarchy
- portfolio relationships
- future AI document analysis

A backend such as Supabase may be considered for:

- authentication
- database
- file storage
- persistent data

Do not implement the backend yet.

First define the architecture.

--------------------------------------------------
IMPORTANT PRODUCT PRINCIPLES
--------------------------------------------------

1. Minimize manual data entry.
2. Upload once, organize automatically.
3. Never silently alter important academic information.
4. User confirmation is required for AI-extracted academic data.
5. The system must scale across all 4 years.
6. Academic data and portfolio data should be connected but not mixed together.
7. Search should work across the entire system.
8. The portfolio should continuously build toward future CV creation.
9. The interface must remain usable even when thousands of files exist.
10. The system should feel like a real product, not a collection of disconnected pages.

--------------------------------------------------
YOUR OUTPUT
--------------------------------------------------

Before writing any code, produce a structured product plan containing:

1. Product overview
2. Information architecture
3. Page / route structure
4. Navigation structure
5. Database entities
6. Relationships between entities
7. Upload and AI classification workflow
8. Academic data model
9. Portfolio data model
10. Grade calculation architecture
11. Search architecture
12. Dashboard structure
13. Component system
14. Interaction system
15. Design system
16. Responsive strategy
17. Backend architecture
18. MVP scope
19. Phase 2 features
20. Phase 3 / future features
21. Risks and technical challenges
22. Recommended implementation order

IMPORTANT:
Do not generate UI code yet.
Do not build the application yet.
Do not simplify the architecture just to make implementation easier.

I want a serious, scalable product plan first.