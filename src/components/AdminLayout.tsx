import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

type AdminLayoutProps = {
  children: ReactNode
}

const adminNav = [
  { to: '/admin/usuarios', label: 'Usuários & Créditos' },
  { to: '/admin/consultas', label: 'Histórico de Consultas' },
  { to: '/admin/configuracoes', label: 'Configurações de Pagamento' },
]

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation()
  const { profile } = useAuth()

  return (
    <div className="grid gap-6 md:grid-cols-[260px,minmax(0,1fr)]">
      <aside className="bg-white/45 backdrop-blur-md rounded-3xl shadow-md border border-white/30 p-5 h-fit">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Painel de Administração
          </p>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">Sowish Viabilidade</h1>
          <p className="mt-1 text-xs text-slate-500">
            Gerencie usuários, créditos, histórico e integrações de pagamento.
          </p>
          {profile?.role === 'admin' && (
            <span className="mt-3 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-[11px] font-medium">
              Admin
            </span>
          )}
        </div>

        <nav className="space-y-1">
          {adminNav.map((item) => {
            const isActive = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-slate-900 text-slate-50 shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.label}</span>
                {isActive && <span className="text-[10px] uppercase tracking-[0.16em]">Atual</span>}
              </Link>
            )
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
          <p>Esta área só é acessível para contas com perfil de administrador.</p>
          <p>
            Use com cuidado: alterações de créditos e chaves de pagamento impactam todos os usuários do
            sistema.
          </p>
        </div>
      </aside>

      <section className="space-y-4">{children}</section>
    </div>
  )
}

export default AdminLayout

