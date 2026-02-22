/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authApi, setAuthToken } from '../services/api'
import {
  handleAuth0Callback,
  isAuth0Callback,
  loginWithAuth0Redirect,
  logoutFromAuth0,
} from '../services/auth0'
import type { Auth0Session, User } from '../types/auth'

const SESSION_KEY = 'learner_auth0_session'

interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (returnTo?: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredSession(): Auth0Session | null {
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Auth0Session
    if (!parsed.access_token || !parsed.id_token || !parsed.expires_at) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeStoredSession(session: Auth0Session | null) {
  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } else {
    window.localStorage.removeItem(SESSION_KEY)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const clearSession = useCallback(() => {
    writeStoredSession(null)
    setAuthToken(null)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      try {
        let session = readStoredSession()
        const currentUrl = new URL(window.location.href)
        if (currentUrl.pathname === '/login' && isAuth0Callback(currentUrl)) {
          session = await handleAuth0Callback(currentUrl)
          writeStoredSession(session)
          window.history.replaceState({}, document.title, '/login')
        }

        if (!session || session.expires_at <= Date.now()) {
          clearSession()
          return
        }

        setAuthToken(session.access_token)
        if (!cancelled) {
          setToken(session.access_token)
        }

        const me = await authApi.me()
        if (!cancelled) {
          setUser(me.data)
        }
      } catch {
        if (!cancelled) {
          clearSession()
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void initialize()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const login = useCallback(async (returnTo?: string) => {
    await loginWithAuth0Redirect(returnTo)
  }, [])

  const logout = useCallback(() => {
    clearSession()
    logoutFromAuth0()
  }, [clearSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, token, isLoading, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
