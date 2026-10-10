/* Forces the embedded Gemini API key into stored profile.
   Runs before the main bundle. Overwrites any stale key. */
(function () {
  try {
    var KEY = "AIzaSyAzb0uT6tqO5jEOKH2g9Z1H5c5s0lZx4sV";
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
