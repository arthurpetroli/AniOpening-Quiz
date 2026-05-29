# AniOpening Quiz

Jogo web inspirado no Animdle para adivinhar o anime pela opening ou ending. O vídeo começa borrado, o trecho liberado é curto e cada erro ou skip reduz uma vida, libera mais tempo e diminui o blur.

## Stack

- React + Vite + TypeScript
- TailwindCSS
- React Router
- Zustand
- Fuse.js
- AnimeThemes API
- Cache simples com `localStorage`

## Modos

- `Opening`: temas `OP`, 6 vidas e dicas durante a partida.
- `Ending`: temas `ED`, 6 vidas e dicas durante a partida.
- `Hard Opening`: temas `OP`, 5 vidas, blur mais forte, menos tempo e autocomplete a partir de 3 letras.
- `Hard Ending`: temas `ED`, 5 vidas, blur mais forte, menos tempo e autocomplete a partir de 3 letras.

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
https://api.animethemes.moe/anime?include=synonyms,animethemes.animethemeentries.videos,animethemes.song.artists
```

A implementação busca páginas aleatórias, filtra por `OP` ou `ED`, descarta temas sem vídeo, cria um pool em memória e mantém cache no `localStorage` por algumas horas. O próximo vídeo é pré-carregado com `preload="metadata"`.

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
