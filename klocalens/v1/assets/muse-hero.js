/* KLoCa Lens muse/ — scan-first hero injection.
   Injects the pretty scan hero at the top of the home view.
   Clicking it forwards to the app's real scan modal (.cam-btn).
   No app logic touched. */
(function () {
  var HERO_HTML =
    '<div class="muse-scan-hero">' +
      '<div class="muse-finder" id="museFinder" role="button" aria-label="사진으로 검색">' +
        '<div class="muse-corner c1"></div>' +
        '<div class="muse-corner c2"></div>' +
        '<div class="muse-corner c3"></div>' +
        '<div class="muse-corner c4"></div>' +
        '<div class="muse-scanline"></div>' +
        '<div class="muse-finder-emoji">🥑</div>' +
        '<div class="muse-finder-hint">찍어서 바로 검색</div>' +
      '</div>' +
      '<button class="muse-bigcta" id="museBigCta">📷 사진 찍기' +
        '<small>접시 · 영수증 · 바코드 모두 OK</small>' +
      '</button>' +
      '<div class="muse-motto"><b>KETO / LOCARB FOR THE WIN!</b></div>' +
    '</div>';

  function openScan() {
    var btn = document.querySelector('.search-wrap .cam-btn') || document.querySelector('.cam-btn');
    if (btn) { btn.click(); }
  }

  function inject() {
    // Replace logo-mark with new avocado+lens logo (once)
    var logoMark = document.querySelector('.logo-mark');
    if (logoMark && !logoMark.querySelector('img.muse-logo')) {
      logoMark.innerHTML = '<img class="muse-logo" src="assets/logo-lens.webp" alt="KLoCa Lens">';
    }

    // Only on home: search-wrap exists and hero not yet injected
    var wrap = document.querySelector('.search-wrap');
    if (!wrap) return;
    if (document.querySelector('.muse-scan-hero')) return;
    // Don't inject inside modals/sheets
    if (wrap.closest('.sheet') || wrap.closest('[role="dialog"]')) return;

    var tmp = document.createElement('div');
    tmp.innerHTML = HERO_HTML;
    var hero = tmp.firstElementChild;
    wrap.parentNode.insertBefore(hero, wrap);

    hero.querySelector('#museBigCta').addEventListener('click', openScan);
    hero.querySelector('#museFinder').addEventListener('click', openScan);
  }

  // SPA navigation: re-check on DOM changes (throttled)
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; inject(); }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
