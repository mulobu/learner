type GsapLike = {
  fromTo: (
    target: gsap.TweenTarget,
    fromVars: gsap.TweenVars,
    toVars: gsap.TweenVars,
  ) => gsap.core.Tween
  to: (target: gsap.TweenTarget, vars: gsap.TweenVars) => gsap.core.Tween
  timeline: (vars?: gsap.TimelineVars) => gsap.core.Timeline
}

declare namespace gsap {
  type TweenTarget = Element | Element[] | NodeListOf<Element> | string
  type TweenVars = Record<string, unknown>
  type TimelineVars = Record<string, unknown>
  namespace core {
    interface Tween {
      kill: () => void
    }
    interface Timeline {
      fromTo: (
        target: TweenTarget,
        fromVars: TweenVars,
        toVars: TweenVars,
        position?: string | number,
      ) => Timeline
      to: (
        target: TweenTarget,
        vars: TweenVars,
        position?: string | number,
      ) => Timeline
      kill: () => void
    }
  }
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
