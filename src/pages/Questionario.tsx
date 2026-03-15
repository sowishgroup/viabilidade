import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import type { N8nViabilidadeResponse } from '../types/consulta'

function normalizeN8nResponse(raw: unknown): N8nViabilidadeResponse {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Resposta do n8n inválida (não é um objeto JSON).')
  }

  // n8n pode retornar um array com um objeto [{ areaRecomendada, relatório, ... }]
  const obj: Record<string, unknown> = Array.isArray(raw) && raw.length > 0
    ? (raw[0] as Record<string, unknown>)
    : (raw as Record<string, unknown>)

  const area =
    (typeof obj.areaRecomendada === 'number' ? obj.areaRecomendada : undefined) ??
    (typeof obj.area_recomendada === 'number' ? obj.area_recomendada : undefined) ??
    (typeof obj.areaTotal === 'number' ? obj.areaTotal : undefined) ??
    (typeof obj.area_total === 'number' ? obj.area_total : undefined)

  const relatorio =
    (typeof obj['relatório'] === 'string' ? (obj['relatório'] as string) : undefined) ??
    (typeof obj.relatorio === 'string' ? (obj.relatorio as string) : undefined) ??
    (typeof obj.relatorioTexto === 'string' ? (obj.relatorioTexto as string) : undefined)

  const imagemUrl =
    (typeof obj.imagemUrl === 'string' ? (obj.imagemUrl as string) : undefined) ??
    (typeof obj.imagem_url === 'string' ? (obj.imagem_url as string) : undefined) ??
    (typeof obj.imageUrl === 'string' ? (obj.imageUrl as string) : undefined)

  const instalacoes =
    (typeof obj.instalacoesTecnicas === 'string' ? (obj.instalacoesTecnicas as string) : undefined) ??
    (typeof obj.instalacoes_tecnicas === 'string' ? (obj.instalacoes_tecnicas as string) : undefined) ??
    (typeof obj.instalacoes === 'string' ? (obj.instalacoes as string) : undefined)

  const keys = Object.keys(obj).slice(0, 30).join(', ')

  if (typeof area !== 'number' || Number.isNaN(area)) {
    throw new Error(`Resposta do n8n sem 'areaRecomendada'. Campos recebidos: ${keys}`)
  }
  if (!relatorio) {
    throw new Error(`Resposta do n8n sem 'relatório'/'relatorio'. Campos recebidos: ${keys}`)
  }

  return {
    areaRecomendada: area,
    relatório: relatorio,
    imagemUrl,
    instalacoesTecnicas: instalacoes,
  }
}

type FormState = {
  especialidade: string
  procedimentos: string
  numeroSalas: number | ''
  areaImovel: number | ''
  funcionariosTurno: number | ''
  pacientesEspera: number | ''
  permiteReforma: boolean | null
  permiteHidraulica: boolean | null
  permiteClimatizacao: boolean | null
}

const especialidadeOptions = [
  { id: 'consultorio-medico', label: 'Consultório Médico', description: 'Clínicas gerais e especialidades médicas ambulatoriais.', icon: '🩺' },
  { id: 'odontologia', label: 'Odontologia', description: 'Consultórios odontológicos e salas de procedimentos.', icon: '🦷' },
  { id: 'estetica-avancada', label: 'Estética Avançada', description: 'Procedimentos estéticos com uso de equipamentos específicos.', icon: '✨' },
  { id: 'pequenas-cirurgias', label: 'Pequenas Cirurgias', description: 'Ambulatórios cirúrgicos de baixa complexidade.', icon: '✂️' },
  { id: 'diagnostico-imagem', label: 'Diagnóstico por Imagem', description: 'Salas de exames, raio-x, ultrassom e afins.', icon: '📷' },
  { id: 'outros', label: 'Outros', description: 'Outro tipo de serviço assistencial em saúde.', icon: '⋯' },
]

const initialForm: FormState = {
  especialidade: '',
  procedimentos: '',
  numeroSalas: 1,
  areaImovel: '',
  funcionariosTurno: '',
  pacientesEspera: '',
  permiteReforma: null,
  permiteHidraulica: null,
  permiteClimatizacao: null,
}

