# Lista de jogos — confirmados, backlog e análise de 5 jogadores

> Atualizado após segunda rodada de revisão. Inclui: explicações dos 3 jogos de trivia ainda pendentes, lista travada de confirmados, backlog, e análise de quais jogar amanhã com 5 jogadores.

---

## Explicações pendentes (trivia)

**Trivia Murder Party (Jackbox)** — Imagina um programa de trivia com um anfitrião serial killer. Todos respondem a mesma pergunta de múltipla escolha. Quem acerta fica vivo; quem erra "morre" e cai num **Killing Floor**: um mini-jogo rápido e absurdo (ex.: "escolha um número 1-10; se alguém escolher o mesmo que você, você morre de novo"). Mortes no Killing Floor são permanentes naquele mini-jogo, mas **fantasmas continuam jogando** — e na rodada final, fantasmas podem vencer. O diferencial é o **tema de terror + os mini-jogos caóticos** entre rodadas de trivia. Não é trivia "seca" — é um show com personalidade.
→ **Fácil de implementar:** é trivia múltipla escolha + mini-jogo de eliminação aleatório. Você define os mini-jogos que quiser.

**You Don't Know Jack** — Trivia estilo programa de auditório sarcástico, com um host que faz piada com suas respostas erradas. O diferencial não é o conteúdo da trivia, é o **formato das perguntas**. Exemplos de formatos:
- **Dis or Dat:** série de itens, você classifica cada um em A ou B rapidinho (ex.: "isso é uma marca de sorvete ou uma música dos anos 80?")
- **Jack Attack:** uma palavra "âncora" aparece; palavras passam rápido e você buzina quando achar que combina com a âncora
- **Perguntas normais** mas com alternativas engraçadas e texto irônico
→ É essencialmente: **trivia + variedade de formatos + personalidade/humor**. O trabalho é criar os formatos e escrever perguntas com bom humor.

**Smart Ass** — Trivia **sem ordem de jogada** — é caótico de propósito. O app lê pistas sobre algo (pessoa, lugar, coisa) começando **muito vaga** e ficando mais específica. Qualquer jogador pode responder a qualquer momento. Errar não pune — mas quem acertar primeiro leva os pontos. Exemplo de sequência de pistas: *"Sou um lugar... fico na América do Sul... tenho as maiores cataratas do mundo... estou na fronteira entre Brasil e Argentina..."* — quem gritar "Foz do Iguaçu!" primeiro ganha. Quanto mais cedo acertar, mais prestígio (arriscar na pista difícil).
→ Engine: banco de itens com 5-8 pistas ordenadas por dificuldade + buzzin de tempo real. Puro texto.

---

## Lista travada

### Confirmados ✅

| Família | Jogo | Nota |
|---|---|---|
| **Impostor / assimetria** | Spyfall | Testar junto com Chameleon |
| | The Chameleon | Testar junto com Spyfall |
| | Insider | Preferido sobre Werewords |
| | A Fake Artist Goes to NY | |
| **Papéis ocultos / times** | Two Rooms and a Boom | |
| | Werewolf / Mafia | Backup |
| | One Night Werewolf | |
| | Secret Hitler | |
| | The Resistance: Avalon | |
| | Mascarade | No lugar do Coup |
| | Blood on the Clocktower | Modo "Narrador humano" |
| | Deception: Murder in Hong Kong | |
| **Dar pista / palavra** | Taboo | ✅ Em produção |
| | Decrypto | |
| | Codenames | Deixar pra mais tarde |
| **Prompt → resposta → voto** | Quiplash | |
| | Fibbage | |
| | Survive the Internet | |
| | Blather Round | |
| | Joke Boat | |
| | Psych | |
| | Balderdash | |
| **Blefe / nervo** | Snake Oil | |
| **Julgamento de cartas** | Cards Against Humanity | |
| | Funemployed | |
| | Joking Hazard / Bad People / The Voting Game | |
| **Convergência** | Herd Mentality | |
| **Trivia** | Half Truth | |
| | Trivia Murder Party | Pendente confirmação final |
| | You Don't Know Jack | Pendente confirmação final |
| | Wits & Wagers | |
| | Smart Ass | Pendente confirmação final |
| **Palavras / letras** | Stop / Adedonha | |
| | Ghost | |
| | Superfight | |
| **Numéricos / co-op** | The Mind | |

### Backlog (possíveis testes futuros) 🗂️

- **So Clover!**
- **Skull**
- **Codenames** (confirmado mas deixado pra mais tarde — migra pro ativo quando chegar a hora)

### Fora da lista ❌

- Werewords, Password, Boggle, No Thanks, Wavelength (e demais não citados)

---

## Amanhã — 5 jogadores

### Ótimos com exatamente 5 ⭐

| Jogo | Por quê funciona bem em 5 |
|---|---|
| **Spyfall** | Perguntas cruzadas ficam dinâmicas com 5, sem ser exaustivo |
| **The Chameleon** | 4-6 é o sweet spot; 5 é perfeito |
| **Insider** | 4-6 ideal; 5 funciona muito bem |
| **A Fake Artist Goes to NY** | 5 é o **mínimo recomendado** — funciona como foi projetado |
| **One Night Werewolf** | 3-10; com 5 dá pra ter ~4 papéis rodando, muito bom |
| **Deception** | 4-12; 5 funciona muito bem (1 Forense + 1 Assassino + 3 investigadores) |
| **The Resistance** | 5 é o **mínimo oficial** — 2 espiões vs 3 — jogo balancéado |
| **Taboo** | 2 times de 2 + 1 árbitro rotativo, ou 2+3; funciona |
| **Snake Oil** | 3-10; 5 é muito divertido (4 pitchers pra 1 cliente) |
| **Herd Mentality** | 4+; 5 é bom, grupo menor = votos mais reveladores |

### Jogáveis mas não ideais com 5 ⚠️

| Jogo | Ressalva |
|---|---|
| **Secret Hitler** | 5 é o mínimo; funciona mas fica apertado em papéis (só 1 fascista + Hitler) |
| **Mascarade** | Funciona, mas ganha muito mais com 7+ (mais caos de identidade) |
| **Two Rooms and a Boom** | Projetado pra 6-30; com 5 perde o "duas salas separadas" |
| **Werewolf/Mafia** | 5 é possível mas fino — precisa de narrador e poucos papéis |
| **Blood on the Clocktower** | Recomendado 7-15; com 5 falta massa crítica pra dedução |

### Sugestão de sequência pra amanhã

Se quiser testar o app em construção + referências físicas:

1. **Taboo** — já no app, é o aquecimento natural
2. **Spyfall ou The Chameleon** — testar os dois em rodadas separadas, comparar feel
3. **Insider** — ótimo pra 5, mecânica interessante pra analisar
4. **A Fake Artist Goes to NY** — se tiverem papel/caneta, ou versão digital depois
5. **One Night Werewolf** ou **Deception** — fecha com papéis ocultos

---

## Próximos passos

1. Você confirma (ou não) Trivia Murder Party, You Don't Know Jack e Smart Ass após as explicações acima
2. A gente trava a lista definitiva
3. Define quais **famílias/engines** construir na ordem — com Taboo já rodando, a engine "dar pista / palavra" está na cabeça; o que vem depois?
