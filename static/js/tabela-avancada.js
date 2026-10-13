// TabelaAvancada: a tabela inteira mora no navegador (decisão 2A, nada vai pro servidor).
// Cabeçalho dentro do card, menu sanduíche (Filtro por coluna, Ordenar, Colunas, Exportar CSV,
// Exportar Excel, Linhas por página), ordenação pelo título, paginação no navegador.
// Preferências (colunas, ordem, linhas por página) ficam no localStorage. Sem alert, confirm nem prompt.
//
// Markup que ela lê:
//   <div class="tabela-wrap" data-tabela data-pref-key="proximas_contas" data-titulo="Próximas contas"
//        data-busca-global>
//     <div class="tabela-scroll"><table class="tabela">
//       <thead><tr><th data-col-key="valor" data-tipo="num">Valor</th> ...</tr></thead>
//       <tbody><tr data-valor="1234.50" data-busca="texto livre"><td>R$ 1.234,50</td> ...</tr></tbody>
//     </table></div>
//   </div>
// data-tipo: texto (padrão), num (ordena e exporta como número) ou data (valor cru em AAAA-MM-DD).
// Coluna sem data-col-key (ex.: ações) nunca filtra, nunca ordena e nunca esconde.
// escada: ordenação, filtro e paginação rodam no navegador; passando de ~2.000 linhas ou entrando banco, mover pro servidor
(function (glb) {
  'use strict';

  var TAMANHOS = [10, 25, 50, 100];
  var PADRAO = 10;
  var MAX_ORDEM = 3;

  function el(tag, attrs, filhos) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (filhos || []).forEach(function (f) { if (f) e.appendChild(f); });
    return e;
  }
  function icone(classe) { return el('i', {'class': classe, 'aria-hidden': 'true'}); }

  function normalizar(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function plural(n, um, varios) { return n + ' ' + (n === 1 ? um : varios); }

  function lerPref(chave) {
    try {
      var bruto = localStorage.getItem('evhira.tabela.' + chave);
      var p = bruto ? JSON.parse(bruto) : {};
      return p && typeof p === 'object' ? p : {};
    } catch (e) { return {}; }
  }
  function gravarPref(chave, valor) {
    try { localStorage.setItem('evhira.tabela.' + chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento: segue sem lembrar */ }
  }

  // ---------- exportação ----------
  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function baixar(nome, partes, mime) {
    var url = URL.createObjectURL(new Blob(partes, {type: mime}));
    var a = el('a', {href: url, download: nome});
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
  }
  // célula de texto que começa com = + - @ vira fórmula no Excel; o apóstrofo segura
  function seguroParaPlanilha(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
  function celulaCsv(c) {
    var v = c.num ? String(c.v).replace('.', ',') : seguroParaPlanilha(c.v);
    return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  var TABELA_CRC = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = TABELA_CRC[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  // zip sem compressão (método 0): o Excel abre normalmente
  function zipar(arquivos) {
    var enc = new TextEncoder(), locais = [], centrais = [], pos = 0, d = new Date();
    var hora = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var data = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    function u16(v) { return [v & 255, (v >>> 8) & 255]; }
    function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    arquivos.forEach(function (a) {
      var nome = enc.encode(a.nome), corpo = enc.encode(a.conteudo), crc = crc32(corpo);
      var campos = [].concat(u16(20), u16(0x0800), u16(0), u16(hora), u16(data), u32(crc), u32(corpo.length), u32(corpo.length), u16(nome.length), u16(0));
      locais.push(new Uint8Array([0x50, 0x4B, 3, 4].concat(campos)), nome, corpo);
      centrais.push(new Uint8Array([0x50, 0x4B, 1, 2].concat(u16(20), campos, u16(0), u16(0), u16(0), u32(0), u32(pos))), nome);
      pos += 30 + nome.length + corpo.length;
    });
    var tamanhoCentral = centrais.reduce(function (s, p) { return s + p.length; }, 0);
    var fim = new Uint8Array([0x50, 0x4B, 5, 6, 0, 0, 0, 0].concat(u16(arquivos.length), u16(arquivos.length), u32(tamanhoCentral), u32(pos), u16(0)));
    return locais.concat(centrais, [fim]);
  }
  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
  function letraColuna(i) {
    var s = '';
    for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
  }
  // escada: planilha simples, sem estilos nem larguras; negrito e largura de coluna entram se alguém pedir
  function montarXlsx(cabecalho, linhas) {
    var NS = 'http://schemas.openxmlformats.org/';
    var todas = [cabecalho.map(function (t) { return {v: t, num: false}; })].concat(linhas);
    var xmlLinhas = todas.map(function (linha, r) {
      return '<row r="' + (r + 1) + '">' + linha.map(function (c, i) {
        var ref = letraColuna(i) + (r + 1);
        if (c.num && isFinite(Number(c.v)) && c.v !== '') return '<c r="' + ref + '"><v>' + Number(c.v) + '</v></c>';
        return '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + escXml(seguroParaPlanilha(String(c.v))) + '</t></is></c>';
      }).join('') + '</row>';
    }).join('');
    var cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    return zipar([
      {nome: '[Content_Types].xml', conteudo: cab + '<Types xmlns="' + NS + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'},
      {nome: '_rels/.rels', conteudo: cab + '<Relationships xmlns="' + NS + 'package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
      {nome: 'xl/workbook.xml', conteudo: cab + '<workbook xmlns="' + NS + 'spreadsheetml/2006/main" xmlns:r="' + NS + 'officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>'},
      {nome: 'xl/_rels/workbook.xml.rels', conteudo: cab + '<Relationships xmlns="' + NS + 'package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'},
      {nome: 'xl/worksheets/sheet1.xml', conteudo: cab + '<worksheet xmlns="' + NS + 'spreadsheetml/2006/main"><sheetData>' + xmlLinhas + '</sheetData></worksheet>'}
    ]);
  }

  // ---------- componente ----------
  function TabelaAvancada() {}

  TabelaAvancada.init = function (wrap, opts) {
    opts = opts || {};
    var prefKey = opts.prefKey || wrap.getAttribute('data-pref-key') || 'tabela';
    var titulo = opts.titulo || wrap.getAttribute('data-titulo') || 'Registros';
    var scroll = wrap.querySelector('.tabela-scroll');
    var tabela = scroll && scroll.querySelector('table');
    var thead = tabela && tabela.tHead;
    var tbody = tabela && tabela.tBodies[0];
    if (!tabela || !thead || !tbody) return;
    if (wrap.getAttribute('data-pronta') === '1') return;
    wrap.setAttribute('data-pronta', '1');

    var ths = Array.prototype.slice.call(thead.rows[0].cells);
    var linhasDom = Array.prototype.slice.call(tbody.rows);
    var linhas = linhasDom.map(function (tr, pos) {
      var cels = Array.prototype.slice.call(tr.cells).map(function (td) { return td.textContent.trim(); });
      return {tr: tr, pos: pos, cels: cels, norm: cels.map(normalizar), busca: normalizar(tr.getAttribute('data-busca') || cels.join(' '))};
    });
    var colunas = [];
    ths.forEach(function (th, i) {
      var key = th.getAttribute('data-col-key');
      if (!key) return;
      var filtro = th.getAttribute('data-col-filtro');
      colunas.push({
        i: i, key: key, th: th, label: th.textContent.trim(), tipo: th.getAttribute('data-tipo') || 'texto',
        filtravel: filtro === 'sim' || (filtro !== 'nao' && linhas.some(function (l) { return l.cels[i]; }))
      });
    });
    function colPorKey(k) { for (var n = 0; n < colunas.length; n++) if (colunas[n].key === k) return colunas[n]; return null; }

    var pref = lerPref(prefKey);
    var estado = {
      pagina: 0,
      porPagina: TAMANHOS.indexOf(pref.porPagina) >= 0 ? pref.porPagina : PADRAO,
      ocultas: {},
      ordem: [],
      filtroAberto: false,
      filtros: {},
      busca: ''
    };
    if (pref.ocultas && typeof pref.ocultas === 'object') {
      colunas.forEach(function (c) { if (pref.ocultas[c.key] === true) estado.ocultas[c.key] = true; });
      if (colunas.every(function (c) { return estado.ocultas[c.key]; })) estado.ocultas = {};
    }
    if (Array.isArray(pref.ordem)) {
      pref.ordem.slice(0, MAX_ORDEM).forEach(function (o) {
        if (o && colPorKey(o.key) && (o.dir === 'asc' || o.dir === 'desc')) estado.ordem.push({key: o.key, dir: o.dir});
      });
    }
    function persistir() {
      gravarPref(prefKey, {porPagina: estado.porPagina, ocultas: estado.ocultas, ordem: estado.ordem});
    }

    // --- cabeçalho do card ---
    var tabInfo = el('span', {'class': 'tabela-info', hidden: 'hidden', 'aria-live': 'polite'});
    var campoBusca = null;
    if (wrap.hasAttribute('data-busca-global')) {
      campoBusca = el('input', {'class': 'tabela-busca', type: 'search', placeholder: 'buscar', autocomplete: 'off', 'aria-label': 'Buscar em ' + titulo});
    }
    var btnMenu = el('button', {type: 'button', 'class': 'btn-tab-menu', 'aria-label': 'Menu da tabela', 'aria-haspopup': 'menu', 'aria-expanded': 'false'},
      [el('i', {'class': 'ph-bold ph-list', 'aria-hidden': 'true'})]);
    var menu = el('div', {'class': 'tab-menu', role: 'menu', hidden: 'hidden'});
    var itensMenu = {};
    function item(acao, rotulo, ic) {
      var b = el('button', {type: 'button', 'class': 'tab-menu-item', role: 'menuitem', 'data-acao': acao}, [icone('ph ' + ic), el('span', {text: rotulo})]);
      itensMenu[acao] = b;
      menu.appendChild(b);
    }
    function sep() { menu.appendChild(el('div', {'class': 'tab-menu-sep', role: 'separator'})); }
    item('filtro', 'Filtro por coluna', 'ph-funnel');
    item('ordenar', 'Ordenar', 'ph-arrows-down-up');
    item('colunas', 'Colunas', 'ph-columns');
    sep();
    item('csv', 'Exportar CSV', 'ph-file-csv');
    item('excel', 'Exportar Excel', 'ph-file-xls');
    sep();
    item('linhas', 'Linhas por página', 'ph-list-numbers');

    var popups = {
      ordenar: el('div', {'class': 'tab-popup', hidden: 'hidden', role: 'dialog', 'aria-label': 'Ordenar'}),
      colunas: el('div', {'class': 'tab-popup', hidden: 'hidden', role: 'dialog', 'aria-label': 'Colunas'}),
      linhas: el('div', {'class': 'tab-popup', hidden: 'hidden', role: 'dialog', 'aria-label': 'Linhas por página'})
    };
    var menuWrap = el('div', {'class': 'tab-menu-wrap'}, [btnMenu, menu, popups.ordenar, popups.colunas, popups.linhas]);
    var cab = el('div', {'class': 'tabela-cab'}, [
      el('div', {'class': 'tabela-titulo', text: titulo}), tabInfo,
      el('div', {'class': 'tabela-acoes'}, [campoBusca, menuWrap])
    ]);
    wrap.insertBefore(cab, scroll);

    // --- rodapé: contagem à esquerda, controles no centro (com hidden próprio) ---
    var rodInfo = el('span', {'class': 'oc-pag-info'});
    var rodNav = el('div', {'class': 'oc-pag-nav', hidden: 'hidden'});
    var rodape = el('div', {'class': 'oc-pag'}, [rodInfo, rodNav, el('span')]);
    wrap.appendChild(rodape);

    // --- linha de filtros dentro do thead (nasce fechada) ---
    var linhaFiltro = el('tr', {'class': 'th-filtro', hidden: 'hidden'});
    ths.forEach(function (th, i) {
      var col = null;
      colunas.forEach(function (c) { if (c.i === i) col = c; });
      var cel = el('th', {'class': th.className});
      if (col && col.filtravel) {
        var inp = el('input', {type: 'text', 'class': 'th-filtro-campo', placeholder: 'filtrar', autocomplete: 'off', 'aria-label': 'Filtrar ' + col.label, 'data-th-filtro': col.key});
        inp.addEventListener('input', function () {
          if (inp.value) estado.filtros[col.key] = normalizar(inp.value); else delete estado.filtros[col.key];
          estado.pagina = 0;
          desenhar();
        });
        cel.appendChild(inp);
      }
      linhaFiltro.appendChild(cel);
    });
    thead.appendChild(linhaFiltro);

    // --- título clicável ordena (Shift soma uma segunda e terceira coluna) ---
    colunas.forEach(function (c) {
      c.th.classList.add('ordenavel');
      c.th.setAttribute('tabindex', '0');
      var seta = el('span', {'class': 'th-seta', 'aria-hidden': 'true'});
      c.th.appendChild(seta);
      c.seta = seta;
      function acionar(e) { alternarOrdem(c.key, e.shiftKey); }
      c.th.addEventListener('click', acionar);
      c.th.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acionar(e); }
      });
    });
    function alternarOrdem(key, somar) {
      var atual = null, resto = [];
      estado.ordem.forEach(function (o) { if (o.key === key) atual = o; else resto.push(o); });
      var proxima = !atual ? 'asc' : atual.dir === 'asc' ? 'desc' : null;
      if (somar) {
        if (!atual && resto.length < MAX_ORDEM) estado.ordem = resto.concat({key: key, dir: 'asc'});
        else if (atual && proxima) atual.dir = proxima;
        else if (atual) estado.ordem = resto;
      } else {
        estado.ordem = proxima ? [{key: key, dir: proxima}] : [];
      }
      estado.pagina = 0;
      persistir();
      desenhar();
    }

    // --- ordenar e filtrar ---
    function valorDe(l, c) {
      var cru = l.tr.getAttribute('data-' + c.key);
      return cru == null ? l.cels[c.i] : cru;
    }
    function comparar(a, b) {
      for (var n = 0; n < estado.ordem.length; n++) {
        var o = estado.ordem[n], c = colPorKey(o.key), va = valorDe(a, c), vb = valorDe(b, c), r;
        if (c.tipo === 'num') r = (parseFloat(va) || 0) - (parseFloat(vb) || 0);
        else if (c.tipo === 'data') r = va < vb ? -1 : va > vb ? 1 : 0;
        else r = String(va).localeCompare(String(vb), 'pt-BR', {sensitivity: 'base', numeric: true});
        if (r) return o.dir === 'desc' ? -r : r;
      }
      return a.pos - b.pos;
    }
    function filtradas() {
      var chaves = Object.keys(estado.filtros);
      return linhas.filter(function (l) {
        if (estado.busca && l.busca.indexOf(estado.busca) < 0) return false;
        return chaves.every(function (k) { return l.norm[colPorKey(k).i].indexOf(estado.filtros[k]) >= 0; });
      }).sort(comparar);
    }

    var vazio = null;
    function desenhar() {
      var vis = filtradas();
      var total = vis.length;
      var paginas = Math.max(1, Math.ceil(total / estado.porPagina));
      if (estado.pagina >= paginas) estado.pagina = paginas - 1;
      var ini = estado.pagina * estado.porPagina, fim = Math.min(ini + estado.porPagina, total);

      var naPagina = {};
      vis.slice(ini, fim).forEach(function (l) { naPagina[l.pos] = true; });
      var frag = document.createDocumentFragment();
      var emVis = {};
      vis.forEach(function (l) { emVis[l.pos] = true; });
      vis.concat(linhas.filter(function (l) { return !emVis[l.pos]; })).forEach(function (l) {
        l.tr.hidden = !naPagina[l.pos];
        frag.appendChild(l.tr);
      });
      tbody.appendChild(frag);
      if (vazio) { vazio.remove(); vazio = null; }
      if (!total) {
        vazio = el('tr', {'class': 'tabela-vazia'}, [el('td', {colspan: String(ths.length), text: 'Nenhuma linha com esse filtro. Limpe os campos ou a busca pra ver tudo.'})]);
        tbody.appendChild(vazio);
      }

      colunas.forEach(function (c) {
        var some = estado.ocultas[c.key] ? 'none' : '';
        c.th.style.display = some;
        linhaFiltro.cells[c.i].style.display = some;
        linhas.forEach(function (l) { l.tr.cells[c.i].style.display = some; });
        var pos = -1;
        estado.ordem.forEach(function (o, n) { if (o.key === c.key) pos = n; });
        c.seta.textContent = pos < 0 ? '' : (estado.ordem[pos].dir === 'asc' ? '▲' : '▼') + (estado.ordem.length > 1 ? String(pos + 1) : '');
        c.th.setAttribute('aria-sort', pos < 0 ? 'none' : estado.ordem[pos].dir === 'asc' ? 'ascending' : 'descending');
      });
      if (vazio) vazio.cells[0].colSpan = Math.max(1, ths.length - Object.keys(estado.ocultas).length);

      var filtrando = !!(estado.busca || Object.keys(estado.filtros).length);
      tabInfo.hidden = !filtrando;
      tabInfo.textContent = filtrando ? total + ' de ' + plural(linhas.length, 'registro', 'registros') : '';
      rodInfo.textContent = total ? 'Mostrando ' + (ini + 1) + ' a ' + fim + ' de ' + plural(total, 'registro', 'registros') : 'Nenhum registro';
      desenharNav(paginas);
      itensMenu.filtro.classList.toggle('ativo', estado.filtroAberto);
      linhaFiltro.hidden = !estado.filtroAberto;
    }
    function desenharNav(paginas) {
      rodNav.hidden = paginas <= 1;
      rodNav.textContent = '';
      if (paginas <= 1) return;
      function botao(rotulo, aria, alvo) {
        var b = el('button', {type: 'button', 'class': 'oc-pg', 'aria-label': aria, text: rotulo});
        b.disabled = alvo === estado.pagina;
        b.addEventListener('click', function () { estado.pagina = alvo; desenhar(); });
        return b;
      }
      rodNav.appendChild(botao('«', 'Primeira página', 0));
      rodNav.appendChild(botao('‹', 'Página anterior', Math.max(0, estado.pagina - 1)));
      rodNav.appendChild(el('span', {'class': 'oc-pag-pos', text: 'Página ' + (estado.pagina + 1) + ' de ' + paginas}));
      rodNav.appendChild(botao('›', 'Próxima página', Math.min(paginas - 1, estado.pagina + 1)));
      rodNav.appendChild(botao('»', 'Última página', paginas - 1));
    }

    // --- popups ---
    function fecharPopups() {
      Object.keys(popups).forEach(function (k) { popups[k].hidden = true; });
    }
    function fecharTudo() {
      menu.hidden = true;
      fecharPopups();
      btnMenu.setAttribute('aria-expanded', 'false');
    }
    function cabPopup(ic, texto) {
      return el('div', {'class': 'tab-popup-cab'}, [icone('ph ' + ic), el('span', {text: texto})]);
    }
    function rodapePopup(botoes) {
      return el('div', {'class': 'tab-popup-rodape'}, botoes);
    }
    function botaoTexto(texto, aoClicar, primario) {
      var b = el('button', {type: 'button', 'class': 'tab-btn' + (primario ? ' tab-btn-primario' : ''), text: texto});
      b.addEventListener('click', aoClicar);
      return b;
    }
    function montarOrdenar() {
      var p = popups.ordenar;
      p.textContent = '';
      p.appendChild(cabPopup('ph-arrows-down-up', 'Ordenar'));
      p.appendChild(el('p', {'class': 'tab-popup-dica', text: 'Toque numa coluna pra ordenar. Toque de novo pra inverter ou tirar. Dá pra combinar até 3.'}));
      var lista = el('div', {'class': 'tab-popup-lista'});
      colunas.forEach(function (c) {
        var pos = -1;
        estado.ordem.forEach(function (o, n) { if (o.key === c.key) pos = n; });
        var estadoTxt = pos < 0 ? 'sem ordem' : estado.ordem[pos].dir === 'asc' ? 'crescente' : 'decrescente';
        var b = el('button', {type: 'button', 'class': 'tab-opcao' + (pos >= 0 ? ' ativo' : ''), 'aria-label': c.label + ', ' + estadoTxt}, [
          el('span', {'class': 'tab-opcao-nome', text: c.label}),
          el('span', {'class': 'tab-opcao-estado', text: pos < 0 ? '' : (estado.ordem[pos].dir === 'asc' ? '▲ crescente' : '▼ decrescente') + (estado.ordem.length > 1 ? ' (' + (pos + 1) + ')' : '')})
        ]);
        b.addEventListener('click', function () { alternarOrdem(c.key, true); montarOrdenar(); });
        lista.appendChild(b);
      });
      p.appendChild(lista);
      p.appendChild(rodapePopup([
        botaoTexto('Limpar ordem', function () { estado.ordem = []; persistir(); desenhar(); montarOrdenar(); }),
        botaoTexto('Fechar', fecharTudo, true)
      ]));
    }
    function montarColunas() {
      var p = popups.colunas;
      p.textContent = '';
      p.appendChild(cabPopup('ph-columns', 'Colunas'));
      var lista = el('div', {'class': 'tab-popup-lista'});
      colunas.forEach(function (c) {
        var cx = el('input', {type: 'checkbox'});
        cx.checked = !estado.ocultas[c.key];
        cx.addEventListener('change', function () {
          if (!cx.checked && colunas.filter(function (o) { return !estado.ocultas[o.key]; }).length <= 1) { cx.checked = true; return; }
          if (cx.checked) delete estado.ocultas[c.key]; else estado.ocultas[c.key] = true;
          persistir();
          desenhar();
        });
        lista.appendChild(el('label', {'class': 'tab-opcao tab-check'}, [cx, el('span', {'class': 'tab-opcao-nome', text: c.label})]));
      });
      p.appendChild(lista);
      p.appendChild(rodapePopup([
        botaoTexto('Mostrar todas', function () { estado.ocultas = {}; persistir(); desenhar(); montarColunas(); }),
        botaoTexto('Fechar', fecharTudo, true)
      ]));
    }
    function montarLinhas() {
      var p = popups.linhas;
      p.textContent = '';
      p.appendChild(cabPopup('ph-list-numbers', 'Linhas por página'));
      var lista = el('div', {'class': 'tab-popup-lista'});
      TAMANHOS.forEach(function (n) {
        var b = el('button', {type: 'button', 'class': 'tab-opcao' + (n === estado.porPagina ? ' ativo' : ''), 'aria-pressed': n === estado.porPagina ? 'true' : 'false'}, [
          el('span', {'class': 'tab-opcao-nome', text: n + ' linhas'})
        ]);
        b.addEventListener('click', function () {
          estado.porPagina = n; estado.pagina = 0; persistir(); desenhar(); fecharTudo(); btnMenu.focus();
        });
        lista.appendChild(b);
      });
      p.appendChild(lista);
    }

    // --- exportar (as linhas que sobraram do filtro, na ordem da tela, só as colunas visíveis) ---
    function paraExportar() {
      var cols = colunas.filter(function (c) { return !estado.ocultas[c.key]; });
      return {
        cabecalho: cols.map(function (c) { return c.label; }),
        linhas: filtradas().map(function (l) {
          return cols.map(function (c) {
            return c.tipo === 'num' ? {v: valorDe(l, c), num: true} : {v: l.cels[c.i], num: false};
          });
        })
      };
    }
    function exportarCsv() {
      var d = paraExportar();
      var linhasTxt = [d.cabecalho.map(function (t) { return celulaCsv({v: t, num: false}); }).join(';')].concat(
        d.linhas.map(function (l) { return l.map(celulaCsv).join(';'); }));
      baixar(prefKey + '_' + hoje() + '.csv', ['﻿', linhasTxt.join('\r\n')], 'text/csv;charset=utf-8');
    }
    function exportarExcel() {
      var d = paraExportar();
      baixar(prefKey + '_' + hoje() + '.xlsx', montarXlsx(d.cabecalho, d.linhas),
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    // --- eventos do menu ---
    btnMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var abrir = menu.hidden && Object.keys(popups).every(function (k) { return popups[k].hidden; });
      fecharTudo();
      menu.hidden = !abrir;
      btnMenu.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-acao]');
      if (!b) return;
      var acao = b.getAttribute('data-acao');
      menu.hidden = true;
      if (acao === 'csv') { fecharTudo(); return exportarCsv(); }
      if (acao === 'excel') { fecharTudo(); return exportarExcel(); }
      if (acao === 'filtro') {
        estado.filtroAberto = !estado.filtroAberto;
        if (!estado.filtroAberto) {
          estado.filtros = {};
          Array.prototype.forEach.call(linhaFiltro.querySelectorAll('input'), function (i) { i.value = ''; });
        }
        estado.pagina = 0;
        fecharTudo();
        desenhar();
        if (estado.filtroAberto) { var primeiro = linhaFiltro.querySelector('input'); if (primeiro) primeiro.focus(); }
        return;
      }
      if (acao === 'ordenar') montarOrdenar();
      if (acao === 'colunas') montarColunas();
      if (acao === 'linhas') montarLinhas();
      popups[acao].hidden = false;
    });
    // composedPath vale mesmo quando o botão clicado já saiu do DOM (os popups se remontam a cada clique)
    document.addEventListener('click', function (e) { if (e.composedPath().indexOf(menuWrap) < 0) fecharTudo(); });
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && (!menu.hidden || !popups.ordenar.hidden || !popups.colunas.hidden || !popups.linhas.hidden)) {
        fecharTudo();
        btnMenu.focus();
      }
    });
    if (campoBusca) {
      campoBusca.addEventListener('input', function () {
        estado.busca = normalizar(campoBusca.value.trim());
        estado.pagina = 0;
        desenhar();
      });
    }

    desenhar();
  };

  TabelaAvancada.autoInit = function () {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tabela]'), function (w) { TabelaAvancada.init(w); });
  };

  glb.TabelaAvancada = TabelaAvancada;
  if (document.readyState !== 'loading') TabelaAvancada.autoInit();
  else document.addEventListener('DOMContentLoaded', TabelaAvancada.autoInit);
})(window);
