import type { QuizQuestion } from '../types/quiz'

interface QuestionCardProps {
  question: QuizQuestion
  questionIndex: number
  totalQuestions: number
  selectedOption: string | null
  onSelectOption: (option: string) => void
}

export default function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  onSelectOption,
}: QuestionCardProps) {
  return (
    <div className="rounded-2xl border border-white/90 bg-white/95 p-6 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.8)]">
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-font text-xs font-medium uppercase tracking-wide text-teal-700">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            question.difficulty === 'easy'
              ? 'bg-green-100 text-green-800'
              : question.difficulty === 'hard'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {question.difficulty}
        </span>
      </div>

      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        {question.question_text}
      </h3>

      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.key}
            onClick={() => onSelectOption(option.key)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
              selectedOption === option.key
                ? 'border-teal-500 bg-teal-50'
                : 'border-gray-200 hover:border-teal-300 hover:bg-white'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                selectedOption === option.key
                  ? 'bg-teal-700 text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {option.key}
            </span>
            <span className="text-sm text-gray-900">{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
