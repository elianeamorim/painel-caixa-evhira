# Roteiro da demonstração (3 minutos)

Para a rodada de negócios do SEBRAE, 19/10/2026. Você não precisa ser contadora. O que vale é mostrar, perguntar e anotar.

## Antes de começar: duas coisas pra deixar claras

- O **Painel** é uma demonstração. Os números são inventados (fábrica fictícia "Sabor da Serra Alimentos"). Na versão real, ele usaria os dados do negócio do cliente.
- A **conferência com o banco** é a parte que funciona de verdade, com arquivo de verdade.

## O roteiro

**0:00 a 0:30. Abertura**
"Você já quis saber, num olhar, quanto entrou, quanto tem pra pagar e quanto falta vender pra bater a meta?"
Abra o **Painel**. Mostre os 4 números de cima e mude a meta do mês pra ver o "falta vender" mudar na hora.
Diga: "Aqui os dados são de exemplo. No seu negócio, seriam os seus."

**0:30 a 2:00. A conferência**
"Quem cuida das suas contas lança o que foi pago. Você confere se bate com o banco?"
Abra **Conferir com o banco** e toque em **Usar dados de exemplo**. Mostre:
- **Bateu** (verde): a maioria, sem trabalho nenhum.
- **Valor diferente** (amarelo): 2 itens pagos por valor diferente do lançado.
- **Só de um lado** (vermelho): o que foi lançado e não saiu, ou saiu e ninguém lançou.
Diga: "Em vez de conferir tudo linha por linha, você olha só o que não bateu."

**2:00 a 2:30. Com arquivo de verdade**
Se o cliente quiser, suba os dois arquivos da pasta `amostras_demo`, ou arquivos dele. Lembre: "Nada fica guardado. O arquivo some depois do resultado."

**2:30 a 3:00. As duas perguntas (a aposta)**
Faça e anote as respostas na tabela abaixo:
1. **"Quem lança suas contas?"**
2. **"Você confere o que é lançado?"**

## Tabela pra anotar

| Empresa / pessoa | Quem lança as contas? | Confere? (sim / não / gostaria) | Interesse (0 a 3) | Observação |
|---|---|---|---|---|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

**Como ler no fim:** de umas 10 conversas, se **4 ou 5** conferem ou gostariam de conferir, tem mercado. Se só **1**, vale repensar.

## Se o cliente perguntar

- **"Meus dados ficam guardados?"** Não. O arquivo é lido, o resultado aparece e tudo é descartado.
- **"Funciona com o meu sistema?"** Funciona com planilha de qualquer sistema (xlsx ou csv) e extrato do banco (OFX, xlsx ou csv). Se o arquivo não for reconhecido, o app avisa e oferece um modelo de planilha.
- **"E quando um débito paga várias contas juntas?"** Esse caso ainda não é casado. Aparece como "só de um lado". É um limite conhecido da primeira versão.
- **"Esse número do Painel vem de onde?"** Aqui é um exemplo: os números são inventados e fixos. No negócio dele, viriam dos arquivos dele: o que entrou, das vendas ou do extrato do banco; o que tem a pagar, do relatório de contas a pagar do sistema da contabilidade; o saldo, do extrato do banco. Só a meta do mês é digitada pelo dono. Quem lê arquivo de verdade hoje é a conferência com o banco.
- **"É de graça? Quando fica pronto de verdade?"** Hoje é uma demonstração. Anote o interesse e diga que volta com a versão com os dados dele.

## Plano B: sem internet

Se o Wi-Fi do evento falhar, rode o app no seu notebook:
1. Abra a pasta do projeto e dê **dois cliques em `abrir_painel.bat`**.
2. O navegador abre sozinho no Painel. Se não abrir, digite `http://127.0.0.1:5000/painel`.
3. Pra fechar, feche a janela preta.

**Importante:** teste isso em casa **antes do dia 19**, com o Wi-Fi desligado. Na primeira vez o arquivo instala algumas peças e precisa de internet. Depois funciona sem.
