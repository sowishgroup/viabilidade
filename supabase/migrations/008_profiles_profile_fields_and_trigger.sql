-- Perfis: campos de perfil e trigger com 3 créditos iniciais
-- Execute este arquivo no SQL Editor do Supabase.

-- Garante que a tabela profiles exista (estrutura básica já vem das migrations anteriores)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 3,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Campos adicionais de perfil
alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists especialidade text,
  add column if not exists email text;

-- Garantir default de 3 créditos para novos perfis
alter table public.profiles alter column credits set default 3;

-- Trigger: cria perfil com 3 créditos quando um usuário é criado em auth.users
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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

