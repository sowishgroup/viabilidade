-- Corrige a tabela profiles: garante que exista com as colunas id, credits, role, created_at, updated_at
-- Execute no SQL Editor do Supabase.

-- Cria a tabela se não existir (com todas as colunas)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 0,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Adiciona colunas que estiverem faltando (se a tabela já existia com estrutura antiga)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits') then
    alter table public.profiles add column credits integer not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'role') then
    alter table public.profiles add column role text not null default 'user' check (role in ('user', 'admin'));
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'created_at') then
    alter table public.profiles add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'updated_at') then
    alter table public.profiles add column updated_at timestamptz not null default now();
  end if;
end $$;

-- RLS
alter table public.profiles enable row level security;

-- Políticas (remove as antigas se existirem para recriar)
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Enable insert for authenticated users (own row)" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Enable insert for authenticated users (own row)"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);
