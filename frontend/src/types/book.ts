export interface BookSummary {
  id: string
  title: string
  author: string | null
  filename: string
  total_pages: number
  toc_extracted: boolean
  created_at: string
}

export interface UnitTreeNode {
  id: string
  title: string
  level: number
  order_index: number
  start_page: number
  end_page: number
  status: 'not_started' | 'in_progress' | 'completed'
  is_processed: boolean
  children: UnitTreeNode[]
}

export interface BookDetail {
  id: string
  title: string
  author: string | null
  filename: string
  total_pages: number
  toc_extracted: boolean
  units: UnitTreeNode[]
  created_at: string
}

export interface BookProgress {
  book_id: string
  title: string
  progress: {
    total_units: number
    completed_units: number
    in_progress_units: number
    not_started_units: number
    completion_percentage: number
  }
}

export interface Dashboard {
  books: BookSummary[]
  total_books: number
}
