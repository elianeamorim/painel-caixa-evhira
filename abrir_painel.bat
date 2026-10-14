@echo off
rem Abre o Painel de Caixa Evhira neste notebook, sem internet.
rem Na primeira vez precisa de internet (instala as pecas). Depois funciona sem.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Preparando pela primeira vez. Pode demorar um pouco...
  py -3 -m venv .venv || python -m venv .venv
  .venv\Scripts\python -m pip install -r requirements.txt
)
start "" http://127.0.0.1:5000/painel
.venv\Scripts\python app.py
pause
