import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { AdminLayout } from '@/context/AdminLayout'
import { resolveChatSessionOnly } from '@/config/env'
import { PageWait } from '@/components/feedback/PageWait'
import { Layout } from '@/components/Layout'
import { AdminRolesPage } from '@/pages/AdminRolesPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { ChatPage } from '@/pages/ChatPage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'

/** Chat : connexion obligatoire si le serveur impose le JWT (WEBHOOK_JWT_ONLY) ou Vite. */
function ChatRoute() {
  const { user, loading, authConfig, configLoaded } = useAuth()
  const needLogin = resolveChatSessionOnly(
    authConfig?.webhookJwtOnly,
    configLoaded,
  )
  if (loading || !configLoaded) {
    return <PageWait />
  }
  if (needLogin && !user) {
    return <Navigate to="/login" replace state={{ from: '/' }} />
  }
  return <ChatPage />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ChatRoute />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
