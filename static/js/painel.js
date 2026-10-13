// Painel do dono: contagem animada dos números, meta do mês (digitada, validada e lembrada só neste navegador).
(function () {
  'use strict';

  var BRL = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
  var NUM = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  var CHAVE = 'evhira.meta.v1';
  var MAX_META = 999999999.99;
  var reduzMovimento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var kpi = document.getElementById('kpiMeta');
  var valMeta = document.getElementById('kpiMetaVal');
  var discMeta = document.getElementById('kpiMetaDisc');
  var barra = document.getElementById('kpiMetaBarra');
  var form = document.getElementById('formMeta');
  var campo = document.getElementById('metaValor');
  var msg = document.getElementById('metaMsg');
  if (!kpi || !form || !campo) return;

  var entrou = Number(kpi.getAttribute('data-entrou')) / 100;
  var metaPadrao = Number(kpi.getAttribute('data-meta-padrao')) / 100;

  function animar(elemento, alvo, de) {
    if (reduzMovimento) { elemento.textContent = BRL.format(alvo); return; }
    var inicio = null, duracao = 800, fim = false;
    var rodada = (elemento._rodada = (elemento._rodada || 0) + 1);
    function terminar() {
      if (fim || elemento._rodada !== rodada) return;
      fim = true;
      elemento.textContent = BRL.format(alvo);
    }
    function passo(t) {
      if (fim || elemento._rodada !== rodada) return;
      if (inicio === null) inicio = t;
      var p = Math.min(1, (t - inicio) / duracao);
      var suave = 1 - Math.pow(1 - p, 3);
      elemento.textContent = BRL.format(de + (alvo - de) * suave);
      if (p < 1) requestAnimationFrame(passo);
      else terminar();
    }
    requestAnimationFrame(passo);
    // aba em segundo plano pausa a animação: este relógio garante o número final
    setTimeout(terminar, duracao + 150);
  }

  // aceita 400000, 400.000, 400.000,50, 400000,5 e R$ 400.000; devolve null se não for um valor positivo e razoável
  function lerValor(texto) {
    var t = String(texto).replace(/R\$/gi, '').replace(/\s/g, '');
    if (!t || /[^0-9.,]/.test(t)) return null;
    if (t.indexOf(',') >= 0) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    var n = Number(t);
    return n > 0 && n <= MAX_META ? n : null;
  }

  function guardada() {
    try {
      return lerValor(localStorage.getItem(CHAVE) || '');
    } catch (e) { return null; }
  }

  var atual = null;  // valor mostrado hoje no KPI, pra animar de onde estava
  function aplicar(meta, animarValor) {
    var falta = Math.max(meta - entrou, 0);
    var pct = Math.min(100, Math.round(entrou / meta * 100));
    var batida = entrou >= meta;
    kpi.classList.toggle('pos', batida);
    discMeta.textContent = batida
      ? 'Meta de ' + BRL.format(meta) + ' batida, com ' + BRL.format(entrou - meta) + ' a mais.'
      : 'Já entrou ' + pct + '% da meta de ' + BRL.format(meta) + '.';
    barra.setAttribute('aria-valuenow', String(pct));
    barra.firstElementChild.style.width = pct + '%';
    if (animarValor) animar(valMeta, falta, atual === null ? 0 : atual);
    else valMeta.textContent = BRL.format(falta);
    atual = falta;
  }

  function mostrarErro(texto) {
    campo.setAttribute('aria-invalid', 'true');
    campo.classList.add('erro');
    msg.className = 'campo-msg erro';
    msg.textContent = texto;
  }
  function limparMensagem() {
    campo.removeAttribute('aria-invalid');
    campo.classList.remove('erro');
    msg.className = 'campo-msg';
    msg.textContent = '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var n = lerValor(campo.value);
    if (n === null) {
      mostrarErro(campo.value.trim()
        ? 'Não entendi esse valor. Digite só números, por exemplo 400.000 ou 400.000,50.'
        : 'Digite a meta do mês, por exemplo 400.000.');
      campo.focus();
      return;
    }
    limparMensagem();
    campo.value = NUM.format(n);
    var lembrou = true;
    try { localStorage.setItem(CHAVE, String(n)); } catch (err) { lembrou = false; }
    aplicar(n, true);
    msg.className = 'campo-msg ok';
    msg.textContent = lembrou ? 'Meta salva neste navegador.' : 'Meta aplicada. Este navegador não deixou guardar pra próxima vez.';
  });
  campo.addEventListener('input', function () { if (campo.classList.contains('erro')) limparMensagem(); });

  // abre com a meta lembrada, ou com a de exemplo
  var inicial = guardada();
  var meta = inicial === null ? metaPadrao : inicial;
  campo.value = NUM.format(meta);
  aplicar(meta, true);

  // os outros números contam de zero até o valor
  Array.prototype.forEach.call(document.querySelectorAll('.mg-kpi .val[data-centavos]'), function (v) {
    animar(v, Number(v.getAttribute('data-centavos')) / 100, 0);
  });
})();
