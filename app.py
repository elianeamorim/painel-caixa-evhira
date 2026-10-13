import io
import os
import secrets

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, send_file, url_for

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


@app.get("/health")
def health():
    return jsonify(status="ok")


if __name__ == "__main__":
    # debug so quando FLASK_DEBUG=1 no ambiente local; nunca em producao
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")),
            debug=os.getenv("FLASK_DEBUG") == "1")
