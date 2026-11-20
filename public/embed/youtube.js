/* Athar video player bridge (see youtube.html).
   Messages to the app:   { source: "athar-yt", type: "ready" | "state" | "time" | "error", ... }
   Messages from the app: { source: "athar-yt-cmd", cmd, args } — playback controls only. */
(function () {
  "use strict";
  var query = new URLSearchParams(location.search);
  var id = query.get("v") || "";
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return;

  var requested = {};
  try { requested = JSON.parse(query.get("vars") || "{}") || {}; } catch (e) { requested = {}; }
  var ALLOWED_VARS = ["autoplay", "mute", "controls", "rel", "modestbranding", "playsinline", "iv_load_policy", "fs", "disablekb", "loop", "playlist", "start", "cc_load_policy"];
  var playerVars = { enablejsapi: 1, playsinline: 1, origin: location.origin };
  ALLOWED_VARS.forEach(function (key) {
    var value = requested[key];
    if (typeof value === "number" || (typeof value === "string" && /^[A-Za-z0-9_,-]{0,40}$/.test(value))) playerVars[key] = value;
  });

  var app = window.parent;
  function send(message) {
    message.source = "athar-yt";
    try { app.postMessage(message, "*"); } catch (e) { /* the app is gone */ }
  }

  var player = null;
  var timer = 0;
  function report(type) {
    if (!player || !player.getCurrentTime) return;
    send({
      type: type,
      time: player.getCurrentTime() || 0,
      duration: player.getDuration() || 0,
      state: player.getPlayerState ? player.getPlayerState() : -1,
    });
  }

  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player("player", {
      host: "https://www.youtube-nocookie.com",
      videoId: id,
      playerVars: playerVars,
      events: {
        onReady: function () {
          report("ready");
          clearInterval(timer);
          timer = setInterval(function () { report("time"); }, 500);
        },
        onStateChange: function () { report("state"); },
        onError: function (event) { send({ type: "error", code: (event && event.data) || 0 }); },
      },
    });
  };

  var COMMANDS = { playVideo: 1, pauseVideo: 1, seekTo: 1, mute: 1, unMute: 1 };
  window.addEventListener("message", function (event) {
    if (event.source !== app) return;
    var data = event.data;
    if (!data || data.source !== "athar-yt-cmd" || !COMMANDS[data.cmd] || !player || typeof player[data.cmd] !== "function") return;
    var args = Array.isArray(data.args) ? data.args.slice(0, 2).filter(function (a) { return typeof a === "number" || typeof a === "boolean"; }) : [];
    player[data.cmd].apply(player, args);
    report("state");
  });

  var script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  script.onerror = function () { send({ type: "error", code: -1 }); };
  document.head.appendChild(script);
})();
