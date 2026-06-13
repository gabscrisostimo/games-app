# Referências de jogos — party games focados em texto

> Pesquisa de referências para o games-app. Organizado por **família de mecânica** (não por jogo solto), porque pro app o que importa é a *engine* reutilizável: jogos da mesma família compartilham UI e infra (lista de jogadores, papéis secretos, votação, timer, prompt→resposta→voto). Construindo ~8–10 engines bem feitas, cada uma vira dezenas de jogos só trocando conteúdo e regras.
>
> Filosofia: **personalizar, não clonar.** Cada jogo tem um *ângulo de personalização* marcado.

---

## 1. Impostor / conhecimento assimétrico

*Engine base: um (ou poucos) jogador recebe info diferente dos outros; todos conversam; vota-se em quem é o estranho. Quase tudo texto, zero asset.*

- **Spyfall** — Todos recebem o mesmo "local" (Praia, Hospital, Estação Espacial) menos o Espião, que não sabe onde está. Fazem perguntas uns aos outros; o grupo tenta achar o espião sem revelar o local, o espião tenta deduzir o local. Núcleo: assimetria + perguntas abertas. *Personalização: trocar a lista de locais por temas seus (memes, sua cidade, fandoms), ajustar nº de espiões, dar ao espião uma lista de palpites.*
- **The Chameleon** — Grade 4×4 de palavras (ex.: animais) + uma "palavra secreta" que todos sabem, menos o Camaleão. Cada um diz UMA palavra relacionada à secreta; o camaleão improvisa pra não se denunciar. Mais rápido e mais "uma palavra só" que Spyfall — ótimo pra mobile. *Personalização: as grades temáticas são triviais de criar.*
- **Insider** — Werewolf encontra 20-perguntas: o Mestre sabe a palavra secreta, o grupo faz perguntas sim/não pra adivinhar — mas um "Insider" no grupo já sabe e tenta guiar discretamente. Se acertam a palavra, precisam então descobrir quem era o insider. Núcleo: cooperação com um sabotador escondido dentro da cooperação.
- **Werewords** — Igual ao Insider em espírito: 20-perguntas pra adivinhar uma palavra, com papéis ocultos (um ajuda, um atrapalha). Funde dois gêneros: guess-the-word + hidden role.
- **A Fake Artist Goes to New York** — Versão desenho do mesmo DNA (todos desenham juntos um traço; o impostor não sabe o tema). Referência caso queira uma engine de desenho colaborativo; pra "focado em texto", o Chameleon é o equivalente.
- **Two Rooms and a Boom** — Versão grande/social: jogadores divididos em duas salas com papéis ocultos (Presidente, Bombardeiro) trocam reféns por rodada. Mais complexo, mas referência rica pra modo "muita gente".

**Por que começar por aqui:** zero arte, regra explicável em 20s, escala de 3 a 12+ jogadores, e a personalização é só **conteúdo (listas)** — exatamente o pitch do app.

---

## 2. Mafia / Werewolf (eliminação + times ocultos)

*Engine base: papéis secretos, ciclo dia/noite, votação pra eliminar, condição de vitória por time.*

- **Mafia / Werewolf** — O clássico. Aldeões vs. Lobos; à noite os lobos "matam", de dia todos discutem e linchaim um suspeito. *Personalização infinita via papéis especiais (Vidente, Médico, Caçador, Bruxa…). Dá pra montar um "construtor de baralho de papéis".*
- **One Night Ultimate Werewolf** — Tudo numa única noite, sem eliminação progressiva: os papéis se embaralham na calada e ninguém tem certeza do que é mais. Uma rodada = ~10 min. Bem melhor fit pra mobile que o Werewolf longo. Engine de "ações noturnas em ordem" é a parte interessante de implementar.
- **Secret Hitler** — Liberais vs. Fascistas aprovando "políticas"; mecânica central é a passagem de cartas presidente→chanceler com mentira possível no meio. Tensão social altíssima com componentes mínimos. *Personalização: re-tematizar (qualquer "bom vs. infiltrado") evita a bagagem do tema original.*
- **The Resistance / Avalon** — Sem eliminação: rodadas de "missões" onde uma equipe selecionada vota secreto sucesso/sabotagem; espiões tentam sabotar sem se expor. Avalon adiciona papéis (Merlin sabe quem são os vilões mas não pode se revelar). Núcleo puro de dedução por padrão de votos. Excelente pra app: estado de jogo é pequeno e 100% texto/botões.
- **Coup** — Bluff de identidade: cada um tem 2 personagens ocultos com poderes; você pode reivindicar QUALQUER poder (mentindo) e qualquer um pode te desafiar. Perde quem fica sem cartas. Rápido, brutal, brilhante. Engine de "reivindicar/desafiar" é reutilizável.
- **Blood on the Clocktower** — O "endgame" do gênero: jogadores mortos continuam participando, papéis riquíssimos, precisa de um Narrador. Complexo demais pra v1, mas é a referência de teto criativo pra um modo com storyteller humano.
- **Deception: Murder in Hong Kong** — Um Forense (que sabe quem é o assassino) só pode se comunicar por pistas indiretas; o grupo deduz arma+evidência. Inverte o Werewolf: o "que sabe" está limitado a dar dicas, não a falar.

