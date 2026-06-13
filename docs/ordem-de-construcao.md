# Ordem de construção — engines e jogos

> A lógica central: construir **engines** (não jogos isolados). Cada engine é um conjunto de telas, estado e lógica que vários jogos compartilham. Trocar o conteúdo e as regras de pontuação = novo jogo sem reescrever o app.
>
> Taboo já está em construção → engine "dar pista / palavra" já existe. Decrypto vem quase de graça quando quisermos.

---

## Ordem recomendada

### Engine 0 — Dar pista / palavra *(já em produção)*
**Jogos:** Taboo ✅ em construção → Decrypto (depois, reusa a engine)

---

### Engine 1 — Impostor / Assimetria
**Jogos:** Insider → The Chameleon → Spyfall → Deception

**Por que primeiro:**
- Insider é sua prioridade #1
- A mesma engine cobre seus #1, #5, #6 e #7 — 4 jogos de uma vez
- 100% texto, sem UI especial (sem drawing, sem mão de cartas físicas)
- Estado simples: distribuir papéis/info diferentes por jogador + rodada de votação

**Ordem dentro da engine:**
1. **Insider** — 20-perguntas com insider escondido. Menor estado de jogo (1 Mestre, 1 Insider, N ingênuos + palavra secreta + timer)
2. **The Chameleon** — acrescenta a grade 4×4 de palavras e a mecânica de "uma palavra por vez"
3. **Spyfall** — acrescenta o banco de locais + papéis secundários (ex.: guia turístico, cientista) por local
4. **Deception** — acrescenta papéis mais ricos (Forense, Assassino) + sistema de pistas indiretas (arma + evidência)

---

### Engine 2 — Julgamento / Mão de Cartas
**Jogos:** Snake Oil → Cards Against Humanity → Funemployed → Joking Hazard / Bad People / The Voting Game

**Por que segundo:**
- Snake Oil é sua prioridade #2
- Engine cobre 5+ jogos
- Núcleo: distribuir mão de cartas de palavra/conceito → jogadores combinam/jogam → juiz rotativo escolhe → pontua

**Ordem dentro da engine:**
1. **Snake Oil** — mão de palavras + persona-cliente + pitch textual + juiz escolhe
2. **Cards Against Humanity** — mão de respostas + prompt com lacuna + juiz escolhe (sem pitch, mais direto)
3. **Funemployed** — mão de "qualificações" + entrevista improvisada + juiz
4. **Joking Hazard / Bad People / The Voting Game** — variações do mesmo julgamento

---

### Engine 3 — Prompt → Resposta → Voto *(família Jackbox)*
**Jogos:** Quiplash → Fibbage → Herd Mentality → Survive the Internet → Blather Round → Joke Boat → Psych → Balderdash

**Por que terceiro:**
- Maior catálogo de uma vez: ~8 jogos de uma engine
- Herd Mentality é variante simples do mesmo fluxo (todos respondem um prompt → comparação → pontuação por maioria)
- Núcleo: prompt → cada jogador responde texto → todos veem as respostas → votam → pontuam

> 📌 **Decisão de arquitetura (2026-06-13): construir pass-and-play primeiro, single-device.** A versão clássica (Jackbox) é multi-device — cada celular responde, servidor coordena. Mas para manter o app no modelo atual (sem backend), a 1ª versão dessa engine é **pass-and-play**: passa o celular de mão em mão para responder e para votar, com tela de handoff que esconde a resposta/voto anterior (mesmo padrão de privacidade do Insider). O modo **multi-device (backend/realtime)** fica como upgrade futuro — exige decisão de infra própria, não é pré-requisito pra começar.

**Ordem dentro da engine:**
1. **Quiplash** — a mais simples: prompt criativo → 2 respostas → voto do grupo
2. **Herd Mentality** — prompt aberto → todos respondem → maioria ganha (variante de pontuação)
3. **Fibbage** — acrescenta a resposta "verdadeira" misturada com as inventadas
4. **Balderdash** — mesma lógica do Fibbage com definições/datas/leis
5. **Psych** — similar ao Fibbage com banco de perguntas de trivia
6. **Blather Round** — acrescenta banco limitado de palavras para descrever
7. **Joke Boat / Survive the Internet** — variantes de encadeamento e recontextualização

---

