/* KLoCa Lens v1-2: Split camera / gallery in scan modal.
   - Clicking the scan-drop visual area opens CAMERA (capture="environment").
   - The button becomes "사진 올리기" and opens GALLERY (no capture attr).
   Runs as a small DOM patch; does not touch React internals. */
(function () {
  function patchScanModal() {
    // Find scan modal by its title
    var titles = document.querySelectorAll('*');
    var modal = null;
    for (var k = 0; k < titles.length; k++) {
      var el = titles[k];
      if (el.textContent === '사진 · 영수증 스캔' && el.closest('[role="dialog"], .sheet, .modal')) {
        modal = el.closest('[role="dialog"], .sheet, .modal') || el.parentElement;
        break;
      }
    }
    if (!modal || modal.dataset.klocaSplitDone) return;

    var fileInput = modal.querySelector('input[type="file"][accept*="image"]');
    var scanDrop = modal.querySelector('.scan-drop');
    var btn = modal.querySelector('button.cta');
    if (!fileInput || !btn) return;

    modal.dataset.klocaSplitDone = '1';

    // 1. Create a gallery-only input (no capture attribute)
    var galleryInput = document.createElement('input');
    galleryInput.type = 'file';
    galleryInput.accept = 'image/*';
    galleryInput.hidden = true;
    // Copy the onChange behavior by dispatching to original input's handler:
    // simplest: on gallery select, set files on original input and dispatch change
    galleryInput.addEventListener('change', function () {
      if (galleryInput.files && galleryInput.files[0]) {
        // Transfer files via DataTransfer (supported on modern mobile browsers)
        try {
          var dt = new DataTransfer();
          dt.items.add(galleryInput.files[0]);
          fileInput.files = dt.files;
        } catch (e) {
          // fallback: directly assign (may not work everywhere)
        }
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      galleryInput.value = '';
    });
    modal.appendChild(galleryInput);

    // 2. Button -> gallery only, relabel to "사진 올리기"
    // Replace the button's click behavior by cloning (removes React listener safely? No -
    // cloning would break React. Instead, intercept via capture listener.)
    btn.addEventListener('click', function (e) {
      e.stopImmediatePropagation();
      e.preventDefault();
      galleryInput.click();
    }, true);

    // Relabel button text (keep the orb icon span)
    (function relabel() {
      var walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.indexOf('사진 찍기 / 선택') >= 0) {
          node.nodeValue = node.nodeValue.replace('사진 찍기 / 선택', '사진 올리기');
        } else if (node.nodeValue.indexOf('다른 사진 선택') >= 0) {
          node.nodeValue = node.nodeValue.replace('다른 사진 선택', '다른 사진 올리기');
        }
      }
    })();

    // 3. Scan-drop area -> camera (original input has capture="environment")
    if (scanDrop) {
      scanDrop.style.cursor = 'pointer';
      scanDrop.addEventListener('click', function () {
        fileInput.click();
      });
    }

    // Re-run relabel after React re-renders (button text resets on state change)
    var obs = new MutationObserver(function () { relabel(); });
    obs.observe(btn, { childList: true, subtree: true, characterData: true });
  }

  // Watch for modal open (lightweight, only scans on DOM additions)
  var obs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].addedNodes.length) { patchScanModal(); break; }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  // Also try immediately in case modal is already open
  patchScanModal();
})();
