-- Colunas para resposta do n8n (relatório, imagem, instalações técnicas)
alter table public.consultas
  add column if not exists relatorio text,
  add column if not exists imagem_url text,
  add column if not exists instalacoes_tecnicas text;

-- Especialidade enviada ao n8n
alter table public.consultas
  add column if not exists especialidade text;

-- Permitir consultas só com resposta n8n (campos antigos opcionais)
alter table public.consultas
  alter column num_salas drop not null,
  alter column tem_anestesia drop not null,
  alter column equipe_admin drop not null,
  alter column markdown drop not null;
