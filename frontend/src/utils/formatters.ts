export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`
}

export function formatViewCount(count: number | null): string {
  if (!count) return ''
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`
  return `${count} views`
}

export function formatLikeCount(count: number | null): string {
  if (!count) return ''
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M likes`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K likes`
  return `${count} likes`
}

export function formatDuration(isoDuration: string | null): string {
  if (!isoDuration) return ''
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const hours = match[1] ? `${match[1]}:` : ''
  const minutes = match[2] || '0'
  const seconds = (match[3] || '0').padStart(2, '0')
  return `${hours}${minutes}:${seconds}`
}
