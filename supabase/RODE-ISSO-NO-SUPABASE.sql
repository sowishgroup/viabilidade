-- =============================================================================
-- SOWISH VIABILIDADE – Script único para o Supabase
-- Rode no SQL Editor do Supabase: Dashboard → SQL Editor → New query → Cole e Execute
-- =============================================================================

-- 1) TABELA PROFILES (cria só com id se não existir; depois adiciona colunas faltando)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade
);

-- Garante todas as colunas em profiles (seguro se a tabela já existir sem algumas)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits') then
    alter table public.profiles add column credits integer not null default 3;
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

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists especialidade text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists main_specialty text;
alter table public.profiles add column if not exists cpf_cnpj text;

alter table public.profiles alter column credits set default 3;

-- 2) FUNÇÃO PARA EVITAR RECURSÃO EM RLS (admin)
--    Políticas que fazem SELECT em profiles para saber se o usuário é admin causam
--    "infinite recursion". Usamos uma função SECURITY DEFINER que lê profiles sem RLS.
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3) RLS PROFILES
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Enable insert for authenticated users (own row)" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

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

-- Admin: usa is_admin() para não ler profiles dentro da política (evita recursão)
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- 3) TRIGGER: criar perfil ao criar usuário
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, credits, role, email)
  values (new.id, 3, 'user', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4) TABELA CONSULTAS
-- -----------------------------------------------------------------------------
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

alter table public.consultas add column if not exists relatorio text;
alter table public.consultas add column if not exists imagem_url text;
alter table public.consultas add column if not exists instalacoes_tecnicas text;
alter table public.consultas add column if not exists especialidade text;
alter table public.consultas add column if not exists markdown text;
alter table public.consultas add column if not exists num_salas integer;
alter table public.consultas add column if not exists tem_anestesia boolean;
alter table public.consultas add column if not exists equipe_admin integer;

-- 5) RLS CONSULTAS
-- -----------------------------------------------------------------------------
alter table public.consultas enable row level security;

drop policy if exists "Users can read own consultas" on public.consultas;
drop policy if exists "Users can insert own consultas" on public.consultas;
drop policy if exists "Admins can read all consultas" on public.consultas;

create policy "Users can read own consultas"
  on public.consultas for select
  using (auth.uid() = user_id);

create policy "Users can insert own consultas"
  on public.consultas for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all consultas"
  on public.consultas for select
  using (public.is_admin());

create index if not exists consultas_user_id_idx on public.consultas (user_id);
create index if not exists consultas_created_at_idx on public.consultas (created_at desc);

-- 6) SYSTEM_SETTINGS (admin)
-- -----------------------------------------------------------------------------
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.system_settings enable row level security;

drop policy if exists "Admins can read system_settings" on public.system_settings;
drop policy if exists "Admins can upsert system_settings" on public.system_settings;
drop policy if exists "Admins can update system_settings" on public.system_settings;

create policy "Admins can read system_settings"
  on public.system_settings for select
  using (public.is_admin());

create policy "Admins can upsert system_settings"
  on public.system_settings for insert
  with check (public.is_admin());

create policy "Admins can update system_settings"
  on public.system_settings for update
  using (public.is_admin());

-- 7) STORAGE – bucket avatars
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true);
  end if;
end $$;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fim do script.