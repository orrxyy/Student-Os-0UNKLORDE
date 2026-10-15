import { useEffect, useState } from 'react'
import { Badge, Button, Card, EmptyState, Input, Modal, Progress, Select } from '../components/ui'
import {
  deletePersonalActivity,
  fetchPersonalLife,
  savePersonalActivity,
  savePersonalWeekNote,
  setPersonalCheckin,
  type PersonalActivity,
} from '../lib/personalLifeRemote'

// Personal Life data is loaded from and saved to Supabase.

type Mode = 'weekly' | 'temporary'

type Activity = PersonalActivity

interface Draft {
  name: string
  focus: string
  mode: Mode
  target: string
  endDate: string
  notes: string
}


const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
function mondayOf(d: Date) {
  const diff = (d.getDay() + 6) % 7
  return addDays(d, -diff)
}
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const today = new Date()
const thisMonday = mondayOf(today)
const todayKey = dateKey(today)

const emptyDraft: Draft = { name: '', focus: '', mode: 'weekly', target: '', endDate: '', notes: '' }



export function PersonalLifePage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [checks, setChecks] = useState<Set<string>>(new Set())
  const [weekNotes, setWeekNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState('')
  const [weekStart, setWeekStart] = useState(thisMonday)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [draftError, setDraftError] = useState('')
  const [deleting, setDeleting] = useState<Activity | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const weekDays = DAYS.map((label, i) => ({ label, date: addDays(weekStart, i), key: dateKey(addDays(weekStart, i)) }))
  const weekStartKey = dateKey(weekStart)
  const weekEndKey = weekDays[6].key
  const isThisWeek = weekStartKey === dateKey(thisMonday)

  const inWeek = (a: Activity) => a.startDate <= weekEndKey && (!a.endDate || a.endDate >= weekStartKey)
  const visible = activities.filter((a) => !a.archived && inWeek(a))
  const archived = activities.filter((a) => a.archived)

  const doneIn = (a: Activity) => weekDays.filter((d) => checks.has(`${a.id}:${d.key}`)).length
  const goalOf = (a: Activity) => a.target ?? 7
  const totalDone = visible.reduce((n, a) => n + doneIn(a), 0)
  const hit = visible.filter((a) => a.target && doneIn(a) >= a.target).length
  const withTarget = visible.filter((a) => a.target).length
useEffect(() => {
  let active = true

  fetchPersonalLife()
    .then((data) => {
      if (!active) return
      setActivities(data.activities)
      setChecks(new Set(data.checks))
      setWeekNotes(data.weekNotes)
    })
    .catch((error) => {
      console.error('[supabase] personal life load failed', error)
      if (active) setStorageError('Could not load Personal Life data from Supabase.')
    })
    .finally(() => {
      if (active) setLoading(false)
    })

  return () => {
    active = false
  }
}, [])
  function openNew() {
    setDraft(emptyDraft)
    setDraftError('')
    setEditing('new')
  }
  function openEdit(a: Activity) {
    setDraft({ name: a.name, focus: a.focus, mode: a.mode, target: a.target ? String(a.target) : '', endDate: a.endDate ?? '', notes: a.notes })
    setDraftError('')
    setEditing(a.id)
  }
async function save() {
  const name = draft.name.trim()
  const focus = draft.focus.trim()
  const target = draft.target.trim() === '' ? undefined : Number(draft.target)

  if (!name) return setDraftError('Give the activity a name.')
  if (target !== undefined && (!Number.isInteger(target) || target < 1 || target > 7)) {
    return setDraftError('Weekly target must be a whole number from 1 to 7.')
  }
  if (
    draft.mode === 'temporary' &&
    draft.endDate &&
    draft.endDate < dateKey(weekStart) &&
    editing === 'new'
  ) {
    return setDraftError('End date is before the week you are viewing.')
  }

  const existing = editing === 'new'
    ? undefined
    : activities.find((activity) => activity.id === editing)

  const activity: Activity = {
    id: existing?.id ?? `a_${Date.now().toString(36)}`,
    name,
    focus,
    mode: draft.mode,
    target,
    startDate: existing?.startDate ?? weekStartKey,
    endDate: draft.mode === 'temporary' && draft.endDate ? draft.endDate : undefined,
    notes: draft.notes.trim(),
    archived: existing?.archived ?? false,
  }

  try {
    setStorageError('')
    await savePersonalActivity(activity)
    setActivities((current) => {
      const exists = current.some((item) => item.id === activity.id)
      return exists
        ? current.map((item) => item.id === activity.id ? activity : item)
        : [...current, activity]
    })
    setEditing(null)
  } catch (error) {
    console.error('[supabase] personal activity save failed', error)
    setStorageError('Could not save the activity. Check the Supabase connection and try again.')
  }
}

async function toggleCheck(id: string, key: string) {
  const checked = !checks.has(`${id}:${key}`)

  try {
    setStorageError('')
    await setPersonalCheckin(id, key, checked)
    setChecks((current) => {
      const next = new Set(current)
      const checkKey = `${id}:${key}`
      if (checked) next.add(checkKey)
      else next.delete(checkKey)
      return next
    })
  } catch (error) {
    console.error('[supabase] personal check-in save failed', error)
    setStorageError('Could not save that check-in.')
  }
}

async function remove(activity: Activity) {
  try {
    setStorageError('')
    await deletePersonalActivity(activity.id)
    setActivities((current) => current.filter((item) => item.id !== activity.id))
    setChecks((current) => new Set(
      [...current].filter((key) => !key.startsWith(`${activity.id}:`)),
    ))
    setWeekNotes((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith(`${activity.id}:`)),
    ))
    setDeleting(null)
  } catch (error) {
    console.error('[supabase] personal activity delete failed', error)
    setStorageError('Could not delete the activity.')
  }
}

