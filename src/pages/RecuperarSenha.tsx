import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const RecuperarSenha = () => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const redirectTo = `${window.location.origin}/atualizar-senha`
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })
      if (err) {
        setError(err.message)
        return
      }
      setSuccess(
        'Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.',
      )
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Erro ao solicitar recuperação de senha.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto rounded-2xl sm:rounded-3xl bg-white/45 backdrop-blur-md border border-white/30 shadow-xl p-4 sm:p-6 md:p-8">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Recuperar senha</h1>
      <p className="text-xs text-slate-500 mb-4">
        Informe o e-mail que você usa para acessar a plataforma. Vamos enviar um link seguro para você
        criar uma nova senha.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-800 mb-1.5">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400 transition"
            placeholder="voce@clinica.com.br"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-2xl border bg-red-50 text-red-700 border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm p-3 rounded-2xl border bg-emerald-50 text-emerald-800 border-emerald-100">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-full text-sm font-semibold text-white bg-[#0B1F3A] hover:bg-[#0d2847] shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {submitting ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        Lembrou a senha?{' '}
        <Link to="/login" className="text-sky-600 hover:text-sky-700 hover:underline">
          Voltar para login
        </Link>
      </p>
    </div>
  )
}

export default RecuperarSenha

