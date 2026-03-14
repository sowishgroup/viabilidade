-- 1) Garantir coluna cpf_cnpj em profiles (se ainda não existir)
alter table public.profiles
  add column if not exists cpf_cnpj text;

comment on column public.profiles.cpf_cnpj is 'CPF (11 dígitos) ou CNPJ (14 dígitos) apenas números; obrigatório para comprar créditos via Asaas.';

-- 2) Bucket de avatares e políticas de Storage
-- Cria o bucket se não existir (via insert com on conflict do nothing não existe para buckets; usamos verificação)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'avatars') then
    insert into storage.buckets (id, name, public)
    values ('avatars', 'avatars', true);
  end if;
end $$;

-- Políticas em storage.objects para o bucket avatars
-- Leitura: qualquer um pode ver (bucket público)
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload: usuário autenticado só pode enviar para a pasta do próprio user id
drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Atualizar: usuário pode atualizar/sobrescrever apenas arquivos na própria pasta
drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deletar: usuário pode apagar apenas arquivos na própria pasta
drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
