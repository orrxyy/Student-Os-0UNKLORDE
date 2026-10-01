import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../lib/store'
import { getActiveCourses, getSemesterLabel } from '../lib/selectors'
import {
  getSemesterSummary,
  getCumulativeSummary,
  getGradeDistribution,
  getCoursePerformance,
  simulateTarget,
} from '../lib/analytics'
import { formatGPA } from '../lib/grades'
import { Card, Badge, StatTile, Progress, EmptyState, Select } from './ui'

const fmt = (n: number | null, d = 1) => (n === null ? '—' : n.toFixed(d))

export function SemesterSummaryTiles() {
  const { state } = useStore()
  const sem = getSemesterSummary(state)
  const cum = getCumulativeSummary(state)
  const tiles = [
    {
      label: 'Semester GPA',
      value: formatGPA(sem.gpa),
      sub: sem.gpa === null ? 'no grades yet' : sem.provisional ? 'provisional' : 'final',
      accent: sem.gpa !== null,
    },
    { label: 'Total SKS', value: String(sem.totalSKS), sub: 'this semester' },
    { label: 'Courses counted', value: `${sem.coursesCounted}/${sem.courseCount}`, sub: 'with final grade' },
    { label: 'Cumulative GPA', value: formatGPA(cum.gpa), sub: `${cum.gradedSKS} graded SKS`, accent: cum.gpa !== null },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
      {tiles.map((t) => (
        <div key={t.label} className="bg-card px-4 md:px-5 py-3 md:py-4">
          <StatTile label={t.label} value={t.value} sub={t.sub} accent={t.accent} />
        </div>
      ))}
    </div>
  )
}

export function GradeDistributionCard() {
  const { state } = useStore()
  const dist = getGradeDistribution(state)
  const max = Math.max(1, ...dist.map((d) => d.count))
  const any = dist.some((d) => d.count > 0)
  return (
    <Card className="p-4 md:p-5">
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Grade Distribution
      </h3>
      {!any ? (
        <p className="text-sm text-muted-foreground py-4">No final grades yet.</p>
      ) : (
        <div className="space-y-1.5">
          {dist.map((d) => (
            <div key={d.letter} className="flex items-center gap-3">
              <span className="w-7 text-xs font-mono font-semibold text-foreground">{d.letter}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(d.count / max) * 100}%` }}
                />
              </div>
              <span className="w-5 text-right text-xs font-mono text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function CoursePerformanceList() {
  const { state } = useStore()
  const courses = getActiveCourses(state)
  if (courses.length === 0) return null
  return (
    <div className="space-y-3">
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Course Performance
      </h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {courses.map((c) => {
          const p = getCoursePerformance(c, state.gradingScale)
          return (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/course/${c.id}`} className="font-mono text-xs font-semibold text-primary hover:underline">
                    {c.code}
                  </Link>
                  <p className="text-sm font-medium leading-snug truncate">{c.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{c.sks} SKS</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-xl font-semibold leading-none">{fmt(p.currentScore)}</p>
                  <p className="text-xs font-semibold text-accent mt-1">
                    {p.currentLetter ?? '—'}
                    {p.currentLetter && !p.isFinal && <span className="text-muted-foreground font-normal"> so far</span>}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={p.completedPct} />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>{Math.round(p.completedPct)}% graded</span>
                  <span>{Math.round(p.remainingPct)}% remaining</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {p.assessments.map((a) => (
                  <span
                    key={a.id}
                    className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-mono ${
                      a.score === null ? 'bg-muted text-muted-foreground' : 'bg-sage-light text-primary'
                    }`}
                  >
                    {a.name.replace(/\s*\(.*\)/, '')}
                    <span className="font-semibold">{a.score === null ? '—' : a.score.toFixed(a.score % 1 ? 1 : 0)}</span>
                  </span>
                ))}
              </div>

              <p className="text-[10px] font-mono text-muted-foreground mt-3">
                {p.isFinal
                  ? 'Final grade recorded'
                  : p.projectedFinal !== null
                    ? `Projected at current pace: ${p.projectedFinal.toFixed(1)} (${p.projectedLetter})`
                    : 'Projection needs at least one graded assessment'}
              </p>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function TargetGradeSimulator() {
  const { state } = useStore()
  const courses = getActiveCourses(state)
  const letters = state.gradingScale.grades.map((g) => g.letter)
  const [courseId, setCourseId] = useState('')
  const [target, setTarget] = useState('B+')

  useEffect(() => {
    if (!courses.some((c) => c.id === courseId)) setCourseId(courses[0]?.id ?? '')
  }, [courses.map((c) => c.id).join('|')]) // eslint-disable-line react-hooks/exhaustive-deps

  const course = courses.find((c) => c.id === courseId)
  const result = useMemo(
    () => (course ? simulateTarget(course, target, state.gradingScale) : null),
    [course, target, state.gradingScale],
  )

  return (
    <Card className="p-4 md:p-5">
      <h3 className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
        Target Grade Simulator
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        What-if only. Nothing here changes your grades or assessments.
      </p>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses in this semester.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
            />
            <Select
              label="Target grade"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              options={letters.map((l) => ({ value: l, label: `${l} (≥ ${state.gradingScale.grades.find((g) => g.letter === l)?.minScore})` }))}
            />
          </div>

          {result && (
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Current" value={fmt(result.currentScore)} />
                <StatTile label="Completed" value={`${result.completedWeight}%`} />
                <StatTile label="Remaining" value={`${result.remainingWeight}%`} />
              </div>
              <div
                className={`rounded-lg border px-4 py-3 text-sm ${
                  result.status === 'impossible'
                    ? 'border-destructive/40 text-destructive'
                    : result.status === 'reached'
                      ? 'border-primary/40 text-primary bg-sage-light'
                      : 'border-border bg-muted'
                }`}
              >
                {result.status === 'no-data' && 'This course has no assessments to simulate.'}
                {result.status === 'reached' && (
                  <>Already secured: {target} needs {result.targetMin}, and {result.secured.toFixed(1)} points are locked in.</>
                )}
                {result.status === 'possible' && result.requiredAverage !== null && (
                  <>
                    Average{' '}
                    <span className="font-display font-semibold text-base">{result.requiredAverage.toFixed(1)}</span>{' '}
                    needed on the remaining {result.remainingWeight}% to reach {target}.
                  </>
                )}
                {result.status === 'impossible' &&
                  (result.remainingWeight <= 0
                    ? `Not possible: all assessments are graded and the final score is below ${result.targetMin}.`
                    : `Not possible: would need over 100 on the remaining ${result.remainingWeight}%.`)}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export function SemesterAnalyticsSection() {
  const { state } = useStore()
  const label = getSemesterLabel(state, state.activeSemesterId)
  const courses = getActiveCourses(state)
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </h2>
        <Badge variant="secondary">Active semester</Badge>
      </div>
      <SemesterSummaryTiles />
      {courses.length === 0 ? (
        <Card className="p-4">
          <EmptyState icon="bar-chart-2" title="No academic data yet." description="Add courses to this semester to see analytics." className="py-8" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GradeDistributionCard />
            <TargetGradeSimulator />
          </div>
          <CoursePerformanceList />
        </>
      )}
    </section>
  )
}
