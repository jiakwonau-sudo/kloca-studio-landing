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
      '<div class="muse-icon-row">' +
        '<button class="muse-icon-btn" id="museCameraBtn" aria-label="사진 찍기">📷</button>' +
        '<button class="muse-icon-btn" id="museUploadBtn" aria-label="사진 올리기">🖼️</button>' +
        '<button class="muse-icon-btn" id="museSearchBtn" aria-label="식재료 검색">🔍</button>' +
      '</div>' +
      '<div class="muse-motto"><b>KETO / LOCARB FOR THE WIN!</b></div>' +
      '<button class="muse-collapse" id="museCollapse" aria-label="접기">▲ 접기</button>' +
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


  function addVoiceButton() {
    var searchWrap = document.querySelector('.search-wrap');
    if (!searchWrap || searchWrap.querySelector('.muse-voice-btn')) return;
    var shell = searchWrap.querySelector('.search-shell');
    if (!shell) return;

    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    var btn = document.createElement('button');
    btn.className = 'muse-voice-btn';
    btn.innerHTML = '🎤';
    btn.setAttribute('aria-label', '음성 검색');
    btn.style.cssText = 'font-size:1.3rem;padding:0.3rem 0.5rem;cursor:pointer;background:none;border:none;';

    btn.addEventListener('click', function () {
      var rec = new SR();
      rec.lang = 'ko-KR';
      rec.interimResults = false;
      btn.innerHTML = '🔴';
      rec.onresult = function (e) {
        var text = e.results[0][0].transcript;
        var input = searchWrap.querySelector('input');
        if (input) {
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          // Try to trigger search
          var form = searchWrap.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          } else {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        }
        btn.innerHTML = '🎤';
      };
      rec.onerror = function () { btn.innerHTML = '🎤'; };
      rec.onend = function () { btn.innerHTML = '🎤'; };
      rec.start();
    });

    shell.appendChild(btn);
  }


  function initCollapse(hero) {
    var btn = hero.querySelector('#museCollapse');
    var collapsed = localStorage.getItem('muse-hero-collapsed') === '1';
    function apply() {
      hero.classList.toggle('collapsed', collapsed);
      btn.textContent = collapsed ? '▼ 펼치기' : '▲ 접기';
      btn.setAttribute('aria-label', collapsed ? '펼치기' : '접기');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      collapsed = !collapsed;
      localStorage.setItem('muse-hero-collapsed', collapsed ? '1' : '0');
      apply();
    });
    apply();
  }


  function removeTodayNutrition() {
    // Completely remove from DOM, not just hide
    var selectors = ['.dash-head', '.dash-mini', '.dash-collapsed', '.dash-expand', '.dash-toggle-icon'];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.remove();
      });
    });
  }


  function fixSearchEnter() {
    var input = document.querySelector('.search-wrap input');
    if (!input || input.dataset.museEnterFixed) return;
    input.dataset.museEnterFixed = '1';
    // Enter should only trigger search display, never add food to table
    // Capture phase to intercept before app's own handlers
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        // Just blur to dismiss keyboard; results already show via live search
        input.blur();
      }
    }, true);
  }

  function inject() {
    // Logo is handled by CSS (::before avocado + ::after magnifier)
    // No JS injection needed — survives React re-renders

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
    hero.querySelector('#museSearchBtn').addEventListener('click', function () {
      var input = document.querySelector('.search-wrap input');
      if (input) {
        input.focus();
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Mark home so CSS can hide the redundant search-bar camera button
    document.body.classList.add('muse-has-hero');

    // Collapsible hero
    initCollapse(hero);

    // Remove Today Nutrition completely from home
    removeTodayNutrition();
    // Watch for React re-renders and remove again
    var obs = new MutationObserver(function () { removeTodayNutrition(); });
    obs.observe(document.body, { childList: true, subtree: true });

    // Add voice input to search
    addVoiceButton();

    // Fix Enter key on search
    fixSearchEnter();
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
