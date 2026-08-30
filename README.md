# Radar 2026

Agregador independente da eleição presidencial. **Não é uma pesquisa.** Média ponderada (recência, √n, presencial vs telefone, acerto 2018/2022) + chance de ganhar somando 1º e 2º turno.

**URL canônica:** https://radar-2026.vercel.app

Portal neutro. Sem marca de campanha. Sem tilt de lado.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080`.

## Modelo

- Chance de ser presidente = P(50% no 1º) + P(2º) × soma dos pares que as casas perguntaram (não assume Flávio no 2º)
- Teto de 22% do peso por casa. Pesquisa duplicada (mesmo campo, n e 1º) entra uma vez
- Casas com menor erro vs urna em 2018 e 2022 pesam mais (Paraná, Datafolha, MDA, Gerp, Quaest)
- 2º turno no mapa só se o instituto perguntou
- Ingestão TSE 11h e 19h BRT: descobre protocolo. Número só entra com parser + allowlist. SoT do agregador continua `src/data/polls.json`.

## Não é

Print de uma casa. Blog sem TSE. Torcida.


## Ingest TSE

`scripts/ingest-polls.mjs` descobre protocolos no CKAN e grava em `data/inbox/pending.jsonl`. Não escreve voto.

`scripts/process-pending.mjs` cruza o inbox com o CSV TSE. Governador/Senador vão para `data/inbox/races.jsonl` (sem voto, fora do agregador presidencial). Deputado e demais cargos saem para `skipped.jsonl`. Presidente nacional da allowlist (Poder360, Datafolha, Gerp) só entra em `src/data/polls.json` com instituto + campo + n + protocolo + `firstRound` parseado. Sem número, permanece no inbox.

```
node scripts/process-pending.mjs --offline
node scripts/process-pending.mjs
```

Timer 11h/19h BRT roda `node scripts/pipeline.mjs` (ingest + process). Sem número parseado, o protocolo fica no inbox. O agregador não lê o inbox.
