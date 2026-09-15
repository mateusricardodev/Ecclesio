import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Events } from './pages/Events'
import { CreateEvent } from './pages/CreateEvent'
import { EventDetail } from './pages/EventDetail'
import { NewRegistration } from './pages/NewRegistration'
import { EditRegistration } from './pages/EditRegistration'
import { SearchRegistrations } from './pages/SearchRegistrations'
import { EditEvent } from './pages/EditEvent'
import { EventSetupPayment } from './pages/EventSetupPayment'
import { EventSetupForm } from './pages/EventSetupForm'
import { EventSetupPage } from './pages/EventSetupPage'
import { EventPublic } from './pages/EventPublic'
import { PublicRegistration } from './pages/PublicRegistration'
import { PixPayment } from './pages/PixPayment'
import { PublicFeedback } from './pages/PublicFeedback'
import { EventFeedback } from './pages/EventFeedback'
import { Wallet } from './pages/Wallet'
import { AdminPayouts } from './pages/AdminPayouts'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { EventsList } from './app/pages/EventsList'
import { EventCheckin } from './app/pages/EventCheckin'
import { SearchCheckin } from './app/pages/SearchCheckin'
import { QrScanner } from './app/pages/QrScanner'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/evento/:slug" element={<EventPublic />} />
        <Route path="/evento/:slug/inscricao" element={<PublicRegistration />} />
        <Route path="/evento/:slug/pagamento-pix" element={<PixPayment />} />
        <Route path="/evento/:slug/avaliacao" element={<PublicFeedback />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eventos"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/new"
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/edit"
          element={
            <ProtectedRoute>
              <EditEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/setup/payment"
          element={
            <ProtectedRoute>
              <EventSetupPayment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/setup/form"
          element={
            <ProtectedRoute>
              <EventSetupForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/setup/page"
          element={
            <ProtectedRoute>
              <EventSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/avaliacao"
          element={
            <ProtectedRoute>
              <EventFeedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/registrations/new"
          element={
            <ProtectedRoute>
              <NewRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/registrations/:regId/edit"
          element={
            <ProtectedRoute>
              <EditRegistration />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buscar-inscricoes"
          element={
            <ProtectedRoute>
              <SearchRegistrations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/saques"
          element={
            <ProtectedRoute>
              <AdminPayouts />
            </ProtectedRoute>
          }
        />

        {/* App mobile de credenciamento (voluntários) */}
        <Route path="/app" element={<Navigate to="/app/eventos" replace />} />
        <Route
          path="/app/eventos"
          element={
            <ProtectedRoute>
              <EventsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/evento/:id"
          element={
            <ProtectedRoute>
              <EventCheckin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/evento/:id/pesquisar"
          element={
            <ProtectedRoute>
              <SearchCheckin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/evento/:id/qrcode"
          element={
            <ProtectedRoute>
              <QrScanner />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
