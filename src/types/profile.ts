export type ProfileRole = 'user' | 'admin'

export type Profile = {
  id: string
  credits: number
  role: ProfileRole
  // campos de perfil do usuário
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
  phone?: string | null
  cpf_cnpj?: string | null
  especialidade?: string | null
  created_at?: string
  updated_at?: string
}
