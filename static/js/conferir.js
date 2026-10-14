// Tela Conferir com o banco: escolhe os dois arquivos, manda pro servidor, mostra os 3 grupos.
// Nada é guardado: o servidor lê na memória e devolve o resultado; aqui ele só vive na tela.
// Todo dado que veio do arquivo entra na tela por textContent (Padrao_XSS), nunca como HTML.
(function () {
  'use strict';

  var LIMITE = 5 * 1024 * 1024;
  var EXTENSOES = {
    lancamentos: {lista: ['xlsx', 'csv', 'txt'], texto: 'Nos lançamentos, aceito só planilha .xlsx ou .csv.'},
    extrato: {lista: ['ofx', 'xlsx', 'csv', 'txt'], texto: 'No extrato, aceito só .ofx, .xlsx ou .csv.'}
  };
  var BRL = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});

  var arquivos = {lancamentos: null, extrato: null};
  var ocupado = false;

  var btnConferir = document.getElementById('btnConferir');
  var btnExemplo = document.getElementById('btnExemplo');
  var msg = document.getElementById('imMsg');
  var vzInicio = document.getElementById('vzInicio');
  var vzCarregando = document.getElementById('vzCarregando');
  var vzErro = document.getElementById('vzErro');
  var vzErroTexto = document.getElementById('vzErroTexto');
  var resultado = document.getElementById('resultado');
  if (!btnConferir || !btnExemplo) return;

  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (filhos || []).forEach(function (f) { if (f) e.appendChild(f); });
    return e;
  }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }
  function tamanho(bytes) { return bytes < 1024 * 1024 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1).replace('.', ',') + ' MB'; }
  function dataBr(iso) { var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }

  function mensagem(texto, tipo) {
    msg.textContent = texto || '';
    msg.className = 'im-msg' + (tipo ? ' ' + tipo : '');
  }

  // ---------- as duas áreas de soltar arquivo ----------
  function zona(campo) { return document.querySelector('.im-drop[data-campo="' + campo + '"]'); }

  function mostrarArquivo(campo) {
    var z = zona(campo), f = arquivos[campo];
    z.classList.toggle('loaded', !!f);
    z.classList.remove('over');
    z.querySelector('i').className = 'ph ' + (f ? 'ph-check-circle' : 'ph-file-arrow-up');
    z.querySelector('.im-txt').textContent = f ? 'Arquivo escolhido:' : 'Clique ou arraste o arquivo aqui';
    // o nome só aparece na tela; ele não vai pro servidor
    z.querySelector('.im-arq').textContent = f ? f.name + ' (' + tamanho(f.size) + ')' : '';
    atualizarBotao();
  }

  function escolher(campo, f) {
    if (!f) return;
    var ext = (f.name.split('.').pop() || '').toLowerCase();
    if (EXTENSOES[campo].lista.indexOf(ext) < 0) {
      mensagem(EXTENSOES[campo].texto, 'erro');
      return;
    }
    if (f.size > LIMITE) {
      mensagem('Este arquivo passa de 5 MB. Envie um arquivo menor.', 'erro');
      return;
    }
    arquivos[campo] = f;
    mensagem('');
    mostrarArquivo(campo);
  }

  ['lancamentos', 'extrato'].forEach(function (campo) {
    var z = zona(campo), inp = z.nextElementSibling;
    inp.addEventListener('change', function () {
      escolher(campo, inp.files && inp.files[0]);
      inp.value = '';
    });
    z.addEventListener('dragover', function (e) { e.preventDefault(); z.classList.add('over'); });
    z.addEventListener('dragleave', function (e) { e.preventDefault(); z.classList.remove('over'); });
    z.addEventListener('drop', function (e) {
      e.preventDefault();
      z.classList.remove('over');
      escolher(campo, e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
    });
  });

  function atualizarBotao() {
    btnConferir.disabled = ocupado || !(arquivos.lancamentos && arquivos.extrato);
    btnExemplo.disabled = ocupado;
  }

  // ---------- chamada ao servidor ----------
  function mostrarSo(qual) {
    [vzInicio, vzCarregando, vzErro, resultado].forEach(function (e) { e.hidden = e !== qual; });
  }

  function rotuloBotao(botao, icone, texto) {
    botao.querySelector('i').className = icone;
    botao.querySelector('span').textContent = texto;
  }

  function trabalhar(url, corpo, qualBotao) {
    if (ocupado) return;
    ocupado = true;
    var original = {i: qualBotao.querySelector('i').className, t: qualBotao.querySelector('span').textContent};
    atualizarBotao();
    rotuloBotao(qualBotao, 'ph ph-spinner-gap girando', 'Conferindo...');
    mensagem('');
    mostrarSo(vzCarregando);
    fetch(url, {method: 'POST', body: corpo})
      .then(function (r) {
        return r.json().then(function (j) { return {ok: r.ok, status: r.status, json: j}; },
          function () { return {ok: false, status: r.status, json: {erro: 'O servidor respondeu algo que eu não entendi. Tente de novo.'}}; });
      })
      .then(function (r) {
        if (r.ok) { desenhar(r.json); return; }
        falhar(r.json.erro || 'Não deu certo. Tente de novo.', r.json.campo, r.status);
      })
      .catch(function () {
        falhar('Não consegui falar com o servidor. Confira sua internet e tente de novo.', null, 0);
      })
      .then(function () {
        ocupado = false;
        rotuloBotao(qualBotao, original.i, original.t);
        atualizarBotao();
      });
  }

  function falhar(texto, campo, status) {
    // arquivo que não deu pra ler ganha o estado próprio, com o botão Baixar modelo; o resto vira recado ao lado do botão
    if (status === 422 || status === 413) {
      vzErroTexto.textContent = texto;
      mostrarSo(vzErro);
    } else {
      mostrarSo(vzInicio);
    }
    mensagem(status === 422 || status === 413 ? '' : texto, 'erro');
  }

  btnConferir.addEventListener('click', function () {
    if (!(arquivos.lancamentos && arquivos.extrato)) return;
    var corpo = new FormData();
    corpo.append('lancamentos', arquivos.lancamentos);
    corpo.append('extrato', arquivos.extrato);
    trabalhar('/conferir/processar', corpo, btnConferir);
  });
  btnExemplo.addEventListener('click', function () {
    trabalhar('/conferir/exemplo', null, btnExemplo);
  });

  // ---------- abas ----------
  var abas = Array.prototype.slice.call(document.querySelectorAll('.cf-tab'));
  function abrirAba(nome) {
    abas.forEach(function (a) {
      var ativa = a.getAttribute('data-pane') === nome;
      a.classList.toggle('ativo', ativa);
      a.setAttribute('aria-selected', ativa ? 'true' : 'false');
      document.getElementById('pane-' + a.getAttribute('data-pane')).hidden = !ativa;
    });
  }
  abas.forEach(function (a) {
    a.addEventListener('click', function () { abrirAba(a.getAttribute('data-pane')); });
  });

  // ---------- resultado ----------
  function tabela(prefKey, titulo, colunas, linhas) {
    var cab = el('tr', null, colunas.map(function (c) {
      var th = el('th', {'data-col-key': c.key, text: c.rotulo});
      if (c.tipo) th.setAttribute('data-tipo', c.tipo);
      if (c.tipo === 'num') th.className = 'num';
      return th;
    }));
    var corpo = el('tbody', null, linhas.map(function (l) {
      var tr = el('tr');
      colunas.forEach(function (c) {
        var bruto = l[c.campo];
        var td = el('td', {text: c.mostrar ? c.mostrar(bruto, l) : (bruto == null ? '' : String(bruto))});
        if (c.tipo === 'num') td.className = 'num';
        if (c.tipo) tr.setAttribute('data-' + c.key, c.tipo === 'num' ? String(bruto == null ? 0 : bruto) : String(bruto || ''));
        tr.appendChild(td);
      });
      return tr;
    }));
    var wrap = el('div', {'class': 'tabela-wrap', 'data-pref-key': prefKey, 'data-titulo': titulo, 'data-busca-global': ''}, [
      el('div', {'class': 'tabela-scroll'}, [el('table', {'class': 'tabela'}, [el('thead', null, [cab]), corpo])])
    ]);
    return wrap;
  }

  var reais = function (v) { return BRL.format(v); };
  var data = function (v) { return v ? dataBr(v) : ''; };
  var diferenca = function (v) { return (v > 0 ? '+' : '') + BRL.format(v); };

  var COLUNAS = {
    bateu: [
      {key: 'data', campo: 'data', rotulo: 'Data', tipo: 'data', mostrar: data},
      {key: 'descricao', campo: 'descricao', rotulo: 'Lançamento'},
      {key: 'valor', campo: 'valor', rotulo: 'Valor', tipo: 'num', mostrar: reais},
      {key: 'conta', campo: 'conta', rotulo: 'Conta'},
      {key: 'banco', campo: 'data_banco', rotulo: 'Saiu no banco em', tipo: 'data', mostrar: data},
      {key: 'documento', campo: 'documento', rotulo: 'Documento'}
    ],
    diferente: [
      {key: 'data', campo: 'data', rotulo: 'Data', tipo: 'data', mostrar: data},
      {key: 'descricao', campo: 'descricao', rotulo: 'Lançamento'},
      {key: 'lancado', campo: 'valor', rotulo: 'Valor lançado', tipo: 'num', mostrar: reais},
      {key: 'nobanco', campo: 'valor_banco', rotulo: 'Valor no banco', tipo: 'num', mostrar: reais},
      {key: 'diferenca', campo: 'diferenca', rotulo: 'Diferença', tipo: 'num', mostrar: diferenca},
      {key: 'conta', campo: 'conta', rotulo: 'Conta'}
    ],
    umlado: [
      {key: 'onde', campo: 'lado', rotulo: 'Onde está', mostrar: function (v) { return v === 'banco' ? 'Só no banco' : 'Só no lançamento'; }},
      {key: 'data', campo: 'data', rotulo: 'Data', tipo: 'data', mostrar: data},
      {key: 'descricao', campo: 'descricao', rotulo: 'Descrição'},
      {key: 'valor', campo: 'valor', rotulo: 'Valor', tipo: 'num', mostrar: reais},
      {key: 'conta', campo: 'conta', rotulo: 'Conta'},
      {key: 'motivo', campo: 'motivo', rotulo: 'O que houve'}
    ]
  };
  var TITULOS = {bateu: 'Bateu', diferente: 'Valor diferente', umlado: 'Só de um lado'};

  function preencherAba(nome, linhas) {
    var pane = document.getElementById('pane-' + nome);
    var lugar = pane.querySelector('[data-lugar]');
    var vazio = pane.querySelector('[data-vazio]');
    lugar.textContent = '';
    document.getElementById('cont-' + nome).textContent = String(linhas.length);
    lugar.hidden = !linhas.length;
    vazio.hidden = linhas.length > 0;
    if (!linhas.length) return;
    var wrap = tabela('conferir_' + nome, TITULOS[nome], COLUNAS[nome], linhas);
    lugar.appendChild(wrap);
    window.TabelaAvancada.init(wrap);
  }

  function frase(r) {
    var s = r.resumo;
    if (!s.passam_pelo_banco) return 'Nenhum lançamento passa pelo banco neste arquivo.';
    var inicio = 'De ' + plural(s.passam_pelo_banco, 'lançamento que passa', 'lançamentos que passam') + ' pelo banco, ';
    var bateu = s.bateram === 1 ? '1 bateu' : s.bateram + ' bateram';
    var resto = s.precisam_de_atencao
      ? (s.precisam_de_atencao === 1 ? ' 1 item precisa' : ' ' + s.precisam_de_atencao + ' itens precisam') + ' da sua atenção.'
      : ' Nada precisa da sua atenção.';
    return inicio + bateu + '.' + resto;
  }

  function desenhar(r) {
    document.getElementById('resumoFrase').textContent = frase(r);
    var fora = r.nao_passam;
    var aviso = document.getElementById('avisoFora');
    aviso.hidden = !fora.quantidade;
    if (fora.quantidade) {
      document.getElementById('avisoForaTexto').textContent =
        plural(fora.quantidade, 'lançamento não passa', 'lançamentos não passam') + ' pelo extrato (' + BRL.format(fora.total) +
        '): cartão, caixinha ou adiantamento. Eles ficaram de fora porque o cartão aparece no banco como uma fatura só.';
    }
    preencherAba('bateu', r.bateu);
    preencherAba('diferente', r.valor_diferente);
    preencherAba('umlado', r.so_um_lado);
    abrirAba(r.valor_diferente.length ? 'diferente' : r.so_um_lado.length ? 'umlado' : 'bateu');
    mostrarSo(resultado);
    mensagem(r.origem.lancamentos === 'Dados de exemplo' ? 'Resultado com os dados de exemplo.' : '', 'ok');
  }

  atualizarBotao();
})();
