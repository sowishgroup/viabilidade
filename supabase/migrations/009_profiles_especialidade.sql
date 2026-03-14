-- Adiciona a coluna 'especialidade' (e demais campos de perfil) na tabela profiles
-- Execute no Supabase: Dashboard → SQL Editor → New query → cole e rode.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists phone text,
  add column if not exists especialidade text,
  add column if not exists email text;
