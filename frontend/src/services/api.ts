const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:8080' : ''

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('prodesign_token')
  const headers: Record<string, string> = {}
  if (options.headers) Object.assign(headers, options.headers)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

export { API_BASE }
