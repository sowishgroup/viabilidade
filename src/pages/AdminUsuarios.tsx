import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type AdminUser = {
  id: string
  email: string | null
  especialidade: string | null
  credits: number
  created_at: string | null
}

const AdminUsuarios = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [newCredits, setNewCredits] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, email, especialidade, credits, created_at')
      .order('created_at', { ascending: false })

    if (err) {
      setError(err.message)
      setUsers([])
    } else {
      setUsers(
        (data ?? []).map((u) => ({
          id: u.id as string,
          email: (u as any).email ?? null,
          especialidade: (u as any).especialidade ?? null,
          credits: (u as any).credits ?? 0,
          created_at: (u as any).created_at ?? null,
        })),
      )
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setNewCredits(user.credits)
  }

  const closeEdit = () => {
    setEditingUser(null)
    setNewCredits('')
  }

  const handleSaveCredits = async () => {
    if (!editingUser || newCredits === '' || Number.isNaN(Number(newCredits))) return
    setSaving(true)
    setError(null)

    const { error: err } = await supabase
      .from('profiles')
      .update({ credits: Number(newCredits) })
      .eq('id', editingUser.id)

    if (err) {
      setError(err.message)
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, credits: Number(newCredits) } : u)),
      )
      closeEdit()
    }
    setSaving(false)
  }

  return (
    <div className="bg-white/45 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Usuários & Créditos</h2>
          <p className="text-xs text-slate-500">
            Visualize todos os usuários e ajuste manualmente o saldo de créditos.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
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
      ) : users.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">Nenhum usuário encontrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">E-mail</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                  Data de cadastro
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                  Especialidade
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">
                  Créditos
                </th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-slate-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-4 py-2 text-slate-900">
                    {u.email ?? <span className="text-slate-400 italic">sem e-mail em profiles</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.especialidade ?? <span className="text-slate-400 italic">não informado</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-900 font-semibold">{u.credits}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-slate-900 text-slate-50 hover:bg-slate-800 transition"
                    >
                      Editar créditos
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40">
          <div className="bg-white/45 backdrop-blur-md rounded-2xl shadow-xl border border-white/30 max-w-sm w-full p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              Editar créditos de usuário
            </h3>
            <p className="text-xs text-slate-500 mb-4 break-all">
              {editingUser.email ?? editingUser.id}
            </p>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Novo saldo de créditos
            </label>
            <input
              type="number"
              min={0}
              value={newCredits}
              onChange={(e) => setNewCredits(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A]"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Use para dar créditos de cortesia, ajustes manuais ou correções de cobrança.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveCredits}
                disabled={saving || newCredits === '' || Number(newCredits) < 0}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#0B1F3A] text-white hover:bg-[#0d2847] disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsuarios

