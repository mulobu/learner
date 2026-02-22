import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuiz, useCreateAttempt, useSubmitQuiz } from '../hooks/useQuiz'
import QuestionCard from '../components/QuestionCard'
import Spinner from '../components/ui/Spinner'
import ProgressBar from '../components/ui/ProgressBar'
import { loadGsap } from '../utils/gsap'

export default function QuizPage() {
  const { unitId } = useParams<{ unitId: string }>()
  const navigate = useNavigate()
  const { data: quiz, isLoading } = useQuiz(unitId!)
  const createAttempt = useCreateAttempt()
  const submitQuiz = useSubmitQuiz()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [started, setStarted] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

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
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power2.out',
          },
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
    const answerList = quiz.questions
      .filter((q) => answers[q.id])
      .map((q) => ({
        question_id: q.id,
        selected_option: answers[q.id],
      }))

    const result = await submitQuiz.mutateAsync({
      attemptId,
      answers: answerList,
    })
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
      <p className="py-12 text-center text-red-600">
        No quiz available for this unit.
      </p>
    )
  }

  if (!started) {
    return (
      <div ref={containerRef} className="mx-auto max-w-lg">
        <button
          onClick={() => navigate(`/units/${unitId}`)}
          className="mb-4 text-sm text-gray-600 hover:text-gray-800"
        >
          &larr; Back to Unit
        </button>
        <div data-animate className="rounded-2xl border border-white/80 bg-white/90 p-8 text-center shadow-[0_12px_36px_-28px_rgba(15,23,42,0.8)]">
          <h1 className="text-2xl font-bold text-gray-900">{quiz.unit_title}</h1>
          <p className="meta-font mt-2 text-xs uppercase tracking-wide text-gray-500">
            {quiz.questions.length} questions
          </p>
          {quiz.best_score != null && (
            <p className="mt-1 text-sm text-gray-500">
              Best score: {Math.round(quiz.best_score)}%
            </p>
          )}
          <button
            onClick={handleStart}
            disabled={createAttempt.isPending}
            className="mt-6 rounded-lg bg-teal-700 px-6 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {createAttempt.isPending ? 'Starting...' : 'Start Quiz'}
          </button>
        </div>
      </div>
    )
  }

  const question = quiz.questions[currentIndex]
  const allAnswered = quiz.questions.every((q) => answers[q.id])
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100

  return (
    <div ref={containerRef} className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(`/units/${unitId}`)}
        className="mb-4 text-sm text-gray-600 hover:text-gray-800"
      >
        &larr; Back to Unit
      </button>

      <div data-animate>
        <ProgressBar value={progress} className="mb-6" />
      </div>

      <div data-animate>
        <QuestionCard
          question={question}
          questionIndex={currentIndex}
          totalQuestions={quiz.questions.length}
          selectedOption={answers[question.id] || null}
          onSelectOption={handleSelect}
        />
      </div>

      <div data-animate className="mt-6 flex items-center justify-between rounded-2xl border border-white/85 bg-white/70 p-3">
        <button
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={currentIndex === 0}
          className="rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-30"
        >
          Previous
        </button>

        <div className="flex gap-1">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i === currentIndex
                  ? 'bg-teal-700'
                  : answers[q.id]
                    ? 'bg-teal-300'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {currentIndex < quiz.questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitQuiz.isPending}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitQuiz.isPending ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  )
}
