export interface VideoResource {
  id: string
  source: string
  search_query: string
  video_id: string
  title: string
  channel_name: string
  thumbnail_url: string | null
  view_count: number | null
  like_count: number | null
  duration: string | null
  relevance_score: number | null
  url: string
}
