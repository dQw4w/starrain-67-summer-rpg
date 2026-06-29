import { BrowserRouter, Routes, Route } from 'react-router-dom'
import TeamPage from './pages/TeamPage'
import TeamSettingsPage from './pages/TeamSettingsPage'
import AdminPage from './pages/AdminPage'
import QrPrintPage from './pages/QrPrintPage'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/team/:token" element={<TeamPage />} />
          <Route path="/team/:token/settings" element={<TeamSettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/qr" element={<QrPrintPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
