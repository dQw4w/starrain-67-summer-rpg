import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TeamPage from './pages/TeamPage'
import AdminPage from './pages/AdminPage'
import QrPrintPage from './pages/QrPrintPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/qr" element={<QrPrintPage />} />
        <Route path="/" element={<Navigate to="/team/1" replace />} />
        <Route path="*" element={<Navigate to="/team/1" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
