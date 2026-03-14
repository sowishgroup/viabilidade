-- Garante que a tabela system_settings exista (para Configurações Admin).
-- Execute no SQL Editor do Supabase se o erro "table system_settings not found" aparecer.

create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.system_settings enable row level security;

drop policy if exists "Admins can read system_settings" on public.system_settings;
create policy "Admins can read system_settings"
  on public.system_settings for select
  using (
    exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert system_settings" on public.system_settings;
create policy "Admins can insert system_settings"
  on public.system_settings for insert
  with check (
    exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  );

drop policy if exists "Admins can update system_settings" on public.system_settings;
create policy "Admins can update system_settings"
  on public.system_settings for update
  using (
    exists (
      select 1 from public.profiles admin_p
      where admin_p.id = auth.uid() and admin_p.role = 'admin'
    )
  );
