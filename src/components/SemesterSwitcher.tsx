import { useStore } from '../lib/store'

/** Year × Semester picker. `activeSemesterId` in the store is the only source of truth. */
export function SemesterSwitcher() {
  const { state, setActiveSemester } = useStore()
  const activeYear = state.academicYears.find((y) => y.semesters.some((s) => s.id === state.activeSemesterId))
  const activeSemNo = activeYear?.semesters.find((s) => s.id === state.activeSemesterId)?.number ?? 1

  function pickYear(yearNo: number) {
    const y = state.academicYears.find((x) => x.number === yearNo)
    const target = y?.semesters.find((s) => s.number === activeSemNo) ?? y?.semesters[0]
    if (target) setActiveSemester(target.id)
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5" role="group" aria-label="Switch semester">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground w-10 shrink-0">Year</span>
        <div className="flex gap-1 p-1 bg-muted rounded-lg flex-1 sm:flex-none">
          {state.academicYears.map((y) => {
            const has = y.semesters.some((s) => s.courses.length > 0)
            const on = y.number === activeYear?.number
            return (
              <button
                key={y.id}
                type="button"
                onClick={() => pickYear(y.number)}
                aria-pressed={on}
                className={`relative flex-1 sm:flex-none sm:w-14 h-10 sm:h-9 rounded-md text-sm font-display font-semibold transition-all ${
                  on ? 'bg-card text-foreground shadow-sm ring-1 ring-accent/30' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Y{y.number}
                {has && <span className="absolute top-1.5 right-1.5 w-1 h-1 rounded-full bg-accent" />}
              </button>
            )
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground w-10 shrink-0">Sem</span>
        <div className="flex gap-1 p-1 bg-muted rounded-lg flex-1 sm:flex-none">
          {[1, 2].map((n) => {
            const sem = activeYear?.semesters.find((s) => s.number === n)
            const on = n === activeSemNo
            return (
              <button
                key={n}
                type="button"
                disabled={!sem}
                onClick={() => sem && setActiveSemester(sem.id)}
                aria-pressed={on}
                className={`flex-1 sm:flex-none sm:w-20 h-10 sm:h-9 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  on ? 'bg-card text-foreground shadow-sm ring-1 ring-accent/30' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                S{n}
                {sem && sem.courses.length > 0 && (
                  <span className="text-[10px] font-mono text-muted-foreground">{sem.courses.length}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
