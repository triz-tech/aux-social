# AUX — Product Spec

## Conceito
AUX é uma rede social de música em que a unidade central é a relação entre uma pessoa e uma faixa. Não é streaming. A música entra primeiro; depois o usuário escolhe se quer registrar uma **Review** (opinião + 0,5–5 estrelas) ou uma **Memory** (música + 1–6 fotos + memória).

## Diferencial
- Letterboxd registra uma opinião sobre uma obra; serviços de streaming registram consumo; AUX registra **significado e contexto**.
- O momento assinatura é `+ → O que tá tocando? → reconhecer → Memory → fotografar → publicar → Story Card`.
- Perfil é identidade musical, não dashboard.

## Casos de uso
1. Festa: reconhecer uma música desconhecida, fotografar amigas e guardar a noite como Memory.
2. Escuta intencional: colar link do Spotify e publicar review de 4,5 estrelas.
3. Descoberta: buscar uma música, ver publicações e seguir pessoas.
4. Expressão externa: gerar Story Card 9:16 e compartilhar fora do AUX.

## Arquitetura
- Next.js App Router + React + TypeScript strict.
- Supabase Auth, Postgres, Storage e RLS.
- Resolução musical server-side em `/api/music/*`.
- Credenciais de Spotify/Apple/AudD somente no servidor.
- PWA progressiva; share target é enhancement, nunca requisito.
- Demo mode explícito e separado de produção.

## Telas P0/P1 implementadas
Home/Feed, Create, Recognition, Review, Memory, Comments sheet, Story share, Profile, Discover, Activity, Login/Signup, Onboarding, Settings e permalink de post.

## MVP
Auth; profile; track model; URL resolver; search; Review; Memory; camera/gallery; feed; likes; comments; repost; follow; sharing; Story Card; RLS; Storage; responsive mobile UI; demo mode; deploy-ready.

## Escopo futuro
Track page avançada, listas UI, monthly/year recap, On This Day, compatibilidade musical, recomendação avançada e app nativo com ShazamKit quando fizer sentido.
