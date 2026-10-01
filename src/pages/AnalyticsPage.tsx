import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
import { useStore } from '../lib/store'
import {
  semesterGPA,
  finalScore,
  letterGrade,
  formatGPA,
  cumulativeGPA,
} from '../lib/grades'
import { Card, StatTile, Badge } from '../components/ui'
import { SemesterAnalyticsSection } from '../components/AcademicAnalytics'
import { getCumulativeSummary } from '../lib/analytics'

const SEMESTER_LABELS = ['Y1·S1', 'Y1·S2', 'Y2·S1', 'Y2·S2', 'Y3·S1', 'Y3·S2', 'Y4·S1', 'Y4·S2']

const CHART_COLORS = {
  primary: '#556B50',
  accent: '#C4920A',
  secondary: '#1E2D6B',
  muted: '#D5CBBA',
  ring: '#7C6FD4',
}

const LETTER_COLORS: Record<string, string> = {
  A: '#3A7050',
  'A-': '#4A8060',
  'B+': '#556B50',
  B: '#6B7F5E',
  'B-': '#7A8F6D',
  'C+': '#C4920A',
  C: '#D4A21A',
  'C-': '#D4861A',
  D: '#D06030',
  F: '#B84040',
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs font-sans">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value !== null && p.value !== undefined ? Number(p.value).toFixed(2) : '—'}
        </p>
      ))}
    </div>
  )
}

export function AnalyticsPage() {
  const { state } = useStore()

  // Build per-semester data
  const semesterData = state.academicYears.flatMap((year, yi) =>
    year.semesters.map((sem, si) => {
      const gpa = semesterGPA(sem.courses, state.gradingScale)
      const sks = sem.courses.reduce((a, c) => a + c.sks, 0)
      return {
        label: SEMESTER_LABELS[yi * 2 + si],
        gpa: gpa ?? null,
        sks,
        courses: sem.courses.length,
      }
    }),
  )

  // Grade distribution from all completed course components
  const allGrades: Record<string, number> = {}
  for (const year of state.academicYears) {
    for (const sem of year.semesters) {
      for (const course of sem.courses) {
        const score = finalScore(course)
        if (score !== null) {
          const letter = letterGrade(score, state.gradingScale)
          allGrades[letter] = (allGrades[letter] ?? 0) + 1
        }
      }
    }
  }
  const gradeDistData = Object.entries(allGrades)
    .sort((a, b) => {
      const order = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']
      return order.indexOf(a[0]) - order.indexOf(b[0])
    })
    .map(([letter, count]) => ({ letter, count, fill: LETTER_COLORS[letter] ?? '#999' }))

  // Cumulative stats
  const activeSemesters = state.academicYears.flatMap((y) => y.semesters).filter((s) => s.courses.length > 0)
  const totalCourses = activeSemesters.reduce((a, s) => a + s.courses.length, 0)
  const totalSKS = activeSemesters.reduce((a, s) => a + s.courses.reduce((b, c) => b + c.sks, 0), 0)
  const cumGPA = getCumulativeSummary(state).gpa
  const completedCourses = activeSemesters
    .flatMap((s) => s.courses)
    .filter((c) => finalScore(c) !== null).length

  const hasAnyGrades = gradeDistData.length > 0
  const hasAnySKS = semesterData.some((d) => d.sks > 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Academic performance across all semesters
          </p>
        </div>
      </div>

      <SemesterAnalyticsSection />

      <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground pt-2">All Semesters</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
        {[
          { label: 'Cum GPA', value: formatGPA(cumGPA), accent: true },
          { label: 'Courses', value: String(totalCourses), sub: 'enrolled' },
          { label: 'SKS', value: String(totalSKS), sub: 'credit hours' },
          { label: 'Graded', value: String(completedCourses), sub: `of ${totalCourses} courses` },
        ].map((s) => (
          <div key={s.label} className="bg-card px-5 py-4">
            <StatTile label={s.label} value={s.value} sub={s.sub} accent={s.accent} />
          </div>
        ))}
      </div>

      {/* ── GPA Trend ─────────────────────────────────────────── */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-sm font-semibold">GPA Trend</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Semester GPA across 8 semesters · {hasAnyGrades ? 'Live data' : 'Enter grades to populate'}
            </p>
          </div>
          <Badge variant="outline" className="font-mono">Sem GPA</Badge>
        </div>

        {hasAnyGrades ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={semesterData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D5CBBA" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: '#6E6E80' }}
                axisLine={{ stroke: '#D5CBBA' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 4]}
                tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: '#6E6E80' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gpa"
                name="GPA"
                stroke={CHART_COLORS.accent}
                strokeWidth={2.5}
                dot={{ fill: CHART_COLORS.accent, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: CHART_COLORS.accent, stroke: '#FDFAF5', strokeWidth: 2 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex flex-col items-center justify-center gap-3 bg-muted/30 rounded-lg border border-dashed border-border">
            <div className="w-32 h-1 bg-muted rounded-full" />
            <p className="text-sm text-muted-foreground">No completed courses yet</p>
            <p className="text-xs text-muted-foreground/70">
              Enter all grade components in a course to see GPA here.
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* ── SKS Workload ──────────────────────────────────── */}
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-display text-sm font-semibold">SKS Workload</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Credit hours per semester</p>
          </div>

          {hasAnySKS ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={semesterData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D5CBBA" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: '#6E6E80' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'DM Mono', fill: '#6E6E80' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="sks" name="SKS" radius={[3, 3, 0, 0]}>
                  {semesterData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.sks > 0 ? CHART_COLORS.primary : CHART_COLORS.muted}
                      fillOpacity={entry.sks > 0 ? 1 : 0.5}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-xs text-muted-foreground">No data</p>
            </div>
          )}
        </Card>

        {/* ── Grade Distribution ─────────────────────────── */}
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-display text-sm font-semibold">Grade Distribution</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasAnyGrades ? `${completedCourses} completed courses` : 'No grades recorded yet'}
            </p>
          </div>

          {hasAnyGrades ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart
                data={gradeDistData}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 15, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="letter"
                  tick={{ fontSize: 11, fontFamily: 'DM Mono', fill: '#6E6E80' }}
                  axisLine={false}
                  tickLine={false}
                  width={24}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Courses" radius={[0, 3, 3, 0]}>
                  {gradeDistData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex flex-col items-center justify-center gap-2 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Awaiting data</p>
              <p className="text-xs text-muted-foreground/70">Complete grade components first.</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Per-Semester Table ─────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-display text-sm font-semibold">Semester Summary</h2>
        </div>
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {['Semester', 'Courses', 'SKS', 'GPA', 'Status'].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.academicYears.flatMap((year) =>
              year.semesters.map((sem) => {
                const gpa = semesterGPA(sem.courses, state.gradingScale)
                const sks = sem.courses.reduce((a, c) => a + c.sks, 0)
                const isActive = year.number === 1 && sem.number === 1
                return (
                  <tr key={sem.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium font-mono text-xs">
                      Y{year.number}·S{sem.number}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{sem.courses.length || '—'}</td>
                    <td className="px-5 py-3 text-muted-foreground">{sks || '—'}</td>
                    <td className="px-5 py-3">
                      {gpa !== null ? (
                        <span className="font-mono font-semibold text-accent">{formatGPA(gpa)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {isActive ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : sem.courses.length > 0 ? (
                        <Badge variant="muted">Enrolled</Badge>
                      ) : (
                        <Badge variant="outline">Empty</Badge>
                      )}
                    </td>
                  </tr>
                )
              }),
            )}
          </tbody>
        </table></div>
      </Card>
    </div>
  )
}
