/* KLoCa Lens API key helper.
   No embedded key: public repo keys get auto-revoked by Google.
   The user enters their own Gemini API key in the app's settings/profile.
   That key is stored in localStorage (nutrilens.profile.geminiKey)
   on their own device only. */
(function () {
  try {
    // Clear any dead/revoked key that was previously force-installed,
    // so the user's own key (entered in app settings) takes effect.
    var raw = localStorage.getItem("nutrilens.profile");
    if (raw) {
      var p = JSON.parse(raw);
      if (p.geminiKey === "AIzaSyAzb0uT6tqO5jEOKH2g9Z1H5c5s0lZx4sV") {
        delete p.geminiKey;
        localStorage.setItem("nutrilens.profile", JSON.stringify(p));
      }
    }
  } catch (e) {}
})();
