# Design — One Night Werewolf (games-app)

**Data:** 2026-06-13
**Status:** Aprovado (design); pendente plano de implementação
**Engine:** Papéis Ocultos + Noite — **primeiro jogo: One Night Ultimate Werewolf**
**Pasta:** `src/games/hiddenroles/onenight/` · dados em `src/data/hiddenroles/onenight/`

---

## Contexto

One Night é o primeiro jogo da engine "Papéis Ocultos + Noite" (depois: Secret Hitler,
Mascarade, Blood on the Clocktower). É o jogo mais complexo das engines até agora porque,
ao contrário do Insider, **o papel FINAL de um jogador pode diferir do papel inicial** — a
Vidente espia, o Ladrão rouba uma carta, o Encrenqueiro troca as cartas de dois outros. Logo,
**o app precisa ser a fonte secreta da verdade de todas as cartas e resolver a noite sozinho.**

Modo de uso: **presencial, passa-e-joga** (um único celular passado de mão em mão) — mesmo
modelo do Taboo/Insider. Multi-device é fase futura, fora de escopo.

### Decisões de produto (do brainstorming)

1. **Noite = passa-e-joga digital.** O app é o baralho. O celular passa em **ordem de assento**
   (não de papel — isso vazaria quem tem qual papel); cada jogador confirma quem é, vê o papel e
   executa a ação noturna NO celular. Todos seguram o celular por um instante parecido, então
   ninguém deduz quem agiu. Sem cartas físicas.
2. **Roster completo (clássico):** Lobisomem ×2, Vidente, Ladrão, Encrenqueiro, Aldeão, **Capanga,
   Maçom, Insônia, Bêbado, Tanner, Caçador.** Engine é *role-extensível* (registry data-driven).
3. **Voto = passa-e-joga secreto**, revelado de uma vez no resultado.
4. **Host monta o bag:** tela de setup com contador ao vivo exigindo exatamente `jogadores + 3`
   cartas, pré-preenchida com um set recomendado editável.
5. **Rodadas autocontidas + tally de vitória por jogador** (+1 quando seu time vence a rodada).
6. **Insônia → "pass de amanhecer" secreto** (uniforme; só quando há Insônia no bag).
7. **Lobo solitário** espia 1 carta do centro (regra canônica) incluído.
8. **Voto:** regra canônica de "ninguém morre" (precisa de 2+ votos pra morrer) incluída.
9. **Discussão:** cronômetro configurável (presets 3/5/8 min), com "votar agora" pra pular.
10. **Player count:** 3–10 (cartas em jogo 6–13).

---

## Arquitetura (decisão técnica central)

O coração da engine é **como resolver a noite**:

> Coletar todas as escolhas durante o pass, depois resolver numa função **pura
> `resolveNight(deal, actions)`** que aplica as ações na **ordem canônica de papéis**. Papéis
> são definidos num **registry data-driven** (`{id, team, nightOrder, action, blurb}`) — adicionar
> Secret Hitler / Mascarade depois é adicionar entradas, não reescrever a engine.

**Alternativas rejeitadas:**
- *Mutar o estado conforme cada um joga (ordem de assento)* — quebra a ordem canônica (ex.: Ladrão
  que senta depois do Encrenqueiro veria uma carta já trocada). Rejeitado.
- *Framework de handlers por papel com scheduler* — overkill pro v1; o registry já deixa a porta
  aberta pra extrair isso depois.

**Insight-chave que simplifica tudo:** toda informação que um papel vê durante a noite é calculável
a partir do **deal original** — porque, na ordem canônica, nenhum papel que *troca* cartas age
antes de um papel que *vê*. (Vidente vê antes de qualquer troca; Ladrão vê a carta original do
alvo, pois só Lobos/Capanga/Maçom/Vidente agem antes dele e nenhum troca; Lobos/Maçons/Capanga se
reconhecem pelo deal; Lobo-solo vê o centro antes de o Bêbado mexer no centro.) **A ÚNICA exceção
é a Insônia**, que precisa do estado *final* — daí o pass de amanhecer.

**Separação importante:** "o que você VIU" (`NightView`, derivado do deal original) **≠** "o que
você É no fim" (`finalRole`). Ex.: Ladrão rouba B (vê o papel de B), depois o Encrenqueiro troca
Ladrão↔C → o Ladrão *acha* que é B, mas termina como C. A engine guarda os dois; o jogador só sabe
o que viu (que é a informação correta).

---

## Pastas, estilo e contrato de integração

- Tudo em `src/games/hiddenroles/onenight/` (espelha o layout do Insider). Dados em
  `src/data/hiddenroles/onenight/` (definições de papel + bags recomendados). O núcleo genérico
  sobe pra `hiddenroles/` quando chegar o 2º jogo — sem abstração prematura agora.
- Expõe **`<OneNightApp onHome={() => void} />`** (`OneNightApp.tsx`). **NÃO** edita `src/App.tsx`
  nem `src/shell/**` — o wiring na home é do Chat A.
