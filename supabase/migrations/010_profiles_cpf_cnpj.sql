-- CPF ou CNPJ para perfil (exigido pelo Asaas para compra de créditos)
alter table public.profiles
  add column if not exists cpf_cnpj text;

comment on column public.profiles.cpf_cnpj is 'CPF (11 dígitos) ou CNPJ (14 dígitos) apenas números; obrigatório para comprar créditos via Asaas.';
