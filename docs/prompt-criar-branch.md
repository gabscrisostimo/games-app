# Prompt — Criar branch de trabalho (Chat B / Chat C)

Cole este prompt no chat correspondente **antes de começar a implementação**.

---

## Para o Chat B (Engine Impostor/Assimetria — Insider)

```
Antes de começar a implementação, preciso que você crie um branch de trabalho isolado.

Contexto: estamos usando branches separados por chat para evitar conflitos de push no mesmo repositório. O Chat A (visual polish) já está trabalhando no branch `feat/visual-polish`.

Faça agora:

1. Confirme que está no repo correto:
   pwd  → deve ser /home/gabs/personal/games-app
   git branch --show-current  → deve ser main

2. Crie e mude para o branch de trabalho:
   git checkout -b feat/impostor-engine

3. Verifique a baseline:
   npm run test:run  → esperado: 33 testes passando

4. Confirme que criou com sucesso antes de começar qualquer arquivo de código.

Regra de escopo continua igual: você só toca em src/games/impostor/** (não edita src/App.tsx, src/shell/, src/index.css, index.html, vite.config.ts, public/, src/games/taboo/**).

Quando terminar toda a implementação e os testes passarem, avise o Gabs — ele faz o merge dos branches em sequência (visual-polish primeiro, depois impostor-engine).
```

---

## Para o Chat C (próxima engine — a definir)

```
Antes de começar qualquer trabalho, crie um branch de trabalho isolado.

Contexto: estamos usando branches separados por chat para evitar conflitos de push no mesmo repositório.
- Chat A → branch feat/visual-polish (visual polish do app)
- Chat B → branch feat/impostor-engine (Engine Impostor: Insider, Chameleon, Spyfall…)
- Chat C (você) → branch feat/<nome-da-engine> (a engine que você vai implementar)

Faça agora:

1. Confirme que está no repo correto:
   pwd  → deve ser /home/gabs/personal/games-app
   git branch --show-current  → deve ser main

2. Escolha o nome da engine que vai implementar (leia docs/ordem-de-construcao.md para ver o roadmap).
   Sugestões livres: feat/judging-engine, feat/prompt-vote-engine, feat/hidden-roles-engine…

3. Crie e mude para o branch:
   git checkout -b feat/<nome-escolhido>

4. Verifique a baseline:
   npm run test:run  → esperado: 33 testes passando (pode ser mais se Chat A já mergeou)

5. Reivindique seu território em docs/status-chats.md (edite só a sua seção — Chat C).

Regras de escopo: você só toca em src/games/<sua-engine>/**. Não edita src/App.tsx, src/shell/, src/index.css, index.html, vite.config.ts, public/, src/games/taboo/**, src/games/impostor/**.
Contrato de integração: expor <XyzApp onHome={() => void} />.

Quando terminar, avise o Gabs para coordenar o merge.
```

---

## Ordem de merge recomendada

1. `feat/visual-polish` (Chat A) — primeiro, pois altera shell/CSS/config que os outros consomem
2. `feat/impostor-engine` (Chat B) — depois do visual-polish mergear
3. `feat/<engine-C>` (Chat C) — por último

Cada merge: `git checkout main && git merge feat/<branch> --no-ff && git push`
