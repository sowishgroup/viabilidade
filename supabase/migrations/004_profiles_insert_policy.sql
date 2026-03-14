-- Garante que usuários autenticados possam inserir o próprio perfil (id = auth.uid())
-- Execute no SQL Editor do Supabase se o insert do perfil falhar com RLS.

drop policy if exists "Enable insert for authenticated users (own row)" on public.profiles;

create policy "Enable insert for authenticated users (own row)"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);
