import { useState } from 'react'
import { useStore } from '../lib/store'
import { getSemesterLabel } from '../lib/selectors'
import { getTimelineWeeks, type TimelineWeek } from '../lib/timeline'
import { ActivityRow, fmtShortDate } from '../components/ActivityRow'
import { isSemesterConfigured } from '../data/academicWeeks'
import { Badge, Card, EmptyState, Icon, Select } from '../components/ui'

function WeekSummary({ w }: { w: TimelineWeek }) {
  const parts: string[] = []
  if (w.activityCount > 0) parts.push(`${w.activityCount} ${w.activityCount === 1 ? 'activity' : 'activities'}`)
  w.milestones.forEach((m) => parts.push(m.title.split(' / ')[0]))
  return <>{parts.length ? parts.join(' · ') : 'No activity yet'}</>
}

function WeekAccordion({ w, open, onToggle }: { w: TimelineWeek; open: boolean; onToggle: () => void }) {
  const hasMilestone = w.milestones.length > 0
  return (
    <Card className={`overflow-hidden ${w.isCurrent ? 'ring-1 ring-primary/30' : ''}`}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 min-h-14 py-3 text-left transition-colors hover:bg-muted/50 ${w.isCurrent ? 'bg-sage-light' : ''}`}
      >
        <Icon name="chevron-right" size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold tracking-wide">WEEK {w.week.number}</span>
            {w.isCurrent && <Badge variant="primary">Current</Badge>}
            {hasMilestone && <Badge variant="accent">{w.milestones[0].kind === 'final' ? 'UAS' : 'UTS'}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            {fmtShortDate(w.week.start)} — {fmtShortDate(w.week.end)}
          </p>
        </div>
        <span className={`text-xs shrink-0 text-right max-w-[40%] ${w.events.length ? 'text-foreground' : 'text-muted-foreground'}`}>
          <WeekSummary w={w} />
        </span>
      </button>
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-3 pt-1 border-t border-border/60">
            {w.events.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3">No activity yet.</p>
            ) : (
              <div className="divide-y divide-border/60">
                {w.events.map((e) => <ActivityRow key={e.id} event={e} actions />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function TimelinePage() {
  const { state, setActiveSemester } = useStore()
  const semId = state.activeSemesterId
  const weeks = getTimelineWeeks(state, semId)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({})

  const label = getSemesterLabel(state, semId)
  const yearId = state.academicYears.find((y) => y.semesters.some((x) => x.id === semId))?.id ?? ''
  const year = state.academicYears.find((y) => y.id === yearId)

  function Selector() {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Year"
          value={yearId}
          onChange={(e) => {
            const y = state.academicYears.find((x) => x.id === e.target.value)
            if (y) setActiveSemester(y.semesters[0].id)
          }}
          options={state.academicYears.map((y) => ({ value: y.id, label: `Year ${y.number}` }))}
        />
        <Select
          label="Semester"
          value={semId}
          onChange={(e) => setActiveSemester(e.target.value)}
          options={(year?.semesters ?? []).map((x) => ({
            value: x.id,
            label: `Semester ${x.number}${isSemesterConfigured(x.id) ? '' : ' · not configured'}`,
          }))}
        />
      </div>
    )
  }

  if (!weeks) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        <Header label={label} />
        <Selector />
        <Card className="p-4">
          <EmptyState icon="clock" title="No academic timeline yet" description={`Academic weeks are not configured yet for ${label}.`} className="py-10" />
        </Card>
      </div>
    )
  }

  const isOpen = (w: TimelineWeek) => openMap[w.week.id] ?? w.isCurrent

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <Header label={label} />
      <Selector />
      <div className="space-y-2">
        {weeks.map((w) => (
          <WeekAccordion
            key={w.week.id}
            w={w}
            open={isOpen(w)}
            onToggle={() => setOpenMap((m) => ({ ...m, [w.week.id]: !isOpen(w) }))}
          />
        ))}
      </div>
    </div>
  )
}

function Header({ label }: { label: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-accent">{label}</p>
      <h1 className="font-display text-xl font-semibold mt-1">Academic Timeline</h1>
      <p className="text-sm text-muted-foreground mt-0.5">What you did, week by week.</p>
    </div>
  )
}
