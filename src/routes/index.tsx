import { Route, Routes, Navigate } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import AdminRoute from '../components/AdminRoute'
import AdminLayout from '../components/AdminLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import Compras from '../pages/Compras'
import Questionario from '../pages/Questionario'
import Resultado from '../pages/Resultado'
import Perfil from '../pages/Perfil'
import RecuperarSenha from '../pages/RecuperarSenha'
import AtualizarSenha from '../pages/AtualizarSenha'
import Admin from '../pages/Admin'
import AdminUsuarios from '../pages/AdminUsuarios'
import AdminConsultas from '../pages/AdminConsultas'
import AdminConfiguracoes from '../pages/AdminConfiguracoes'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/atualizar-senha" element={<AtualizarSenha />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/compras"
        element={
          <ProtectedRoute>
            <Compras />
          </ProtectedRoute>
        }
      />
      <Route
        path="/perfil"
        element={
          <ProtectedRoute>
            <Perfil />
          </ProtectedRoute>
        }
      />
      <Route
        path="/questionario"
        element={
          <ProtectedRoute>
            <Questionario />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resultado/:consultaId"
        element={
          <ProtectedRoute>
            <Resultado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resultado"
        element={
          <ProtectedRoute>
            <Resultado />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout>
                <Admin />
              </AdminLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/usuarios"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout>
                <AdminUsuarios />
              </AdminLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/consultas"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout>
                <AdminConsultas />
              </AdminLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/configuracoes"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout>
                <AdminConfiguracoes />
              </AdminLayout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default AppRoutes

