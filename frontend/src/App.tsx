import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TeamPage from './pages/TeamPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/team/:teamId" element={<TeamPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<Navigate to="/team/1" replace />} />
        <Route path="*" element={<Navigate to="/team/1" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
