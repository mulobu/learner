import type { VideoResource } from '../types/resource'
import { formatViewCount, formatLikeCount, formatDuration } from '../utils/formatters'

interface ResourceCardProps {
  resource: VideoResource
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-lift flex gap-4 surface-card p-4 shadow-sm"
    >
      {resource.thumbnail_url && (
        <img
          src={resource.thumbnail_url}
          alt={resource.title}
          className="h-24 w-40 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
          {resource.title}
        </h4>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{resource.channel_name}</p>
        <div className="meta-font mt-2 flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          {resource.view_count != null && (
            <span>{formatViewCount(resource.view_count)}</span>
          )}
          {resource.like_count != null && (
            <span>{formatLikeCount(resource.like_count)}</span>
          )}
          {resource.duration && (
            <span>{formatDuration(resource.duration)}</span>
          )}
        </div>
      </div>
    </a>
  )
}
