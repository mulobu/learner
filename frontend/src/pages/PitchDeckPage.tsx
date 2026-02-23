import { useEffect, useRef } from 'react'
import pitchDeckHtml from '../assets/pitch-deck.html?raw'
import usePageTitle from '../hooks/usePageTitle'

export default function PitchDeckPage() {
  usePageTitle('Pitch Deck Blastoff')
  const deckContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'f') {
        return
      }

      const activeTag = (document.activeElement as HTMLElement | null)?.tagName
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        return
      }

      event.preventDefault()

      if (document.fullscreenElement) {
        void document.exitFullscreen()
        return
      }

      if (deckContainerRef.current) {
        void deckContainerRef.current.requestFullscreen()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pitch Deck</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Restricted to super-user/admin accounts.
        </p>
      </div>
      <div
        ref={deckContainerRef}
        className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm"
      >
        <iframe
          title="Learner Studio Pitch Deck"
          srcDoc={pitchDeckHtml}
          className="h-[80vh] w-full"
          allow="fullscreen"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  )
}
