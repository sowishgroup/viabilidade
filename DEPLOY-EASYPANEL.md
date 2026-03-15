# Deploy do app no EasyPanel (via GitHub)

## 1. Subir o projeto no GitHub

- Crie um repositório no GitHub e envie o código (incluindo o `Dockerfile` e este guia).
- Não faça commit do arquivo `.env` (ele já está no `.dockerignore`).

## 2. Token do GitHub no EasyPanel

1. No **GitHub**: [Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens).
2. Crie um token (Classic ou Fine-grained):
   - **Classic**: marque `repo` e (opcional) `admin:repo_hook` para auto-deploy.
   - **Fine-grained**: permissões **Metadata** (read), **Contents** (read), **Webhooks** (read/write) no repositório.
3. No **EasyPanel**: **Settings → Github** e cole o token.

## 3. Criar o App no EasyPanel

1. **Create** → **App**.
2. **Source**: escolha **Github**.
3. Selecione o repositório e o branch (ex.: `main`).
4. Se a plataforma mostrar a aba **Dockerfile** como origem do build, use-a para construir com o `Dockerfile` do repositório (Node 20 + nginx). Caso use **Nixpacks** (build automático), o projeto já tem `.nvmrc`, `engines.node` e `nixpacks.toml` para Node 20 e `npm install`.

## 4. Variáveis de ambiente (obrigatório)

No serviço do app, em **Environment**, adicione (com os valores reais):

- `VITE_SUPABASE_URL` = URL do projeto no Supabase (ex.: `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` = chave anon do Supabase (Settings → API)
- `VITE_N8N_WEBHOOK_URL` = URL do webhook do n8n (ex.: `https://seu-n8n.com/webhook/...`)

Essas variáveis são usadas **em tempo de build** pelo Vite; sem elas o app pode carregar mas não conectar ao Supabase/n8n.

## 5. Domínio e porta

- Em **Domains & Proxy**:
  - Adicione o domínio (ex.: `app.seudominio.com`).
  - **Proxy port**: **80** (o container expõe a porta 80 do nginx).

## 6. Deploy

- Clique em **Deploy** (ou use o webhook de deploy).
- Se tiver **Auto Deploy** ativado e o token com permissão de webhook, cada push no branch configurado dispara um novo deploy.

## 7. Depois do deploy

- Acesse o domínio configurado.
- Se algo falhar, use **Logs** e **Console** do serviço no EasyPanel para inspecionar erros de build ou de execução.

---

## Se der erro de build (npm ci / lock file / Node 18)

- **"Missing: lucide-react@... from lock file"** ou **"package.json and package-lock.json are in sync"**: na pasta do projeto, rode `npm install` e faça commit do `package-lock.json`, depois dê push e redeploy. O repositório já tem `nixpacks.toml` usando `npm install` em vez de `npm ci`, então o próximo deploy deve funcionar mesmo sem o lock file.
- **Node 18 / "Unsupported engine"**: o projeto exige Node 20. Foram adicionados `engines.node` no `package.json`, `.nvmrc` com `20` e `nixpacks.toml`. Faça push desses arquivos e redeploy. Se ainda usar Node 18, no EasyPanel defina a variável de ambiente **NIXPACKS_NODE_VERSION** = **20** (em tempo de build).
