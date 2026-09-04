import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />
  }
  return <>{children}</>
}
