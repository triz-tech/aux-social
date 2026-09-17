# Tech Research — 16 Sep 2026

## Spotify
- Web API oficial exige OAuth. AUX usa Client Credentials no backend para catálogo público (`GET /tracks/{id}` e busca).
- Spotify também oferece oEmbed para unfurl, mas ele não é usado como substituto de metadata estruturada completa.
- Artwork do Spotify não deve ser recortado/alterado e precisa manter atribuição/link conforme Platform Policy.
- Secrets nunca chegam ao browser.
- Docs: https://developer.spotify.com/documentation/web-api/ e https://developer.spotify.com/documentation/embeds/reference/oembed

## Apple Music
- Apple Music API é a opção oficial para catálogo completo e exige Developer Token.
- Para reduzir atrito do MVP, a busca e alguns lookups têm fallback para o iTunes Search API público. O fallback não é tratado como equivalente perfeito à Apple Music API.
- `APPLE_MUSIC_DEVELOPER_TOKEN` é opcional no primeiro boot e recomendado para cobertura completa.
- Docs: https://developer.apple.com/documentation/applemusicapi/ e https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/

## Deezer
- Deezer for Developers expõe catálogo/search/track via API. O resolver usa track ID de links `deezer.com/track/...`.
- Verifique termos/quotas antes de lançamento comercial.
- Docs: https://developers.deezer.com/

## Reconhecimento musical
- ShazamKit é uma tecnologia Apple excelente para app nativo, mas o MVP é web/PWA.
- AUX usa AudD: grava ~7s após gesto explícito do usuário, envia o Blob ao backend, o backend envia ao AudD e o áudio não é salvo pelo AUX.
- AudD aceita arquivo binário e pode retornar blocos Apple Music/Spotify/Deezer. Token fica no servidor.
- ACRCloud continua uma alternativa legítima se custo/qualidade mudarem.
- Docs: https://docs.audd.io/ e https://docs.acrcloud.com/reference/identification-api

## Web Share / Share Target
- `navigator.share()` é progressive enhancement e exige contexto seguro (HTTPS).
- `share_target` permite que uma PWA instalada receba conteúdo do share sheet em plataformas compatíveis, mas não é Baseline e não funciona em todos os browsers.
- Fallback universal: copiar URL da música → abrir AUX → colar; ou `/new?url=...`.
- Docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API e https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target

## Câmera e microfone
- Permissão apenas depois de ação explícita.
- Microfone: `getUserMedia` + `MediaRecorder` em contexto seguro.
- Câmera: `<input type=file accept=image/* capture=environment>` como caminho simples e resiliente; galeria continua disponível.
- Nenhuma permissão é solicitada no carregamento inicial.

## Supabase
- Auth por email/senha, RLS em todas as tabelas sociais, Storage limitado por pasta do `auth.uid()`.
- Next.js usa `@supabase/ssr` com cookies.
- A publishable key pode estar no client; service-role key não é necessária para o produto e não deve ser adicionada ao frontend.
- Docs: https://supabase.com/docs/guides/auth/server-side e https://supabase.com/docs/guides/auth/quickstarts/nextjs
