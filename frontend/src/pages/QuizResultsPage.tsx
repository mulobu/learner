import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAttemptDetail } from '../hooks/useQuiz'
import Spinner from '../components/ui/Spinner'

export default function QuizResultsPage() {
  const { unitId, attemptId } = useParams<{
    unitId: string
    attemptId: string
  }>()
  const navigate = useNavigate()
  const { data: result, isLoading } = useAttemptDetail(attemptId!)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!result) {
    return (
      <p className="py-12 text-center text-red-600">
        Failed to load quiz results.
      </p>
    )
  }

  const percentage = Math.round(result.score)

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(`/units/${unitId}`)}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Back to Unit
      </button>

      {/* Score summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold ${
            percentage >= 80
              ? 'bg-green-100 text-green-700'
              : percentage >= 50
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {percentage}%
        </div>
        <p className="mt-4 text-lg font-medium text-gray-900">
          {result.correct_count} of {result.total_questions} correct
        </p>
        <p className="mt-1 text-sm text-gray-500">
          {percentage >= 80
            ? 'Excellent work!'
            : percentage >= 50
              ? 'Good effort, keep studying!'
              : 'Review the material and try again.'}
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            to={`/units/${unitId}/quiz`}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Retake Quiz
          </Link>
          <Link
            to={`/units/${unitId}`}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Unit
          </Link>
        </div>
      </div>

      {/* Per-question review */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Review Answers</h2>
        {result.results.map((r, i) => (
          <div
            key={r.question_id}
            className={`rounded-lg border p-5 ${
              r.is_correct
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  r.is_correct ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{r.question_text}</p>

                <div className="mt-3 space-y-2">
                  {r.options.map((opt) => {
                    const isSelected = opt.key === r.selected_option
                    const isCorrect = opt.key === r.correct_option
                    return (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
                          isCorrect
                            ? 'bg-green-100 font-medium text-green-800'
                            : isSelected
                              ? 'bg-red-100 text-red-800'
                              : 'text-gray-600'
                        }`}
                      >
                        <span className="font-medium">{opt.key}.</span>
                        <span>{opt.text}</span>
                        {isCorrect && <span className="ml-auto text-xs">Correct</span>}
                        {isSelected && !isCorrect && (
                          <span className="ml-auto text-xs">Your answer</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">Explanation:</span>{' '}
                  {r.explanation}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