- Reuso **read-only** do shell: `ActionButton`, `useCountdown`.
- Estilo: **só tokens** (`bg`, `surface`, `line`, `ink`, `muted`, `accent`, `good*`, `bad*`),
  `animate-screen-in` / `animate-card-in`. Nunca cor crua. Classes centralizadas em `ui.ts`.

---

## Modelo de domínio (`types.ts` + `roles.ts`)

- **`RoleId`**: `werewolf | minion | mason | seer | robber | troublemaker | drunk | insomniac |
  hunter | tanner | villager`
- **`Team`**: `village | werewolf | tanner`
- **Registry** (`roles.ts`): cada papel = `{ id, name, team, nightOrder: number|null, action:
  ActionKind, blurb }`. `nightOrder` codifica a ordem canônica; `null` = sem ação noturna. Quantos
  de cada cabem no box: Lobisomem ×2, Maçom ×2, Aldeão ×3, demais ×1.
- **`ActionKind`**: `none | see-team` (Lobos/Maçons) | `minion-see-wolves` | `lone-wolf-peek` |
  `seer-peek` | `rob` | `swap-others` | `drunk-swap-center` | `insomniac-check`.
- **`deal: RoleId[]`** de tamanho `N+3`: índices `0..N-1` = carta original de cada jogador;
  `N..N+2` = as 3 cartas do centro.
- **`Player`**: `{ id, name }` (persistido, reusado entre partidas — padrão do Insider).
- **`NightAction`** (união marcada, no máx. 1 por jogador que escolhe):
  - `{ kind:'robber', actor, target }`
  - `{ kind:'troublemaker', actor, a, b }`
  - `{ kind:'seer', actor, peek: {kind:'player', target} | {kind:'center', cards:[c1,c2]} }`
  - `{ kind:'drunk', actor, center }`
  - `{ kind:'lone-wolf', actor, center }`
  - (Lobos em grupo, Capanga, Maçom, Aldeão, Caçador, Tanner, Insônia não geram `NightAction`.)
- **`NightView`** (o que cada jogador aprendeu — derivado do deal original, exceto Insônia):
  parceiros vistos / carta(s) vista(s) / "você agora é X" (Ladrão) / `null` (sem info). Insônia é
  preenchida no amanhecer com `finalRoles[i]`.
- **`Config`**: `{ players: Player[]; bag: RoleId[] /* len = N+3 */; discussSeconds: number }`
- **`Phase`**: `config → night → (dawn?) → discussion → vote → result`
- **`RoundState`**: `{ deal, actions: NightAction[], views: NightView[], passIndex, finalRoles,
  endsAt: number|null, votes: number[], deaths: number[], winners: WinResult, phase }`
- **`SessionState`**: `{ config, scores: Record<playerId, number>, round: RoundState }`

---

## Resolução da noite (`logic.ts` — puro, rng injetável)

Ordem canônica (`nightOrder`): **Lobos → Capanga → Maçons → Vidente → Ladrão → Encrenqueiro →
Bêbado → Insônia.** (Doppelgänger fora do v1.)

- **`dealRoles(bag, rng)`** → embaralha o bag em `deal` (N+3 cartas), define centro.
- **Views no pass** (deal original):
  - Lobos → nomes dos parceiros lobos; **se lobo único** (1 só werewolf entre jogadores) → espia 1
    carta do centro que ele escolhe (`lone-wolf`).
  - Capanga → quem são os lobos (lobos NÃO veem o Capanga).
  - Maçons → outros maçons (ou "você é o único maçom").
  - Vidente → 1 carta de jogador OU 2 das 3 cartas do centro (jogador escolhe quais 2).
  - Ladrão → escolhe alvo; vê `deal[target]` e "você agora é X".
  - Encrenqueiro → escolhe dois OUTROS jogadores; **sem info**.
  - Bêbado → escolhe 1 carta do centro pra trocar com a sua; **sem info** (não sabe o que virou).
  - Aldeão / Caçador / Tanner → sem ação, sem info.
- **`resolveNight(deal, actions)`**: `working = [...deal]`; aplica em ordem canônica só o que
  *troca*: Ladrão `swap(working[actor], working[target])`; Encrenqueiro `swap(working[a],
  working[b])`; Bêbado `swap(working[actor], working[center])`. Retorna
  `finalRoles = working[0..N-1]`.

---

## Telas e máquina de estados

1. **ConfigScreen / BagBuilder** — gerencia lista de jogadores (persistida); monta o bag com
   contador ao vivo (`selecionadas / N+3`), pré-preenchido com set recomendado; escolhe duração da
   discussão. "Começar" bloqueado enquanto `bag.length !== N+3`.
2. **NightPassScreen** (ordem de assento; todos pegam o celular igual → sigilo): handoff "passe pro
   [nome]" → revela papel original + explicação (`blurb`) → **UI de ação** conforme `ActionKind` →
   grava `NightAction` + calcula `NightView` → mostra a view → "esconder e passar". Avança
   `passIndex`. Após o último → `resolveNight` → `finalRoles`. Se há Insônia no bag → `dawn`, senão
   → `discussion`.
