import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { isLoggedIn } from './utils/auth.js'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import DeclarationList from './pages/DeclarationList.jsx'
import DeclarationDetail from './pages/DeclarationDetail.jsx'

function Protected({ children }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: 13 } }} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/"                    element={<Dashboard />} />
                <Route path="/declarations"        element={<DeclarationList />} />
                <Route path="/declarations/:id"    element={<DeclarationDetail />} />
                <Route path="*"                    element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Protected>
        } />
      </Routes>
    </BrowserRouter>
  )
}
