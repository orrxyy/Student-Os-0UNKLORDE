import { Link } from 'react-router'
import { useStore } from '../lib/store'
import { semesterGPA, cumulativeGPA, formatGPA } from '../lib/grades'
import { Card, Badge, StatTile, Icon, EmptyState, Button } from '../components/ui'

export function AcademicsPage() {
  const { state, setActiveSemester } = useStore()

  const allSemesters = state.academicYears.flatMap((y) => y.semesters)
  const cumGPA = cumulativeGPA(allSemesters, state.gradingScale)
  const totalCourses = allSemesters.reduce((a, s) => a + s.courses.length, 0)
  const totalSKS = allSemesters.reduce((a, s) => a + s.courses.reduce((b, c) => b + c.sks, 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold">Academic Record</h1>
          <p className="text-sm text-muted-foreground mt-0.5">4 years · 8 semesters</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <StatTile label="Total Courses" value={totalCourses} />
          <StatTile label="Total SKS" value={totalSKS} />
          <StatTile label="Cumulative GPA" value={formatGPA(cumGPA)} accent />
        </div>
      </div>

      {/* Gold hairline */}
      <div className="h-px bg-accent/25" />

      {/* Years */}
      <div className="space-y-6">
        {state.academicYears.map((year) => {
          const yearCourses = year.semesters.flatMap((s) => s.courses)
          const yearSKS = yearCourses.reduce((a, c) => a + c.sks, 0)
          const yearGPA = cumulativeGPA(year.semesters, state.gradingScale)

          return (
            <div key={year.id}>
              {/* Year header */}
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <span className="text-xs font-display font-semibold text-secondary-foreground">
                      Y{year.number}
                    </span>
                  </div>
                  <div>
                    <p className="font-display text-base font-semibold">Year {year.number}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {yearCourses.length > 0
                        ? `${yearCourses.length} courses · ${yearSKS} SKS`
                        : 'No courses yet'}
                    </p>
                  </div>
                </div>
                {yearGPA !== null && (
                  <Badge variant="accent" className="ml-auto">GPA {formatGPA(yearGPA)}</Badge>
                )}
              </div>

              {/* Semesters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-11">
                {year.semesters.map((sem) => {
                  const semGPA = semesterGPA(sem.courses, state.gradingScale)
                  const semSKS = sem.courses.reduce((a, c) => a + c.sks, 0)
                  const isActive = sem.id === state.activeSemesterId
                  return (
                    <Card key={sem.id} className={`p-4 ${isActive ? 'border-accent/40' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">Semester {sem.number}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {sem.courses.length > 0
                              ? `${sem.courses.length} courses · ${semSKS} SKS`
                              : 'Empty'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <Badge variant="secondary">Active</Badge>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveSemester(sem.id)}
                              className="text-[11px] text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded hover:bg-muted"
                            >
                              Set active
                            </button>
                          )}
                          {semGPA !== null && <Badge variant="accent">{formatGPA(semGPA)}</Badge>}
                        </div>
                      </div>

                      {sem.courses.length > 0 ? (
                        <>
                          <div className="space-y-1 mb-3">
                            {sem.courses.slice(0, 4).map((c) => (
                              <div key={c.id} className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-muted-foreground w-20 shrink-0 truncate">
                                  {c.code}
                                </span>
                                <span className="flex-1 truncate text-foreground/80">{c.name}</span>
                                <span className="font-mono text-muted-foreground shrink-0">{c.sks}sk</span>
                              </div>
                            ))}
                            {sem.courses.length > 4 && (
                              <p className="text-xs text-muted-foreground pl-1">
                                +{sem.courses.length - 4} more
                              </p>
                            )}
                          </div>
                          <Link
                            to={`/academics/${year.number}/${sem.number}`}
                            className="flex items-center gap-1 text-xs text-accent hover:underline font-medium"
                          >
                            Open semester <Icon name="chevron-right" size={12} />
                          </Link>
                        </>
                      ) : (
                        <EmptyState
                          icon="book-open"
                          title="No courses"
                          description="Add courses to begin."
                          className="py-6"
                          action={
                            <Link to={`/academics/${year.number}/${sem.number}`}>
                              <Button variant="outline" size="sm" icon="plus">
                                Add Course
                              </Button>
                            </Link>
                          }
                        />
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