---

## 3. Dar pista → adivinhar palavra (clue-giving)

*Engine base: alguém vê uma palavra-alvo, gera pista textual, os outros adivinham. A diferença entre os jogos é só a **restrição** na pista.*

- **Taboo** — Faça o time adivinhar a palavra SEM usar 5 palavras proibidas. Restrição = palavras banidas. *Personalização: gerar baralhos temáticos com tabus automáticos.*
- **Codenames** — Tabuleiro de 25 palavras; o Spymaster dá UMA pista + um número ("Oceano, 3") pra conectar várias palavras do seu time, evitando as do inimigo e o assassino. Obra-prima de design e quase todo texto. A grade é trivial de gerar; dá pra fazer infinitos word packs.
- **Codenames Duet** — Versão cooperativa pra 2 (ou grupo vs. o jogo), com contagem de turnos. Bom pra incluir um modo co-op.
- **Just One** — Cooperativo: todos escrevem uma pista de UMA palavra pra ajudar o adivinhador — mas pistas **idênticas se cancelam**. A graça é evitar o óbvio que todos pensariam. Mecânica de "cancelar duplicatas" é simples e deliciosa.
- **Decrypto** — Seu time tem 4 palavras secretas numeradas; você dá pistas pra códigos tipo "2-4-1" que seu time decifra, enquanto o time rival escuta e tenta quebrar seu código ao longo das rodadas. Mais cerebral, dá longevidade.
- **Password** — Pista de UMA palavra só, alternando entre parceiros até acertar. O avô minimalista do gênero.
- **So Clover!** — Cooperativo: você escreve uma palavra-pista entre cada par de palavras de um "trevo"; os outros remontam o trevo. Co-op caseiro e quase puro texto.
- **Concept** — Comunicação por ícones em vez de palavras (referência caso queira uma variante "sem escrever").

---

## 4. Prompt → resposta → voto (família Jackbox)

*Engine base — provavelmente a mais valiosa pro app: servidor manda um prompt, cada celular responde por texto, todos votam/avaliam. Reutilizável pra dezenas de modos.*

- **Quiplash** — Prompt engraçado ("A pior coisa pra dizer num casamento"), dois jogadores respondem, o resto vota na melhor. Pura comédia gerada pelos jogadores. O conteúdo (prompts) é a única coisa a criar — perfeito pra personalizar.
- **Fibbage** — Trivia ao contrário: pergunta obscura, cada um inventa uma resposta falsa plausível, todos tentam achar a verdadeira no meio das mentiras. Pontua quem acha a verdade E quem engana os outros. Funde trivia + blefe.
- **Survive the Internet** — Cada resposta sua é tirada de contexto pra fazer outro jogador parecer ridículo. Mecânica de "encadeamento" engenhosa.
- **Blather Round** — Você descreve uma coisa secreta usando só um banco limitado de palavras/frases; os outros adivinham. Charada por texto restrito.
- **Joke Boat** — Construção colaborativa de piadas (setup/punchline). Referência pra modos "preencha o template".
- **Psych! / apps estilo Cards Against** — Vários apps mobile já usam essa engine; valem como referência de UX (fluxo "responda no seu celular → tela compartilhada mostra resultado").

**Sugestão de arquitetura:** UMA engine "prompt → submissões de texto → votação → placar" cobre Quiplash, Fibbage, Balderdash, Two Truths, Apples-to-Apples e meia dúzia de outros, só trocando as regras de pontuação e a fonte do prompt.

---

## 5. Blefe / mentira plausível

*Engine base: misturar uma verdade com mentiras inventadas pelos jogadores; o grupo tenta separar.*

- **Balderdash (Jogo do Dicionário)** — Palavra obscura real; cada um inventa uma definição falsa convincente; lê-se todas + a verdadeira; vota-se. Ganha pontos quem acerta a real e quem engana. *Variantes: datas históricas, siglas, leis bizarras, sinopse de filmes — todas a mesma engine.*
- **Two Truths and a Lie** — Cada um diz 3 afirmações sobre si, uma falsa; o grupo adivinha. Icebreaker eterno, custo de implementação ~zero. *Personalização: modos temáticos ("3 coisas sobre sua infância").*
- **Skull** — Cada um põe cartas viradas e aposta quantas "flores" consegue revelar sem virar a caveira; blefe puro de leitura social, componente mínimo.
- **Snake Oil** — Você combina duas cartas de palavra pra "vender" um produto inventado a um cliente com persona aleatória; ele compra o melhor pitch. Improviso comercial absurdo.
- **The Resistance / Avalon** (já citado) — também é blefe, mas estrutural.

