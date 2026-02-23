import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAttemptDetail, useQuiz, useAttemptHistory } from '../hooks/useQuiz'
import usePageTitle from '../hooks/usePageTitle'
import Spinner from '../components/ui/Spinner'
import RichText from '../components/ui/RichText'

export default function QuizResultsPage() {
  const { unitId, attemptId } = useParams<{
    unitId: string
    attemptId: string
  }>()
  const navigate = useNavigate()
  const { data: result, isLoading } = useAttemptDetail(attemptId!)
  const { data: quiz } = useQuiz(unitId!, true)
  const { data: attemptHistory } = useAttemptHistory(unitId!)
  usePageTitle(result ? `${Math.round(result.score)}% - Victory Debrief` : 'Victory Debrief')
  const [activeTab, setActiveTab] = useState<'mistakes' | 'all'>('mistakes')
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set())

  const toggleExplanation = (questionId: string) => {
    setExpandedExplanations((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!result) {
    return (
      <p className="py-12 text-center text-[var(--error)]">
        Failed to load quiz results.
      </p>
    )
  }

  const percentage = Math.round(result.score)
  const mistakes = result.results.filter((r) => !r.is_correct)
  const displayResults = activeTab === 'mistakes' ? mistakes : result.results

  // Build difficulty map from quiz questions
  const difficultyMap = new Map<string, string>()
  if (quiz) {
    for (const q of quiz.questions) {
      difficultyMap.set(q.id, q.difficulty)
    }
  }

  // Calculate difficulty breakdown
  const difficultyStats = { easy: { correct: 0, total: 0 }, medium: { correct: 0, total: 0 }, hard: { correct: 0, total: 0 } }
  for (const r of result.results) {
    const diff = (difficultyMap.get(r.question_id) || 'medium') as keyof typeof difficultyStats
    if (diff in difficultyStats) {
      difficultyStats[diff].total++
      if (r.is_correct) difficultyStats[diff].correct++
    }
  }

  // Attempt trend data
  const sortedAttempts = attemptHistory
    ? [...attemptHistory].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    : []

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(`/units/${unitId}`)}
        className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        &larr; Back to Unit
      </button>

      {/* Score summary */}
      <div className="surface-card p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${
            percentage >= 80
              ? 'bg-[var(--success-soft)] text-[var(--success)]'
              : percentage >= 50
                ? 'bg-[var(--warning-soft)] text-[var(--warning)]'
                : 'bg-[var(--error-soft)] text-[var(--error)]'
          }`}
        >
          {percentage}%
        </div>
        <p className="mt-4 text-lg font-medium text-[var(--text-primary)]">
          {result.correct_count} of {result.total_questions} correct
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {percentage >= 80
            ? 'Excellent work!'
            : percentage >= 50
              ? 'Good effort, keep studying!'
              : 'Review the material and try again.'}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            to={`/units/${unitId}/quiz`}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
          >
            Retake Quiz
          </Link>
          <Link
            to={`/units/${unitId}`}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-muted)]"
          >
            Back to Unit
          </Link>
        </div>
      </div>

      {/* Difficulty breakdown */}
      {quiz && (
        <div className="mt-6 surface-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Score by Difficulty</h3>
          <div className="space-y-3">
            {(['easy', 'medium', 'hard'] as const).map((level) => {
              const stats = difficultyStats[level]
              if (stats.total === 0) return null
              const pct = Math.round((stats.correct / stats.total) * 100)
              const colorMap = { easy: 'var(--success)', medium: 'var(--warning)', hard: 'var(--accent)' }
              return (
                <div key={level} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-medium capitalize text-[var(--text-secondary)]">{level}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-muted)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: colorMap[level] }}
                    />
                  </div>
                  <span className="meta-font w-12 text-right text-xs text-[var(--text-tertiary)]">
                    {stats.correct}/{stats.total}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Attempt trend */}
      {sortedAttempts.length > 1 && (
        <div className="mt-6 surface-card p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Score Trend</h3>
          <svg viewBox="0 0 300 100" className="w-full" preserveAspectRatio="xMidYMid meet">
            {(() => {
              const pts = sortedAttempts.map((a, i) => ({
                x: sortedAttempts.length === 1 ? 150 : 30 + (i / (sortedAttempts.length - 1)) * 240,
                y: 90 - ((a.score ?? 0) / 100) * 80,
                score: Math.round(a.score ?? 0),
                isCurrent: a.id === attemptId,
              }))
              const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ')
              return (
                <>
                  <polyline
                    points={polyline}
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {pts.map((p, i) => (
                    <g key={i}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={p.isCurrent ? 5 : 3}
                        fill={p.isCurrent ? 'var(--accent)' : 'var(--primary)'}
                      />
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        fontSize="9"
                        fill="var(--text-secondary)"
                      >
                        {p.score}%
                      </text>
                    </g>
                  ))}
                </>
              )
            })()}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>Attempt 1</span>
            <span>Attempt {sortedAttempts.length}</span>
          </div>
        </div>
      )}

      {/* Review tabs */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('mistakes')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'mistakes'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Review Mistakes ({mistakes.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Review All ({result.results.length})
          </button>
        </div>

        {displayResults.length === 0 ? (
          <div className="rounded-xl border border-[var(--success-soft)] bg-[var(--success-soft)] p-6 text-center">
            <p className="text-sm font-medium text-[var(--success)]">No mistakes — perfect score!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayResults.map((r) => {
              const globalIndex = result.results.findIndex((x) => x.question_id === r.question_id)
              const isExplanationOpen = expandedExplanations.has(r.question_id)
              return (
                <div
                  key={r.question_id}
                  className={`rounded-xl border p-5 ${
                    r.is_correct
                      ? 'border-[var(--success-soft)] bg-[var(--success-soft)]'
                      : 'border-[var(--error-soft)] bg-[var(--error-soft)]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        r.is_correct ? 'bg-[var(--success)]' : 'bg-[var(--error)]'
                      }`}
                    >
                      {globalIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-[var(--text-primary)]">
                        <RichText content={r.question_text} />
                      </div>

                      <div className="mt-3 space-y-2">
                        {r.options.map((opt) => {
                          const isSelected = opt.key === r.selected_option
                          const isCorrect = opt.key === r.correct_option
                          return (
                            <div
                              key={opt.key}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                                isCorrect
                                  ? 'bg-[var(--success-soft)] font-medium text-[var(--success)]'
                                  : isSelected
                                    ? 'bg-[var(--error-soft)] text-[var(--error)]'
                                    : 'text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="font-medium">{opt.key}.</span>
                              <span><RichText content={opt.text} inline /></span>
                              {isCorrect && <span className="ml-auto text-xs">Correct</span>}
                              {isSelected && !isCorrect && (
                                <span className="ml-auto text-xs">Your answer</span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Collapsible explanation */}
                      <button
                        onClick={() => toggleExplanation(r.question_id)}
                        className="mt-3 text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                      >
                        {isExplanationOpen ? 'Hide explanation' : 'Show explanation'}
                      </button>
                      {isExplanationOpen && (
                        <div className="mt-2 text-sm text-[var(--text-secondary)]">
                          <RichText content={r.explanation} />
                        </div>
                      )}

                      {/* Study link for wrong answers */}
                      {!r.is_correct && (
                        <Link
                          to={`/units/${unitId}`}
                          className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          Study this topic &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
