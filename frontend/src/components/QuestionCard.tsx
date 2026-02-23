import type { QuizQuestion } from '../types/quiz'
import RichText from './ui/RichText'

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
    <div className="surface-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-font text-xs font-medium uppercase tracking-wide text-[var(--primary)]">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            question.difficulty === 'easy'
              ? 'bg-[var(--success-soft)] text-[var(--success)]'
              : question.difficulty === 'hard'
                ? 'bg-[var(--error-soft)] text-[var(--error)]'
                : 'bg-[var(--warning-soft)] text-[var(--warning)]'
          }`}
        >
          {question.difficulty}
        </span>
      </div>

      <h3 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">
        <RichText content={question.question_text} />
      </h3>

      <div className="space-y-3">
        {question.options.map((option) => (
          <button
            key={option.key}
            onClick={() => onSelectOption(option.key)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-colors ${
              selectedOption === option.key
                ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                : 'border-[var(--border)] hover:border-[var(--primary-muted)] hover:bg-[var(--bg-surface)]'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                selectedOption === option.key
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--bg-muted)] text-[var(--text-secondary)]'
              }`}
            >
              {option.key}
            </span>
            <span className="text-sm text-[var(--text-primary)]">
              <RichText content={option.text} inline />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
