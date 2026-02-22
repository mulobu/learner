import type { Auth0Session } from '../types/auth'

const PKCE_VERIFIER_KEY = 'auth0_pkce_verifier'
const OAUTH_STATE_KEY = 'auth0_oauth_state'
const RETURN_TO_KEY = 'auth0_return_to'

function getConfig() {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined
  const redirectUri =
    (import.meta.env.VITE_AUTH0_REDIRECT_URI as string | undefined) ||
    `${window.location.origin}/login`

  if (!domain || !clientId || !audience) {
    throw new Error('Auth0 environment is missing (VITE_AUTH0_DOMAIN/CLIENT_ID/AUDIENCE)')
  }

  return {
    domain: domain.trim(),
    clientId: clientId.trim(),
    audience: audience.trim(),
    redirectUri,
  }
}

function toBase64Url(value: Uint8Array): string {
  let binary = ''
  value.forEach((char) => {
    binary += String.fromCharCode(char)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomString(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

async function createCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return toBase64Url(new Uint8Array(digest))
}

export async function loginWithAuth0Redirect(returnTo: string = '/'): Promise<never> {
  const { domain, clientId, audience, redirectUri } = getConfig()
  const state = randomString(24)
  const verifier = randomString(64)
  const challenge = await createCodeChallenge(verifier)

  sessionStorage.setItem(OAUTH_STATE_KEY, state)
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier)
  sessionStorage.setItem(RETURN_TO_KEY, returnTo)

  const authorizeUrl = new URL(`https://${domain}/authorize`)
  authorizeUrl.searchParams.set('response_type', 'code')
  authorizeUrl.searchParams.set('client_id', clientId)
  authorizeUrl.searchParams.set('redirect_uri', redirectUri)
  authorizeUrl.searchParams.set('scope', 'openid profile email')
  authorizeUrl.searchParams.set('audience', audience)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('code_challenge', challenge)
  authorizeUrl.searchParams.set('code_challenge_method', 'S256')

  window.location.assign(authorizeUrl.toString())
  return new Promise<never>(() => {})
}

export function consumePostLoginPath(): string {
  const value = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return value || '/'
}

export function isAuth0Callback(url: URL): boolean {
  return url.searchParams.has('code') || url.searchParams.has('error')
}

export async function handleAuth0Callback(url: URL): Promise<Auth0Session> {
  const { domain, clientId, redirectUri } = getConfig()

  const error = url.searchParams.get('error')
  if (error) {
    const description = url.searchParams.get('error_description')
    throw new Error(description || error)
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    throw new Error('Missing authorization code callback parameters')
  }

  const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(OAUTH_STATE_KEY)
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  if (!expectedState || expectedState !== state || !verifier) {
    throw new Error('Invalid OAuth state')
  }

  const response = await fetch(`https://${domain}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: clientId,
      code_verifier: verifier,
      code,
      redirect_uri: redirectUri,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to exchange Auth0 authorization code')
  }
  const payload = (await response.json()) as {
    access_token?: string
    id_token?: string
    expires_in?: number
  }

  if (!payload.access_token || !payload.id_token || !payload.expires_in) {
    throw new Error('Auth0 token response is missing fields')
  }

  return {
    access_token: payload.access_token,
    id_token: payload.id_token,
    expires_at: Date.now() + payload.expires_in * 1000,
  }
}

export function logoutFromAuth0(): void {
  const { domain, clientId } = getConfig()
  const returnTo = window.location.origin + '/login'
  const logoutUrl = new URL(`https://${domain}/v2/logout`)
  logoutUrl.searchParams.set('client_id', clientId)
  logoutUrl.searchParams.set('returnTo', returnTo)
  window.location.assign(logoutUrl.toString())
}
