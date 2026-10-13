"""Números do Painel do dono, da "Sabor da Serra Alimentos" (fábrica fictícia, setembro de 2026).

Tudo é inventado e fixo: a demo mostra sempre o mesmo mês. Valores em centavos inteiros.
As saídas por grupo vêm do mesmo cadastro que alimenta a conferência (`core.exemplo`), então os dois lados contam a mesma história.
"""
from collections import defaultdict
from datetime import date, timedelta

from core.exemplo import BASE, FORA_DO_BANCO

HOJE = date(2026, 9, 30)  # "hoje" da demo: fecha o mês
MES_NOME = "Setembro de 2026"
META_PADRAO = 40000000  # R$ 400.000,00, só o valor que vem preenchido no campo
JANELA_A_PAGAR = 30

# grupos de saída: nome -> (ícone, token de cor). O token mora em tokens.css.
GRUPOS = {
    "Impostos": ("ph-bank", "grp-impostos"),
    "Custos de produção": ("ph-factory", "grp-producao"),
    "Frete": ("ph-truck", "grp-frete"),
    "Despesas fixas": ("ph-house-line", "grp-fixas"),
    "Marketing e vendas": ("ph-megaphone", "grp-marketing"),
    "Administrativo": ("ph-briefcase", "grp-admin"),
    "Qualidade": ("ph-seal-check", "grp-qualidade"),
    "Investimento": ("ph-trend-up", "grp-invest"),
}

# entradas do mês por canal: nome -> (ícone, token, centavos)
CANAIS = {
    "Pix e transferência": ("ph-qr-code", "grp-producao", 14280000),
    "Boleto": ("ph-barcode", "grp-impostos", 9860000),
    "Loja online": ("ph-shopping-cart", "grp-marketing", 5190000),
    "Lojas parceiras": ("ph-storefront", "grp-frete", 3800000),
}

# semanas do mês: rótulo, último dia da semana, entradas em centavos
SEMANAS = [
    ("1 a 6", 6, 6240000),
    ("7 a 13", 13, 7130000),
    ("14 a 20", 20, 9850000),
    ("21 a 27", 27, 5390000),
    ("28 a 30", 30, 4520000),
]

SALDOS = {"Banco A": 18432055, "Banco B": 6287010, "Caixa": 315000}

# (dia de outubro, fornecedor, grupo, conta, centavos)
A_PAGAR = [
    (2, "Fazenda Boa Safra Hortifruti", "Custos de produção", "Banco A", 1218000),
    (3, "Embalagens Alfa Ltda", "Custos de produção", "Banco A", 684050),
    (5, "Simples Nacional DAS", "Impostos", "Banco A", 835000),
    (5, "Aluguel do Galpão", "Despesas fixas", "Banco A", 950000),
    (6, "Agência Brilho Digital", "Marketing e vendas", "Banco B", 320000),
    (8, "Frigorífico Serra Alta", "Custos de produção", "Banco A", 1521090),
    (9, "Transportes Rápido Norte", "Frete", "Banco A", 362000),
    (10, "Companhia de Energia", "Despesas fixas", "Banco A", 739040),
    (10, "Companhia de Água", "Despesas fixas", "Banco A", 131025),
    (10, "FGTS Mensal", "Impostos", "Banco A", 331000),
    (13, "Laticínios Vale Verde", "Custos de produção", "Banco A", 915000),
    (15, "Seguro Predial Segura Mais", "Despesas fixas", "Banco B", 112000),
    (16, "Cooperativa Agrícola Planalto", "Custos de produção", "Banco B", 790530),
    (20, "INSS Folha", "Impostos", "Banco A", 461022),
    (20, "Imposto Municipal ISS", "Impostos", "Banco A", 118000),
    (23, "Contabilidade Número Certo", "Administrativo", "Banco A", 185000),
    (25, "Folha de Pagamento", "Despesas fixas", "Banco A", 3864000),
    (27, "Máquinas Industriais Ômega", "Investimento", "Banco A", 1850000),
    (28, "Comissões de Vendas", "Marketing e vendas", "Banco A", 536045),
]


def _semana(dia):
    for n, (_, ultimo, _) in enumerate(SEMANAS):
        if dia <= ultimo:
            return n


def dados_painel():
    saidas_grupo = defaultdict(int)
    saidas_semana = defaultdict(int)
    for dia, _razao, grupo, valor, _conta in BASE + FORA_DO_BANCO:
        saidas_grupo[grupo] += valor
        saidas_semana[_semana(dia)] += valor

    total_saidas = sum(saidas_grupo.values())
    total_entradas = sum(c for _, _, c in SEMANAS)
    por_grupo = [
        {"nome": nome, "icone": GRUPOS[nome][0], "cor": GRUPOS[nome][1], "centavos": saidas_grupo[nome]}
        for nome in sorted(GRUPOS, key=lambda n: -saidas_grupo[n])
    ]
    por_canal = [
        {"nome": nome, "icone": i, "cor": cor, "centavos": c}
        for nome, (i, cor, c) in sorted(CANAIS.items(), key=lambda kv: -kv[1][2])
    ]
    semanas = [
        {"rotulo": r, "entrou": e, "saiu": saidas_semana[n]}
        for n, (r, _, e) in enumerate(SEMANAS)
    ]
    maior_semana = max(max(s["entrou"], s["saiu"]) for s in semanas)
    a_pagar = [
        {"data": date(2026, 10, dia), "fornecedor": f, "grupo": g, "conta": conta, "centavos": c,
         "icone": GRUPOS[g][0], "cor": GRUPOS[g][1], "em_dias": (date(2026, 10, dia) - HOJE).days}
        for dia, f, g, conta, c in sorted(A_PAGAR)
    ]
    return {
        "mes": MES_NOME,
        "limite": (HOJE + timedelta(days=JANELA_A_PAGAR)).strftime("%d/%m"),
        "entrou": total_entradas,
        "saiu": total_saidas,
        "a_pagar": a_pagar,
        "a_pagar_total": sum(i["centavos"] for i in a_pagar),
        "saldos": [{"nome": n, "centavos": c} for n, c in SALDOS.items()],
        "saldo_total": sum(SALDOS.values()),
        "meta_padrao": META_PADRAO,
        "por_grupo": por_grupo,
        "maior_grupo": por_grupo[0]["centavos"],
        "por_canal": por_canal,
        "maior_canal": por_canal[0]["centavos"],
        "semanas": semanas,
        "maior_semana": maior_semana,
    }
