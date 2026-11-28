const SESSION_KEY = 'smrt-execution-secret-session'

export function getExecutionSecretHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {}
  try {
    const secret = window.sessionStorage.getItem(SESSION_KEY)?.trim()
    return secret ? { 'x-smrt-execution-secret': secret } : {}
  } catch {
    return {}
  }
}

export function setExecutionSecretSession(secret: string) {
  if (typeof window === 'undefined') return
  try {
    if (secret.trim()) window.sessionStorage.setItem(SESSION_KEY, secret.trim())
    else window.sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

export function readExecutionSecretSession(): string {
  if (typeof window === 'undefined') return ''
  try {
    return window.sessionStorage.getItem(SESSION_KEY) ?? ''
  } catch {
    return ''
  }
}
