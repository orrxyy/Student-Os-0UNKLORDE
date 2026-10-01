import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useStore } from '../lib/store'
import { Card, Badge, Button, EmptyState, Icon, Modal, Input, Select } from '../components/ui'
import { getTaskAssignment } from '../lib/selectors'
import { AttachmentSection, AttachmentToggle } from '../components/Attachments'
import { DIFFICULTY_OPTIONS, DifficultyEdit } from '../components/TaskDifficulty'
import type { Task, TaskDifficulty } from '../types'

const PRIORITY_BADGE = { low: 'muted', medium: 'primary', high: 'accent' } as const

export function TasksPage() {
  const { state, addTask, toggleTask, deleteTask } = useStore()
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', dueDate: '', priority: 'medium' as Task['priority'], difficulty: 'medium' as TaskDifficulty })
  const highlight = useSearchParams()[0].get('task')
  useEffect(() => {
    if (highlight) document.getElementById(`task-${highlight}`)?.scrollIntoView({ block: 'center' })
  }, [highlight])
  const [filesOpen, setFilesOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')

  // Collect all tasks: global + course-level
  const courseTasks = state.academicYears
    .flatMap((y) => y.semesters)
    .flatMap((s) => s.courses)
    .flatMap((c) => c.tasks.map((t) => ({ ...t, courseCode: c.code, courseName: c.name })))

  const globalTasks = state.globalTasks.map((t) => ({ ...t, courseCode: undefined, courseName: undefined }))
  const allTasks = [...globalTasks, ...courseTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  const filtered = allTasks.filter((t) => {
    if (filter === 'pending') return !t.completed
    if (filter === 'done') return t.completed
    return true
  })

  const pendingCount = allTasks.filter((t) => !t.completed).length
  const doneCount = allTasks.filter((t) => t.completed).length

  function handleAdd() {
    if (!form.title.trim()) return
    addTask({ title: form.title.trim(), dueDate: form.dueDate || undefined, priority: form.priority, difficulty: form.difficulty, completed: false })
    setForm({ title: '', dueDate: '', priority: 'medium', difficulty: 'medium' })
    setAddOpen(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pendingCount} pending · {doneCount} completed
          </p>
        </div>
        <Button icon="plus" onClick={() => setAddOpen(true)}>Add Task</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium border capitalize transition-colors ${filter === f ? 'bg-secondary text-secondary-foreground border-secondary' : 'border-border text-muted-foreground hover:bg-muted'}`}
          >
            {f === 'all' ? `All (${allTasks.length})` : f === 'pending' ? `Pending (${pendingCount})` : `Done (${doneCount})`}
          </button>
        ))}
      </div>

      <div className="h-px bg-accent/20" />

      {/* Task list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="check-square"
          title={filter === 'done' ? 'No completed tasks' : 'No tasks'}
          description={filter === 'all' ? 'Add your first task above.' : undefined}
          action={filter === 'all' ? <Button icon="plus" onClick={() => setAddOpen(true)}>Add Task</Button> : undefined}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              id={`task-${task.id}`}
              className={`bg-card border rounded-lg ${highlight === task.id ? 'border-accent ring-1 ring-accent' : 'border-border'}`}
            >
            <div
              className={`flex items-center gap-3 px-4 py-3 transition-opacity ${task.completed ? 'opacity-55' : ''}`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${task.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-border hover:border-primary'}`}
              >
                {task.completed && <Icon name="check" size={11} />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                {(task as any).courseCode && (
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">{(task as any).courseCode}</p>
                )}
                {task.assignmentId && (
                  <p className="text-[10px] font-mono uppercase tracking-wide text-accent mt-0.5 truncate">
                    Assignment{getTaskAssignment(state, task) ? `: ${getTaskAssignment(state, task)!.title}` : ''}
                  </p>
                )}
              </div>

              {task.dueDate && (
                <span className="text-xs font-mono text-muted-foreground shrink-0 flex items-center gap-1">
                  <Icon name="calendar" size={11} />
                  {task.dueDate}
                </span>
              )}
              <Badge variant={PRIORITY_BADGE[task.priority]}>{task.priority}</Badge>
              <DifficultyEdit task={task} />
              <AttachmentToggle
                entityType="task"
                entityId={task.id}
                open={filesOpen === task.id}
                onToggle={() => setFilesOpen(filesOpen === task.id ? null : task.id)}
              />
              <button
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground/40 hover:text-destructive transition-colors shrink-0"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
            {filesOpen === task.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border">
                <AttachmentSection entityType="task" entityId={task.id} semesterId={task.semesterId} courseId={task.courseId} className="pt-2" />
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Task"
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Task" placeholder="e.g. Review lecture notes" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="Due Date (optional)" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize border transition-colors ${form.priority === p ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Select
            label="Difficulty"
            value={form.difficulty}
            options={DIFFICULTY_OPTIONS}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value as TaskDifficulty })}
          />
        </div>
      </Modal>
    </div>
  )
}
