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
      '<button class="muse-collapse" id="museCollapse" aria-label="접기">▲</button>' +
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
    // Just open the scan modal - the app's own buttons handle file selection
    openScanModal();
  }

  function uploadPhoto() {
    // Just open the scan modal - the app's own buttons handle file selection
    openScanModal();
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



  function addPhotoUploadToSearch() {
    var searchWrap = document.querySelector('.search-wrap');
    if (!searchWrap || searchWrap.querySelector('.muse-photo-btn')) return;
    var shell = searchWrap.querySelector('.search-shell');
    if (!shell) return;

    var btn = document.createElement('button');
    btn.className = 'muse-photo-btn';
    btn.innerHTML = '🖼️';
    btn.setAttribute('aria-label', '사진 올리기');
    btn.style.cssText = 'font-size:1.3rem;padding:0.3rem 0.5rem;cursor:pointer;background:none;border:none;order:-1;';

    btn.addEventListener('click', function () {
      uploadPhoto();
    });

    shell.insertBefore(btn, shell.firstChild);
  }


  function updateVisibilityForTab() {
    // Disabled: was breaking React navigation (white screen)
    // Hero only injects on home anyway via search-wrap check
  }



  function initCollapse(hero) {
    var btn = hero.querySelector('#museCollapse');
    if (!btn) return;
    var collapsed = false;
    try { collapsed = localStorage.getItem('muse-hero-collapsed') === '1'; } catch (e) {}
    function apply() {
      hero.classList.toggle('collapsed', collapsed);
      document.body.classList.toggle('muse-hero-collapsed', collapsed);
      btn.textContent = collapsed ? '▼' : '▲';
      btn.setAttribute('aria-label', collapsed ? '펼치기' : '접기');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      collapsed = !collapsed;
      try { localStorage.setItem('muse-hero-collapsed', collapsed ? '1' : '0'); } catch (err) {}
      apply();
    });
    apply();
  }


  function removeTodayNutrition() {
    // Only remove dashboard from HOME (where our hero is visible)
    // Dashboard tab needs its dashboard, so don't touch it there
    var hero = document.querySelector('.muse-scan-hero');
    if (!hero || hero.style.display === 'none') return;
    // Completely remove from DOM, not just hide
    var selectors = ['.dash-head', '.dash-mini', '.dash-collapsed', '.dash-expand', '.dash-toggle-icon',
                     '.rings-core', '.rings-row', '.rings-foot'];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        // Find the parent shell/container and remove it
        var container = el.closest('.shell') || el.closest('.section') || el;
        // But don't remove if it's on dashboard tab (no hero means we're not on home)
        container.remove();
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


  function addLogoHandle() {
    var logoMark = document.querySelector('.logo-mark');
    if (logoMark && !logoMark.querySelector('.muse-handle')) {
      var handle = document.createElement('span');
      handle.className = 'muse-handle';
      logoMark.appendChild(handle);
    }
  }


  function makeFoodCollapsible() {
    // Find the Market Lens section
    var sections = document.querySelectorAll('.section');
    sections.forEach(function (sec) {
      if (sec.dataset.museFoodDone) return;
      var eyebrow = sec.querySelector('.eyebrow');
      if (!eyebrow) return;
      var text = eyebrow.textContent || '';
      if (text.indexOf('Market Lens') < 0) return;
      
      sec.dataset.museFoodDone = '1';
      
      var head = sec.querySelector('.section-head');
      if (!head) return;
      
      // Add toggle button
      var btn = document.createElement('button');
      btn.className = 'muse-section-toggle';
      btn.innerHTML = '▲';
      btn.setAttribute('aria-label', '접기');
      btn.style.cssText = 'background:none;border:none;font-size:1rem;cursor:pointer;color:var(--ink-3);padding:0.3rem;';
      
      var collapsed = false;
      try { collapsed = localStorage.getItem('muse-food-collapsed') === '1'; } catch (e) {}
      
      function apply() {
        // Hide everything except the head
        Array.from(sec.children).forEach(function (child) {
          if (child !== head) {
            child.style.display = collapsed ? 'none' : '';
          }
        });
        btn.innerHTML = collapsed ? '▼' : '▲';
        btn.setAttribute('aria-label', collapsed ? '펼치기' : '접기');
      }
      
      btn.addEventListener('click', function () {
        collapsed = !collapsed;
        try { localStorage.setItem('muse-food-collapsed', collapsed ? '1' : '0'); } catch (e) {}
        apply();
      });
      
      head.appendChild(btn);
      head.style.display = 'flex';
      head.style.justifyContent = 'space-between';
      head.style.alignItems = 'center';
      apply();
    });
  }

  function inject() {
    // Always ensure photo button on search (survives React re-renders)
    addPhotoUploadToSearch();
    // Logo: CSS avocado + transparent lens, JS adds handle
    addLogoHandle();

    // Add X close button to bottom-sheet modals (user request: must be able to exit)
    document.querySelectorAll('.sheet').forEach(function (sheet) {
      if (sheet.querySelector('.muse-close')) return;
      var head = sheet.querySelector('.sheet-head');
      if (!head) return;
      // Don't add if there's already a close button (any X, ×, ✕, or aria-label)
      var existing = head.querySelector('button');
      var hasClose = false;
      head.querySelectorAll('button').forEach(function (b) {
        var txt = (b.textContent || '').trim();
        var label = (b.getAttribute('aria-label') || '').toLowerCase();
        if (txt === '×' || txt === '✕' || txt === 'X' || label.indexOf('닫기') >= 0 || label.indexOf('close') >= 0) {
          hasClose = true;
        }
      });
      if (hasClose) return;
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

    hero.querySelector('#museFinder').addEventListener('click', takePhoto);

    // Mark home so CSS can hide the redundant search-bar camera button
    document.body.classList.add('muse-has-hero');

    // Collapsible hero
    initCollapse(hero);

    // Remove Today Nutrition and setup food collapsible
    removeTodayNutrition();
    makeFoodCollapsible();

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
    setTimeout(function () { 
      scheduled = false; 
      inject();
      // Always remove dashboard from home, independent of hero
      removeTodayNutrition();
      updateVisibilityForTab();
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  // interval removed: was breaking app
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
