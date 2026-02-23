import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface BookNavState {
  currentBookId: string | null
  currentBookTitle: string | null
  currentUnitTitle: string | null
}

interface BookNavContextValue extends BookNavState {
  setBookNav: (state: Partial<BookNavState>) => void
  clearBookNav: () => void
}

const BookNavigationContext = createContext<BookNavContextValue>({
  currentBookId: null,
  currentBookTitle: null,
  currentUnitTitle: null,
  setBookNav: () => {},
  clearBookNav: () => {},
})

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

export function useBookNav() {
  return useContext(BookNavigationContext)
}
