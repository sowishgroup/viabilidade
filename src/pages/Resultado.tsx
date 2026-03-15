import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { supabase } from '../lib/supabaseClient'
import type { Consulta } from '../types/consulta'

const getStatusText = (tone: 'success' | 'alert' | 'neutral') => {
  if (tone === 'success') return 'Viável'
  if (tone === 'alert') return 'Não atende às normas'
  return 'Em análise'
}

const getResumoLaudo = (consulta: Consulta | null) => {
  if (!consulta) return ''
  const fonte = consulta.relatorio ?? consulta.instalacoes_tecnicas ?? ''
  if (!fonte) return ''
  const clean = fonte.replace(/\s+/g, ' ').trim()
  const partes = clean.split('. ')
  if (partes.length <= 2) return clean
  return partes.slice(0, 2).join('. ') + '.'
}

const Resultado = () => {
  const { consultaId } = useParams<{ consultaId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const onlyLocal = (location.state as { onlyLocal?: boolean } | null)?.onlyLocal === true
  const [consulta, setConsulta] = useState<Consulta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConsulta = async () => {
    if (!consultaId) {
      // Sem ID: tentar redirecionar para o último resultado salvo no sessionStorage
      try {
        const latest = sessionStorage.getItem('sowish_consulta_latest')
        if (latest) {
          const parsed = JSON.parse(latest) as Consulta
          if (parsed.id) {
            navigate(`/resultado/${parsed.id}`, { replace: true })
            return
          }
        }
      } catch (_) {}
      setLoading(false)
      setError('Nenhuma consulta informada. Preencha o questionário para ver um resultado.')
      return
    }
    setLoading(true)
    setError(null)

    // Tentar primeiro do sessionStorage (salvo pelo Questionário após o insert) para exibir na hora
    try {
      let cached = sessionStorage.getItem(`sowish_consulta_${consultaId}`)
      if (!cached) {
        const latest = sessionStorage.getItem('sowish_consulta_latest')
        if (latest) {
          const parsed = JSON.parse(latest) as Consulta
          if (parsed.id === consultaId) cached = latest
        }
      }
      if (cached) {
        const parsed = JSON.parse(cached) as Consulta
        setConsulta(parsed)
        setError(null)
        setLoading(false)
        // Buscar do servidor em background; mesclar para não perder relatório/imagem se o servidor vier com null (ex.: RLS)
        const { data } = await supabase.from('consultas').select('*').eq('id', consultaId).maybeSingle()
        if (data) {
          const fromDb = data as Consulta
          setConsulta({
            ...fromDb,
            relatorio: fromDb.relatorio ?? parsed.relatorio,
            instalacoes_tecnicas: fromDb.instalacoes_tecnicas ?? parsed.instalacoes_tecnicas,
            imagem_url: fromDb.imagem_url ?? parsed.imagem_url,
          })
        }
        return
      }
    } catch (_) {}

    const { data, error: err } = await supabase
      .from('consultas')
      .select('*')
      .eq('id', consultaId)
      .maybeSingle()

    if (err) {
      setError(err.message)
      setConsulta(null)
    } else if (!data) {
      setError('Consulta não encontrada. Pode ser que ainda não tenha sido salva — tente "Tentar novamente" em alguns segundos.')
      setConsulta(null)
    } else {
      setConsulta(data as Consulta)
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!consultaId) {
      try {
        const latest = sessionStorage.getItem('sowish_consulta_latest')
        if (latest) {
          const parsed = JSON.parse(latest) as Consulta
          if (parsed.id) {
            navigate(`/resultado/${parsed.id}`, { replace: true })
            return
          }
        }
      } catch (_) {}
      setLoading(false)
      setError('Nenhuma consulta informada. Preencha o questionário para ver um resultado.')
      return
    }
    fetchConsulta()
  }, [consultaId, navigate])

  const { statusLabel, statusDescription, statusTone } = useMemo(() => {
    if (!consulta) {
      return {
        statusLabel: '',
        statusDescription: '',
        statusTone: 'neutral' as 'success' | 'alert' | 'neutral',
      }
    }

    const baseText = (
      consulta.relatorio ??
      consulta.instalacoes_tecnicas ??
      ''
    ).toLowerCase()

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

    if (hasNegative && !hasPositive) {
      return {
        statusLabel: 'Não atende às normas',
        statusDescription:
          'Pelos parâmetros informados, o espaço não atinge os requisitos mínimos recomendados.',
        statusTone: 'alert' as const,
      }
    }

    if (hasPositive && !hasNegative) {
      return {
        statusLabel: 'Espaço viável',
        statusDescription:
          'Com base nas normas e parâmetros analisados, o espaço é considerado adequado.',
        statusTone: 'success' as const,
      }
    }

    return {
      statusLabel: 'Análise de viabilidade',
      statusDescription:
        'Confira abaixo os detalhes de área recomendada e instalações técnicas para interpretar o resultado.',
      statusTone: 'neutral' as const,
    }
  }, [consulta])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8 animate-pulse space-y-4">
          <div className="h-5 w-40 bg-slate-200 rounded-full" />
          <div className="h-4 w-64 bg-slate-200 rounded-full" />
          <div className="h-40 w-full bg-slate-200 rounded-2xl" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-slate-200 rounded-full" />
            <div className="h-3 w-5/6 bg-slate-200 rounded-full" />
            <div className="h-3 w-4/6 bg-slate-200 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  const isNoIdError = error?.startsWith('Nenhuma consulta informada')

  if (error || !consulta) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8 max-w-lg mx-auto text-center border-red-100">
        <p className="text-red-600 mb-4 font-medium">{error ?? 'Consulta não encontrada.'}</p>
        {consultaId && consultaId !== 'undefined' && (
          <p className="text-xs text-slate-400 mb-2 font-mono break-all">ID: {consultaId}</p>
        )}
        {!isNoIdError && (
          <p className="text-sm text-slate-500 mb-4">
            Se você acabou de enviar o questionário, aguarde alguns segundos e clique em &quot;Tentar novamente&quot;.
          </p>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          {!isNoIdError && (
            <button
              type="button"
              onClick={() => fetchConsulta()}
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium text-white bg-[#0B1F3A] hover:bg-[#0d2847] transition"
            >
              Tentar novamente
            </button>
          )}
          {isNoIdError && (
            <button
              type="button"
              onClick={() => navigate('/questionario')}
              className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium text-white bg-[#0B1F3A] hover:bg-[#0d2847] transition"
            >
              Ir ao Questionário
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  const toneClasses =
    statusTone === 'success'
      ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
      : statusTone === 'alert'
        ? 'bg-amber-50 border-amber-100 text-amber-800'
        : 'bg-slate-50 border-slate-100 text-slate-800'

  const badgeClasses =
    statusTone === 'success'
      ? 'bg-emerald-100 text-emerald-800 print:bg-emerald-100 print:text-emerald-800'
      : statusTone === 'alert'
        ? 'bg-red-100 text-red-800 print:bg-red-100 print:text-red-800'
        : 'bg-slate-100 text-slate-700'

  return (
    <div className="space-y-4 print:space-y-0">
      {onlyLocal && (
        <div className="rounded-xl bg-amber-500/95 text-[#0B1F3A] px-4 py-3 max-w-4xl mx-auto border border-amber-400/50 shadow-lg print:hidden">
          <p className="text-sm font-medium">
            Este resultado não foi salvo no Supabase (o insert falhou). Seu crédito não foi descontado.
            Rode o script <code className="bg-black/20 px-1 rounded">supabase/RODE-ISSO-NO-SUPABASE.sql</code> no SQL Editor do projeto e tente novamente.
          </p>
        </div>
      )}

      {/* Área que será impressa/PDF (cabeçalho + relatório + avisos) */}
      <div className="print-document max-w-4xl mx-auto">
        {/* Cabeçalho do programa (sempre visível na tela; na impressão vira o topo do documento) */}
        <header className="hidden print:block print:flex print:items-center print:justify-between print:mb-8 print:border-b-2 print:border-slate-800 print:pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo-sowish.png" alt="" className="h-10 w-10 object-contain print:block" />
            <div>
              <span className="block text-xs tracking-[0.2em] uppercase text-slate-500 print:text-slate-600">
                Sowish Viabilidade
              </span>
              <span className="block text-lg font-semibold text-slate-900">
                Laudo de Viabilidade Arquitetônica
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] leading-snug text-slate-700">
            <p>Data de geração: {new Date().toLocaleDateString('pt-BR')}</p>
            {consultaId && <p className="font-mono text-slate-600">ID: {consultaId}</p>}
          </div>
        </header>

        <div className="space-y-6 print:space-y-4">
        {/* Seção: título + status + resumo rápido */}
        <section className="bg-white/45 backdrop-blur-sm rounded-xl shadow-sm border border-white/30 p-6 sm:p-8 print:bg-white print:shadow-none print:border-none print:p-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Resultado da viabilidade
              </h1>
              {consulta.area_total != null && (
                <p className="text-slate-700 mt-1 text-sm">
                  Área recomendada:&nbsp;
                  <strong className="text-slate-900">
                    {consulta.area_total} m²
                  </strong>
                </p>
              )}
              {consulta.especialidade && (
                <p className="text-xs text-slate-500 mt-1">
                  Especialidade avaliada:&nbsp;
                  <span className="font-medium text-slate-700">
                    {consulta.especialidade}
                  </span>
                </p>
              )}
            </div>

            <div
              className={`rounded-2xl px-4 py-3 border shadow-sm ${toneClasses}`}
            >
              {statusLabel && (
                <div
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold gap-2 border border-current ${badgeClasses}`}
                >
                  {statusTone === 'success' && (
                    <span
                      aria-hidden
                      className="text-emerald-700 print:text-emerald-800"
                    >
                      ✔︎
                    </span>
                  )}
                  {statusTone === 'alert' && (
                    <span
                      aria-hidden
                      className="text-red-700 print:text-red-800"
                    >
                      ⚠︎
                    </span>
                  )}
                  <span>{statusLabel}</span>
                </div>
              )}
              {statusDescription && (
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-800">
                  {statusDescription}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Seção: Relatório principal */}
        {consulta.relatorio && (
          <section className="bg-white/45 backdrop-blur-sm rounded-xl shadow-sm border border-white/30 p-6 sm:p-8 print:bg-white print:shadow-none print:border-none print:p-0 print:mt-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Relatório técnico
            </h2>
            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-p:text-slate-800 prose-p:leading-relaxed prose-p:text-justify">
              <ReactMarkdown>{consulta.relatorio}</ReactMarkdown>
            </div>
          </section>
        )}

        {/* Seção: Instalações técnicas */}
        {consulta.instalacoes_tecnicas && (
          <section className="bg-white/45 backdrop-blur-sm rounded-xl shadow-sm border border-white/30 p-6 sm:p-8 print:bg-white print:shadow-none print:border-none print:p-0">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">
              Instalações técnicas e pontos de atenção
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Pontos de atenção de acordo com normas da vigilância sanitária e
              referenciais técnicos.
            </p>
            <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-strong:text-slate-900 prose-p:text-slate-800 prose-p:leading-relaxed prose-p:text-justify">
              <ReactMarkdown>{consulta.instalacoes_tecnicas}</ReactMarkdown>
            </div>
          </section>
        )}

        {/* Nenhum conteúdo adicional */}
        {!consulta.imagem_url &&
          !consulta.relatorio &&
          !consulta.instalacoes_tecnicas && (
            <section className="bg-white/45 backdrop-blur-sm rounded-xl shadow-sm border border-white/30 p-6 text-center text-slate-500 print:bg-white print:shadow-none print:border-none print:p-0">
              Nenhum conteúdo adicional para exibir para esta consulta.
            </section>
          )}

        {/* Aviso legal (tela + impressão) */}
        <section className="mt-2 print:mt-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-sm text-yellow-800 rounded-r-xl shadow-sm print:shadow-none print:bg-yellow-50 print:border-l-4 print:border-yellow-400 print:p-4 print:break-inside-avoid">
            <p className="font-semibold mb-1">⚠️ Aviso legal</p>
            <p className="leading-relaxed text-justify">
              Este é um laudo preliminar de viabilidade arquitetônica gerado
              com apoio de modelos de Inteligência Artificial e referenciais
              técnicos (incluindo a RDC 50/ANVISA e SOMASUS), com base nas
              informações fornecidas pelo usuário. Ele não substitui a vistoria
              in loco, o projeto arquitetônico detalhado ou a validação formal
              junto à vigilância sanitária e demais órgãos competentes.
            </p>
            <p className="leading-relaxed text-justify font-semibold mt-3 print:mt-3">
              Consulte um especialista antes de tomar qualquer decisão com base neste documento.
            </p>
          </div>
        </section>

        {/* Imagem 3D (final do laudo) */}
        {consulta.imagem_url && (
          <section className="mt-6 print:mt-10 print:break-before-page">
            <figure className="bg-white/45 backdrop-blur-sm rounded-xl shadow-md overflow-hidden border border-white/30 px-4 sm:px-6 pt-6 pb-4 print:bg-white print:border-none print:shadow-none print:px-0 print:pt-0 print:pb-0 print:break-inside-avoid">
              <div className="rounded-2xl overflow-hidden shadow-[0_18px_45px_rgba(15,23,42,0.25)] bg-slate-100">
                <img
                  src={consulta.imagem_url}
                  alt="Perspectiva 3D ilustrativa do ambiente analisado"
                  className="w-full max-w-3xl mx-auto object-contain max-h-[480px]"
                />
              </div>
              <figcaption className="text-center text-xs text-slate-500 mt-3">
                Perspectiva 3D ilustrativa do ambiente analisado
              </figcaption>
            </figure>
          </section>
        )}

        </div>
      </div>

        {/* Barra de ações (tela apenas, fora do documento impresso) */}
        <div className="pt-2 pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end print:hidden max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 shadow-sm transition"
          >
            <span className="mr-2">🖨️</span> Imprimir / Salvar PDF
          </button>
          <button
            type="button"
            onClick={() => {
              const especialidade = consulta.especialidade ?? 'serviço em saúde'
              const status = getStatusText(statusTone)
              const areaText =
                consulta.area_total != null
                  ? `${consulta.area_total} m²`
                  : 'não informada'
              const resumo = getResumoLaudo(consulta)
              const subject = `Laudo de Viabilidade - ${especialidade}`
              const body = [
                `Olá! Segue o resumo da nossa análise de viabilidade para a clínica de ${especialidade}.`,
                '',
                `Status: ${status}`,
                `Área Estimada: ${areaText}`,
                '',
                resumo ? `Resumo do laudo: ${resumo}` : '',
                '',
                'Lembre-se: Este é um laudo preliminar gerado por Inteligência Artificial e não substitui o projeto de um arquiteto.',
                '',
                'Consulte um especialista antes de tomar qualquer decisão com base neste documento.',
              ]
                .filter(Boolean)
                .join('\n')

              const mailto = `mailto:?subject=${encodeURIComponent(
                subject,
              )}&body=${encodeURIComponent(body)}`
              window.location.href = mailto
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 shadow-sm transition"
          >
            <span className="mr-2">✉️</span> Enviar por E-mail
          </button>
          <button
            type="button"
            onClick={() => {
              const especialidade = consulta.especialidade ?? 'serviço em saúde'
              const status = getStatusText(statusTone)
              const areaText =
                consulta.area_total != null
                  ? `${consulta.area_total} m²`
                  : 'não informada'
              const resumo = getResumoLaudo(consulta)
              const texto = [
                `🏥 *Análise de Viabilidade - ${especialidade}*`,
                '',
                `*Status:* ${status}`,
                `*Área Estimada:* ${areaText}`,
                '',
                '*Resumo do Laudo:*',
                resumo || '(sem resumo disponível)',
                '',
                '⚠️ _Aviso: Este é um laudo preliminar gerado por IA (RDC 50) e não substitui avaliação técnica no local._',
                '',
                '_Consulte um especialista antes de tomar qualquer decisão com base neste documento._',
              ].join('\n')

              const url = `https://wa.me/?text=${encodeURIComponent(texto)}`
              window.open(url, '_blank')
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
          >
            <span className="mr-2">💬</span> Enviar por WhatsApp
          </button>
        </div>
    </div>
  )
}

export default Resultado
