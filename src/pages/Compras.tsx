import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const PLANOS = [
  { id: '10', valor: 10, consultas: 2, valorUnitario: 5, destaque: false },
  { id: '50', valor: 50, consultas: 12, valorUnitario: (50 / 12).toFixed(2), destaque: true }, // Mais comprado
  { id: '100', valor: 100, consultas: 30, valorUnitario: (100 / 30).toFixed(2), destaque: false },
] as const

const Compras = () => {
  const { profile } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const cpfCnpj = profile?.cpf_cnpj?.replace(/\D/g, '') ?? ''
  const temCpfCnpj = cpfCnpj.length === 11 || cpfCnpj.length === 14

  const handleComprar = async (planoId: string) => {
    if (!temCpfCnpj) {
      setErro('Cadastre seu CPF ou CNPJ no Perfil para poder comprar créditos.')
      return
    }
    setErro(null)
    setLoading(planoId)
    try {
      const base = import.meta.env.VITE_ASAAS_CHECKOUT_URL || '/api/asaas/checkout'
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: planoId,
          userId: profile?.id,
          cpfCnpj: cpfCnpj,
          email: profile?.email ?? '',
          name: profile?.full_name ?? profile?.email ?? '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data?.message || `Erro ao criar cobrança (${res.status}). Configure o backend com a chave Asaas.`)
        return
      }
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }
      setErro('Resposta do servidor sem link de pagamento. Configure o endpoint com a chave Asaas.')
    } catch (e) {
      setErro('Não foi possível conectar ao servidor de pagamento. Configure o endpoint /api/asaas/checkout com sua chave Asaas.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3 sm:mb-4">Créditos e compras</h1>
      <p className="text-sm sm:text-base text-slate-600 mb-6">Cada crédito equivale a uma consulta de viabilidade. Escolha um plano e pague com segurança via Asaas.</p>

      {!temCpfCnpj && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-800 text-sm">
          Para comprar créditos é necessário cadastrar <strong>CPF ou CNPJ</strong> no seu perfil.
          <Link to="/perfil" className="ml-2 font-medium underline">Ir para Perfil</Link>
        </div>
      )}

      {erro && (
        <div className="mb-6 p-4 rounded-xl bg-red-50/70 border border-red-200 text-red-800 text-sm">
          {erro}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-3">
        {PLANOS.map((plano) => (
          <div
            key={plano.id}
            className={`relative rounded-2xl border-2 p-6 ${
              plano.destaque
                ? 'border-[#0B1F3A] bg-sky-50/50 shadow-lg'
                : 'border-slate-200 bg-white/50'
            }`}
          >
            {plano.destaque && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#0B1F3A] text-white text-xs font-medium">
                Mais comprado
              </span>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">R$ {plano.valor}</p>
              <p className="text-slate-600 text-sm mt-1">{plano.consultas} consultas</p>
              <p className="text-slate-500 text-xs mt-0.5">R$ {plano.valorUnitario} por consulta</p>
            </div>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => handleComprar(plano.id)}
                disabled={!temCpfCnpj || loading !== null}
                className={`w-full rounded-xl py-3 font-medium text-sm transition ${
                  plano.destaque
                    ? 'bg-[#0B1F3A] text-white hover:bg-[#0d2a4a]'
                    : 'bg-slate-700 text-white hover:bg-slate-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plano.id ? 'Abrindo pagamento...' : 'Comprar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-slate-500">
        Pagamento processado com segurança pelo Asaas. Após a confirmação, os créditos são creditados automaticamente na sua conta.
      </p>
    </div>
  )
}

export default Compras
