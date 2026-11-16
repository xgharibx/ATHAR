/* Athar return link: opt-in OS app opening from a real user click.
   Never redirect someone who only opens the feedback form. */
(function () {
  "use strict";
  const play = "https://play.google.com/store/apps/details?id=com.athar.adhkar";
  const appStore = "https://apps.apple.com/eg/app/athar-%D8%A3%D8%AB%D8%B1/id6832864610";
  const androidIntent = "intent://open/#Intent;scheme=app.athar;package=com.athar.adhkar;S.browser_fallback_url=" +
    encodeURIComponent(play) + ";end";
  const agent = navigator.userAgent || "";
  const isAndroid = /Android/i.test(agent);
  const isIos = /iPhone|iPad|iPod/i.test(agent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  document.querySelectorAll("[data-af-return]").forEach(function (link) {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (isAndroid) {
      // The native Android release must support app.athar://open (new intent filter).
      // Chrome will use browser_fallback_url when the app cannot handle this URI.
      link.href = androidIntent;
      return;
    }
    if (isIos) {
      link.href = "app.athar://open";
      link.addEventListener("click", function (event) {
        event.preventDefault();
        let leftPage = false;
        const onVisibility = function () {
          if (document.hidden) leftPage = true;
        };
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pagehide", onVisibility, { once: true });
        window.location.href = "app.athar://open";
        window.setTimeout(function () {
          document.removeEventListener("visibilitychange", onVisibility);
          if (!leftPage && document.visibilityState === "visible") {
            window.location.href = appStore;
          }
        }, 1600);
      });
    }
  });
})();