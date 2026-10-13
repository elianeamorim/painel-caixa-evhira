"""Cruza os lançamentos da contabilidade com as saídas do extrato do banco.

Três grupos, na ordem em que são formados:
- bateu: mesmo valor, datas a no máximo 3 dias uma da outra
- valor diferente: datas em até 3 dias e descrição parecida, mas valor diferente
- só de um lado: lançado e não saiu no banco, ou saiu no banco e não foi lançado
Cada linha de um lado casa com no máximo uma do outro. Nada é gravado nem registrado em log.
"""
import re
from collections import defaultdict
from functools import lru_cache

from core.leitores import normalizar

JANELA_DIAS = 3
# escada: lista fixa de palavras comuns; crescer conforme extratos reais mostrarem outras
# palavras de extrato e de razão social que não identificam ninguém; sem elas, "pagamento" casaria com tudo
PALAVRAS_COMUNS = frozenset({
    "pagamento", "pagto", "boleto", "transferencia", "transf", "enviado", "enviada", "recebido",
    "debito", "credito", "compra", "cartao", "automatico", "banco", "conta", "referente",
    "ltda", "eireli", "comercio", "industria", "servicos",
})


@lru_cache(maxsize=8192)
def _palavras(descricao):
    texto = re.sub(r"\d+", " ", normalizar(descricao))
    return tuple(p for p in texto.split() if p not in PALAVRAS_COMUNS)


def parecida(a, b):
    """Depois de tirar acento, caixa, números e palavras comuns: uma contém a outra ou dividem palavra de 4+ letras."""
    pa, pb = _palavras(a), _palavras(b)
    if not pa or not pb:
        return False
    ta, tb = " ".join(pa), " ".join(pb)
    if min(len(ta), len(tb)) >= 4 and (ta in tb or tb in ta):
        return True
    return bool({p for p in pa if len(p) >= 4} & {p for p in pb if len(p) >= 4})


def _dias(a, b):
    return abs((a["data"] - b["data"]).days)


def _reais(centavos):
    return round(centavos / 100, 2)


def _linha(it):
    return {"data": it["data"].isoformat(), "descricao": it["descricao"], "valor": _reais(it["centavos"]),
            "conta": it["conta"], "documento": it["documento"], "categoria": it["categoria"]}


def conferir(lancamentos, extrato):
    """Recebe os dicionários de `ler_lancamentos` e `ler_extrato` (ou de `exemplo`) e devolve os 3 grupos."""
    lanc = sorted(lancamentos["itens"], key=lambda i: (i["data"], i["descricao"], i["centavos"]))
    banco = sorted(extrato["itens"], key=lambda i: (i["data"], i["descricao"], i["centavos"]))
    casado_lanc, casado_banco = {}, {}  # índice -> índice do par

    por_valor = defaultdict(list)
    por_dia = defaultdict(list)
    for j, b in enumerate(banco):
        por_valor[b["centavos"]].append(j)
        por_dia[b["data"].toordinal()].append(j)

    # escada: casamento guloso na ordem das datas, sem otimizar o conjunto; trocar por casamento ótimo se pares trocados aparecerem na prática
    # escada: um pagamento do banco quita no máximo um lançamento; pagamento agrupado (um pra muitos) fica fora da v1
    # 1) bateu: valor exato e data na janela; prefere descrição parecida, depois a data mais próxima
    for i, l in enumerate(lanc):
        candidatos = [j for j in por_valor[l["centavos"]]
                      if j not in casado_banco and _dias(l, banco[j]) <= JANELA_DIAS]
        if candidatos:
            j = candidatos[0] if len(candidatos) == 1 else min(
                candidatos, key=lambda j: (not parecida(l["descricao"], banco[j]["descricao"]), _dias(l, banco[j]), j))
            casado_lanc[i], casado_banco[j] = j, i
    exatos = set(casado_lanc)

    # 2) valor diferente: sobra com data na janela e descrição parecida
    for i, l in enumerate(lanc):
        if i in casado_lanc:
            continue
        candidatos = [j for d in range(l["data"].toordinal() - JANELA_DIAS, l["data"].toordinal() + JANELA_DIAS + 1)
                      for j in por_dia[d]
                      if j not in casado_banco and parecida(l["descricao"], banco[j]["descricao"])]
        if candidatos:
            j = min(candidatos, key=lambda j: (_dias(l, banco[j]), abs(l["centavos"] - banco[j]["centavos"]), j))
            casado_lanc[i], casado_banco[j] = j, i

    bateu, diferente, um_lado = [], [], []
    for i, l in enumerate(lanc):
        if i not in casado_lanc:
            continue
        b = banco[casado_lanc[i]]
        linha = {**_linha(l), "data_banco": b["data"].isoformat(), "descricao_banco": b["descricao"]}
        if i in exatos:
            bateu.append(linha)
        else:
            linha.update(valor_banco=_reais(b["centavos"]), diferenca=_reais(b["centavos"] - l["centavos"]))
            diferente.append(linha)

    ja_batidos = [lanc[i] for i in exatos]
    for i, l in enumerate(lanc):
        if i in casado_lanc:
            continue
        duplicado = any(m["centavos"] == l["centavos"] and normalizar(m["descricao"]) == normalizar(l["descricao"])
                        and _dias(m, l) <= JANELA_DIAS for m in ja_batidos)
        um_lado.append({"lado": "lancamento", **_linha(l),
                        "motivo": ("Parece lançado em duplicidade" if duplicado
                                   else "Lançado, mas não saiu no extrato")})
    for j, b in enumerate(banco):
        if j not in casado_banco:
            um_lado.append({"lado": "banco", **_linha(b), "motivo": "Saiu no banco e não foi lançado"})

    nao_passam = [_linha(i) for i in lancamentos.get("nao_passam", [])]
    so_lanc = sum(1 for x in um_lado if x["lado"] == "lancamento")
    return {
        "bateu": bateu,
        "valor_diferente": diferente,
        "so_um_lado": um_lado,
        "nao_passam": {"quantidade": len(nao_passam),
                       "total": _reais(sum(i["centavos"] for i in lancamentos.get("nao_passam", []))),
                       "itens": nao_passam},
        "resumo": {
            "lancamentos": len(lanc) + len(nao_passam),
            "passam_pelo_banco": len(lanc),
            "bateram": len(bateu),
            "valor_diferente": len(diferente),
            "so_lancamento": so_lanc,
            "so_banco": len(um_lado) - so_lanc,
            "precisam_de_atencao": len(diferente) + len(um_lado),
        },
    }
