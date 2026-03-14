import { Component, type ReactNode } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import AppRoutes from './routes'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; message: string }> {
  state = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100/90 flex items-center justify-center p-6">
          <div className="bg-white/45 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-8 max-w-md text-center">
            <p className="text-red-600 font-medium mb-2">Algo deu errado</p>
            <p className="text-sm text-slate-600 mb-4">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-full bg-[#0B1F3A] text-white text-sm font-medium"
            >
              Recarregar página
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
