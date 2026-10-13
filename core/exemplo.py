"""Dados fictícios da "Sabor da Serra Alimentos" (setembro de 2026), para a demo e para os testes.

Nomes, valores e documentos são inventados. Erros plantados de propósito:
- 2 valores trocados (o lançamento diz uma coisa, o banco pagou outra)
- 2 lançamentos duplicados (lançados duas vezes, saiu uma só no banco)
- 3 saídas do banco sem lançamento
Mais 3 lançamentos em cartão, adiantamento e caixinha, que não aparecem como linha própria no extrato.
"""
from datetime import date, timedelta

from core.leitores import normalizar, passa_pelo_banco

ANO, MES = 2026, 9

# (dia, razão social, categoria, valor em centavos, conta). As categorias são os grupos do fluxo de caixa.
BASE = [
    (5, "Simples Nacional DAS", "Impostos", 842035, "Banco A"),
    (10, "FGTS Mensal", "Impostos", 327540, "Banco A"),
    (20, "Imposto Municipal ISS", "Impostos", 118000, "Banco A"),
    (20, "INSS Folha", "Impostos", 461022, "Banco A"),
    (2, "Fazenda Boa Safra Hortifruti", "Custos de produção", 1245000, "Banco A"),
    (3, "Embalagens Alfa Ltda", "Custos de produção", 689050, "Banco A"),
    (4, "Laticínios Vale Verde", "Custos de produção", 932000, "Banco A"),
    (8, "Frigorífico Serra Alta", "Custos de produção", 1578090, "Banco A"),
    (9, "Insumos Naturais Beta", "Custos de produção", 421575, "Banco B"),
    (11, "Moinho Pedra Dourada", "Custos de produção", 564000, "Banco A"),
    (12, "Cooperativa Agrícola Planalto", "Custos de produção", 790530, "Banco B"),
    (14, "Uniformes e EPIs Segurança Já", "Custos de produção", 136000, "Banco B"),
    (15, "Rótulos e Etiquetas Gama", "Custos de produção", 238000, "Banco B"),
    (16, "Condimentos Sol Nascente", "Custos de produção", 315060, "Banco A"),
    (17, "Fazenda Boa Safra Hortifruti", "Custos de produção", 1187000, "Banco A"),
    (21, "Fazenda Boa Safra Hortifruti", "Custos de produção", 1094000, "Banco A"),
    (22, "Embalagens Alfa Ltda", "Custos de produção", 594000, "Banco A"),
    (24, "Laticínios Vale Verde", "Custos de produção", 876040, "Banco A"),
    (26, "Gás Industrial Delta", "Custos de produção", 221500, "Banco B"),
    (28, "Embalagens Alfa Ltda", "Custos de produção", 620500, "Banco A"),
    (29, "Frigorífico Serra Alta", "Custos de produção", 1432000, "Banco A"),
    (5, "Transportes Rápido Norte", "Frete", 348000, "Banco A"),
    (11, "Combustível Posto Estrada", "Frete", 121540, "Banco A"),
    (12, "Transportes Rápido Norte", "Frete", 291550, "Banco A"),
    (19, "Logística Entrega Certa", "Frete", 413000, "Banco B"),
    (26, "Transportes Rápido Norte", "Frete", 376020, "Banco A"),
    (30, "Logística Entrega Certa", "Frete", 198500, "Banco B"),
    (3, "Manutenção Industrial Rápida", "Despesas fixas", 198000, "Banco A"),
    (5, "Aluguel do Galpão", "Despesas fixas", 950000, "Banco A"),
    (6, "Material de Limpeza Brilho", "Despesas fixas", 64230, "Banco B"),
    (8, "Provedor de Internet Conecta", "Despesas fixas", 28990, "Banco B"),
    (10, "Companhia de Energia", "Despesas fixas", 721864, "Banco A"),
    (10, "Companhia de Água", "Despesas fixas", 134218, "Banco A"),
    (15, "Seguro Predial Segura Mais", "Despesas fixas", 112000, "Banco B"),
    (23, "Seguro Frota Estrada Segura", "Despesas fixas", 148000, "Banco A"),
    (25, "Folha de Pagamento", "Despesas fixas", 3864000, "Banco A"),
    (27, "Manutenção Industrial Rápida", "Despesas fixas", 112000, "Banco A"),
    (6, "Agência Brilho Digital", "Marketing e vendas", 320000, "Banco B"),
    (14, "Anúncios Online Impulso", "Marketing e vendas", 245000, "Banco B"),
    (18, "Feira de Alimentos Inscrição", "Marketing e vendas", 280000, "Banco A"),
    (21, "Gráfica Cores Vivas", "Marketing e vendas", 178000, "Banco B"),
    (28, "Comissões de Vendas", "Marketing e vendas", 536045, "Banco A"),
    (29, "Assessoria de Imprensa Voz", "Marketing e vendas", 150000, "Banco B"),
    (7, "Contabilidade Número Certo", "Administrativo", 185000, "Banco A"),
    (13, "Papelaria Escritório Fácil", "Administrativo", 43670, "Banco B"),
    (18, "Software de Gestão Nuvem", "Administrativo", 59000, "Banco B"),
    (23, "Advocacia Souza & Lima", "Administrativo", 220000, "Banco A"),
    (9, "Laboratório Análise Pura", "Qualidade", 164000, "Banco A"),
    (16, "Treinamento Boas Práticas", "Qualidade", 95000, "Banco B"),
    (20, "Dedetizadora Livre de Pragas", "Qualidade", 78000, "Banco B"),
    (27, "Certificadora Selo Qualidade", "Qualidade", 295000, "Banco A"),
    (13, "Máquinas Industriais Ômega", "Investimento", 1850000, "Banco A"),
    (24, "Câmara Fria Gelo Seco", "Investimento", 672500, "Banco B"),
    (30, "Reforma do Refeitório", "Investimento", 435000, "Banco B"),
]
# o que o banco realmente pagou, no lugar do valor lançado: (dia, razão social) -> centavos
TROCADOS = {(4, "Laticínios Vale Verde"): 923000, (26, "Transportes Rápido Norte"): 367020}
# lançados duas vezes: (dia, razão social)
DUPLICADOS = [(3, "Embalagens Alfa Ltda"), (7, "Contabilidade Número Certo")]
# lançamentos que não viram linha própria no extrato (cartão, adiantamento, caixinha)
FORA_DO_BANCO = [
    (8, "Posto de Combustível Estrada", "Frete", 41230, "Cartão de Crédito"),
    (14, "Adiantamento Viagem Comercial", "Administrativo", 80000, "Adiantamento"),
    (22, "Compras Pequenas da Loja", "Administrativo", 15000, "Caixinha"),
]
# saídas do banco que ninguém lançou: (dia, descrição no extrato, centavos, conta)
SO_BANCO = [
    (12, "FATURA CARTAO CREDITO", 487035, "Banco A"),
    (15, "PIX ENVIADO JOAO S", 65000, "Banco B"),
    (28, "TARIFA PACOTE SERVICOS", 8990, "Banco A"),
]
# entradas do mês (aparecem no extrato, mas a conferência v1 olha só as saídas)
ENTRADAS = [
    (2, "PIX RECEBIDO MERCADO CENTRAL", 1845000, "Banco A"),
    (4, "TED RECEBIDA REDE SUPERMERCADOS ALVORADA", 3280000, "Banco A"),
    (9, "BOLETO RECEBIDO PADARIA PAO DOURADO", 524000, "Banco B"),
    (15, "PIX RECEBIDO LOJA ONLINE", 1296000, "Banco B"),
    (18, "TED RECEBIDA RESTAURANTE SABOR CASEIRO", 987000, "Banco A"),
    (25, "PIX RECEBIDO MERCADO CENTRAL", 2130000, "Banco A"),
]