---

## 6. Julgamento / matching de cartas

*Engine base: um "juiz" rotativo escolhe a melhor combinação; cada um joga uma carta-resposta da mão.*

- **Apples to Apples** — Juiz revela uma carta de adjetivo ("Assustador"); cada um joga um substantivo da mão que melhor combine (ou seja mais engraçado); o juiz escolhe. Family-friendly. A engine de "mão de cartas + juiz" é genérica.
- **Cards Against Humanity** — A versão adulta/ácida (prompt com lacuna + respostas chocantes). Mesma engine, conteúdo diferente. Aqui a personalização — decks próprios, decks do grupo de amigos — é literalmente o maior apelo.
- **Funemployed** — Você faz uma entrevista de emprego absurda usando cartas de "qualificação" aleatórias. Improviso + matching.
- **Joking Hazard / Bad People / The Voting Game** — variações do tema "monte algo ofensivo/engraçado e seja julgado". Boas referências de tom.

---

## 7. Convergência / consenso (acertar = pensar igual)

*Engine base: ninguém "ganha sozinho"; pontua quem dá a MESMA resposta que os outros (ou quem prevê a maioria). Cooperação social fácil de codar.*

- **Herd Mentality** — Pergunta aberta ("Um animal que você não confiaria"); todos escrevem; pontua quem está na MAIORIA. Quem responder sozinho leva a "vaca rosa". Genial e trivial: só precisa de prompts + agrupar respostas iguais.
- **Medium** — Dois jogadores recebem palavras diferentes e, na contagem, tentam dizer SIMULTANEAMENTE a mesma palavra que conecta as duas. Telepatia forçada.
- **Wits & Wagers** — Trivia numérica onde você não precisa saber a resposta, só apostar em qual palpite alheio está mais perto. Convergência + aposta.
- **"Match" games em geral** — qualquer "diga o que você acha que a maioria diria" usa a mesma engine de agrupar respostas.

---

## 8. Espectro / escala (Wavelength)

*Engine base: um eixo contínuo entre dois extremos; um jogador vê a posição-alvo e dá uma pista; o grupo gira o dial pra adivinhar.*

- **Wavelength** — Eixo "Frio ↔ Quente", "Superestimado ↔ Subestimado"; o psíquico dá um conceito ("café") e o time posiciona o dial. Discussão deliciosamente subjetiva. *Personalização: criar pares de extremos é fácil e dá identidade ao app.*
- **Hues and Cues** — Versão cor (menos texto, citado por completude).
- **Half Truth** — trivia com gradação de certeza.

---

## 9. Palavras e letras

*Engine base: manipulação de palavras/letras; por turnos ou simultâneo com timer.*

- **Scattergories** — Uma letra sorteada + lista de categorias ("Animal, Cidade, Comida com C…"); todos escrevem em 3 min; respostas únicas pontuam. Engine de "timer + categorias + dedupe" reutiliza muito do Herd Mentality.
- **Adedonha / Stop! (Categories)** — irmão nacional do Scattergories. Provavelmente um "must" pelo apelo local.
- **Ghost** — Jogadores adicionam letras formando o início de uma palavra sem COMPLETAR uma palavra válida; quem fechar uma palavra perde. Puro turno de texto.
- **Contact** — Um jogador pensa numa palavra e revela a 1ª letra; os outros dão pistas pra palavras com aquela letra e tentam "fazer contato" (dizer a mesma palavra ao mesmo tempo) antes do dono adivinhar a pista. Convergência + letras.
- **Shiritori / Última Letra** — Cada palavra começa com a última letra da anterior; sem repetir. Casual, ótimo pra modo rápido.
- **Boggle / Anagrams / Word chains** — grids e embaralhamentos; um pouco mais de UI, mas baratos.
- **Superfight / The Metagame** — debates "quem venceria" combinando cartas; argumentação por texto.

---

## 10. Trivia (com torção social)

*Trivia pura é chata e cara de manter conteúdo; trivia com mecânica social é ouro.*

- **Fibbage** (já citado) — trivia + blefe.
- **Trivia Murder Party** — trivia com "morte" e minigames; referência de como dar tema/personalidade a um quiz.
- **You Don't Know Jack** — trivia cômica com formatos de pergunta variados.
- **Wits & Wagers** — trivia por aposta (não precisa saber, só apostar).
- **Smart Ass / Linq** — perguntas com pistas progressivas; primeiro a gritar acerta.

---

## 11. Perguntas sociais / icebreaker / festa

