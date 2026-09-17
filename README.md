# aux.

AUX é uma rede social music-first: **Review = o que você pensa sobre uma música; Memory = onde ela entrou na sua vida.** O produto não toca catálogo como serviço de streaming. Ele registra música + opinião + memória + fotografia + contexto.

> **Nome:** “AUX” é um termo amplamente usado. Antes de lançamento comercial, verifique domínio, disponibilidade em lojas e trademark nas jurisdições relevantes.

## Stack
Next.js 16.3.3 · React 19.3 · TypeScript strict · Supabase Auth/Postgres/Storage/RLS · Motion · Lucide · PWA manifest.

## O que já existe
- Auth email/senha + onboarding.
- Feed Para você / Seguindo.
- Colar link Spotify, Apple Music ou Deezer.
- Busca de música.
- Reconhecimento real via AudD quando o token está configurado.
- Review com meia estrela.
- Memory com 1–6 fotos, câmera/galeria e carrossel.
- Like, comentários, repost e follow com RLS.
- Activity via notifications geradas por triggers.
- Story Card PNG 1080×1920 e Web Share/fallback de salvar.
- Perfil, Discover, permalink, settings.
- Demo mode explícito.
- PWA manifest + share target progressivo.

Veja `docs/PRODUCT_SPEC.md`, `docs/TECH_RESEARCH.md` e `docs/DESIGN_SYSTEM.md`.

---

# 1. Rodar primeiro em DEMO (sem Supabase)

No terminal, dentro da pasta do projeto:

```bash
cp .env.example .env.local
```

No Windows PowerShell, se `cp` não funcionar:

```powershell
Copy-Item .env.example .env.local
```

Deixe em `.env.local`:

```env
NEXT_PUBLIC_DEMO_MODE=true
```

Depois:

```bash
npm install
npm run typecheck
npm run dev
```

Abra `http://localhost:3000` e também `http://localhost:3000/u/demo`.

---

# 2. Criar um Supabase NOVO — passo a passo

1. Abra **supabase.com** e faça login.
2. Clique em **New project**.
3. Escolha sua organização.
4. Nome sugerido: `aux-social`.
5. Crie e guarde uma senha forte para o banco.
6. Escolha uma região próxima do público (para Brasil, selecione uma opção sul-americana quando disponível).
7. Crie o projeto.
8. No menu esquerdo, abra **SQL Editor**.
9. Clique em **New query**.
10. Abra localmente o arquivo `supabase/schema.sql` deste projeto.
11. Copie **o arquivo inteiro**, cole no SQL Editor e clique em **Run**.
12. Abra **Table Editor** e confirme tabelas como `profiles`, `tracks`, `posts`, `post_media`, `likes`, `comments`, `reposts`, `follows` e `notifications`.
13. Abra **Storage**. Os buckets `avatars` e `memories` já devem existir porque o `schema.sql` os cria. Não os recrie se já estiverem lá.
14. Abra **Authentication → Providers** e confirme **Email** habilitado.
15. Durante desenvolvimento, decida se quer confirmação por email. Se estiver habilitada, o cadastro pedirá que você confirme a mensagem antes de entrar.
16. Abra as configurações/API do projeto e copie **Project URL** e a **Publishable key**. Não use `service_role` no navegador.

O SQL já liga RLS e cria policies. Não desative RLS “para fazer funcionar”.

---

# 3. Configurar `.env.local`

Na raiz, ao lado de `package.json`:

```text
aux-social/
├── .env.local       ← aqui
├── app/
├── components/
├── lib/
├── supabase/
└── package.json
```

Conteúdo mínimo para produção local:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY
NEXT_PUBLIC_DEMO_MODE=false
```

Reinicie `npm run dev` sempre que alterar variáveis de ambiente.

---

# 4. Spotify — resolver links com metadata completa

O código usa a Web API oficial e Client Credentials **somente no servidor**.

1. Entre no dashboard de desenvolvedores do Spotify.
2. Crie um app.
3. Copie Client ID e Client Secret.
4. Adicione em `.env.local`:

```env
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

Nunca use o secret em variável `NEXT_PUBLIC_*`.

Sem essas credenciais, o AUX não finge que conseguiu resolver metadata completa de um link Spotify. A busca geral ainda tenta o catálogo Apple público como fallback.

---

# 5. Apple Music

