-- Admin: ajustes para painel e configurações seguras
-- Execute este arquivo no SQL Editor do Supabase (Dashboard → SQL → New query).

-----------------------------
-- 1) PERFIS (profiles)
-----------------------------

-- Adiciona colunas de apoio ao Admin (e-mail e especialidade principal)
alter table public.profiles
  add column if not exists email text,
  add column if not exists main_specialty text;

-- (Opcional) Tenta preencher o e-mail a partir de auth.users
do $$
begin
  if exists (select 1 from pg_catalog.pg_namespace n join pg_catalog.pg_class c on c.relnamespace = n.oid where n.nspname = 'auth' and c.relname = 'users') then
    update public.profiles p
    set email = u.email
    from auth.users u
    where u.id = p.id
      and (p.email is null or p.email = '');
  end if;
end $$;

-- Permitir que administradores leiam e atualizem todos os perfis
drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  );

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  );

-----------------------------
-- 2) CONSULTAS (histórico global)
-----------------------------

-- Permitir que administradores leiam todas as consultas
drop policy if exists "Admins can read all consultas" on public.consultas;
create policy "Admins can read all consultas"
  on public.consultas for select
  using (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  );

-----------------------------
-- 3) SYSTEM_SETTINGS (chaves sensíveis)
-----------------------------

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.system_settings enable row level security;

-- Apenas administradores podem ler/escrever system_settings
drop policy if exists "Admins can read system_settings" on public.system_settings;
create policy "Admins can read system_settings"
  on public.system_settings for select
  using (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  );

drop policy if exists "Admins can upsert system_settings" on public.system_settings;
create policy "Admins can upsert system_settings"
  on public.system_settings
  for insert, update
  using (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles admin_p
      where admin_p.id = auth.uid()
        and admin_p.role = 'admin'
    )
  );

