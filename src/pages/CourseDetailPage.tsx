import { Fragment, useState } from 'react'
import { useParams, Link, useSearchParams } from 'react-router'
import { useStore } from '../lib/store'
import { MATERIAL_TYPE_LABELS } from '../lib/materials'
import { MaterialEditor } from '../components/MaterialEditor'
import { CertificateCard } from '../components/CertificateCard'
import { CertificateEditor } from '../components/CertificateEditor'
import { getCourseCertificates, getCoursePortfolioItems } from '../lib/selectors'
import { PortfolioCard } from '../components/PortfolioCard'
import { PortfolioItemEditor } from '../components/PortfolioItemEditor'
import {
  effectiveScore,
  contribution,
  completedWeight,
  remainingWeight,
  totalRegularWeight,
  currentWeightedScore,
  bonusContribution,
  finalScore,
  letterGrade,
  formatScore,
} from '../lib/grades'
import { getCourseNotes } from '../lib/selectors'
import {
  Card,
  Badge,
  Button,
  Tabs,
  Input,
  EmptyState,
  StatTile,
  Icon,
  Progress,
  Modal,
  Select,
} from '../components/ui'
import { DIFFICULTY_OPTIONS, DifficultyEdit } from '../components/TaskDifficulty'
import type { TaskDifficulty, GradeComponent, MaterialType, ScoreEntry, ScoringMode, AggregationMethod, Task } from '../types'
import { uid } from '../data/mock'
import { EditCourseModal } from '../components/CourseEditor'
import { AssignmentsTab } from '../components/AssignmentsTab'
import { getTaskAssignment } from '../lib/selectors'
import { AttachmentSection, AttachmentToggle, PendingFilesField, attachFiles } from '../components/Attachments'

// ─── Grade Table ─────────────────────────────────────────────────────────────

const AGG_LABELS: Record<AggregationMethod, string> = {
  average: 'Avg',
  sum: 'Sum',
  best: 'Best',
  weighted: 'WAvg',
}

