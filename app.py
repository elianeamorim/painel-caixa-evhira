import io
import os
import secrets

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, send_file, url_for

from core.conferencia import conferir
from core.exemplo import dados_exemplo
from core.leitores import ErroArquivo, ler_extrato, ler_lancamentos
from core.modelo_excel import gerar_modelo
from core.painel import dados_painel
from core.security import init_security

load_dotenv()

app = Flask(__name__)
# o app nao usa sessao; a chave existe so como guarda. Sem SECRET_KEY no ambiente, nasce uma aleatoria a cada subida.
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY") or secrets.token_hex(32),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
init_security(app)


@app.template_filter("moeda")
def moeda(centavos):
    """Centavos inteiros em 'R$ 1.234,56', com o mesmo espaço fixo que o Intl.NumberFormat pt-BR usa no navegador."""
    sinal = "-" if centavos < 0 else ""
    reais, cent = divmod(abs(centavos), 100)
    return f"{sinal}R$ {reais:,}".replace(",", ".") + f",{cent:02d}"


@app.template_filter("reais_num")
def reais_num(centavos):
    """Número cru em reais ('12180.50'), pra ordenar e exportar a tabela como número."""
    return f"{centavos / 100:.2f}"


@app.template_filter("mil")
def mil(centavos):
    """Valor compacto em milhares ('62,4'), pros rótulos do gráfico."""
    return f"{centavos / 100000:.1f}".replace(".", ",")


@app.template_filter("prazo")
def prazo(dias):
    return "Hoje" if dias == 0 else "Amanhã" if dias == 1 else f"Em {dias} dias"


@app.get("/")
def raiz():
    return redirect(url_for("painel"))


@app.get("/painel")
def painel():
    return render_template("painel.html", ativo="painel", titulo="Painel do dono", d=dados_painel())


@app.get("/conferir/modelo.xlsx")
def modelo_xlsx():
    return send_file(io.BytesIO(gerar_modelo()), as_attachment=True,
                     download_name="modelo_lancamentos_evhira.xlsx",
                     mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


LIMITE_ARQUIVO = 5 * 1024 * 1024  # por arquivo; o teto global de 10 MB fica em core/security.py
CAMPOS = (("lancamentos", "lançamentos da contabilidade", ler_lancamentos), ("extrato", "extrato do banco", ler_extrato))


def _json(dados, status=200):
    resp = jsonify(dados)
    resp.status_code = status
    resp.headers["Cache-Control"] = "no-store"  # nada fica guardado, nem no navegador
    return resp


def _erro(mensagem, campo=None, status=400):
    return _json({"erro": mensagem, "campo": campo}, status)


@app.errorhandler(413)
def arquivo_grande_demais(_):
    return _erro("Os arquivos juntos passam de 10 MB. Envie arquivos menores, de até 5 MB cada.", None, 413)


@app.get("/conferir")
def conferir_tela():
    return render_template("conferir.html", ativo="conferir", titulo="Conferir com o banco")


@app.post("/conferir/processar")
def conferir_processar():
    lidos = {}
    for campo, nome, leitor in CAMPOS:
        arq = request.files.get(campo)
        # le um byte a mais que o limite: o suficiente pra saber que estourou, sem trazer o arquivo todo
        dados = arq.stream.read(LIMITE_ARQUIVO + 1) if arq else b""
        if not dados:
            return _erro(f"Falta o arquivo de {nome}.", campo)
        if len(dados) > LIMITE_ARQUIVO:
            return _erro(f"O arquivo de {nome} passa de 5 MB. Envie um arquivo menor.", campo, 413)
        try:
            lidos[campo] = leitor(dados)
        except ErroArquivo as e:
            return _erro(str(e), campo, 422)
        except Exception as e:  # arquivo estranho que o leitor não previu: mensagem amiga, sem pilha e sem conteúdo
            app.logger.error("falha ao ler %s: %s", campo, type(e).__name__)
            return _erro("Não consegui abrir este arquivo. Confira se ele não está corrompido ou baixe o modelo.", campo, 422)
    return _json(_resultado(lidos["lancamentos"], lidos["extrato"]))


@app.post("/conferir/exemplo")
def conferir_exemplo():
    return _json(_resultado(*dados_exemplo()))


def _resultado(lancamentos, extrato):
    r = conferir(lancamentos, extrato)
    r["origem"] = {"lancamentos": lancamentos["formato_nome"], "extrato": extrato["formato_nome"]}
    return r


@app.get("/como-funciona")
def como_funciona():
    return render_template("como_funciona.html", ativo="como", titulo="Como funciona")


@app.get("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    # debug so quando FLASK_DEBUG=1 no ambiente local; nunca em producao
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")),
            debug=os.getenv("FLASK_DEBUG") == "1")
