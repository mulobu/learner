type GsapLike = {
  fromTo: (
    target: TweenTarget,
    fromVars: TweenVars,
    toVars: TweenVars,
  ) => GsapTween
  to: (target: TweenTarget, vars: TweenVars) => GsapTween
  timeline: (vars?: TimelineVars) => GsapTimeline
}

type TweenTarget = Element | Element[] | NodeListOf<Element> | string
type TweenVars = Record<string, unknown>
type TimelineVars = Record<string, unknown>

interface GsapTween {
  kill: () => void
}

interface GsapTimeline {
  fromTo: (
    target: TweenTarget,
    fromVars: TweenVars,
    toVars: TweenVars,
    position?: string | number,
  ) => GsapTimeline
  to: (
    target: TweenTarget,
    vars: TweenVars,
    position?: string | number,
  ) => GsapTimeline
  kill: () => void
}

const GSAP_ESM_CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.12.7/+esm'
let gsapPromise: Promise<GsapLike | null> | null = null

export async function loadGsap(): Promise<GsapLike | null> {
  if (typeof window === 'undefined') return null

  if (!gsapPromise) {
    gsapPromise = import(/* @vite-ignore */ GSAP_ESM_CDN)
      .then((mod: unknown) => {
        const module = mod as { gsap?: GsapLike; default?: GsapLike }
        return module.gsap || module.default || null
      })
      .catch(() => null)
  }

  return gsapPromise
}
