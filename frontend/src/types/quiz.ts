export interface QuizOption {
  key: string
  text: string
}

export interface QuizQuestion {
  id: string
  question_text: string
  options: QuizOption[]
  difficulty: string
}

export interface Quiz {
  unit_id: string
  unit_title: string
  questions: QuizQuestion[]
  best_score: number | null
  attempt_count: number
}

export interface QuizAttempt {
  id: string
  unit_id: string
  total_questions: number
  created_at: string
}

export interface AnswerSubmission {
  question_id: string
  selected_option: string
}

export interface QuestionResult {
  question_id: string
  question_text: string
  options: QuizOption[]
  selected_option: string
  correct_option: string
  is_correct: boolean
  explanation: string
}

export interface QuizResult {
  attempt_id: string
  score: number
  correct_count: number
  total_questions: number
  results: QuestionResult[]
}

export interface QuizAttemptSummary {
  id: string
  score: number | null
  correct_count: number
  total_questions: number
  completed_at: string | null
  created_at: string
}
