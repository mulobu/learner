import { useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { BookNavigationContext, type BookNavState } from './bookNavigation'

export function BookNavigationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookNavState>({
    currentBookId: null,
    currentBookTitle: null,
    currentUnitTitle: null,
  })

  const setBookNav = useCallback((partial: Partial<BookNavState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  const clearBookNav = useCallback(() => {
    setState({ currentBookId: null, currentBookTitle: null, currentUnitTitle: null })
  }, [])

  return (
    <BookNavigationContext.Provider value={{ ...state, setBookNav, clearBookNav }}>
      {children}
    </BookNavigationContext.Provider>
  )
}
