export type CourseStatus = 'active' | 'completed' | 'planned'
export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskDifficulty = 'easy' | 'medium' | 'hard' | 'extreme'
export type MaterialType = 'lecture' | 'reading' | 'video' | 'lab' | 'other'
/** 'pending' is shown as "Not Started"; 'graded' is the legacy pre-2D value. */
export type AssignmentStatus = 'pending' | 'in_progress' | 'submitted' | 'completed' | 'graded'
export type PortfolioCategory =
  | 'org'
  | 'project'
  | 'achievement'
  | 'certificate'
  | 'competition'
  | 'volunteering'

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday'

export type ScoringMode = 'single' | 'multiple'
export type AggregationMethod = 'average' | 'sum' | 'best' | 'weighted'

export interface ScoreEntry {
  id: string
  label: string
  value: number
  /** Academic week this record belongs to; overrides the date-based Timeline placement. */
  academicWeek?: number
  /** ISO time the score was recorded (Timeline). Missing on older data. */
  createdAt?: string
}

export interface ClassSchedule {
  day: DayOfWeek
  start: string
  end: string
  room?: string
  isLab?: boolean
}

export interface GradePoint {
  letter: string
  minScore: number
  point: number
}

export interface GradingScale {
  id: string
  name: string
  grades: GradePoint[]
}

export interface GradeComponent {
  id: string
  name: string
  weight: number
  maxScore: number
  // Single-score mode
  score: number | null
  // Multi-score mode
  scores: ScoreEntry[]
  scoringMode: ScoringMode
  aggregation: AggregationMethod
  isBonus: boolean
  order: number
  notes?: string
  /** ISO time a single-mode score was last set (Timeline). */
  scoredAt?: string
  /** Academic week this record belongs to; overrides the date-based Timeline placement. */
  academicWeek?: number
}

export interface Assignment {
  id: string
  courseId: string
  semesterId?: string
  title: string
  description?: string
  dueDate?: string
  status: AssignmentStatus
  priority?: TaskPriority
  type?: string
  /** GradeComponent.id in the same course. Grades stay owned by the grading system. */
  assessmentId?: string
  /** Task created from this assignment (Task.assignmentId points back). */
  taskId?: string
  score?: number
  maxScore: number
  notes?: string
  createdAt?: string
  updatedAt?: string
  /** ISO time the assignment entered Completed (Timeline). */
  completedAt?: string
  /** Academic week this record belongs to; overrides the date-based Timeline placement. */
  academicWeek?: number
}

export interface Material {
  id: string
  courseId: string
  semesterId?: string
  week: number
  title?: string
  topic: string
  type: MaterialType
  url?: string
  notes?: string
  createdAt?: string
  /** Academic week this record belongs to; overrides the date-based Timeline placement. */
  academicWeek?: number
}

export interface Task {
  id: string
  courseId?: string
  semesterId?: string
  title: string
  description?: string
  type?: string
  assessmentId?: string
  assignmentId?: string
  /** Missing on older tasks; treated as 'medium'. */
  difficulty?: TaskDifficulty
  dueDate?: string
  completed: boolean
  priority: TaskPriority
  notes?: string
  createdAt?: string
  completedAt?: string
  /** Academic week this record belongs to; overrides the date-based Timeline placement. */
  academicWeek?: number
}

export interface Note {
  id: string
  title?: string
  content: string
  courseId?: string
  semesterId?: string
  week?: number
  relatedTaskId?: string
  relatedAssessmentId?: string
  createdAt: string
}

export interface Course {
  id: string
  code: string
  name: string
  sks: number
  lecturer?: string
  room?: string
  schedule?: string
  description?: string
  notes?: string
  status: CourseStatus
  semesterId: string
  gradeComponents: GradeComponent[]
  assignments: Assignment[]
  materials: Material[]
  tasks: Task[]
  classSchedule: ClassSchedule[]
  /** Letter grade entered directly (e.g. "B+") — bypasses numeric grade components for GPA. */
  courseLetterGrade?: string
}

export interface Semester {
  id: string
  yearId: string
  number: 1 | 2
  courses: Course[]
}

export interface AcademicYear {
  id: string
  number: 1 | 2 | 3 | 4
  semesters: [Semester, Semester]
}

export interface PortfolioEntry {
  id: string
  title: string
  category: PortfolioCategory
  date: string
  organization?: string
  role?: string
  description: string
  skills: string[]
  cvReady: boolean
}

export type AttachmentEntityType =
  | 'course' | 'task' | 'material' | 'note' | 'assignment' | 'submission' | 'assessment'
  | 'certificate' | 'portfolio' | 'achievement' | 'organization' | 'project' | 'cv'

/** Where the bytes live. `key` is opaque to the UI; adapters resolve it. */
export interface AttachmentStorageRef {
  provider: 'indexeddb' | 'remote'
  key: string
}

/** Metadata only — file bytes are never kept in AppState / localStorage. */
export interface Attachment {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  createdAt: string
  updatedAt: string
  storage: AttachmentStorageRef
  entityType: AttachmentEntityType
  entityId: string
  semesterId?: string
  courseId?: string
}

export type SubmissionStatus = 'not_submitted' | 'submitted'

/** At most one per assignment. Grades live in the grading system, not here. */
export interface Submission {
  id: string
  assignmentId: string
  courseId: string
  semesterId?: string
  status: SubmissionStatus
  submittedAt?: string
  note?: string
  createdAt: string
  updatedAt: string
}

export type CertificateCategory =
  | 'academic' | 'organization' | 'competition' | 'volunteer' | 'workshop' | 'seminar' | 'course' | 'certification' | 'other'

/** Global entity. Optionally references a course/semester; never embedded in Course. Dates are YYYY-MM-DD. */
export interface Certificate {
  id: string
  title: string
  issuer: string
  category?: CertificateCategory
  issueDate?: string
  expiryDate?: string
  certificateNumber?: string
  description?: string
  courseId?: string
  semesterId?: string
  relatedOrganization?: string
  credentialUrl?: string
  createdAt: string
  updatedAt: string
}

export type PortfolioItemType =
  | 'project' | 'organization' | 'volunteer' | 'achievement' | 'competition' | 'experience' | 'leadership' | 'other'

/** Global entity. certificateIds reference AppState.certificates (never copied). Dates are YYYY-MM-DD. */
export interface PortfolioItem {
  id: string
  title: string
  type: PortfolioItemType
  organization?: string
  role?: string
  description?: string
  startDate?: string
  endDate?: string
  semesterId?: string
  courseId?: string
  location?: string
  url?: string
  skills?: string[]
  highlights?: string[]
  certificateIds?: string[]
  featured?: boolean
  createdAt: string
  updatedAt: string
}

export interface CvProfile {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  website: string
  institution: string
  degree: string
}

/** Reference to an existing record plus CV-only visibility/order. 'education' uses sourceId 'academic'. */
export interface CvEntry {
  type: 'portfolio' | 'certificate' | 'education'
  sourceId: string
  visible: boolean
  order: number
}

export interface AppState {
  academicYears: AcademicYear[]
  /** ID of the currently active semester (used as single source of truth). */
  activeSemesterId: string
  gradingScale: GradingScale
  /** Legacy (pre-2E-E) entries; migrated into portfolioItems and no longer read. */
  portfolio: PortfolioEntry[]
  portfolioItems: PortfolioItem[]
  cvProfile: CvProfile
  cvEntries: CvEntry[]
  cvSkills: string[]
  globalTasks: Task[]
  notes: Note[]
  attachments: Attachment[]
  submissions: Submission[]
  certificates: Certificate[]
  migrations?: string[]
}
