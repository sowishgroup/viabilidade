# Como subir o aplicativo para o GitHub

## 1. Criar conta e repositório no GitHub (se ainda não tiver)

1. Acesse **https://github.com** e faça login (ou crie uma conta).
2. Clique no **+** no canto superior direito → **New repository**.
3. Preencha:
   - **Repository name:** por exemplo `sowish-viabilidade`
   - **Description:** (opcional) "App de viabilidade arquitetônica e sanitária"
   - Deixe **Public**.
   - **Não** marque "Add a README" (o projeto já tem arquivos).
4. Clique em **Create repository**.
5. Copie a URL do repositório (ex.: `https://github.com/SEU_USUARIO/sowish-viabilidade.git`).

---

## 2. No computador (pasta do projeto)

Abra o **terminal** (PowerShell ou CMD) na pasta do projeto e rode os comandos abaixo.

### Inicializar Git e primeiro commit (se ainda não fez)

```bash
cd c:\Users\carlos_sowishgroup\sowish-viabilidade

git init
git add .
git commit -m "Primeiro commit: Sowish Viabilidade"
```

### Conectar ao repositório do GitHub e enviar

Substitua `SEU_USUARIO` e `sowish-viabilidade` pela sua URL:

```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/sowish-viabilidade.git
git push -u origin main
```

Se o GitHub pedir **usuário e senha**, use:
- **Usuário:** seu usuário do GitHub
- **Senha:** um **Personal Access Token** (não a senha da conta).  
  Para criar: GitHub → Settings → Developer settings → Personal access tokens → Generate new token. Marque pelo menos **repo** e use o token como senha.

---

## 3. Próximas atualizações

Sempre que quiser enviar alterações:

```bash
git add .
git commit -m "Descrição do que você alterou"
git push
```

---

**Importante:** O arquivo `.env` já está no `.gitignore`, então suas chaves do Supabase **não** serão enviadas para o GitHub. Nunca remova `.env` do `.gitignore`.
