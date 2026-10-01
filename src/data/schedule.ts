import type { ClassSchedule, Course } from '../types'

type SeedEntry = { lecturer: string; slots: ClassSchedule[] }

export const Y1S1_SCHEDULE_SEED: Record<string, SeedEntry> = {
  IBDA1001: {
    lecturer: 'Dr. Steven Bandong',
    slots: [{ day: 'Tuesday', start: '14:00', end: '17:00', room: '1401' }],
  },
  IBDA1011: {
    lecturer: 'Kelly K. Audrey, M.Kom.',
    slots: [{ day: 'Wednesday', start: '08:00', end: '10:00', room: '1202' }],
  },
  IDIS1011A: {
    lecturer: 'Pdt. David Tong, Ph.D., Ph.D. / Vik. dr. Jeffrey Wibowo, M.Th.',
    slots: [{ day: 'Wednesday', start: '13:00', end: '15:00', room: 'Multipurpose Room' }],
  },
  MATH1061: {
    lecturer: 'Natanael, M.Si.',
    slots: [
      { day: 'Tuesday', start: '10:00', end: '11:00', room: 'Multipurpose Room' },
      { day: 'Thursday', start: '08:00', end: '10:00', room: '1401' },
    ],
  },
  PHED1014: {
    lecturer: 'Agung B. Waluyo, Ph.D.',
    slots: [{ day: 'Monday', start: '08:00', end: '09:00', room: 'Lapangan Basket' }],
  },
  PHYS1011: {
    lecturer: 'Agung B. Waluyo, Ph.D.',
    slots: [
      { day: 'Tuesday', start: '08:00', end: '10:00', room: 'Multipurpose Room' },
      { day: 'Friday', start: '08:00', end: '09:00', room: 'Multipurpose Room' },
    ],
  },
  PHYS1011L: {
    lecturer: 'Ir. Sukadarminto, M.T.',
    slots: [{ day: 'Friday', start: '13:00', end: '16:00', room: 'Lab. Fisika', isLab: true }],
  },
  THEO1011A: {
    lecturer: 'Pdt. David Tong, Ph.D., Ph.D. / Vik. Valentino Sitorus, M.Th.',
    slots: [{ day: 'Tuesday', start: '18:00', end: '20:00', room: 'Multipurpose Room' }],
  },
}

// Placeholder slot from the earlier scaffold seed that is not in the official schedule.
const LEGACY_PLACEHOLDER: Record<string, ClassSchedule> = {
  IBDA1011: { day: 'Thursday', start: '14:00', end: '17:00', isLab: true },
}

const same = (a: ClassSchedule, b: ClassSchedule) =>
  a.day === b.day && a.start === b.start && a.end === b.end

/** Fill-blank-only: never overwrites a lecturer/room the user already set. */
export function applyScheduleSeed(course: Course): Course {
  const seed = Y1S1_SCHEDULE_SEED[course.code]
  if (!seed) return course
  const legacy = LEGACY_PLACEHOLDER[course.code]
  let slots = (course.classSchedule ?? []).filter(
    (s) => !(legacy && same(s, legacy) && !s.room),
  )
  slots = slots.map((s) => {
    const match = seed.slots.find((x) => same(x, s))
    return match && !s.room ? { ...s, room: match.room, isLab: s.isLab ?? match.isLab } : s
  })
  if (slots.length === 0) slots = seed.slots.map((s) => ({ ...s }))
  return {
    ...course,
    lecturer: course.lecturer?.trim() ? course.lecturer : seed.lecturer,
    classSchedule: slots,
  }
}
