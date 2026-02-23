import { useEffect } from 'react'

const APP_NAME = 'Learner Studio'

export default function usePageTitle(title: string) {
  useEffect(() => {
    const cleanTitle = title.trim()
    document.title = cleanTitle ? `${cleanTitle} | ${APP_NAME}` : APP_NAME
  }, [title])
}
