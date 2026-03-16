import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase, supabaseConfigured } from '../lib/supabaseClient'

const Perfil = () => {
  const navigate = useNavigate()
  const { user, profile, refreshProfile, signOut } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [cpfCnpj, setCpfCnpj] = useState('')
  const [especialidade, setEspecialidade] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [credits, setCredits] = useState<number>(0)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState<string | null>('50')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setPhone(profile.phone ?? '')
      setCpfCnpj(profile.cpf_cnpj ?? '')
      setEspecialidade(profile.especialidade ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
      setCredits(profile.credits ?? 0)
    }
  }, [profile])

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return
    if (!supabaseConfigured) {
      setError('Supabase não configurado. Configure as variáveis no EasyPanel e faça um novo deploy.')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    const timeoutMs = 15000
    const uploadWithTimeout = Promise.race([
      (async () => {
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}.${fileExt ?? 'png'}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true })

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        const publicUrl = data.publicUrl

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', user.id)

        if (updateError) throw updateError
        return publicUrl
      })(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo esgotado. Tente de novo.')), timeoutMs)
      ),
    ])

    try {
      const publicUrl = await uploadWithTimeout
      setAvatarUrl(publicUrl)
      setSuccess('Foto de perfil atualizada.')
      refreshProfile().catch(() => {})
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : String(err)
      setError('Foto: ' + msg)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return
    if (!supabaseConfigured) {
      setError('Supabase não configurado. Configure as variáveis no EasyPanel e faça um novo deploy.')
      return
    }
    if (!fullName.trim()) {
      setError('Nome completo é obrigatório.')
      return
    }

    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    const PROFILE_UPDATE_TIMEOUT_MS = 45000

    const doUpdate = (includeCpfCnpj: boolean) => {
      const cpfCnpjOnly = cpfCnpj.replace(/\D/g, '')
      const updates: Record<string, unknown> = {
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        especialidade: especialidade.trim() || null,
      }
      if (includeCpfCnpj) {
        updates.cpf_cnpj = cpfCnpjOnly.length >= 11 ? cpfCnpjOnly : null
      }
      return supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id')
        .single()
    }

    const isRetryableError = (msg: string) =>
      msg.includes('Lock broken') ||
      msg.includes('AbortError') ||
      msg.includes('aborted') ||
      msg.includes('steal') ||
      msg.includes('Tempo esgotado')

    try {
      let result: Awaited<ReturnType<typeof doUpdate>>
      try {
        result = await Promise.race([
          doUpdate(true).then((r) => r),
          new Promise<Awaited<ReturnType<typeof doUpdate>>>((_, reject) =>
            setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), PROFILE_UPDATE_TIMEOUT_MS)
          ),
        ])
      } catch (timeoutErr) {
        const isTimeout = String(timeoutErr instanceof Error ? timeoutErr.message : timeoutErr).includes('Tempo esgotado')
        if (isTimeout) {
          try {
            result = await Promise.race([
              doUpdate(true),
              new Promise<Awaited<ReturnType<typeof doUpdate>>>((_, reject) =>
                setTimeout(() => reject(new Error('Tempo esgotado. Verifique sua conexão e tente novamente.')), 60000)
              ),
            ])
          } catch (retryErr) {
            throw retryErr
          }
        } else {
          throw timeoutErr
        }
      }
      let updateError = result.error as { message?: string } | null

      // Se falhou por cpf_cnpj/coluna, tenta sem CPF/CNPJ
      if (updateError && (String(updateError.message ?? '').includes('cpf_cnpj') || String(updateError.message ?? '').includes('column'))) {
        result = await doUpdate(false)
        updateError = result.error as { message?: string } | null
        if (!updateError) {
          setSuccess('Nome, telefone e especialidade salvos. Para salvar CPF/CNPJ, rode no Supabase a migration que adiciona a coluna cpf_cnpj na tabela profiles.')
          refreshProfile().catch(() => {})
          setSavingProfile(false)
          return
        }
      }

      // Se falhou por lock/abort (outra aba ou conflito de armazenamento), tenta uma vez de novo
      if (updateError && isRetryableError(String(updateError.message ?? ''))) {
        await new Promise((r) => setTimeout(r, 500))
        result = await doUpdate(true)
        updateError = result.error as { message?: string } | null
      }

      if (updateError) {
        const err = updateError as { message?: string; details?: string; hint?: string; code?: string }
        const msg = err?.message ?? String(updateError)
        const detail = err?.details ? ` (${err.details})` : ''
        const hint = err?.hint ? ` Dica: ${err.hint}` : ''
        const code = err?.code ? ` [${err.code}]` : ''
        throw new Error(`${msg}${detail}${hint}${code}`)
      }
      setSuccess('Dados atualizados com sucesso.')
      refreshProfile().catch(() => {})
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string'
          ? (err as { message: string }).message
          : String(err)
      if (isRetryableError(msg)) {
        setError('Perfil: Houve um conflito temporário (outra aba ou navegador). Clique em "Salvar" novamente.')
      } else {
        setError('Perfil: ' + msg)
      }
    } finally {
      setSavingProfile(false)
    }
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-6 sm:p-8 max-w-lg mx-auto text-center">
        <p className="text-red-600 mb-4 font-medium">Você precisa estar logado para acessar o perfil.</p>
      </div>
    )
  }

  const displayEmail = user.email ?? profile?.email ?? ''

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conta · Perfil</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 mt-1">Seu perfil</h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-2">
          Atualize seus dados pessoais e acompanhe seu saldo de créditos para novas análises de viabilidade.
        </p>
      </header>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Seção A: Avatar */}
        <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 flex flex-col items-center text-center">
          <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-semibold text-slate-700 overflow-hidden mb-3">
            {avatarUrl ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={avatarUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
            ) : (
              (profile?.full_name ?? displayEmail ?? 'U')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase())
                .join('')
            )}
          </div>
          <p className="text-sm font-semibold text-slate-900 mb-1">
            {profile?.full_name || displayEmail || 'Seu nome'}
          </p>
          <p className="text-xs text-slate-500 mb-3">Essa foto será usada em todo o ambiente da Sowish.</p>
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploading}
            className="px-4 py-1.5 rounded-full text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {uploading ? 'Enviando...' : 'Alterar foto'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </section>

        {/* Seção B: Dados cadastrais */}
        <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900 mb-3">Dados cadastrais</h2>
          {error && (
            <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              <p>{error}</p>
              <p className="mt-2 text-red-600/90">Se os dados não salvarem, faça <strong>logout e login novamente</strong> para renovar a sessão. Confira também no Supabase se o script <code className="bg-red-100 px-1 rounded">RODE-ISSO-NO-SUPABASE.sql</code> foi executado.</p>
            </div>
          )}
          {success && (
            <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {success}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nome completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A]"
                placeholder="Como quer aparecer no sistema"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                value={displayEmail}
                disabled
                className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Telefone / WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A]"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                CPF ou CNPJ <span className="text-slate-400 font-normal">(obrigatório para comprar créditos)</span>
              </label>
              <input
                type="text"
                value={cpfCnpj}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '')
                  if (v.length <= 14) setCpfCnpj(v)
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A]"
                placeholder="Apenas números (11 ou 14 dígitos)"
                maxLength={18}
              />
              {cpfCnpj.replace(/\D/g, '').length > 0 && cpfCnpj.replace(/\D/g, '').length !== 11 && cpfCnpj.replace(/\D/g, '').length !== 14 && (
                <p className="text-[11px] text-amber-600 mt-1">CPF tem 11 dígitos; CNPJ tem 14.</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Especialidade / Profissão
              </label>
              <input
                type="text"
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B1F3A] focus:border-[#0B1F3A]"
                placeholder="Ex.: Arquitetura hospitalar, Clínico geral, Odontologia..."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-4 py-2 rounded-full text-xs font-medium bg-[#0B1F3A] text-white hover:bg-[#0d2847] disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {savingProfile ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </section>
      </div>

      {/* Seção C: Créditos */}
      <section className="rounded-2xl sm:rounded-3xl bg-sky-50/45 backdrop-blur-md border border-sky-200/50 shadow-xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-sky-700 mb-1">Carteira</p>
          <h2 className="text-lg font-semibold text-slate-900">Saldo de créditos</h2>
          <p className="text-sm text-slate-600 max-w-md">
            Cada crédito permite uma nova análise de viabilidade arquitetônica completa.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-sm text-slate-700">
            Saldo atual:{' '}
            <span className="text-2xl font-semibold text-slate-900">{credits}</span>{' '}
            <span className="text-xs text-slate-500">créditos</span>
          </p>
          <button
            type="button"
            onClick={() => setShowCreditsModal(true)}
            className="px-4 py-2 rounded-full text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            Comprar mais créditos
          </button>
        </div>
      </section>

      {/* Botão secundário de logout */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut()
              navigate('/login', { replace: true })
            } catch (err) {
              console.error('Erro ao sair:', err)
              alert('Não foi possível sair. Verifique sua conexão e tente novamente.')
            }
          }}
          className="px-4 py-2 rounded-full text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
        >
          Sair da conta
        </button>
      </div>

      {showCreditsModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40">
          <div className="rounded-2xl bg-white/45 backdrop-blur-md shadow-xl border border-white/30 max-w-sm w-full p-4 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Escolha um pacote</h3>
            <p className="text-xs text-slate-500 mb-4">
              Cada crédito equivale a uma consulta de viabilidade. Pagamento via Asaas.
            </p>
            <div className="space-y-2">
              {[
                { id: '10', valor: 10, consultas: 2 },
                { id: '50', valor: 50, consultas: 12, destaque: true },
                { id: '100', valor: 100, consultas: 30 },
              ].map((plano) => (
                <button
                  key={plano.id}
                  type="button"
                  onClick={() => setSelectedPackage(plano.id)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                    selectedPackage === plano.id
                      ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800'
                      : 'border-slate-200 bg-white/45 text-slate-700 hover:bg-slate-50/60'
                  }`}
                >
                  <span>
                    R$ {plano.valor} — {plano.consultas} consultas
                    {plano.destaque && <span className="ml-2 text-[10px] font-medium text-sky-600">(Mais comprado)</span>}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreditsModal(false)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreditsModal(false)
                  navigate('/compras')
                }}
                disabled={!selectedPackage}
                className="px-4 py-1.5 rounded-full text-xs font-medium bg-[#0B1F3A] text-white hover:bg-[#0d2847] disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                Ir para pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Perfil

