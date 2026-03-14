import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AdminConsulta = {
  id: string
  user_id: string
  email: string | null
  especialidade: string | null
  created_at: string
  relatorio: string | null
  instalacoes_tecnicas: string | null
}

const AdminConsultas = () => {
  const [rows, setRows] = useState<AdminConsulta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConsultas = async () => {
    setLoading(true)
    setError(null)

    // Busca consultas e faz um segundo request para perfis para obter e-mails
    const { data, error: err } = await supabase
      .from('consultas')
      .select('id, user_id, especialidade, created_at, relatorio, instalacoes_tecnicas')
      .order('created_at', { ascending: false })
      .limit(200)

    if (err) {
      setError(err.message)
      setRows([])
      setLoading(false)
      return
    }

    const consultas = (data ?? []) as {
      id: string
      user_id: string
      especialidade: string | null
      created_at: string
      relatorio: string | null
      instalacoes_tecnicas: string | null
    }[]

    if (consultas.length === 0) {
      setRows([])
      setLoading(false)
      return
    }

    const userIds = Array.from(new Set(consultas.map((c) => c.user_id)))
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', userIds)

    const emailById = new Map<string, string | null>()
    if (!profilesError && profiles) {
      for (const p of profiles as { id: string; email: string | null }[]) {
        emailById.set(p.id, p.email ?? null)
      }
    }

    setRows(
      consultas.map((c) => ({
        ...c,
        email: emailById.get(c.user_id) ?? null,
      })),
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchConsultas()
  }, [])

  const withStatus = useMemo(
    () =>
      rows.map((c) => {
        const baseText = `${c.relatorio ?? ''} ${c.instalacoes_tecnicas ?? ''}`.toLowerCase()
        const hasNegative =
          baseText.includes('não funciona') ||
          baseText.includes('nao funciona') ||
          baseText.includes('inviável') ||
          baseText.includes('inviavel') ||
          baseText.includes('reprovado')
        const hasPositive =
          baseText.includes('funciona') ||
          baseText.includes('viável') ||
          baseText.includes('viavel') ||
          baseText.includes('aprovado')

        let status: 'viavel' | 'inviavel' | 'indefinido' = 'indefinido'
        if (hasNegative && !hasPositive) status = 'inviavel'
        else if (hasPositive && !hasNegative) status = 'viavel'

        return { ...c, status }
      }),
    [rows],
  )

  return (
    <div className="bg-white/45 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Histórico global de consultas</h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Acompanhe o uso da plataforma. Apenas admins conseguem ver todas as consultas (RLS no
            Supabase garante isso).
          </p>
        </div>
        <button
          type="button"
          onClick={fetchConsultas}
          className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          Atualizar lista
        </button>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1F3A]" />
        </div>
      ) : withStatus.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Nenhuma consulta encontrada.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">E-mail</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Especialidade</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Data</th>
                <th className="px-4 py-2 text-left font-semibold text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {withStatus.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2 text-slate-900">
                    {c.email ?? <span className="text-slate-400 italic">sem e-mail em profiles</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {c.especialidade ?? <span className="text-slate-400 italic">não informado</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {new Date(c.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-2">
                    {c.status === 'viavel' && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-medium">
                        Viável
                      </span>
                    )}
                    {c.status === 'inviavel' && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-100 px-2.5 py-0.5 text-[11px] font-medium">
                        Não atende
                      </span>
                    )}
                    {c.status === 'indefinido' && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium">
                        Indefinido
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AdminConsultas

