# AniOpening Quiz

Jogo web inspirado no Animdle para adivinhar o anime pela opening ou ending. O vídeo começa borrado, o trecho liberado é curto e cada erro ou skip reduz uma vida, libera mais tempo e diminui o blur.

## Stack

- React + Vite + TypeScript
- TailwindCSS
- React Router
- Zustand
- Fuse.js
- AnimeThemes API
- Jikan API com dados do MyAnimeList
- Cache simples com `localStorage`

## Modos

- `Opening`: temas `OP`, 6 vidas e dicas durante a partida.
- `Ending`: temas `ED`, 6 vidas e dicas durante a partida.
- `Hard Opening`: temas `OP`, 6 vidas e a mesma progressão visual do modo normal, mas com animes menos conhecidos.
- `Hard Ending`: temas `ED`, 6 vidas e a mesma progressão visual do modo normal, mas com animes menos conhecidos.

No modo hard, a partida não exibe ano, temporada, artista nem sequência do tema antes do resultado.

## Rotas

- `/`
- `/opening`
- `/ending`
- `/hard-opening`
- `/hard-ending`

## Como rodar

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## API

O app consome a AnimeThemes API usando o endpoint:

```txt
https://api.animethemes.moe/anime?include=synonyms,resources,animethemes.animethemeentries.videos,animethemes.song.artists
```

A implementação busca páginas aleatórias, filtra por `OP` ou `ED`, descarta temas sem vídeo, cria um pool em memória e mantém cache no `localStorage` por algumas horas. O autocomplete também usa `/search?q=...` para buscar nomes fora do pool atual, com cache por termo. O próximo vídeo é pré-carregado com `preload="metadata"`.

Para classificar dificuldade, o app usa exclusivamente dados do MyAnimeList via Jikan:

```txt
https://api.jikan.moe/v4/anime?q={title}&limit=5
https://api.jikan.moe/v4/anime/{malId}
```

Os dados da Jikan ficam em cache por 7 dias. A classificação prioriza `members`, `popularity` e `favorites`, usando `score` e `rank` apenas como reforço. Modos normais usam desafios `normal` ou `mixed`; modos hard usam desafios `hard`. O fallback amplo só entra se a API não conseguir montar nenhum desafio adequado.

## Estrutura

```txt
src/
  main.tsx
  App.tsx
  routes/
  components/
  services/
  hooks/
  utils/
  types/
  config/
```

## Evolução

Boas próximas melhorias:

- adicionar testes para `guessMatcher` e `animeThemesApi`;
- persistir histórico de desafios recentes para evitar repetição entre sessões;
- criar filtros por década, temporada ou popularidade;
- adicionar fallback visual quando um navegador não suportar WebM;
- trocar o cache local por IndexedDB se o pool crescer muito.
