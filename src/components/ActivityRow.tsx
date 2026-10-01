import { Link } from 'react-router'
import { useStore } from '../lib/store'
import { courseOf, getRecentActivity, type ActivityEvent, type ActivityType } from '../lib/timeline'
import { Card, Badge } from './ui'
import { ActivityMenu } from './ActivityActions'

const TZ = 'Asia/Jakarta'
export const TYPE_LABEL: Record<ActivityType, string> = {
  grade: 'Grade', assignment: 'Assignment', task: 'Task', submission: 'Submission',
  material: 'Material', note: 'Note', exam: 'Exam',
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TZ })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  return `${date} · ${time}`
}

export function fmtShortDate(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function ActivityRow({ event, showCourseName = true, actions = false }: { event: ActivityEvent; showCourseName?: boolean; actions?: boolean }) {
  const { state } = useStore()
  const course = courseOf(state, event.courseId)
  const isExam = event.type === 'exam'
  const when = isExam ? event.description : fmtDateTime(event.timestamp)
  const body = (
    <div className="flex gap-3 py-2.5 px-1">
      <span
        className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${isExam ? 'bg-accent ring-4 ring-accent/15' : 'bg-primary/70'}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono text-muted-foreground">{when}</p>
        <p className={`text-sm leading-snug break-words ${isExam ? 'font-display font-semibold text-accent' : 'font-medium'}`}>
          {isExam ? '◆ ' : ''}{event.title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          {course && (
            <span className="text-[11px] text-muted-foreground">
              <span className="font-mono">{course.code}</span>
              {showCourseName && ` · ${course.name}`}
            </span>
          )}
          <Badge variant={isExam ? 'accent' : 'muted'}>{TYPE_LABEL[event.type]}</Badge>
        </div>
        {event.description && !isExam && <p className="text-xs text-muted-foreground mt-1">{event.description}</p>}
      </div>
    </div>
  )
  const main = event.href ? (
    <Link to={event.href} className="block rounded-lg hover:bg-muted/60 transition-colors min-w-0 flex-1">{body}</Link>
  ) : (
    <div className="min-w-0 flex-1">{body}</div>
  )
  if (!actions || isExam) return main
  return (
    <div className="group/row flex items-start gap-1">
      {main}
      <div className="pt-1 shrink-0"><ActivityMenu event={event} /></div>
    </div>
  )
}

export function RecentActivityCard() {
  const { state } = useStore()
  const events = getRecentActivity(state, state.activeSemesterId, 4)
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </h3>
        <Link to="/timeline" className="text-xs text-accent hover:underline">View Timeline →</Link>
      </div>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No activity yet. New grades, tasks, notes and more will appear here.</p>
      ) : (
        <div className="divide-y divide-border/60">
          {events.map((e) => <ActivityRow key={e.id} event={e} showCourseName={false} />)}
        </div>
      )}
    </Card>
  )
}