*Engine base trivialíssima: banco de prompts, mostra um por vez, talvez vote/reaja. Custo de dev quase nulo, retenção alta, e a personalização (packs por grupo) é o produto inteiro de apps como "We're Not Really Strangers".*

- **Would You Rather** — dilema entre duas opções; o grupo discute/vota. Pack-driven, infinito.
- **Never Have I Ever** — "Eu nunca..."; quem já fez, marca. Variantes do soft ao picante.
- **Most Likely To** — "Quem é mais provável de...?"; todos apontam ao mesmo tempo; quem recebe mais votos "perde". Engine de votar-em-pessoa, mesma do Werewolf.
- **Truth or Dare** — clássico; texto + desafios.
- **Paranoia** — você sussurra uma pergunta "quem aqui...?" pro vizinho, ele responde em voz alta um nome, mas só se revela a pergunta no cara ou coroa. Tensão social.
- **Hot Seat / The Voting Game** — perguntas sobre o grupo, respostas anônimas reveladas. Drama garantido.
- **We're Not Really Strangers / Actually Curious** — cartas de pergunta em níveis de profundidade (do leve ao íntimo). Referência de um tom *não* cômico — conexão.
- **Superlatives / Awards** — "Dê o prêmio de mais dramático a alguém da sala."
- **Hot Takes / Unpopular Opinions** — soltar opiniões polêmicas e o grupo concorda/discorda.

---

## 12. Narrativa / improv colaborativo

*Engine base: construção coletiva de história, geralmente por turnos de texto.*

- **Once Upon a Time** — Você narra uma história tentando chegar ao SEU final, usando cartas de elementos; outros interrompem com as deles. Storytelling estruturado.
- **Telephone / Eat Poop You Cat (versão texto)** — Frase → (próximo desenha) → (próximo descreve) → … A versão **Gartic Phone** é o hit; a versão só-texto (telefone sem fio escrito) é baratíssima e hilária. Engine de "passa adiante e transforma" é única e marcante.
- **Madlibs (preencha as lacunas)** — templates com lacunas que os jogadores preenchem às cegas; revela-se o resultado absurdo. Talvez o jogo de texto mais barato que existe e sempre funciona.
- **Story Cubes (prompts)** — ícones/prompts aleatórios que forçam improviso.

---

## 13. Numéricos / cooperativos leves (bônus)

*Não são "texto", mas são baratíssimos e ampliam o catálogo com modos co-op.*

- **The Mind** — Cooperativo silencioso: todos têm números na mão e devem jogá-los em ordem crescente SEM se comunicar, só sentindo o tempo. Tensão pura, regra de uma frase.
- **No Thanks! / cartas numéricas** — decisões simples de pegar/passar.
- **The Wavelength co-op, Just One, So Clover, Codenames Duet** — já citados, todos têm modo cooperativo (importante ter pelo menos um co-op no catálogo pra grupos que não querem competição).

---

## Síntese pra decisão de produto

Priorização por **ROI (impacto ÷ esforço)** pra um app de texto customizável. Construir estas **engines** (cada uma destrava muitos jogos):

| Prioridade | Engine | Destrava | Por quê |
|---|---|---|---|
| 1 | **Prompt → resposta → voto** | Quiplash, Fibbage, Balderdash, Two Truths, Apples/CAH | Uma engine, dezenas de modos; conteúdo 100% personalizável |
| 2 | **Impostor (assimetria + votação)** | Spyfall, Chameleon, Insider, Werewords | Pouquíssimo asset, escala bem, personalização só por listas |
| 3 | **Papéis ocultos + dia/noite** | Werewolf, One Night, Secret Hitler, Avalon, Coup | O coração do "party game"; construtor de papéis = profundidade |
| 4 | **Pista → palavra** | Codenames, Taboo, Just One, Decrypto | Word packs infinitos; co-op e versus |
| 5 | **Banco de prompts sociais** | Would You Rather, NHIE, Most Likely To, hot seat | Custo quase zero, retenção alta, packs = identidade/monetização |
| 6 | **Timer + categorias + dedupe** | Scattergories/Adedonha, Herd Mentality | Reaproveita lógica de agrupar respostas iguais |
| 7 | **Espectro/dial** | Wavelength | Mecânica diferenciada, barata, muito "compartilhável" |

A visão "personalizar, não clonar" cai perfeitamente nas famílias **1, 2, 4, 5 e 6**, porque nelas o jogo *é* o conteúdo — trocar listas/prompts/decks já gera um jogo "novo" sem tocar no código.

---

*Próximos passos sugeridos: (a) escolher quais famílias entram na v1; (b) abrir um brainstorming pra fechar escopo das engines; (c) aprofundar qualquer família específica (regras detalhadas, variantes, edge cases de multiplayer).*
