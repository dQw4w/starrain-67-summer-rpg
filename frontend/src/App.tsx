import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TeamPage from './pages/TeamPage'
import AdminPage from './pages/AdminPage'
import QrPrintPage from './pages/QrPrintPage'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/team/:token" element={<TeamPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/qr" element={<QrPrintPage />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
