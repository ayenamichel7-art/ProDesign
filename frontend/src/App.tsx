import React, { useState } from 'react'
import Landing from './pages/Landing'
import Pricing from './pages/Pricing'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [loading, setLoading] = useState(false)
  
  // Authentification
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('prodesign_token'))
  const [showPricing, setShowPricing] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const apiBaseUrl = window.location.hostname === 'localhost' ? 'http://localhost:8080' : ''

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (options.headers) Object.assign(headers, options.headers)
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const resp = await fetch(url, { ...options, headers })
    if (resp.status === 401) {
      localStorage.removeItem('prodesign_token')
      setAuthToken(null)
      throw new Error('Session expirée, veuillez vous reconnecter')
    }
    return resp
  }

  const handleAuthSubmit = async () => {
    setAuthError(null)
    setLoading(true)
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login'
      const resp = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(text || 'Erreur d\'authentification')
      }
      const data = await resp.json()
      localStorage.setItem('prodesign_token', data.token)
      setAuthToken(data.token)
      setShowAuthModal(false)
      setLoginEmail('')
      setLoginPassword('')
    } catch (e: any) {
      setAuthError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('prodesign_token')
    setAuthToken(null)
  }

  const handlePayment = async (amount: number, description: string) => {
      setLoading(true)
      try {
         const resp = await authFetch(`${apiBaseUrl}/api/pay/fedapay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, description, callback_url: window.location.href })
         })
         const data = await resp.json()
         if (data.url) {
            window.location.href = data.url
         }
      } catch (e) {
         console.error("Payment failed:", e)
         alert("Le service de paiement est temporairement indisponible.")
      } finally {
         setLoading(false)
      }
  }

  // Rendu de la Landing Page si non authentifié
  if (!authToken && !showPricing) {
     return <Landing showAuthModal={showAuthModal} setShowAuthModal={setShowAuthModal} loginEmail={loginEmail} setLoginEmail={setLoginEmail} loginPassword={loginPassword} setLoginPassword={setLoginPassword} isRegistering={isRegistering} setIsRegistering={setIsRegistering} authError={authError} setAuthError={setAuthError} handleAuthSubmit={handleAuthSubmit} loading={loading} setShowPricing={setShowPricing} />
  }

  // Rendu de la Pricing Page
  if (showPricing) {
     return <Pricing setShowPricing={setShowPricing} handlePayment={handlePayment} />
  }

  // Rendu de l'Application une fois authentifié
  return <Dashboard authToken={authToken!} setAuthToken={setAuthToken} handleLogout={handleLogout} />
}
