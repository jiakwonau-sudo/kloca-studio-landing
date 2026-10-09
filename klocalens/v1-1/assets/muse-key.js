/* Fills the embedded Gemini API key into stored profile if empty.
   Runs before the main bundle. Key is HTTP-referrer restricted. */
(function () {
  try {
    var KEY = "AIzaSyBoMGLjJA-M2mc6un43Sefc-sVb8QiOFLo";
    var raw = localStorage.getItem("nutrilens.profile");
    if (raw) {
      var p = JSON.parse(raw);
      if (p && !p.geminiKey) {
        p.geminiKey = KEY;
        localStorage.setItem("nutrilens.profile", JSON.stringify(p));
      }
    }
  } catch (e) {}
})();
