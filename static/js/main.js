// Gaveta do menu no celular
(function () {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('overlayMob');
  var btn = document.getElementById('btnMenu');
  if (!sidebar || !btn) return;
  function alternar(abrir) {
    sidebar.classList.toggle('aberta', abrir);
    overlay.classList.toggle('visivel', abrir);
    document.body.classList.toggle('drawer-aberto', abrir);
    btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
  }
  btn.addEventListener('click', function () { alternar(!sidebar.classList.contains('aberta')); });
  overlay.addEventListener('click', function () { alternar(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') alternar(false); });
})();
