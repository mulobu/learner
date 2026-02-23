import { createContext } from 'react'

export interface BookNavState {
  currentBookId: string | null
  currentBookTitle: string | null
  currentUnitTitle: string | null
}

export interface BookNavContextValue extends BookNavState {
  setBookNav: (state: Partial<BookNavState>) => void
  clearBookNav: () => void
}

export const BookNavigationContext = createContext<BookNavContextValue>({
  currentBookId: null,
  currentBookTitle: null,
  currentUnitTitle: null,
  setBookNav: () => {},
  clearBookNav: () => {},
})