3. **DawnPassScreen** (só se a carta Insônia está no bag — roda *mesmo se ela caiu no centro*, pra
   não vazar): pass uniforme; quem foi *distribuído* Insônia vê `finalRoles[i]` ("você acorda
   como: X"); os outros veem "você dorme tranquilo — nada mudou".
4. **DiscussionScreen** — `useCountdown(endsAt)` com presets (3/5/8 min) + "votar agora".
5. **VotePassScreen** — pass-the-phone; cada um escolhe um alvo (não pode votar em si). Grava
   `votes[]`.
6. **ResultScreen** — revela todos os papéis finais (+ um "rastro da noite": o que mudou), quem
   morreu, quem venceu (Aldeia / Lobos / Tanner). Atualiza o tally e mostra a linha de standings.
   "Jogar de novo" (reembaralha; host pode re-ajustar o bag) + "Home".

Banner de **"continuar rodada"** (resume via localStorage) igual ao Insider, quando há rodada em
andamento.

---

## Morte & vitória (regras canônicas) 🚩

**Mortes (`logic.ts`):**
- Conta votos por jogador. `maxVotes = max(contagem)`.
- **Se `maxVotes < 2` → ninguém morre.** Senão, todos com `contagem === maxVotes` morrem (empate no
  topo mata todos os empatados).
- **Caçador:** se um morto tem papel FINAL Caçador, o alvo do voto dele também morre. Resolvido em
  ponto-fixo (cadeia Caçador→Caçador), sem loop infinito.

**Vencedores** (sobre papéis FINAIS e o conjunto de mortes `D`):

| Situação | Quem vence |
|---|---|
| Algum **Lobo** (final) morre | **Aldeia** vence |
| Nenhum lobo morre **e há lobo em jogo** | **Time Lobo** (lobos + Capanga) vence |
| **Sem lobos em jogo** (todos no centro) **e ninguém morre** | **Aldeia** vence |
| Sem lobos em jogo **e alguém morre** | Aldeia perde; **Capanga** vence se morreu um não-Capanga; se só o Capanga morreu → Capanga perde |
| Qualquer **Tanner** (final) morre | esse **Tanner** vence (independente — soma com o resto) |

- O time Aldeia = todos os papéis de `team: village` (Aldeão, Vidente, Ladrão, Encrenqueiro, Maçom,
  Insônia, Bêbado, Caçador). Quando "Aldeia vence", todos eles ganham +1.
- Tanner é seu próprio "time": só vence se morrer; não impede os outros (ex.: lobo morre + tanner
  morre → Aldeia vence E aquele Tanner vence).

> 🚩 **Variantes conhecidas de regra** (a confirmar / podem virar config futura): a interação
> exata Tanner × Time-Lobo (se "só o Tanner morre e há lobo vivo", o time-lobo vence porque nenhum
> lobo morreu — encodado acima), e a regra do Capanga quando não há lobos em jogo. Encodei a versão
> canônica mais difundida; sinalizado aqui pra revisão.

---

## Persistência & dados

- `persistence.ts` — `games-app:onenight:current` (save/load/clear do `SessionState`).
- `playerStore.ts` — `games-app:onenight:players` (lista de jogadores reusável).
- `scores` vivem dentro do `SessionState` (persistem junto).
- `src/data/hiddenroles/onenight/` — registry de papéis e bags recomendados por nº de jogadores.

---

## Estratégia de testes (TDD)

Lógica pura primeiro (sem React), rng injetável:
- `dealRoles` — tamanho `N+3`, conteúdo = bag, determinístico com rng fake.
- `resolveNight` — **casos de ordem**: Ladrão+Encrenqueiro (o Ladrão termina diferente do que viu);
  lobo-solo (espia centro, sem alterar); Bêbado (troca com centro às cegas); Insônia (carta final
  reflete trocas); múltiplas trocas encadeadas.
- `NightView` — cada `ActionKind` produz a info correta a partir do deal original.
- Voto/morte — `maxVotes < 2` → ninguém morre; empate no topo; cadeia do Caçador.
- **Matriz de vitória** — uma asserção por linha da tabela (incl. Tanner morto, Capanga sem lobos,
  sem-lobos-ninguém-morre).
- Reducer — cada action transiciona a fase corretamente.
- Telas-chave (RTL) — contador do bag bloqueia start; gravação de ação no night pass; voto não
  permite votar em si; ResultScreen mostra o vencedor certo.

Espelha o layout de testes do Insider (`logic.test.ts`, `reducer.test.ts`, `persistence.test.ts`,
`playerStore.test.ts`, screens `*.test.tsx`, `OneNightSession.test.tsx`).

---

## Fora de escopo (v1)

- Doppelgänger (copia papel + ação — exige recursão na resolução).
- Multi-device / backend (fase futura — Chat Backend).
- Narrador de áudio / cartas físicas.
- Secret Hitler, Mascarade, BotC (próximos jogos da engine; reusam o registry + resolução).