async function setArchived(id: string, archivedValue: boolean) {
  const activity = activities.find((item) => item.id === id)
  if (!activity) return

  const updated = { ...activity, archived: archivedValue }

  try {
    setStorageError('')
    await savePersonalActivity(updated)
    setActivities((current) =>
      current.map((item) => item.id === id ? updated : item),
    )
  } catch (error) {
    console.error('[supabase] personal activity archive failed', error)
    setStorageError('Could not update the activity.')
  }
}


  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] uppercase text-accent mb-1">Personal</p>
          <h1 className="font-display text-2xl font-semibold">Personal Life</h1>
          <p className="text-sm text-muted-foreground">Routines and goals outside of academics.</p>
        </div>
        <Button icon="plus" onClick={openNew}>Add activity</Button>
      </div>

{loading && (
  <p className="text-xs text-muted-foreground">
    Loading Personal Life data…
  </p>
)}

{storageError && (
  <p
    role="alert"
    className="text-xs rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive"
  >
    {storageError}
  </p>
)}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" icon="chevron-left" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} />
        <div className="min-w-[10.5rem] text-center">
          <p className="text-sm font-medium">{fmt(weekStart)} – {fmt(addDays(weekStart, 6))}</p>
          <p className="text-[11px] text-muted-foreground">{isThisWeek ? 'This week' : weekStart < thisMonday ? 'Past week' : 'Upcoming week'}</p>
        </div>
        <Button variant="outline" size="sm" icon="chevron-right" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} />
        {!isThisWeek && <Button variant="ghost" size="sm" onClick={() => setWeekStart(thisMonday)}>Today</Button>}
      </div>

      <Card className="p-4">
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-3">Weekly summary</p>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activities in this week.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
            <div><p className="font-display text-2xl font-semibold">{totalDone}</p><p className="text-xs text-muted-foreground">check-ins</p></div>
            <div><p className="font-display text-2xl font-semibold">{visible.length}</p><p className="text-xs text-muted-foreground">activities</p></div>
            <div><p className="font-display text-2xl font-semibold">{withTarget ? `${hit}/${withTarget}` : '–'}</p><p className="text-xs text-muted-foreground">targets met</p></div>
          </div>
        )}
      </Card>

      {activities.filter((a) => !a.archived).length === 0 ? (
        <EmptyState icon="star" title="No activities yet" description="Add something like gym training or learning a language." action={<Button icon="plus" onClick={openNew}>Add activity</Button>} />
      ) : (
        <div className="space-y-3">
          {visible.map((a) => {
            const done = doneIn(a)
            const noteKey = `${a.id}:${weekStartKey}`
            return (
              <Card key={a.id} className="p-4 space-y-3 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-display text-base font-semibold [overflow-wrap:anywhere]">{a.name}</h2>
                    {a.focus && <p className="text-xs text-muted-foreground mt-0.5 [overflow-wrap:anywhere]">Focus: {a.focus}</p>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <Badge>{a.mode === 'weekly' ? 'Weekly routine' : 'Temporary'}</Badge>
                      {a.endDate && <span className="text-[11px] text-muted-foreground">until {a.endDate}</span>}
                      <span className="text-[11px] text-muted-foreground">{a.target ? `Target ${a.target}/wk` : 'No target'}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" icon="edit-2" aria-label={`Edit ${a.name}`} onClick={() => openEdit(a)} />
                    <Button variant="ghost" size="sm" aria-label={`Archive ${a.name}`} onClick={() => setArchived(a.id, true)}>Archive</Button>
                    <Button variant="ghost" size="sm" icon="trash-2" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)} />
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {weekDays.map((d) => {
                    const on = checks.has(`${a.id}:${d.key}`)
                    const outside = d.key < a.startDate || (!!a.endDate && d.key > a.endDate)
                    return (
                      <button
                        key={d.key}
                        type="button"
                        disabled={outside}
                        aria-pressed={on}
                        aria-label={`${a.name} ${d.label} ${fmt(d.date)}${on ? ', done' : ''}`}
                        onClick={() => toggleCheck(a.id, d.key)}
                        className={`flex flex-col items-center gap-0.5 rounded border py-2 min-h-12 text-[11px] transition-colors disabled:opacity-35 ${
                          on ? 'bg-silver-wolf text-white border-silver-wolf' : 'bg-card border-border hover:bg-muted'
                        } ${d.key === todayKey && !on ? 'ring-1 ring-ring' : ''}`}
                      >
                        <span className="font-medium">{d.label}</span>
                        <span className="opacity-70">{d.date.getDate()}</span>
                      </button>
                    )
                  })}
                </div>

                <Progress value={Math.min(done, goalOf(a))} max={goalOf(a)} label={`${done} of ${goalOf(a)} days${a.target ? '' : ' (no target)'}`} showPct />

                <div>
                  <label htmlFor={`wn-${a.id}`} className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes for this week</label>
                  <textarea
                    id={`wn-${a.id}`}
                    rows={2}
                    value={weekNotes[noteKey] ?? ''}
                    onChange={(e) => setWeekNotes((p) => ({ ...p, [noteKey]: e.target.value }))}
                    onBlur={() => {
  const content = weekNotes[noteKey] ?? ''
  savePersonalWeekNote(a.id, weekStartKey, content).catch((error) => {
    console.error('[supabase] personal weekly note save failed', error)
    setStorageError('Could not save the weekly note.')
  })
}}
                    placeholder={a.notes || 'How did it go?'}
                    className="mt-1 w-full bg-card border border-border rounded px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none"
                  />
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived} className="text-sm text-muted-foreground hover:text-foreground min-h-10">
            {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="mt-2 space-y-2">
              {archived.map((a) => (
                <li key={a.id}>
                  <Card className="p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm [overflow-wrap:anywhere] min-w-0">{a.name}</span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setArchived(a.id, false)}>Restore</Button>
                      <Button variant="ghost" size="sm" icon="trash-2" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'Add activity' : 'Edit activity'}
        actions={<><Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>{editing === 'new' ? 'Add' : 'Save'}</Button></>}
      >
        <div className="space-y-4">
          <Input label="Name" placeholder="e.g. Gym training" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input label="Skill / focus (optional)" placeholder="e.g. Strength training, Chinese vocabulary" value={draft.focus} onChange={(e) => setDraft({ ...draft, focus: e.target.value })} />
          <Select
            label="Mode"
            value={draft.mode}
            onChange={(e) => setDraft({ ...draft, mode: e.target.value as Mode })}
            options={[{ value: 'weekly', label: 'Weekly routine (repeats every week)' }, { value: 'temporary', label: 'Temporary (limited time)' }]}
          />
          {draft.mode === 'temporary' && <Input label="End date (optional)" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />}
          <Input label="Weekly target in days (optional)" type="number" min={1} max={7} placeholder="1 to 7" value={draft.target} onChange={(e) => setDraft({ ...draft, target: e.target.value })} />
          <div className="flex flex-col gap-1">
            <label htmlFor="pl-notes" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</label>
            <textarea id="pl-notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full bg-card border border-border rounded px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none" />
          </div>
          {draftError && <p role="alert" className="text-xs text-destructive">{draftError}</p>}
        </div>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete activity?"
        actions={<><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleting && remove(deleting)}>Delete</Button></>}
      >
        <p className="text-sm">“{deleting?.name}” and all of its check-ins and notes will be removed.</p>
      </Modal>
    </div>
  )
}
