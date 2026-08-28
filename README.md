# Radar 2026

Agregador da eleição presidencial brasileira. **Não é uma pesquisa** — é a média ponderada (recência, √n, presencial vs telefone, house effect, Monte Carlo) com mapa por estado.

Alvo BR · as-of agosto 2026.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080`.

## O que entra no agregado

- Pesquisas nacionais (Quaest, Datafolha, PoderData, Nexus/BTG, Gerp, Veritá, Real Time…)
- Mapa UF a UF; 2º turno só conta se o instituto perguntou
- Recortes metro (ex.: ABC paulista) ficam de fora do estado

## Não é

Print de uma casa. Blog sem TSE. Torcida.
