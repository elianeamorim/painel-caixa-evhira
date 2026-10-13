# Painel de Caixa Évhira

> Projeto do Joviano. Os padrões técnicos, visuais, de segurança e de copy
> vivem na base de conhecimento, e quem os carrega é o GENESIS, sob demanda:
> `/genesis-iniciar` para trabalho novo, `/genesis-continuar` para retomar.
> Este arquivo descreve só o que é específico DESTE projeto.

## STACK TRAVADA

- Framework: **Flask** + Jinja2. Tipo: **Pagina_Web_Simples**. Regime: **WEB**.
- PROIBIDO: Streamlit, Gradio, FastAPI, Django, Dash, NiceGUI, Flet.
- Sem banco, sem login, sem sessão. Nada do usuário é gravado no servidor.

## Identidade visual

- Tema escuro. Cor de destaque: token `--accent` em `static/css/tokens.css` (valor inicial `#C9A84C`).
- O hex NUNCA aparece em template. Prova: `grep -rn "#C9A84C" templates/` volta vazio.
- Fontes Inter (corpo) e Sora (títulos) e ícones Phosphor, todos self-hosted em `static/`. Nada de CDN.

## Como rodar

```
.venv\Scripts\python app.py      # abre em http://127.0.0.1:5000
```

## Como publicar

Dockerfile e passo a passo do EasyPanel chegam na Fase 6 (`COMO_PUBLICAR.md`). Prévia publicada já na Fase 3.

## Stack

Python 3.12 na imagem (3.13 na máquina local), Flask 3.1.3, openpyxl, gunicorn. Versões em `requirements.txt`, todas com `==`.

## Módulos

- `app.py`: rotas. Único `.py` na raiz.
- `core/security.py`: cabeçalhos, CSP, ProxyFix, teto de upload.
- `core/` (Fase 2): `leitores.py`, `conferencia.py`, `exemplo.py`, `modelo_excel.py`.
- Telas: `/painel` (dados de exemplo), `/conferir` (a parte que funciona com arquivo real), `/como-funciona`.

## Variáveis de ambiente

`FLASK_DEBUG` (0/1) e `PORT`. Nenhuma é obrigatória.

## Convenções deste projeto

- Dados da demo são todos fictícios ("Sabor da Serra Alimentos"). Nenhum dado real do cliente entra no projeto: `grep -rn "CALDO\|32.626.892" .` volta vazio fora de `00_GENESIS`.
- Tabelas rodam no navegador, sem paginação no servidor (decisão 2A).
- Textos de tela em linguagem de dono de negócio, sem jargão contábil, sem travessão.

## Ritmo dos ajudantes

Paralelismo: auto

## Armadilhas

- Dois nomes de token de cor existem na vault (`--accent` e `--cor-primaria`). Aqui vale só `--accent`; as notas de UI que falam `--cor-primaria` traduzem conforme o LASTRO.
