import { applyScheduleSeed } from './schedule'
import type {
  AppState,
  AcademicYear,
  GradingScale,
  GradeComponent,
  Course,
  Semester,
  PortfolioEntry,
  Task,
  ClassSchedule,
} from '../types'

let _uid = 1000
const _session = Date.now().toString(36)
// Session-prefixed so ids generated after a reload never collide with persisted ones.
export const uid = () => `id_${_session}_${_uid++}`

// CIT Grade Scale
export const defaultGradingScale: GradingScale = {
  id: 'scale_cit',
  name: 'CIT Scale',
  grades: [
    { letter: 'A', minScore: 91, point: 4.0 },
    { letter: 'A-', minScore: 86, point: 3.7 },
    { letter: 'B+', minScore: 81, point: 3.3 },
    { letter: 'B', minScore: 76, point: 3.0 },
    { letter: 'B-', minScore: 71, point: 2.7 },
    { letter: 'C+', minScore: 61, point: 2.3 },
    { letter: 'C', minScore: 51, point: 2.0 },
    { letter: 'C-', minScore: 46, point: 1.7 },
    { letter: 'D', minScore: 41, point: 1.0 },
    { letter: 'F', minScore: 0, point: 0.0 },
  ],
}

function defaultComponents(): GradeComponent[] {
  return [
    {
      id: uid(), name: 'Assignments', weight: 20, maxScore: 100,
      score: null, scores: [], scoringMode: 'multiple', aggregation: 'average',
      isBonus: false, order: 0,
    },
    {
      id: uid(), name: 'Quizzes', weight: 20, maxScore: 100,
      score: null, scores: [], scoringMode: 'multiple', aggregation: 'average',
      isBonus: false, order: 1,
    },
    {
      id: uid(), name: 'Midterm (UTS)', weight: 25, maxScore: 100,
      score: null, scores: [], scoringMode: 'single', aggregation: 'average',
      isBonus: false, order: 2,
    },
    {
      id: uid(), name: 'Final (UAS)', weight: 35, maxScore: 100,
      score: null, scores: [], scoringMode: 'single', aggregation: 'average',
      isBonus: false, order: 3,
    },
  ]
}

function makeCourse(
  code: string,
  name: string,
  sks: number,
  semesterId: string,
  classSchedule: ClassSchedule[] = [],
): Course {
  return {
    id: `course_${code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    code,
    name,
    sks,
    semesterId,
    status: 'active',
    gradeComponents: defaultComponents(),
    assignments: [],
    materials: [],
    tasks: [],
    classSchedule,
  }
}

const Y1S1_ID = 'sem_y1s1'
const Y1S2_ID = 'sem_y1s2'
const Y2S1_ID = 'sem_y2s1'
const Y2S2_ID = 'sem_y2s2'
const Y3S1_ID = 'sem_y3s1'
const Y3S2_ID = 'sem_y3s2'
const Y4S1_ID = 'sem_y4s1'
const Y4S2_ID = 'sem_y4s2'

const Y1_ID = 'year_1'
const Y2_ID = 'year_2'
const Y3_ID = 'year_3'
const Y4_ID = 'year_4'

const y1s1Base: Course[] = [
  makeCourse('IBDA1001', 'Pengantar Dunia Digital', 3, Y1S1_ID, [
    { day: 'Tuesday', start: '14:00', end: '17:00' },
  ]),
  makeCourse('IBDA1011', 'Pengantar Algoritma dan Pemrograman', 3, Y1S1_ID, [
    { day: 'Wednesday', start: '08:00', end: '10:00' },
    { day: 'Thursday', start: '14:00', end: '17:00', isLab: true },
  ]),
  makeCourse('IDIS1011A', 'Pemikiran dan Pembelajaran Kristen', 2, Y1S1_ID, [
    { day: 'Wednesday', start: '13:00', end: '15:00' },
  ]),
  makeCourse('MATH1061', 'Kalkulus I', 3, Y1S1_ID, [
    { day: 'Tuesday', start: '10:00', end: '11:00' },
    { day: 'Thursday', start: '08:00', end: '10:00' },
  ]),
  makeCourse('PHED1014', 'Pendidikan Jasmani I', 1, Y1S1_ID, [
    { day: 'Monday', start: '08:00', end: '09:00' },
  ]),
  makeCourse('PHYS1011', 'Fisika I', 3, Y1S1_ID, [
    { day: 'Tuesday', start: '08:00', end: '10:00' },
    { day: 'Friday', start: '08:00', end: '09:00' },
  ]),
  makeCourse('PHYS1011L', 'Lab Fisika I', 1, Y1S1_ID, [
    { day: 'Friday', start: '13:00', end: '16:00', isLab: true },
  ]),
  makeCourse('THEO1011A', 'Survei Teologi Reformed I (A)', 2, Y1S1_ID, [
    { day: 'Tuesday', start: '18:00', end: '20:00' },
  ]),
]

const y1s1Courses: Course[] = y1s1Base.map(applyScheduleSeed)

const academicYears: AcademicYear[] = [
  {
    id: Y1_ID,
    number: 1,
    semesters: [
      { id: Y1S1_ID, yearId: Y1_ID, number: 1, courses: y1s1Courses },
      { id: Y1S2_ID, yearId: Y1_ID, number: 2, courses: [] },
    ],
  },
  {
    id: Y2_ID,
    number: 2,
    semesters: [
      { id: Y2S1_ID, yearId: Y2_ID, number: 1, courses: [] },
      { id: Y2S2_ID, yearId: Y2_ID, number: 2, courses: [] },
    ],
  },
  {
    id: Y3_ID,
    number: 3,
    semesters: [
      { id: Y3S1_ID, yearId: Y3_ID, number: 1, courses: [] },
      { id: Y3S2_ID, yearId: Y3_ID, number: 2, courses: [] },
    ],
  },
  {
    id: Y4_ID,
    number: 4,
    semesters: [
      { id: Y4S1_ID, yearId: Y4_ID, number: 1, courses: [] },
      { id: Y4S2_ID, yearId: Y4_ID, number: 2, courses: [] },
    ],
  },
]

const samplePortfolio: PortfolioEntry[] = [
  {
    id: 'port_1',
    title: 'Blood Donation Committee — Volunteer',
    category: 'volunteering',
    date: '2025-09',
    organization: 'Campus PMI Unit',
    role: 'Volunteer Coordinator',
    description: 'Organized and participated in the annual campus blood donation drive, coordinating logistics and donor registration.',
    skills: ['Leadership', 'Event Management', 'Public Health'],
    cvReady: true,
  },
]

const globalTasks: Task[] = []

export const initialState: AppState = {
  academicYears,
  activeSemesterId: Y1S1_ID,
  gradingScale: defaultGradingScale,
  portfolio: samplePortfolio,
  globalTasks,
  notes: [],
  attachments: [],
  submissions: [],
  certificates: [],
  portfolioItems: [],
  cvProfile: { fullName: '', headline: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '', institution: '', degree: '' },
  cvEntries: [],
  cvSkills: [],
  migrations: ['schedule-seed-v1'],
}
