import { Badge } from './ui'
import { useStore } from '../lib/store'
import type { Task, TaskDifficulty } from '../types'

export const DIFFICULTY_OPTIONS: { value: TaskDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'extreme', label: 'Extreme' },
]

const LABEL: Record<TaskDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', extreme: 'Extreme' }
const VARIANT = { easy: 'success', medium: 'muted', hard: 'accent', extreme: 'destructive' } as const

export function difficultyOf(t: Pick<Task, 'difficulty'>): TaskDifficulty {
  return t.difficulty && t.difficulty in LABEL ? t.difficulty : 'medium'
}

export function DifficultyBadge({ task }: { task: Pick<Task, 'difficulty'> }) {
  const d = difficultyOf(task)
  return <Badge variant={VARIANT[d]}>{LABEL[d]}</Badge>
}

/** Inline editor: native select so it works well on touch; persists through the store. */
export function DifficultyEdit({ task }: { task: Task }) {
  const { updateTask } = useStore()
  const d = difficultyOf(task)
  return (
    <select
      aria-label="Difficulty"
      value={d}
      onChange={(e) => updateTask(task.id, { difficulty: e.target.value as TaskDifficulty })}
      className="h-8 rounded-md border border-border bg-card px-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-ring shrink-0"
    >
      {DIFFICULTY_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
