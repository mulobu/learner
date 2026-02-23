import { useContext } from 'react'
import { BookNavigationContext } from './bookNavigation'

export function useBookNav() {
  return useContext(BookNavigationContext)
}
