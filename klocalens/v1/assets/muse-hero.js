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
        '<div class="muse-finder-hint">접시 · 영수증 · 바코드 모두 OK</div>' +
      '</div>' +
      '<div class="muse-scan-row">' +
        '<button class="muse-bigcta" id="museCameraBtn">📷 사진 찍기</button>' +
        '<button class="muse-bigcta muse-upload" id="museUploadBtn">🖼️ 사진 올리기</button>' +
      '</div>' +
      '<div class="muse-motto"><b>KETO / LOCARB FOR THE WIN!</b></div>' +
    '</div>';

  function openScanModal() {
    var btn = document.querySelector('.search-wrap .cam-btn') || document.querySelector('.cam-btn');
    if (btn) { btn.click(); return true; }
    return false;
  }

  function forwardFileToScan(file, useCapture) {
    // Open scan modal first, then forward the file
    if (!openScanModal()) return;
    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      var sheet = document.querySelector('.sheet');
      var appInput = sheet && sheet.querySelector('input[type="file"]');
      if (appInput) {
        clearInterval(timer);
        var dt = new DataTransfer();
        dt.items.add(file);
        appInput.files = dt.files;
        appInput.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (tries > 20) {
        clearInterval(timer);
      }
    }, 250);
  }

  function takePhoto() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) forwardFileToScan(file, true);
    };
    input.click();
  }

  function uploadPhoto() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) forwardFileToScan(file, false);
    };
    input.click();
  }

  function inject() {
    // Replace logo-mark with new avocado+lens logo (once)
    var logoMark = document.querySelector('.logo-mark');
    if (logoMark && !logoMark.querySelector('img.muse-logo')) {
      logoMark.innerHTML = '<img class="muse-logo" src="assets/logo-lens.webp" alt="KLoCa Lens">';
    }

    // Add X close button to bottom-sheet modals (user request: must be able to exit)
    document.querySelectorAll('.sheet').forEach(function (sheet) {
      if (sheet.querySelector('.muse-close')) return;
      var head = sheet.querySelector('.sheet-head');
      if (!head) return;
      var btn = document.createElement('button');
      btn.className = 'icon-btn muse-close';
      btn.setAttribute('aria-label', '닫기');
      btn.textContent = '✕';
      btn.addEventListener('click', function () {
        var backdrop = document.querySelector('.sheet-backdrop');
        if (backdrop) backdrop.click();
      });
      head.appendChild(btn);
    });

    // Add gallery upload button to scan modal (user request: need album option)
    document.querySelectorAll('.sheet').forEach(function (sheet) {
      if (sheet.querySelector('.muse-gallery-btn')) return;
      var cta = sheet.querySelector('.cta');
      if (!cta || !sheet.querySelector('input[type="file"]')) return;
      var galleryBtn = document.createElement('button');
      galleryBtn.className = 'cta muse-gallery-btn';
      galleryBtn.style.marginTop = '0.5rem';
      galleryBtn.textContent = '🖼️ 앨범에서 선택';
      galleryBtn.addEventListener('click', function () {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          var appInput = sheet.querySelector('input[type="file"]');
          if (appInput) {
            var dt = new DataTransfer();
            dt.items.add(file);
            appInput.files = dt.files;
            var evt = new Event('change', { bubbles: true });
            appInput.dispatchEvent(evt);
          }
        };
        input.click();
      });
      cta.parentNode.insertBefore(galleryBtn, cta.nextSibling);
    });

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

    hero.querySelector('#museCameraBtn').addEventListener('click', takePhoto);
    hero.querySelector('#museUploadBtn').addEventListener('click', uploadPhoto);
    hero.querySelector('#museFinder').addEventListener('click', takePhoto);
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