_ATRASO_NO_BANCO = (0, 1, 0, -1, 0, 2, 1, 0)  # dias de diferença entre o lançamento e a saída no banco
_MODELOS_EXTRATO = ("PAGTO BOLETO {}", "PIX ENVIADO {}", "TED {}")


def _dia(dia):
    return date(ANO, MES, dia)


def _lancamento(n, dia, razao, categoria, centavos, conta):
    return {"data": _dia(dia), "descricao": razao, "centavos": centavos, "conta": conta,
            "documento": f"NF-{1000 + n}", "categoria": categoria}


def movimentos(conta=None):
    """(lançamentos, extrato) com valor em centavos. No extrato a saída é negativa e a entrada positiva.

    Com `conta="Banco A"`, devolve só o recorte daquele banco (usado pra gerar as amostras em arquivo).
    """
    lancamentos, extrato = [], []
    for n, (dia, razao, categoria, centavos, c) in enumerate(BASE):
        lancamentos.append(_lancamento(n, dia, razao, categoria, centavos, c))
        pago = TROCADOS.get((dia, razao), centavos)
        data_banco = _dia(dia) + timedelta(days=_ATRASO_NO_BANCO[n % len(_ATRASO_NO_BANCO)])
        descricao = _MODELOS_EXTRATO[n % 3].format(normalizar(razao).upper()[:28])
        extrato.append({"data": data_banco, "descricao": descricao, "centavos": -pago, "conta": c,
                        "documento": "", "categoria": ""})
    for k, (dia, razao) in enumerate(DUPLICADOS):
        original = next(l for l in lancamentos if l["data"] == _dia(dia) and l["descricao"] == razao)
        lancamentos.append({**original, "documento": f"NF-{2000 + k}"})
    for n, (dia, razao, categoria, centavos, c) in enumerate(FORA_DO_BANCO):
        lancamentos.append(_lancamento(500 + n, dia, razao, categoria, centavos, c))
    for dia, descricao, centavos, c in SO_BANCO:
        extrato.append({"data": _dia(dia), "descricao": descricao, "centavos": -centavos, "conta": c,
                        "documento": "", "categoria": ""})
    for dia, descricao, centavos, c in ENTRADAS:
        extrato.append({"data": _dia(dia), "descricao": descricao, "centavos": centavos, "conta": c,
                        "documento": "", "categoria": ""})
    if conta:
        lancamentos = [l for l in lancamentos if l["conta"] == conta or not passa_pelo_banco(l["conta"])]
        extrato = [e for e in extrato if e["conta"] == conta]
    lancamentos.sort(key=lambda i: (i["data"], i["descricao"]))
    extrato.sort(key=lambda i: (i["data"], i["descricao"]))
    return lancamentos, extrato


def dados_exemplo(conta=None):
    """(lancamentos, extrato) no mesmo formato que `ler_lancamentos` e `ler_extrato` devolvem."""
    lancamentos, extrato = movimentos(conta)
    saidas = [{**e, "centavos": -e["centavos"]} for e in extrato if e["centavos"] < 0]
    return (
        {"formato": "exemplo", "formato_nome": "Dados de exemplo",
         "itens": [l for l in lancamentos if passa_pelo_banco(l["conta"])],
         "nao_passam": [l for l in lancamentos if not passa_pelo_banco(l["conta"])], "ignoradas": 0},
        {"formato": "exemplo", "formato_nome": "Dados de exemplo", "itens": saidas,
         "fora_das_saidas": len(extrato) - len(saidas), "ignoradas": 0},
    )
