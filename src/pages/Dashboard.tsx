import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const Dashboard = () => {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const credits = profile?.credits ?? 0
  const displayName =
    (profile?.full_name?.trim() && profile.full_name.trim()) ||
    profile?.email ||
    user?.email ||
    'bem-vindo(a)'

  return (
    <div className="space-y-8">
      {/* Hero / resumo principal */}
      <section className="bg-slate-900/45 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 text-slate-50">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">
            Estudo de viabilidade para saúde
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 mb-3">
            Olá, <span className="text-sky-300">{displayName}</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6">
            Centralize aqui as análises de metragem, normas da vigilância sanitária e recomendações de layout
            para consultórios, clínicas e espaços odontológicos.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/questionario')}
              className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white bg-sky-500 hover:bg-sky-600 shadow-lg shadow-sky-500/40 transition"
            >
              Nova consulta de viabilidade
            </button>
            <span className="text-xs sm:text-sm text-slate-500">
              Use seus créditos para simular diferentes cenários de implantação.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full max-w-xs md:max-w-sm">
          <div className="col-span-2 rounded-2xl bg-slate-950/55 backdrop-blur text-slate-50 p-4 shadow-lg border border-white/10">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400 mb-1">Créditos disponíveis</p>
            <p className="text-3xl font-semibold mb-1">{credits}</p>
            <p className="text-xs text-slate-300">
              Cada consulta utiliza 1 crédito para gerar o relatório técnico de viabilidade.
            </p>
          </div>
          <div className="rounded-2xl bg-white/45 backdrop-blur border border-white/20 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">Última atividade</p>
            <p className="text-xs text-slate-700">
              Consulte a aba <span className="font-medium">Resultado</span> para revisar o último projeto avaliado.
            </p>
          </div>
          <div className="rounded-2xl bg-white/45 backdrop-blur border border-white/20 p-3 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 mb-1">Status geral</p>
            <p className="text-xs text-slate-700">
              Configure diferentes especialidades e layouts antes de avançar para o projeto executivo.
            </p>
          </div>
        </div>
      </section>

      {/* Seção de atalho para fluxos principais */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/45 backdrop-blur border border-white/30 shadow-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Análise rápida</h2>
            <p className="text-xs text-slate-600 mb-3">
              Informe área, número de salas e estrutura administrativa para validar se o espaço atende às normas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/questionario')}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-[#0B1F3A] bg-slate-50 hover:bg-slate-100 border border-slate-200"
          >
            Abrir questionário
          </button>
        </div>

        <div className="rounded-2xl bg-white/45 backdrop-blur border border-white/30 shadow-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Histórico de estudos</h2>
            <p className="text-xs text-slate-600 mb-3">
              Consulte rapidamente os últimos ambientes avaliados para comparar metragem e requisitos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/resultado')}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold text-slate-700 hover:text-[#0B1F3A] hover:bg-slate-50 border border-dashed border-slate-200"
          >
            Ver último resultado
          </button>
        </div>

        <div className="rounded-2xl bg-white/45 backdrop-blur border border-white/30 shadow-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Orientações da vigilância</h2>
            <p className="text-xs text-slate-600 mb-3">
              Lembretes de pontos críticos: circulação, área de apoio, anestesia, esterilização e acessibilidade.
            </p>
          </div>
          <p className="text-[11px] text-slate-500">
            Use os relatórios gerados como base para conversa com arquitetos e engenheiros.
          </p>
        </div>
      </section>
    </div>
  )
}

export default Dashboard