### Engine 4 — Papéis Ocultos + Noite
**Jogos:** One Night Werewolf → Secret Hitler → Mascarade → Blood on the Clocktower → Werewolf/Mafia (backup)

**Por que quarto:**
- Engine mais complexa: estado noturno, habilidades especiais por papel, cronograma de ações, times ocultos
- One Night é o melhor ponto de entrada (sem eliminação progressiva, uma rodada curta)
- Depois que One Night estiver pronto, Secret Hitler e Mascarade reusam a maior parte

**Ordem dentro da engine:**
1. **One Night Werewolf** — noite curtíssima (cada papel age uma vez em ordem), sem eliminação, discussão → voto simultâneo → fim. Estado menor.
2. **Secret Hitler** — acrescenta ciclo de legislação (presidente → chanceler → baralho de políticas) + condições de vitória duplas
3. **Mascarade** — acrescenta mecânica de troca/espiar identidades (estado de "não sei quem sou")
4. **Blood on the Clocktower** — modo "Narrador humano": um jogador vira Storyteller com tela especial; os outros têm papéis com habilidades que interagem. Complexo — deixar por último dentro da engine.
5. **Werewolf/Mafia** — backup com eliminação progressiva; simples de implementar depois que BotC estiver pronto

---

### Engine 5 — Trivia
**Jogos:** Trivia Murder Party → Wits & Wagers → Half Truth → Smart Ass (teste futuro) → You Don't Know Jack (teste futuro)

**Por que quinto:**
- Trivia tem **custo de conteúdo alto** (banco de perguntas) — faz sentido deixar pra quando a infra de conteúdo (criação/importação de packs de perguntas) estiver madura
- Trivia Murder Party é o mais interessante: trivia + mini-jogos de "killing floor" + fantasmas continuam jogando

**Ordem dentro da engine:**
1. **Wits & Wagers** — palpites numéricos + apostas; não precisa de banco de perguntas elaborado (qualquer número funciona)
2. **Half Truth** — 6 respostas, 3 certas; precisa de banco mas formato é simples
3. **Trivia Murder Party** — trivia + mini-jogo de eliminação; mais trabalho de design de mini-jogos
4. **Smart Ass / YDKJ** — testar conteúdo antes de decidir escopo

---

### Engine 6 — Palavras / Letras
**Jogos:** Stop/Adedonha → Ghost → Superfight

**Por que sexto:**
- Jogos mais independentes entre si
- Stop/Adedonha é rápido de implementar: timer + categorias + letra sorteada + agrupar respostas iguais
- Ghost é puramente por turnos de texto
- Superfight é debate com cartas (cruza com Engine 2 mas sem juiz fixo — o grupo todo vota)

---

### Engine 7 — Drawing *(defer)*
**Jogos:** A Fake Artist Goes to NY

**Por que por último:**
- Única engine que precisa de canvas/desenho — tecnicamente diferente de tudo o resto
- O jogo é excelente mas é a única exceção "não-texto" da lista principal
- Implementar depois que toda a base de texto estiver sólida e você tiver decidido se quer uma lib de canvas

---

## Resumo visual

```
Já rodando   →  Engine 0: Dar pista / palavra     (Taboo → Decrypto)
Build next   →  Engine 1: Impostor / Assimetria    (Insider → Chameleon → Spyfall → Deception)
             →  Engine 2: Julgamento / Cartas       (Snake Oil → CAH → Funemployed → ...)
             →  Engine 3: Prompt → Resposta → Voto  (Quiplash → Fibbage → Herd Mentality → ...)
             →  Engine 4: Papéis Ocultos + Noite    (One Night → Secret Hitler → Mascarade → BotC)
             →  Engine 5: Trivia                    (Wits & Wagers → TMP → Half Truth → ...)
             →  Engine 6: Palavras / Letras         (Stop → Ghost → Superfight)
Later        →  Engine 7: Drawing                  (Fake Artist)
```

---

## Backlog (fora da fila ativa)

- **So Clover!** — dar pista co-op; reusa Engine 0
- **Skull** — blefe simples com cartas; reusa parte da Engine 2
- **The Resistance: Avalon** — você tem o físico; reusa Engine 4 quando quiser
- **Codenames** — reusa Engine 0; deixar pra depois (UI de grade grande)
- **Smart Ass / You Don't Know Jack** — testar conteúdo antes de confirmar escopo