const Questionario = () => {
  const [form, setForm] = useState<FormState>(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const handleChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // Build (VITE_*) ou runtime (window.__SOWISH_N8N_WEBHOOK_URL__ no index.html) – fallback para quando a variável some no EasyPanel
  const webhookUrl = (
    (import.meta.env.VITE_N8N_WEBHOOK_URL ?? '') ||
    (typeof window !== 'undefined' ? ((window as unknown as { __SOWISH_N8N_WEBHOOK_URL__?: string }).__SOWISH_N8N_WEBHOOK_URL__ ?? '') : '')
  ).trim()

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!user) {
      setError('Sessão inválida. Faça login novamente.')
      return
    }
    if (!profile) {
      setError('Perfil ainda não carregado. Clique em "Tentar novamente" abaixo ou atualize a página.')
      return
    }
    if (profile.credits < 1) {
      setError('Você não tem créditos suficientes.')
      return
    }
    if (!webhookUrl) {
      setError(
        import.meta.env.DEV
          ? 'Webhook n8n não configurado. Defina VITE_N8N_WEBHOOK_URL no .env e reinicie o servidor (npm run dev).'
          : 'Webhook n8n não configurado. No EasyPanel, adicione VITE_N8N_WEBHOOK_URL nas variáveis de ambiente do build e faça um novo deploy.'
      )
      return
    }

    setError(null)
    setSubmitting(true)

    const TIMEOUT_MS = 120000 // 2 minutos para o n8n responder

    try {
      const payload = {
        userId: user.id,
        especialidade: form.especialidade,
        procedimentos: form.procedimentos,
        numeroSalas: Number(form.numeroSalas) || 0,
        areaImovel: Number(form.areaImovel) || 0,
        funcionariosTurno: Number(form.funcionariosTurno) || 0,
        pacientesEspera: Number(form.pacientesEspera) || 0,
        permiteReforma: form.permiteReforma,
        permiteHidraulica: form.permiteHidraulica,
        permiteClimatizacao: form.permiteClimatizacao,
      }

      const url = import.meta.env.DEV ? '/api/n8n-webhook' : webhookUrl
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      let res: Response
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `Erro HTTP ${res.status}`)
      }

      const contentType = res.headers.get('content-type') ?? ''
      let raw: unknown
      if (contentType.includes('application/json')) {
        raw = (await res.json()) as unknown
      } else {
        const text = await res.text()
        try {
          raw = JSON.parse(text) as unknown
        } catch {
          throw new Error(`O n8n retornou texto em vez de JSON. Verifique se o nó "Respond to Webhook" envia o corpo em JSON. Recebido: ${text.slice(0, 200)}`)
        }
      }

      const data = normalizeN8nResponse(raw)

      // ID temporário para exibir o resultado; será trocado pelo ID real se o insert funcionar
      const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}`
      const consultaParaResultado = {
        id: tempId,
        user_id: user.id,
        area_total: data.areaRecomendada,
        relatorio: data.relatório ?? null,
        imagem_url: data.imagemUrl ?? null,
        instalacoes_tecnicas: data.instalacoesTecnicas ?? null,
        especialidade: form.especialidade || null,
        num_salas: Number(form.numeroSalas) || null,
        equipe_admin: Number(form.funcionariosTurno) || null,
        markdown: null,
        tem_anestesia: null,
        created_at: new Date().toISOString(),
      }

      // Salvar no sessionStorage ANTES do insert — assim a página Resultado sempre tem o que exibir
      try {
        sessionStorage.setItem(`sowish_consulta_${tempId}`, JSON.stringify(consultaParaResultado))
        sessionStorage.setItem('sowish_consulta_latest', JSON.stringify(consultaParaResultado))
      } catch (_) {}

      let consultaId = tempId
      let savedToServer = false

      const insertResult = await supabase
        .from('consultas')
        .insert({
          user_id: user.id,
          area_total: data.areaRecomendada,
          relatorio: data.relatório ?? null,
          imagem_url: data.imagemUrl ?? null,
          instalacoes_tecnicas: data.instalacoesTecnicas ?? null,
          especialidade: form.especialidade || null,
          num_salas: Number(form.numeroSalas) || null,
          equipe_admin: Number(form.funcionariosTurno) || null,
        })
        .select('id')
        .single()

      if (insertResult.error) {
        console.warn('Consulta não salva no Supabase:', insertResult.error)
        navigate(`/resultado/${consultaId}`, { replace: true, state: { onlyLocal: true } })
        return
      }

      const consulta = insertResult.data
      if (consulta?.id ?? (consulta as { id?: string })?.id) {
        consultaId = (consulta?.id ?? (consulta as { id?: string }).id) as string
        savedToServer = true
        const atualizado = { ...consultaParaResultado, id: consultaId }
        try {
          sessionStorage.setItem(`sowish_consulta_${consultaId}`, JSON.stringify(atualizado))
          sessionStorage.setItem('sowish_consulta_latest', JSON.stringify(atualizado))
        } catch (_) {}
      }

      if (savedToServer) {
        await supabase
          .from('profiles')
          .update({ credits: Math.max(0, profile.credits - 1) })
          .eq('id', user.id)
        refreshProfile().catch(() => {})
      }

      navigate(`/resultado/${consultaId}`, { replace: true })
    } catch (err) {
      // Tenta extrair a mensagem de erro real (incluindo erros do Supabase)
      let msg = 'Erro ao processar consulta.'
      if (err && typeof err === 'object') {
        const anyErr = err as { message?: unknown; name?: string; details?: unknown; hint?: unknown }
        if (anyErr.name === 'AbortError') {
          msg = 'O n8n demorou mais de 2 minutos para responder. No n8n, confira se o nó "Respond to Webhook" está no fim do fluxo e está devolvendo o JSON (areaRecomendada, relatório, etc.). O webhook precisa enviar a resposta HTTP para o navegador.'
        } else if (typeof anyErr.message === 'string' && anyErr.message.trim()) {
          msg = anyErr.message
        } else if (anyErr.details || anyErr.hint) {
          msg = String(anyErr.details ?? anyErr.hint)
        }
      } else if (typeof err === 'string' && err.trim()) {
        msg = err
      }

      console.error('Erro ao processar consulta:', err)

      if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
        setError(msg)
      } else if (msg === 'Failed to fetch' || msg.includes('NetworkError')) {
        setError(
          'Não foi possível conectar ao n8n. Verifique: (1) URL do webhook no .env, (2) se o n8n está online, (3) se o n8n permite CORS da origem do app.'
        )
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-8 sm:p-10 max-w-lg mx-auto text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B1F3A] mx-auto mb-4" />
        <p className="text-slate-600">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-6 sm:p-8 max-w-lg mx-auto text-center">
        <p className="text-red-600 mb-4">Faça login para acessar o questionário.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 px-1 sm:px-0">
      <header className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
          Passo 1 · Dados do serviço e do imóvel
        </p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 mt-1">
          Descreva o cenário que você quer analisar
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mt-2">
          Vamos cruzar essas informações com as normas da vigilância sanitária e com a lógica de viabilidade da Sowish
          para indicar se o espaço funciona ou não funciona para o seu modelo de negócio.
        </p>
      </header>

      {/* Bloco de especialidade */}
      <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 lg:p-7 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">1. Especialidade e tipo de serviço</p>
            <h2 className="text-sm font-semibold text-slate-900">
              Em qual área de atuação o espaço será utilizado?
            </h2>
          </div>
          {profile && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] text-slate-500">
              Créditos disponíveis:&nbsp;
              <span className="font-semibold text-slate-800">{profile.credits}</span>
            </span>
          )}
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {especialidadeOptions.map((opt) => {
            const selected = form.especialidade === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleChange('especialidade', opt.id)}
                className={`group flex flex-col items-start gap-2 rounded-2xl border px-4 py-3 text-left transition shadow-sm ${
                  selected
                    ? 'border-[#0B1F3A] bg-slate-50 ring-2 ring-[#0B1F3A]/40'
                    : 'border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border text-lg bg-sky-50 ${
                      selected ? 'border-[#0B1F3A] bg-[#0B1F3A]/5' : 'border-sky-100'
                    }`}
                  >
                    {opt.icon}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{opt.label}</span>
                </div>
                <p className="text-xs text-slate-600">{opt.description}</p>
              </button>
            )
          })}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="procedimentos" className="block text-xs font-medium text-slate-800">
            Principais procedimentos realizados (opcional)
          </label>
          <textarea
            id="procedimentos"
            rows={3}
            value={form.procedimentos}
            onChange={(e) => handleChange('procedimentos', e.target.value)}
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition resize-none"
            placeholder="Ex.: consultas, profilaxia, pequenas cirurgias, procedimentos a laser..."
          />
        </div>
      </section>

      {/* Bloco A: Pessoas & Fluxo */}
      <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 lg:p-7 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">2. Pessoas &amp; fluxo</p>
          <h2 className="text-sm font-semibold text-slate-900">
            Como será a ocupação diária do espaço?
          </h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="numeroSalas" className="block text-xs font-medium text-slate-800">
              Número de salas de atendimento
            </label>
            <input
              id="numeroSalas"
              type="number"
              min={1}
              value={form.numeroSalas}
              onChange={(e) => handleChange('numeroSalas', Number(e.target.value) || '')}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="funcionariosTurno" className="block text-xs font-medium text-slate-800">
              Funcionários por turno
            </label>
            <p className="text-[11px] text-slate-500 mb-0.5">
              Impacta dimensionamento de banheiros, vestiários e apoio.
            </p>
            <input
              id="funcionariosTurno"
              type="number"
              min={0}
              value={form.funcionariosTurno}
              onChange={(e) => handleChange('funcionariosTurno', Number(e.target.value) || '')}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="pacientesEspera" className="block text-xs font-medium text-slate-800">
              Pacientes/acompanhantes em espera
            </label>
            <p className="text-[11px] text-slate-500 mb-0.5">
              Considera o pico simultâneo na recepção.
            </p>
            <input
              id="pacientesEspera"
              type="number"
              min={0}
              value={form.pacientesEspera}
              onChange={(e) => handleChange('pacientesEspera', Number(e.target.value) || '')}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
            />
          </div>
        </div>
      </section>

      {/* Bloco B: Imóvel alvo */}
      <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 lg:p-7 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">3. O imóvel alvo</p>
          <h2 className="text-sm font-semibold text-slate-900">
            Qual é o tamanho do espaço que você está avaliando?
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="areaImovel" className="block text-xs font-medium text-slate-800">
              Área útil do imóvel (m²)
            </label>
            <input
              id="areaImovel"
              type="number"
              min={0}
              value={form.areaImovel}
              onChange={(e) => handleChange('areaImovel', Number(e.target.value) || '')}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
              placeholder="Ex.: 85"
            />
          </div>
        </div>
      </section>

      {/* Bloco C: Regras do imóvel */}
      <section className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 lg:p-7 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">4. Regras do imóvel</p>
          <h2 className="text-sm font-semibold text-slate-900">
            O que o condomínio/proprietário permite em termos de obra?
          </h2>
        </div>

        <div className="space-y-3 text-sm">
          {[
            {
              key: 'permiteReforma' as const,
              title: 'Quebra de pisos e paredes para adequação sanitária',
              helper:
                'Necessária para criar novos ambientes, regularizar fluxos e implantar áreas técnicas (expurgo, CME, etc.).',
            },
            {
              key: 'permiteHidraulica' as const,
              title: 'Novas instalações de água e esgoto nas salas',
              helper:
                'Importante para pontos de água em consultórios, escovódromos e apoio à limpeza.',
            },
            {
              key: 'permiteClimatizacao' as const,
              title: 'Ar-condicionado central ou exaustão externa',
              helper:
                'Relevante para conforto térmico, renovação de ar e atendimento a exigências específicas.',
            },
          ].map((item) => (
            <div
              key={item.key}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.helper}</p>
              </div>
              <div className="inline-flex rounded-full bg-white border border-slate-200 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => handleChange(item.key, true)}
                  className={`px-3 py-1.5 rounded-full ${
                    form[item.key] === true
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => handleChange(item.key, false)}
                  className={`px-3 py-1.5 rounded-full ${
                    form[item.key] === false
                      ? 'bg-slate-200 text-slate-800'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Não
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Botão de envio */}
      <div className="rounded-2xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || (profile != null && profile.credits < 1)}
          className="w-full sm:w-auto px-6 sm:px-8 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-[#0B1F3A] hover:from-sky-600 hover:to-[#0d2847] shadow-lg shadow-slate-400/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition inline-flex items-center justify-center gap-2"
        >
          {submitting && (
            <span className="inline-flex h-4 w-4 border-2 border-sky-100 border-t-white rounded-full animate-spin" />
          )}
          {submitting
            ? 'A IA está cruzando seus dados com a norma SOMASUS...'
            : 'Analisar viabilidade'}
        </button>
        {profile != null && profile.credits < 1 && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50/90 px-3 py-2 rounded-xl">
            Créditos insuficientes. Ajuste o valor de créditos na tabela <strong>profiles</strong> do Supabase para
            continuar utilizando as análises.
          </p>
        )}
        {error && !submitting && (
          <div className="mt-3 flex flex-wrap items-center gap-2 bg-red-50/90 px-3 py-2 rounded-xl">
            <p className="text-xs text-red-600 max-w-xl">{error}</p>
            {error.includes('Perfil') && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  refreshProfile()
                }}
                className="text-xs font-medium text-[#0B1F3A] underline hover:no-underline"
              >
                Tentar novamente
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Questionario
