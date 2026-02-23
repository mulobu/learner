import 'katex/dist/katex.min.css'

import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

interface RichTextProps {
  content: string
  inline?: boolean
  className?: string
}

/**
 * Renders text with Markdown formatting and LaTeX math support.
 * - Inline math: $...$
 * - Block math: $$...$$
 * - Markdown: **bold**, *italic*, `code`, etc.
 */
export default function RichText({ content, inline, className }: RichTextProps) {
  return (
    <span className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={
          inline
            ? {
                p: ({ children }) => <span>{children}</span>,
              }
            : undefined
        }
      >
        {content}
      </ReactMarkdown>
    </span>
  )
}
