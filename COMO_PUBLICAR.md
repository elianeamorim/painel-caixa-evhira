# Como publicar e atualizar o Painel de Caixa Évhira

O app já está criado no EasyPanel (projeto `evhira`, serviço `painel-caixa`), ligado ao GitHub `elianeamorim/painel-caixa-evhira`, branch `main`. Atualizar é sempre isto:

## Atualizar o app no ar

1. As mudanças chegam ao GitHub (quem faz isso é o Claude, ou você pelo navegador: **Add file → Upload files**).
2. No EasyPanel, abra o serviço `painel-caixa` e clique no botão verde **Implantar** (Deploy).
3. Espere ficar verde (2 a 3 minutos) e abra o endereço do app.

Se o app continuar igual, confira no GitHub se a mudança chegou (o horário do último commit) e implante de novo.

## Conferir depois de implantar (no tablet ou celular)

- **Painel** abre com o aviso "Dados de exemplo de uma fábrica fictícia".
- **Conferir com o banco**: toque em "Usar dados de exemplo". Devem aparecer 52 que bateram, 2 com valor diferente e 5 só de um lado.
- **Conferir com arquivos**: suba os 2 arquivos da pasta `amostras_demo` (`lancamentos_omie_exemplo.xlsx` e `extrato_bancoA_exemplo.ofx`). Deve dar 32 que bateram, 2 diferentes e 4 só de um lado.
- **Como funciona** abre com 3 blocos.
- Endereço `/health` mostra `{"status":"ok"}`.

## Se algo der errado

- **"Não encontrado" numa tela:** a versão no ar é antiga. Implante de novo.
- **Implantação com erro:** abra o log do serviço no EasyPanel e mande um print.
- **Sem internet na rodada:** rotear a internet do celular para o tablet.

## Configuração do serviço (só para consulta)

- Origem: GitHub, repositório `painel-caixa-evhira`, branch `main`.
- Build: Dockerfile na raiz. Porta: **8000**.
- Variáveis de ambiente: nenhuma é obrigatória.
- Nada do usuário é guardado no servidor: sem banco, sem login, sem sessão.

## Rodar no computador (reserva, Windows)

Dois cliques em `abrir_painel.bat`. Na primeira vez precisa de internet para instalar as peças. O endereço local é `http://127.0.0.1:5000/painel`.
