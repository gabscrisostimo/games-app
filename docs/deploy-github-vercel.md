# Deploy: GitHub + Vercel

Guia passo-a-passo para publicar o games-app em uma URL pública acessível pelo celular.

---

## Pré-requisito — Confirmar diretório correto

Rode isso antes de qualquer coisa:

```bash
pwd
```

Saída esperada:
```
/home/gabs/personal/games-app
```

Se não estiver lá:
```bash
cd /home/gabs/personal/games-app && pwd
```

Confirme também que é o repo certo (não o `alaska_docs`):
```bash
git log --oneline -3
```

Deve mostrar commits do games-app, ex:
```
c53d600 chore(pwa): ícones placeholder e verificação de build
...
```

---

## Passo 1 — Instalar GitHub CLI (gh)

No terminal WSL:

```bash
type -p curl >/dev/null || sudo apt install curl -y
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh -y
```

---

## Passo 2 — Autenticar no GitHub

```bash
gh auth login
```

Respostas no wizard:
1. **Where do you use GitHub?** → `GitHub.com`
2. **Preferred protocol?** → `HTTPS`
3. **Authenticate with browser?** → `Yes`

Abre o browser, faz login na conta `gabrielcrisostimo@gmail.com`.

---

## Passo 3 — Criar repo e fazer push

```bash
cd /home/gabs/personal/games-app
gh repo create games-app --public --source=. --remote=origin --push
```

Isso faz tudo de uma vez:
- Cria `github.com/gabrielcrisostimo/games-app`
- Configura `origin` no git local
- Faz push de todos os 19 commits

---

## Passo 4 — Conectar ao Vercel (no browser)

1. Acesse **[vercel.com](https://vercel.com)** → faça login (pode usar a conta GitHub)
2. Clique **"Add New Project"**
3. Importe o repo **`games-app`** da sua conta GitHub
4. Confirme as configurações (Vercel detecta Vite automaticamente):
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique **Deploy**

Após ~1 minuto, você recebe uma URL tipo:
```
https://games-app-xyz.vercel.app
```

---

## Deploy automático (próximos pushes)

A partir de agora, qualquer `git push` faz redeploy automático:

```bash
git add .
git commit -m "feat: alguma coisa"
git push
```

Vercel detecta o push, faz build e publica em ~30 segundos.

---

## Verificar se está tudo ok

Após o deploy, acesse a URL no celular e confirme:
- [ ] App carrega
- [ ] Botão "Taboo" funciona
- [ ] Consegue configurar e iniciar uma partida
- [ ] Timer funciona
- [ ] Navegador pede para "Adicionar à tela inicial" (PWA)
