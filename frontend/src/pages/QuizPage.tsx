import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuiz, useCreateAttempt, useSubmitQuiz } from '../hooks/useQuiz'
import QuestionCard from '../components/QuestionCard'
import Spinner from '../components/ui/Spinner'
import ProgressBar from '../components/ui/ProgressBar'
import { loadGsap } from '../utils/gsap'
import usePageTitle from '../hooks/usePageTitle'

const DRAFT_PREFIX = 'learner_quiz_draft_'

export default function QuizPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { data: quiz, isLoading } = useQuiz(unitId!)
  usePageTitle(quiz?.unit_title ? `${quiz.unit_title} - Quiz Showdown` : 'Quiz Showdown')
  const createAttempt = useCreateAttempt()
  const submitQuiz = useSubmitQuiz()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [pulseUnanswered, setPulseUnanswered] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Restore draft answers from localStorage on start
  useEffect(() => {
    if (!started || !unitId || !quiz) return
    const key = DRAFT_PREFIX + unitId
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, string>
        if (Object.keys(parsed).length > 0) {
          setAnswers(parsed)
          setDraftRestored(true)
          setTimeout(() => setDraftRestored(false), 3000)
        }
      }
    } catch { /* ignore parse errors */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started])

  // Save answers to localStorage on change
  useEffect(() => {
    if (!started || !unitId) return
    const key = DRAFT_PREFIX + unitId
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(key, JSON.stringify(answers))
    }
  }, [answers, unitId, started])

  useEffect(() => {
    const runningTweens: Array<{ kill: () => void }> = []
    let isCancelled = false

    void loadGsap().then((gsap) => {
      if (!gsap || isCancelled || !containerRef.current) return
      const blocks = containerRef.current.querySelectorAll('[data-animate]')
      if (!blocks.length) return
      runningTweens.push(
        gsap.fromTo(
          blocks,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' },
        ),
      )
    })

    return () => {
      isCancelled = true
      runningTweens.forEach((tween) => tween.kill())
    }
  }, [started, currentIndex])

  const handleStart = useCallback(async () => {
    const attempt = await createAttempt.mutateAsync(unitId!)
    setAttemptId(attempt.id)
    setStarted(true)
  }, [createAttempt, unitId])

  const handleSelect = useCallback(
    (option: string) => {
      if (!quiz) return
      const questionId = quiz.questions[currentIndex].id
      setAnswers((prev) => ({ ...prev, [questionId]: option }))
    },
    [quiz, currentIndex],
  )

  const handleSubmit = useCallback(async () => {
    if (!attemptId || !quiz) return

    // Check for unanswered
    const firstUnanswered = quiz.questions.findIndex((q) => !answers[q.id])
    if (firstUnanswered !== -1) {
      setCurrentIndex(firstUnanswered)
      setPulseUnanswered(true)
      setTimeout(() => setPulseUnanswered(false), 2000)
      return
    }

    const answerList = quiz.questions
      .filter((q) => answers[q.id])
      .map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id],
      }))

    const result = await submitQuiz.mutateAsync({ attemptId, answers: answerList })
    // Clear draft on success
    localStorage.removeItem(DRAFT_PREFIX + unitId)
    navigate(`/units/${unitId}/quiz/results/${result.attempt_id}`)
  }, [attemptId, quiz, answers, submitQuiz, navigate, unitId])

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!quiz) {
    return (
      <p className="py-12 text-center text-[var(--error)]">
        No quiz available for this unit.
      </p>
    )
  }

  if (!started) {
    return (
      <div ref={containerRef} className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(`/units/${unitId}`)}
          className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          &larr; Back to Unit
        </button>
        <div data-animate className="surface-card p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{quiz.unit_title}</h1>
          <p className="meta-font mt-2 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
            {quiz.questions.length} questions
          </p>
          {quiz.best_score != null && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Best score: {Math.round(quiz.best_score)}%
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={createAttempt.isPending}
            className="mt-6 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {createAttempt.isPending ? 'Starting...' : 'Start Quiz'}
          </button>
        </div>
      </div>
    )
  }

  const question = quiz.questions[currentIndex]
  const answeredCount = quiz.questions.filter((q) => answers[q.id]).length
  const allAnswered = answeredCount === quiz.questions.length
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100

  return (
    <div ref={containerRef}>
      {/* Draft restored toast */}
      {draftRestored && (
        <div className="fixed right-4 top-20 z-30 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-white shadow-lg">
          Draft restored
        </div>
      )}

      <button
        onClick={() => navigate(`/units/${unitId}`)}
        className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        &larr; Back to Unit
      </button>

      <div data-animate>
        <ProgressBar value={progress} className="mb-6" />
      </div>

      {/* Main grid: question + sidebar */}
      <div className="gap-6 lg:grid lg:grid-cols-[1fr_220px]">
        {/* Question area */}
        <div>
          <div data-animate>
            <QuestionCard
              question={question}
              questionIndex={currentIndex}
              totalQuestions={quiz.questions.length}
              selectedOption={answers[question.id] || null}
              onSelectOption={handleSelect}
            />
          </div>

          {/* Navigation bar */}
          <div data-animate className="mt-6 flex items-center justify-between surface-card p-3 shadow-sm">
            <button
              onClick={() => setCurrentIndex((i) => i - 1)}
              disabled={currentIndex === 0}
              className="rounded-lg px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] disabled:opacity-30"
            >
              Previous
            </button>

            {/* Mobile: inline dot indicators (hidden on lg) */}
            <div className="flex gap-1 lg:hidden">
              {quiz.questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${
                    i === currentIndex
                      ? 'bg-[var(--primary)]'
                      : answers[q.id]
                        ? 'bg-[var(--primary-muted)]'
                        : 'bg-[var(--bg-elevated)]'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {currentIndex < quiz.questions.length - 1 && (
                <button
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
                >
                  Next
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitQuiz.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                  allAnswered
                    ? 'bg-[var(--success)] hover:opacity-90'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] cursor-default'
                }`}
              >
                {submitQuiz.isPending
                  ? 'Submitting...'
                  : allAnswered
                    ? 'Submit Quiz'
                    : `${answeredCount}/${quiz.questions.length} answered`}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar: question grid (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-20 surface-card p-4 shadow-sm">
            <p className="meta-font mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
              Questions
            </p>
            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, i) => {
                const isAnswered = !!answers[q.id]
                const isCurrent = i === currentIndex
                const shouldPulse = pulseUnanswered && !isAnswered
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                      isCurrent
                        ? 'ring-2 ring-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary)]'
                        : isAnswered
                          ? 'bg-[var(--primary)] text-white'
                          : 'bg-[var(--bg-muted)] text-[var(--text-tertiary)]'
                    } ${shouldPulse ? 'animate-pulse ring-2 ring-[var(--accent)]' : ''}`}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--primary)]" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[var(--bg-muted)]" /> Remaining
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
