const Admin = () => {
  return (
    <div className="bg-white/45 backdrop-blur-md rounded-3xl shadow-xl border border-white/30 p-6 sm:p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Visão geral do Admin</h1>
      <p className="text-sm text-slate-600 max-w-2xl">
        Bem-vindo ao painel administrativo da Sowish Viabilidade. Use o menu lateral para navegar
        entre a gestão de usuários & créditos, o histórico global de consultas e as configurações de
        pagamento da plataforma.
      </p>
      <ul className="mt-4 text-sm text-slate-600 list-disc list-inside space-y-1">
        <li>
          <span className="font-semibold">Usuários & Créditos:</span> ajuste manualmente o saldo de
          créditos de qualquer conta.
        </li>
        <li>
          <span className="font-semibold">Histórico de Consultas:</span> acompanhe como a plataforma
          está sendo utilizada.
        </li>
        <li>
          <span className="font-semibold">Configurações de Pagamento:</span> armazene com segurança
          chaves de API de pagamento (Stripe, Asaas, etc.).
        </li>
      </ul>
    </div>
  )
}

export default Admin

