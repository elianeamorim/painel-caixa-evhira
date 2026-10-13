# Como colocar a prévia no ar (EasyPanel)

Tempo: uns 20 minutos. Você clica, eu fico por perto. Se qualquer passo der diferente do que está escrito, mande um print.

## Parte 1: mandar o app pro GitHub

1. Abra https://github.com/new
2. Em "Repository name" escreva: `painel-caixa-evhira`
3. Marque **Private** (privado). Não marque nenhuma caixinha de README.
4. Clique em **Create repository**.
5. Abra o terminal na pasta do projeto e rode os comandos abaixo, **um de cada vez** (troque `SEU-USUARIO` pelo seu usuário do GitHub, o mesmo do outro app: `elianeamorim`).

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "Painel de Caixa Evhira: previa"
```

```bash
git remote add origin https://github.com/SEU-USUARIO/painel-caixa-evhira.git
```

```bash
git push -u origin main
```

Se pedir login, entre com a sua conta do GitHub.

## Parte 2: criar o app no EasyPanel

1. Entre no seu EasyPanel e abra o projeto `evhira` (o mesmo do outro app).
2. Clique em **+ Service** e depois em **App**.
3. Nome do app: `painel-caixa`.
4. Em **Source**, escolha **Github**. Preencha: Owner = seu usuário, Repository = `painel-caixa-evhira`, Branch = `main`. Clique em **Save**.
5. Em **Build**, escolha **Dockerfile** e deixe o caminho `Dockerfile`. Clique em **Save**.
6. Em **Domains & Proxy**, confira que a porta é **8000**. Clique em **Save**.
7. Clique no botão verde **Deploy** (Implantar). Espere terminar (uns 2 a 3 minutos). Se aparecer erro, mande um print do log.
8. Quando ficar verde, clique no endereço do app (algo como `https://evhira-painel-caixa.xxxx.easypanel.host`).

## Parte 3: conferir no celular

Abra o mesmo endereço no seu celular e confira:

- A página abre e mostra o aviso "Dados de exemplo de uma fábrica fictícia".
- Os 4 números aparecem, um embaixo do outro, sem a tela andar de lado.
- Digite uma meta, clique em "Salvar meta" e veja o "Falta vender" mudar.
- A tabela de contas abre o menu (ícone de três linhas) e filtra.

Se tudo certo, volte aqui e diga "abriu no celular". Aí eu fecho a Fase 3.
