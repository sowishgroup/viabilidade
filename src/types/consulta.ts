/** Resposta esperada do webhook n8n */
export type N8nViabilidadeResponse = {
  areaRecomendada: number
  relatório: string
  imagemUrl?: string
  instalacoesTecnicas?: string
}

/** Registro da tabela consultas (Supabase) */
export type Consulta = {
  id: string
  user_id: string
  area_total: number
  markdown: string | null
  relatorio: string | null
  imagem_url: string | null
  instalacoes_tecnicas: string | null
  especialidade: string | null
  num_salas: number | null
  tem_anestesia: boolean | null
  equipe_admin: number | null
  created_at: string
}
