-- Garantir que a tabela consultas exista com todas as colunas usadas pelo app.
-- Execute este arquivo no SQL Editor do Supabase (Dashboard → SQL Editor → New query).

-- Criar tabela se não existir (estrutura completa)
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_total numeric not null default 0,
  markdown text,
  relatorio text,
  imagem_url text,
  instalacoes_tecnicas text,
  especialidade text,
  num_salas integer,
  tem_anestesia boolean,
  equipe_admin integer,
  created_at timestamptz not null default now()
);

-- Se a tabela já existia com estrutura antiga, adicionar colunas que faltam
alter table public.consultas add column if not exists area_total numeric;
alter table public.consultas add column if not exists markdown text;
alter table public.consultas add column if not exists num_salas integer;
alter table public.consultas add column if not exists tem_anestesia boolean;
alter table public.consultas add column if not exists equipe_admin integer;
alter table public.consultas add column if not exists relatorio text;
alter table public.consultas add column if not exists imagem_url text;
alter table public.consultas add column if not exists instalacoes_tecnicas text;
alter table public.consultas add column if not exists especialidade text;

-- Garantir que area_total tenha valor default para linhas antigas (se existirem)
update public.consultas set area_total = 0 where area_total is null;
alter table public.consultas alter column area_total set not null;
alter table public.consultas alter column area_total set default 0;

-- Permitir null em colunas antigas (fluxo n8n não envia markdown/tem_anestesia)
do $$
begin
  alter table public.consultas alter column markdown drop not null;
exception when others then null;
end $$;
do $$
begin
  alter table public.consultas alter column num_salas drop not null;
exception when others then null;
end $$;
do $$
begin
  alter table public.consultas alter column tem_anestesia drop not null;
exception when others then null;
end $$;
do $$
begin
  alter table public.consultas alter column equipe_admin drop not null;
exception when others then null;
end $$;

-- RLS (não quebra se já existir)
alter table public.consultas enable row level security;

drop policy if exists "Users can read own consultas" on public.consultas;
create policy "Users can read own consultas"
  on public.consultas for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own consultas" on public.consultas;
create policy "Users can insert own consultas"
  on public.consultas for insert
  with check (auth.uid() = user_id);

-- Índices
create index if not exists consultas_user_id_idx on public.consultas (user_id);
create index if not exists consultas_created_at_idx on public.consultas (created_at desc);
