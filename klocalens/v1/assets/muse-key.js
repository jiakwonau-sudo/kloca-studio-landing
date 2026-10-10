/* Forces the embedded Gemini API key into stored profile.
   Runs before the main bundle. Overwrites any stale key. */
(function () {
  try {
    var KEY = "AQ.Ab8RN6LBR7PfcpIcpfDWfGfvwCoHeFOZVng1wJrX8MvPBINHqw";
    function forceKey() {
      try {
        var raw = localStorage.getItem("nutrilens.profile");
        var p = raw ? JSON.parse(raw) : {};
        // Always overwrite with the current deployed key
        if (p.geminiKey !== KEY) {
          p.geminiKey = KEY;
          localStorage.setItem("nutrilens.profile", JSON.stringify(p));
        }
      } catch (e) {}
    }
    forceKey();
    setTimeout(forceKey, 1000);
    setTimeout(forceKey, 3000);
  } catch (e) {}
})();