function GradeTable({
  components,
  onChange,
}: {
  components: GradeComponent[]
  onChange: (components: GradeComponent[]) => void
}) {
  const [addOpen, setAddOpen] = useState(false)
  const [newComp, setNewComp] = useState({
    name: '',
    weight: '',
    maxScore: '100',
    isBonus: false,
    scoringMode: 'single' as ScoringMode,
  })
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [newScoreInputs, setNewScoreInputs] = useState<
    Record<string, { label: string; value: string }>
  >({})

  function update(id: string, fields: Partial<GradeComponent>) {
    onChange(components.map((c) => (c.id === id ? { ...c, ...fields } : c)))
  }

  function remove(id: string) {
    onChange(components.filter((c) => c.id !== id))
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleMode(id: string) {
    const comp = components.find((c) => c.id === id)!
    const next: ScoringMode = (comp.scoringMode ?? 'single') === 'single' ? 'multiple' : 'single'
    update(id, {
      scoringMode: next,
      scores: comp.scores ?? [],
      aggregation: comp.aggregation ?? 'average',
    })
    if (next === 'multiple') {
      setExpandedIds((prev) => new Set([...prev, id]))
    }
  }

  function addScore(compId: string) {
    const input = newScoreInputs[compId]
    if (!input || input.value === '') return
    const comp = components.find((c) => c.id === compId)!
    const existingCount = (comp.scores ?? []).length
    const entry: ScoreEntry = {
      id: uid(),
      label: input.label.trim() || `#${existingCount + 1}`,
      value: Number(input.value),
    }
    update(compId, { scores: [...(comp.scores ?? []), entry] })
    setNewScoreInputs((prev) => ({ ...prev, [compId]: { label: '', value: '' } }))
  }

  function updateScore(compId: string, scoreId: string, fields: Partial<ScoreEntry>) {
    const comp = components.find((c) => c.id === compId)!
    update(compId, {
      scores: (comp.scores ?? []).map((s) => (s.id === scoreId ? { ...s, ...fields } : s)),
    })
  }

  function removeScore(compId: string, scoreId: string) {
    const comp = components.find((c) => c.id === compId)!
    update(compId, { scores: (comp.scores ?? []).filter((s) => s.id !== scoreId) })
  }

  function handleAdd() {
    if (!newComp.name.trim() || !newComp.weight) return
    const comp: GradeComponent = {
      id: uid(),
      name: newComp.name.trim(),
      weight: Number(newComp.weight),
      maxScore: Number(newComp.maxScore) || 100,
      score: null,
      scores: [],
      scoringMode: newComp.scoringMode,
      aggregation: 'average',
      isBonus: newComp.isBonus,
      order: components.length,
    }
    onChange([...components, comp])
    if (newComp.scoringMode === 'multiple') {
      setExpandedIds((prev) => new Set([...prev, comp.id]))
    }
    setNewComp({ name: '', weight: '', maxScore: '100', isBonus: false, scoringMode: 'single' })
    setAddOpen(false)
  }

  const regular = components.filter((c) => !c.isBonus)
  const bonuses = components.filter((c) => c.isBonus)
  const totalWt = regular.reduce((a, c) => a + c.weight, 0)

  return (
    <div className="space-y-3">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Component
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-18">
                Wt%
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">
                Max
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32">
                Score
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">
                Contrib
              </th>
              <th className="text-center px-2 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-12">
                Mode
              </th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-14">
                Bonus
              </th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {[...regular, ...bonuses].flatMap((comp) => {
              const mode = comp.scoringMode ?? 'single'
              const eff = effectiveScore(comp)
              const contrib = eff !== null ? contribution(comp) : null
              const isExpanded = expandedIds.has(comp.id)

              const mainRow = (
                <tr
                  key={comp.id}
                  className={`border-b border-border ${comp.isBonus ? 'bg-gold-light/40' : 'last:border-0'}`}
                >
                  {/* Name */}
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      {mode === 'multiple' && (
                        <button
                          onClick={() => toggleExpand(comp.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          title={isExpanded ? 'Collapse scores' : 'Expand scores'}
                        >
                          <Icon
                            name={isExpanded ? 'chevron-down' : 'chevron-right'}
                            size={12}
                          />
                        </button>
                      )}
                      <input
                        value={comp.name}
                        onChange={(e) => update(comp.id, { name: e.target.value })}
                        className="bg-transparent border-b border-transparent hover:border-border focus:border-ring outline-none text-sm w-full font-medium transition-colors"
                      />
                    </div>
                  </td>
                  {/* Weight */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={comp.weight}
                      onChange={(e) => update(comp.id, { weight: Number(e.target.value) })}
                      className="bg-transparent border-b border-transparent hover:border-border focus:border-ring outline-none text-sm font-mono text-right w-full transition-colors"
                    />
                  </td>
                  {/* Max Score */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      value={comp.maxScore}
                      onChange={(e) => update(comp.id, { maxScore: Number(e.target.value) })}
                      className="bg-transparent border-b border-transparent hover:border-border focus:border-ring outline-none text-sm font-mono text-right w-full transition-colors"
                    />
                  </td>
                  {/* Score / Aggregate */}
                  <td className="px-3 py-2">
                    {mode === 'single' ? (
                      <input
                        type="number"
                        min={0}
                        max={comp.maxScore}
                        placeholder="—"
                        value={comp.score ?? ''}
                        onChange={(e) =>
                          update(comp.id, {
                            score: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className={`bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-2 py-0.5 outline-none text-sm font-mono text-right w-full transition-colors ${
                          comp.score !== null ? 'text-primary font-semibold' : 'text-muted-foreground'
                        }`}
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 justify-end">
                        <select
                          value={comp.aggregation ?? 'average'}
                          onChange={(e) =>
                            update(comp.id, { aggregation: e.target.value as AggregationMethod })
                          }
                          className="bg-transparent text-[10px] text-muted-foreground border-b border-transparent hover:border-border focus:border-ring outline-none cursor-pointer"
                        >
                          <option value="average">Avg</option>
                          <option value="sum">Sum</option>
                          <option value="best">Best</option>
                          <option value="weighted">WAvg</option>
                        </select>
                        <span
                          className={`text-sm font-mono font-semibold ${eff !== null ? 'text-primary' : 'text-muted-foreground/40'}`}
                        >
                          {eff !== null ? eff.toFixed(1) : '—'}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/50">
                          ({(comp.scores ?? []).length})
                        </span>
                      </div>
                    )}
                  </td>
                  {/* Contribution */}
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`text-xs font-mono ${contrib !== null ? 'text-foreground' : 'text-muted-foreground/40'}`}
                    >
                      {contrib !== null ? contrib.toFixed(2) : '—'}
                    </span>
                  </td>
                  {/* Mode toggle */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => toggleMode(comp.id)}
                      title={`Switch to ${mode === 'single' ? 'multiple' : 'single'} scores`}
                      className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border transition-all ${
                        mode === 'multiple'
                          ? 'bg-silver-wolf/15 text-silver-wolf border-silver-wolf/30'
                          : 'text-muted-foreground/50 border-border hover:border-muted-foreground'
                      }`}
                    >
                      {mode === 'multiple' ? 'M' : 'S'}
                    </button>
                  </td>
                  {/* Bonus */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={comp.isBonus}
                      onChange={(e) => update(comp.id, { isBonus: e.target.checked })}
                      className="accent-accent w-3.5 h-3.5"
                    />
                  </td>
                  {/* Delete */}
                  <td className="px-2 py-2">
                    <button
                      onClick={() => remove(comp.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                      aria-label="Remove component"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </td>
                </tr>
              )

              // Multi-score expanded rows
              const expandedRows =
                mode === 'multiple' && isExpanded
                  ? [
                      ...(comp.scores ?? []).map((entry) => (
                        <tr key={`score-${entry.id}`} className="border-b border-border/60 bg-muted/20">
                          <td className="px-4 py-1.5 pl-10">
                            <input
                              value={entry.label}
                              onChange={(e) =>
                                updateScore(comp.id, entry.id, { label: e.target.value })
                              }
                              className="bg-transparent text-xs text-muted-foreground border-b border-transparent hover:border-border focus:border-ring outline-none w-full"
                              placeholder="Label"
                            />
                          </td>
                          <td className="px-3 py-1.5" />
                          <td className="px-3 py-1.5 text-right">
                            <span className="text-[10px] font-mono text-muted-foreground/50">
                              /{comp.maxScore}
                            </span>
                          </td>
                          <td className="px-3 py-1.5">
                            <input
                              type="number"
                              min={0}
                              max={comp.maxScore}
                              value={entry.value}
                              onChange={(e) =>
                                updateScore(comp.id, entry.id, {
                                  value: Number(e.target.value),
                                })
                              }
                              className="bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-2 py-0.5 outline-none text-xs font-mono text-right w-full transition-colors text-primary font-semibold"
                            />
                          </td>
                          <td colSpan={3} />
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => removeScore(comp.id, entry.id)}
                              className="text-muted-foreground/35 hover:text-destructive transition-colors p-1"
                              aria-label="Remove score"
                            >
                              <Icon name="x" size={11} />
                            </button>
                          </td>
                        </tr>
                      )),
                      // Add score row
                      <tr key={`add-${comp.id}`} className="border-b border-border/60 bg-muted/10">
                        <td className="px-4 py-1.5 pl-10">
                          <input
                            value={newScoreInputs[comp.id]?.label ?? ''}
                            onChange={(e) =>
                              setNewScoreInputs((prev) => ({
                                ...prev,
                                [comp.id]: { ...(prev[comp.id] ?? { value: '' }), label: e.target.value },
                              }))
                            }
                            placeholder="Label (optional)"
                            className="bg-transparent text-xs text-muted-foreground/60 border-b border-transparent hover:border-border focus:border-ring outline-none w-full"
                          />
                        </td>
                        <td className="px-3 py-1.5" colSpan={2} />
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-2 justify-end">
                            <input
                              type="number"
                              min={0}
                              max={comp.maxScore}
                              value={newScoreInputs[comp.id]?.value ?? ''}
                              onChange={(e) =>
                                setNewScoreInputs((prev) => ({
                                  ...prev,
                                  [comp.id]: {
                                    ...(prev[comp.id] ?? { label: '' }),
                                    value: e.target.value,
                                  },
                                }))
                              }
                              placeholder="score"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') addScore(comp.id)
                              }}
                              className="bg-transparent border border-transparent hover:border-border focus:border-ring rounded px-2 py-0.5 outline-none text-xs font-mono text-right w-20 transition-colors"
                            />
                            <button
                              onClick={() => addScore(comp.id)}
                              className="text-[10px] text-accent hover:text-accent/80 font-semibold transition-colors whitespace-nowrap"
                            >
                              + Add
                            </button>
                          </div>
                        </td>
                        <td colSpan={4} />
                      </tr>,
                    ]
                  : []

              return [mainRow, ...expandedRows]
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td className="px-4 py-2 text-xs text-muted-foreground font-medium">Regular total</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={`text-xs font-mono font-semibold ${
                    totalWt === 100
                      ? 'text-primary'
                      : totalWt > 100
                      ? 'text-destructive'
                      : 'text-accent'
                  }`}
                >
                  {totalWt}%
                </span>
              </td>
              <td colSpan={6} />
            </tr>
          </tfoot>
        </table></div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add Component
        </Button>
        {totalWt !== 100 && (
          <p className="text-xs text-accent flex items-center gap-1">
            <Icon name="alert-circle" size={12} />
            Weights sum to {totalWt}% (target: 100%)
          </p>
        )}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Grade Component"
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Component Name"
            placeholder="e.g. Quiz, Final Project"
            value={newComp.name}
            onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Weight (%)"
              type="number"
              min={0}
              max={100}
              placeholder="20"
              value={newComp.weight}
              onChange={(e) => setNewComp({ ...newComp, weight: e.target.value })}
            />
            <Input
              label="Max Score"
              type="number"
              min={1}
              placeholder="100"
              value={newComp.maxScore}
              onChange={(e) => setNewComp({ ...newComp, maxScore: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Scoring Mode
            </label>
            <div className="flex gap-2">
              {(['single', 'multiple'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setNewComp({ ...newComp, scoringMode: m })}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize border transition-colors ${
                    newComp.scoringMode === m
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {m === 'single' ? 'Single Score' : 'Multiple Scores'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {newComp.scoringMode === 'multiple'
                ? 'Add individual scores (e.g. Quiz 1, Quiz 2…) — calculated as average by default.'
                : 'Enter one final score for this component.'}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={newComp.isBonus}
              onChange={(e) => setNewComp({ ...newComp, isBonus: e.target.checked })}
              className="accent-accent"
            />
            <span>Bonus component (added on top, doesn't count in weight total)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}

// ─── Grade Summary ────────────────────────────────────────────────────────────

function GradeSummary({ course, gradingScale }: { course: any; gradingScale: any }) {
  const current = currentWeightedScore(course)
  const final = finalScore(course)
  const compWt = completedWeight(course)
  const remWt = remainingWeight(course)
  const totalWt = totalRegularWeight(course)
  const bonus = bonusContribution(course)

  const displayScore = final ?? current
  const letter = displayScore !== null ? letterGrade(displayScore, gradingScale) : null

  const letterStyle: Record<string, string> = {
    A: 'text-emerald-700 bg-emerald-50',
    'A-': 'text-emerald-600 bg-emerald-50',
    'B+': 'text-primary bg-sage-light',
    B: 'text-primary bg-sage-light',
    'B-': 'text-primary bg-sage-light',
    'C+': 'text-accent bg-gold-light',
    C: 'text-accent bg-gold-light',
    'C-': 'text-amber-700 bg-amber-50',
    D: 'text-orange-700 bg-orange-50',
    F: 'text-destructive bg-red-50',
  }

  return (
    <div className="grid grid-cols-3 gap-px bg-border rounded-lg overflow-hidden">
      <div className="bg-card px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
          {final !== null ? 'Final Score' : 'Current Score'}
        </p>
        <p className="text-3xl font-display font-semibold">
          {displayScore !== null ? displayScore.toFixed(1) : '—'}
        </p>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          {final !== null ? 'all components done' : `${compWt.toFixed(0)}% of weight complete`}
        </p>
      </div>

      <div className="bg-card px-5 py-4 flex flex-col items-center justify-center">
        {letter ? (
          <span
            className={`text-4xl font-display font-bold px-4 py-2 rounded-lg ${letterStyle[letter] ?? 'text-foreground bg-muted'}`}
          >
            {letter}
          </span>
        ) : (
          <span className="text-2xl text-muted-foreground/30 font-display">—</span>
        )}
        <p className="text-xs text-muted-foreground mt-2">Letter grade</p>
      </div>

      <div className="bg-card px-5 py-4 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Progress</p>
        <Progress value={compWt} max={totalWt} label={`${compWt.toFixed(0)}% done`} variant="primary" />
        <p className="text-xs text-muted-foreground font-mono">
          {remWt.toFixed(0)}% remaining
          {bonus > 0 && ` · +${bonus.toFixed(2)} bonus`}
        </p>
      </div>
    </div>
  )
}

// ─── Grade Simulator ──────────────────────────────────────────────────────────

function GradeSimulator({ course, gradingScale }: { course: any; gradingScale: any }) {
  const regular = course.gradeComponents.filter((c: GradeComponent) => !c.isBonus)
  const [hypothetical, setHypothetical] = useState<Record<string, number>>(() => {
    const defaults: Record<string, number> = {}
    regular.forEach((c: GradeComponent) => {
      const eff = effectiveScore(c)
      defaults[c.id] = eff ?? 75
    })
    return defaults
  })

  const simCourse = {
    ...course,
    gradeComponents: course.gradeComponents.map((c: GradeComponent) =>
      c.isBonus ? c : { ...c, scoringMode: 'single', score: hypothetical[c.id] ?? effectiveScore(c) ?? 75 },
    ),
  }

  const simFinal = finalScore(simCourse)
  const simLetter = simFinal !== null ? letterGrade(simFinal, gradingScale) : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Adjust hypothetical scores to project your final grade.
      </p>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Component
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">
                Weight%
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-28">
                Score (hyp.)
              </th>
              <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                Contrib
              </th>
            </tr>
          </thead>
          <tbody>
            {regular.map((comp: GradeComponent) => {
              const val = hypothetical[comp.id] ?? 75
              const contrib = (val / comp.maxScore) * comp.weight
              const actual = effectiveScore(comp)
              return (
                <tr key={comp.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {comp.name}
                    {actual !== null && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal font-mono">
                        (actual: {actual.toFixed(1)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                    {comp.weight}%
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 justify-end">
                      <input
                        type="range"
                        min={0}
                        max={comp.maxScore}
                        step={0.5}
                        value={val}
                        onChange={(e) =>
                          setHypothetical((prev) => ({ ...prev, [comp.id]: Number(e.target.value) }))
                        }
                        className="w-24 accent-silver-wolf"
                      />
                      <input
                        type="number"
                        min={0}
                        max={comp.maxScore}
                        value={val}
                        onChange={(e) =>
                          setHypothetical((prev) => ({ ...prev, [comp.id]: Number(e.target.value) }))
                        }
                        className="w-16 bg-card border border-border rounded px-2 py-0.5 text-xs font-mono text-right outline-none focus:border-ring"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{contrib.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table></div>
      </div>

      <div className="flex items-center gap-6 px-5 py-4 bg-indigo-light/60 border border-secondary/20 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Projected Final</p>
          <p className="text-3xl font-display font-semibold text-secondary">
            {simFinal?.toFixed(1) ?? '—'}
          </p>
        </div>
        {simLetter && (
          <div className="border-l border-secondary/20 pl-6">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Grade</p>
            <p className="text-3xl font-display font-bold text-secondary">{simLetter}</p>
          </div>
        )}
        <p className="ml-auto text-xs text-muted-foreground max-w-xs">
          Simulator uses hypothetical scores above. Actual recorded scores shown alongside.
        </p>
      </div>
    </div>
  )
}

// ─── Tasks tab ────────────────────────────────────────────────────────────────

function TasksTab({ courseId }: { courseId: string }) {
  const { state, getCourse, addTask, toggleTask, deleteTask } = useStore()
  const course = getCourse(courseId)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', dueDate: '', priority: 'medium' as Task['priority'], difficulty: 'medium' as TaskDifficulty })
  const [filesOpen, setFilesOpen] = useState<string | null>(null)

  if (!course) return null
  const tasks = course.tasks

  function handleAdd() {
    if (!form.title.trim()) return
    addTask({
      title: form.title.trim(),
      dueDate: form.dueDate || undefined,
      priority: form.priority,
      difficulty: form.difficulty,
      completed: false,
      courseId,
    })
    setForm({ title: '', dueDate: '', priority: 'medium', difficulty: 'medium' })
    setAddOpen(false)
  }

  const priorityBadge = { low: 'muted', medium: 'primary', high: 'accent' } as const

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon="check-square" title="No tasks" description="Add tasks for this course." />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="bg-card border border-border rounded-lg">
            <div
              className={`flex items-center gap-3 px-4 py-3 ${task.completed ? 'opacity-60' : ''}`}
            >
              <button
                onClick={() => toggleTask(task.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  task.completed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border hover:border-primary'
                }`}
              >
                {task.completed && <Icon name="check" size={11} />}
              </button>
              <span className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
                {task.assignmentId && (
                  <span className="block text-[10px] font-mono uppercase tracking-wide text-accent">
                    Assignment{getTaskAssignment(state, task) ? `: ${getTaskAssignment(state, task)!.title}` : ''}
                  </span>
                )}
              </span>
              {task.dueDate && (
                <span className="text-xs font-mono text-muted-foreground">{task.dueDate}</span>
              )}
              <Badge variant={priorityBadge[task.priority]}>{task.priority}</Badge>
              <DifficultyEdit task={task} />
              <AttachmentToggle
                entityType="task"
                entityId={task.id}
                open={filesOpen === task.id}
                onToggle={() => setFilesOpen(filesOpen === task.id ? null : task.id)}
              />
              <button
                onClick={() => deleteTask(task.id)}
                className="text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
            {filesOpen === task.id && (
              <div className="px-4 pb-3 pt-1 border-t border-border">
                <AttachmentSection entityType="task" entityId={task.id} semesterId={task.semesterId} courseId={courseId} className="pt-2" />
              </div>
            )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Task"
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Task"
            placeholder="e.g. Submit Assignment 1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label="Due Date (optional)"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Priority
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setForm({ ...form, priority: p })}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize border transition-colors ${
                    form.priority === p
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
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

// ─── Materials tab ────────────────────────────────────────────────────────────

function MaterialsTab({ courseId }: { courseId: string }) {
  const { getCourse, deleteMaterial } = useStore()
  const course = getCourse(courseId)
  const [addOpen, setAddOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState<string | null>(null)
  const [fileErrors, setFileErrors] = useState<string[]>([])

  if (!course) return null
  const materials = [...course.materials].sort((a, b) => a.week - b.week)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add Material
        </Button>
      </div>

      {!addOpen && fileErrors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
          <p className="text-xs font-medium text-destructive">Material saved, but some files were not attached:</p>
          {fileErrors.map((e) => <p key={e} className="text-xs text-destructive break-words">{e}</p>)}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => setFileErrors([])}>Dismiss</button>
        </div>
      )}

      {materials.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No materials yet"
          description="Add lecture slides, readings, and other course materials."
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto -mx-1 px-1"><table className="w-full text-sm min-w-[460px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-12">Wk</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Topic</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide w-16">Link</th>
                <th className="w-24" />
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {materials.map((mat) => (
                <Fragment key={mat.id}>
                <tr className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-sm font-mono text-muted-foreground text-center">{mat.week}</td>
                  <td className="px-4 py-2.5 text-sm font-medium">{mat.topic}</td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                      {MATERIAL_TYPE_LABELS[mat.type]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {mat.url ? (
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline text-xs flex items-center gap-1"
                      >
                        <Icon name="external-link" size={11} />
                        Open
                      </a>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-1 py-1.5">
                    <AttachmentToggle
                      entityType="material"
                      entityId={mat.id}
                      showLabel
                      open={filesOpen === mat.id}
                      onToggle={() => setFilesOpen(filesOpen === mat.id ? null : mat.id)}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <button
                      onClick={() => deleteMaterial(courseId, mat.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </td>
                </tr>
                {filesOpen === mat.id && (
                  <tr className="border-b border-border last:border-0 bg-muted/20">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="max-w-xl">
                        <AttachmentSection entityType="material" entityId={mat.id} semesterId={mat.semesterId} courseId={courseId} />
                      </div>
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {addOpen && (
        <MaterialEditor
          courseId={courseId}
          lockCourse
          onClose={() => setAddOpen(false)}
          onAdded={(mat, errs, n) => {
            setFileErrors(errs)
            if (n > 0) setFilesOpen(mat.id)
          }}
        />
      )}
    </div>
  )
}

// ─── Certificates tab ─────────────────────────────────────────────────────────

function CertificatesTab({ courseId }: { courseId: string }) {
  const { state } = useStore()
  const [adding, setAdding] = useState(false)
  const [filesOpen, setFilesOpen] = useState<string | null>(null)
  const certs = getCourseCertificates(state, courseId)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add Certificate</Button>
      </div>
      {certs.length === 0 ? (
        <EmptyState icon="award" title="No certificates yet" description="Certificates linked to this course will appear here." />
      ) : (
        <Card className="divide-y divide-border/60">
          {certs.map((c) => (
            <CertificateCard key={c.id} cert={c} open={filesOpen === c.id} onToggleFiles={() => setFilesOpen(filesOpen === c.id ? null : c.id)} />
          ))}
        </Card>
      )}
      {adding && <CertificateEditor defaultCourseId={courseId} onClose={() => setAdding(false)} onSaved={(c, _e, n) => n > 0 && setFilesOpen(c.id)} />}
    </div>
  )
}

// ─── Notes tab ────────────────────────────────────────────────────────────────

function NotesTab({ courseId }: { courseId: string }) {
  const { state, addNote, updateNote, deleteNote } = useStore()
  const notes = getCourseNotes(state, courseId)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', week: '' })
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  function handleAdd() {
    if (!form.content.trim()) return
    addNote({
      courseId,
      title: form.title.trim() || undefined,
      content: form.content.trim(),
      week: form.week ? parseInt(form.week) : undefined,
    })
    setForm({ title: '', content: '', week: '' })
    setAddOpen(false)
  }

  function startEdit(id: string, content: string) {
    setEditing(id)
    setEditContent(content)
  }

  function saveEdit(id: string) {
    updateNote(id, { content: editContent.trim() })
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="plus" onClick={() => setAddOpen(true)}>
          Add Note
        </Button>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No notes yet"
          description="Add notes for lectures, discussions, or assessments."
        />
      ) : (
        <div className="space-y-3">
          {[...notes].reverse().map((note) => (
            <div key={note.id} className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {note.title && (
                      <span className="text-sm font-medium">{note.title}</span>
                    )}
                    {note.week && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted rounded border border-border text-muted-foreground">
                        Week {note.week}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {editing === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full text-sm bg-muted rounded-md border border-border p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(note.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  )}
                  <AttachmentSection entityType="note" entityId={note.id} semesterId={note.semesterId} courseId={courseId} compact className="mt-3" />
                </div>
                {editing !== note.id && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(note.id, note.content)}
                      className="text-muted-foreground/40 hover:text-foreground transition-colors p-1"
                    >
                      <Icon name="edit-2" size={13} />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Note"
        actions={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Title (optional)"
              placeholder="e.g. Lecture 4 Notes"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Input
              label="Week (optional)"
              type="number"
              min={1}
              max={16}
              value={form.week}
              onChange={(e) => setForm({ ...form, week: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={5}
              placeholder="Write your notes here…"
              className="w-full text-sm bg-card rounded-md border border-border p-3 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Portfolio tab ────────────────────────────────────────────────────────────

function PortfolioTab({ courseId }: { courseId: string }) {
  const { state } = useStore()
  const [adding, setAdding] = useState(false)
  const items = getCoursePortfolioItems(state, courseId)
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Add Portfolio Item</Button>
      </div>
      {items.length === 0 ? (
        <EmptyState icon="briefcase" title="No portfolio items yet" description="Projects, achievements and experiences linked to this course will appear here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((p) => <PortfolioCard key={p.id} item={p} />)}
        </div>
      )}
      {adding && <PortfolioItemEditor defaultCourseId={courseId} onClose={() => setAdding(false)} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'info' as const },
  { key: 'grades', label: 'Grades', icon: 'layers' as const },
  { key: 'simulator', label: 'Simulator', icon: 'calculator' as const },
  { key: 'assignments', label: 'Assignments', icon: 'file-text' as const },
  { key: 'materials', label: 'Materials', icon: 'folder' as const },
  { key: 'notes', label: 'Notes', icon: 'edit-2' as const },
  { key: 'tasks', label: 'Tasks', icon: 'check-square' as const },
  { key: 'certificates', label: 'Certificates', icon: 'award' as const },
  { key: 'portfolio', label: 'Portfolio', icon: 'briefcase' as const },
]

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { getCourse, updateCourseComponents, state } = useStore()
  const [searchParams] = useSearchParams()
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab')
    return TABS.some((x) => x.key === t) ? (t as string) : 'overview'
  })

  const course = getCourse(id!)
  if (!course) {
    return (
      <div className="p-4 md:p-6">
        <EmptyState icon="alert-circle" title="Course not found" />
      </div>
    )
  }

  const current = currentWeightedScore(course)
  const final = finalScore(course)
  const displayScore = final ?? current
  const letter = displayScore !== null ? letterGrade(displayScore, state.gradingScale) : null

  const scheduleSlots = course.classSchedule ?? []
  const slotRooms = Array.from(new Set(scheduleSlots.map((x) => x.room).filter(Boolean) as string[]))
  const roomSummary = slotRooms.length ? slotRooms.join(' / ') : course.room || '—'

  let yearNum = 1
  let semNum = 1
  for (const y of state.academicYears) {
    for (const s of y.semesters) {
      if (s.courses.find((c) => c.id === id)) {
        yearNum = y.number
        semNum = s.number
      }
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Breadcrumb + Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
          <Link to="/academics" className="hover:text-foreground">
            Academics
          </Link>
          <Icon name="chevron-right" size={11} />
          <Link to={`/academics/${yearNum}/${semNum}`} className="hover:text-foreground">
            Year {yearNum} · Sem {semNum}
          </Link>
          <Icon name="chevron-right" size={11} />
          <span className="text-foreground font-medium">{course.code}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-muted-foreground">{course.code}</span>
              <Badge variant="outline">{course.sks} SKS</Badge>
              <Badge variant={course.status === 'active' ? 'secondary' : 'muted'}>
                {course.status}
              </Badge>
            </div>
            <h1 className="font-display text-2xl font-semibold leading-tight">{course.name}</h1>
            {course.lecturer && (
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                <Icon name="user" size={13} /> {course.lecturer}
              </p>
            )}
          </div>

          {displayScore !== null && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-display font-bold">{displayScore.toFixed(1)}</p>
              {letter && <p className="text-lg font-display font-semibold text-accent">{letter}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <GradeSummary course={course} gradingScale={state.gradingScale} />

            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Course Information
                </h3>
                <Button variant="outline" size="sm" icon="edit-2" onClick={() => setEditOpen(true)}>
                  Edit Course
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: 'Course Code', value: course.code },
                  { label: 'Credits (SKS)', value: `${course.sks} SKS` },
                  { label: 'Lecturer', value: course.lecturer || '—' },
                  { label: 'Room', value: roomSummary },
                  { label: 'Status', value: course.status },
                ].map((row) => (
                  <div key={row.label}>
                    <p className="text-xs text-muted-foreground mb-0.5">{row.label}</p>
                    <p className="text-sm font-medium break-words">{row.value}</p>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Schedule</p>
                  {scheduleSlots.length > 0 ? (
                    <ul className="space-y-0.5">
                      {scheduleSlots.map((sl, i) => (
                        <li key={i} className="text-sm font-medium">
                          {sl.day.slice(0, 3)} {sl.start}–{sl.end}
                          {(sl.room || course.room) ? ` · ${sl.room || course.room}` : ''}
                          {sl.isLab ? ' · Lab' : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium">{course.schedule || '—'}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Grade Components
                </h3>
                <button
                  onClick={() => setActiveTab('grades')}
                  className="text-xs text-accent hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-2">
                {course.gradeComponents.map((comp) => {
                  const eff = effectiveScore(comp)
                  const mode = comp.scoringMode ?? 'single'
                  return (
                    <div key={comp.id} className="flex items-center gap-3">
                      <span className="text-xs font-medium flex-1">{comp.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{comp.weight}%</span>
                      {mode === 'multiple' ? (
                        <span className="text-xs font-mono text-muted-foreground/60">
                          {(comp.scores ?? []).length} scores
                          {eff !== null && ` · avg ${eff.toFixed(1)}`}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-mono w-16 text-right ${eff !== null ? 'text-primary font-semibold' : 'text-muted-foreground/40'}`}
                        >
                          {eff !== null ? `${eff.toFixed(1)}/${comp.maxScore}` : '—'}
                        </span>
                      )}
                      {comp.isBonus && (
                        <Badge variant="accent" className="text-[10px]">
                          Bonus
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="space-y-6">
            <GradeSummary course={course} gradingScale={state.gradingScale} />
            <GradeTable
              components={course.gradeComponents}
              onChange={(components) => updateCourseComponents(course.id, components)}
            />
          </div>
        )}

        {activeTab === 'simulator' && (
          <GradeSimulator course={course} gradingScale={state.gradingScale} />
        )}

        {activeTab === 'assignments' && <AssignmentsTab courseId={course.id} />}

        {activeTab === 'materials' && <MaterialsTab courseId={course.id} />}
        {activeTab === 'certificates' && <CertificatesTab courseId={course.id} />}
        {activeTab === 'portfolio' && <PortfolioTab courseId={course.id} />}

        {activeTab === 'notes' && <NotesTab courseId={course.id} />}

        {activeTab === 'tasks' && <TasksTab courseId={course.id} />}
      </div>
      <EditCourseModal course={editOpen ? course : null} onClose={() => setEditOpen(false)} />
    </div>
  )
}
