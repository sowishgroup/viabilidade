import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type SettingKey = 'stripe_secret_key' | 'asaas_token'

type SettingRecord = {
  key: SettingKey
  value: string
}

const settingLabels: Record<SettingKey, string> = {
  stripe_secret_key: 'Stripe Secret Key',
  asaas_token: 'Asaas API Token',
}

const AdminConfiguracoes = () => {
  const [settings, setSettings] = useState<Record<SettingKey, string>>({
    stripe_secret_key: '',
    asaas_token: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchSettings = async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('system_settings')
      .select('key, value')

    if (err) {
      setError(err.message)
    } else if (data) {
      const next = { ...settings }
      ;(data as SettingRecord[]).forEach((s) => {
        if (s.key in next) {
          next[s.key] = s.value
        }
      })
      setSettings(next)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (key: SettingKey, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    const payload: SettingRecord[] = (Object.keys(settings) as SettingKey[]).map((key) => ({
      key,
      value: settings[key],
    }))

    const { error: err } = await supabase
      .from('system_settings')
      .upsert(payload, { onConflict: 'key' })

    if (err) {
      setError(err.message)
    } else {
      setSuccess('Configurações salvas com sucesso.')
    }
    setSaving(false)
  }

  return (
    <div className="bg-white/45 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Configurações de Pagamento</h2>
        <p className="text-xs text-slate-500 max-w-xl">
          Armazene aqui, de forma segura, as chaves de API de pagamento. Apenas usuários com perfil
          <span className="font-semibold"> admin</span> conseguem ler ou alterar esses valores via
          RLS no Supabase.
        </p>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-50 text-red-700 text-sm border-b border-red-100">
          {error}
        </div>
      )}
      {success && (
        <div className="px-6 py-3 bg-emerald-50 text-emerald-700 text-sm border-b border-emerald-100">
          {success}
        </div>
      )}

      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1F3A]" />
        </div>
      ) : (
        <form
          className="p-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault()
            void handleSave()
          }}
        >
          {(Object.keys(settings) as SettingKey[]).map((key) => (
            <div key={key} className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                {settingLabels[key]}
              </label>
              <input
                type="password"
                autoComplete="off"
                value={settings[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A] font-mono"
                placeholder="••••••••"
              />
              <p className="text-[11px] text-slate-500">
                Nunca exponha estas chaves no front-end público. Elas serão utilizadas em funções
                server-side (ex.: Edge Functions) para processar pagamentos.
              </p>
            </div>
          ))}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-full text-xs font-medium bg-[#0B1F3A] text-white hover:bg-[#0d2847] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default AdminConfiguracoes