O AUX aceita busca com fallback público do iTunes Search API. Para catálogo Apple Music oficial com melhor cobertura, configure um Developer Token conforme a documentação Apple:

```env
APPLE_MUSIC_DEVELOPER_TOKEN=
APPLE_MUSIC_STOREFRONT=br
```

Gerar esse token envolve credenciais de desenvolvedor Apple e assinatura JWT. Não coloque private key no projeto nem no browser.

---

# 6. Deezer

Links no formato `deezer.com/track/<id>` são resolvidos server-side pela API do Deezer. Antes de lançamento comercial, revise termos e limites atuais do Deezer for Developers.

---

# 7. “O que tá tocando?” — AudD

AUX **não usa uma Shazam Web API inventada**. No MVP web, o reconhecimento usa AudD.

1. Crie uma conta no painel do AudD.
2. Gere/copie seu API token.
3. Adicione:

```env
AUDD_API_TOKEN=
```

Fluxo: gesto do usuário → permissão do microfone → ~7 segundos via `MediaRecorder` → `POST /api/music/recognize` → AudD → Track normalizado. O AUX não grava esse áudio no Storage.

Sem token, a interface retorna claramente “reconhecimento ainda não configurado”.

---

# 8. Teste local real

Execute:

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

Teste nesta ordem:
1. criar conta;
2. onboarding;
3. colar link;
4. publicar Review 4,5;
5. curtir/comentar/repostar;
6. abrir perfil;
7. publicar Memory com foto;
8. deslizar carrossel;
9. gerar Story Card;
10. reconhecer música após configurar AudD.

Câmera, microfone e Web Share funcionam melhor em HTTPS; `localhost` tem exceções úteis para desenvolvimento em vários browsers.

---

# 9. GitHub — iniciante

Antes, confirme que `.env.local` está ignorado por `.gitignore`.

```bash
git init
git add .
git commit -m "Initial AUX MVP"
git branch -M main
```

No GitHub:
1. **New repository**.
2. Nome: `aux-social` (ou outro).
3. Não marque README/.gitignore se eles já existem localmente.
4. Crie o repositório.
5. Copie a URL que o GitHub mostrar e rode:

```bash
git remote add origin https://github.com/SEU-USUARIO/aux-social.git
git push -u origin main
```

---

# 10. Vercel

1. Entre em **vercel.com**.
2. **Add New → Project**.
3. Importe o repositório GitHub do AUX.
4. Framework deve ser detectado como Next.js.
5. Abra **Environment Variables** e crie, uma por uma, as mesmas variáveis usadas em `.env.local`.
6. Em produção use `NEXT_PUBLIC_DEMO_MODE=false`.
7. Adicione Spotify/AudD/Apple somente se você os configurou.
8. Clique **Deploy**.
9. Após publicar, abra o domínio HTTPS e teste login, upload, review, memory, comments, share e metadata.

No Supabase, revise **Authentication → URL Configuration** e adicione a URL publicada da Vercel como Site URL/redirect permitido quando necessário ao seu fluxo de autenticação.

---

# 11. PWA e compartilhar para AUX

O manifest registra `share_target` para `/new`. Em plataformas que suportam PWA Share Target, após instalar o AUX ele pode aparecer como destino de compartilhamento. Isso **não é universal**. Em iOS/browser onde não aparecer, o fallback é copiar link e colar no AUX (ou abrir `/new?url=...`).

O botão de compartilhar posts usa `navigator.share()` quando existe e fallback para link/download. Não há promessa de abrir automaticamente o editor de Instagram Stories.

---

# Segurança
- RLS habilitado em todas as tabelas sociais.
- `auth.uid()` define propriedade das escritas.
- Storage aceita upload apenas na pasta do próprio usuário.
- Sem `service_role` no client.
- Tokens de música só no servidor.
- Texto do usuário não é renderizado como HTML.
- URLs externas são validadas.
- Áudio de reconhecimento não vai para Storage.

# Limitações conscientes do MVP
- Canonicalização perfeita da mesma gravação entre Spotify/Apple/Deezer não é prometida.
- Story Card usa PNG local e proxy de imagens com allowlist; integrações específicas do Instagram variam por SO/browser.
- `share_target` depende de PWA instalada e suporte do browser/OS.
- Dados Apple via fallback público podem diferir do Apple Music API; configure Developer Token para cobertura mais consistente.
- Reconhecimento externo não pode ser executado sem credencial AudD válida.
