# Deploy em produção (EasyPanel / Docker)

## Importante: use o build, não o código-fonte

Em **local** você roda `npm run dev`: o Vite serve os arquivos de desenvolvimento (incluindo `/src/main.tsx`).

Em **produção** o navegador deve receber o **build** (pasta `dist/`), onde o `index.html` já aponta para o JavaScript compilado (ex: `/assets/index-xxxxx.js`). Se o servidor entregar o `index.html` do **código-fonte** (com `<script src="/src/main.tsx">`), o app não carrega e a tela fica azul.

## Como fazer certo no EasyPanel

1. **Use o Dockerfile**  
   No EasyPanel, configure o deploy para usar **Docker** (não Nixpacks nem “Run Command” solto). O Dockerfile:
   - faz `npm run build` e gera a pasta `dist/`
   - copia só o `dist/` para o nginx
   - o nginx serve esses arquivos na raiz do domínio

2. **App na raiz do domínio**  
   O app está configurado para rodar na **raiz** (ex: `https://viabilidade.sowishgroup.com/`).  
   Se o EasyPanel colocar o app em um subpath (ex: `https://dominio.com/viabilidade/`), avise para ajustarmos o `base` no Vite.

3. **Variáveis de ambiente no build**  
   No EasyPanel, defina **no ambiente de build** (não só em runtime):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_N8N_WEBHOOK_URL` — **obrigatório para consultas**: URL do webhook do n8n que recebe o questionário e devolve o relatório. Sem isso, ao tentar fazer uma consulta o app exibe "Webhook n8n não configurado". Depois de adicionar, faça um **novo deploy** (o valor é embutido no build).  
   O Dockerfile usa `ARG`/`ENV` para que o Vite embuta esses valores no bundle.

4. **Imagens (logo e fundos)**  
   Para o logo e as imagens de fundo aparecerem, coloque na pasta `public/`: `logo-sowish.png`, `bg-mobile.png`, `bg-desktop.png` (veja `public/IMAGENS-README.txt`). Se não colocar, o app funciona, mas os lugares das imagens ficarão vazios ou com fallback.

5. **Build da imagem**  
   O EasyPanel deve **construir a imagem Docker** a partir deste repositório (e depois subir o container). Assim o servidor nunca entrega `/src/main.tsx`, só os arquivos gerados em `dist/`.

## Se a tela continuar azul

- Abra as ferramentas do desenvolvedor (F12) → aba **Rede**. Recarregue a página e veja se algum arquivo `.js` (ex: `/assets/index-xxx.js`) retorna **404** ou **tipo errado** (ex: text/plain).
- Confirme que o deploy está usando a **imagem construída pelo Dockerfile**, não “Build: npm run build” + “Start: npm run dev” ou similar.
- Após ~6 segundos, se o app não carregar, a própria página mostra “O app não carregou” e um botão **Recarregar**; use isso para tentar de novo depois de corrigir o deploy.
