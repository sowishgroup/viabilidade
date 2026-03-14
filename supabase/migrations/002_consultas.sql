-- Tabela de consultas de viabilidade
create table if not exists public.consultas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_total numeric not null,
  markdown text not null,
  num_salas integer not null,
  tem_anestesia boolean not null,
  equipe_admin integer not null,
  created_at timestamptz not null default now()
);

-- Índice para listar consultas do usuário
create index if not exists consultas_user_id_idx on public.consultas (user_id);
create index if not exists consultas_created_at_idx on public.consultas (created_at desc);

-- RLS
alter table public.consultas enable row level security;

-- Usuário vê e insere apenas suas consultas
create policy "Users can read own consultas"
  on public.consultas for select
  using (auth.uid() = user_id);

create policy "Users can insert own consultas"
  on public.consultas for insert
  with check (auth.uid() = user_id);

-- Opcional: usuário não pode atualizar/deletar (apenas leitura após criado)
-- Se quiser permitir delete: create policy "Users can delete own consultas" ...
