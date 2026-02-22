export interface UnitDetail {
  id: string
  book_id: string
  parent_id: string | null
  title: string
  level: number
  order_index: number
  start_page: number
  end_page: number
  status: 'not_started' | 'in_progress' | 'completed'
  is_processed: boolean
  processed_at: string | null
  has_quiz: boolean
  has_resources: boolean
  created_at: string
}

export interface ProcessingStatus {
  unit_id: string
  status: 'processing' | 'completed' | 'failed' | 'not_started'
  error: string | null
}
