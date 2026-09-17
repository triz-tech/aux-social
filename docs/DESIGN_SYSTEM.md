# AUX Design System

## Princípios
Digital, music-first, calmo e premium. A interface é neutra; artwork e fotografia fornecem cor. Blur indica hierarquia, não decoração.

## Tokens
- Background `#f7f7f5`; surface branca; texto `#121212`; muted `#747474`.
- Fonte: system stack `-apple-system / BlinkMacSystemFont / SF Pro-like`.
- Radius principal 24–30px; controles 14–18px.
- Touch target: controles principais próximos ou acima de 44px.
- Motion: spring curto, sem bounce exagerado; `prefers-reduced-motion` zera animações.

## Composição
- Mobile base: 390×844, safe area inferior preservada.
- Desktop: navegação migra para rail lateral e conteúdo não é apenas esticado.
- Feed usa uma coluna de leitura; cards de Review e Memory são semanticamente diferentes.

## Componentes
BottomNavigation, CreateSheet, TrackPreview, MusicRecognition, RatingStars, Review/Memory PostCard, MemoryCarousel, CommentsSheet, ShareSheet, ProfileView, Empty/Error/Loading states.
