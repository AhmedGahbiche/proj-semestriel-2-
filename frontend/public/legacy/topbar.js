(function () {
  var STYLE_ID = "legacy-theme-style";
  var ALERT_STYLE_ID = "legacy-alert-style";
  var THEME_KEY = "legacy-theme";
  var NOTIF_KEY = "legacy-notifications";
  var MAX_NOTIFICATIONS = 30;

  var ensureThemeStyle = function () {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      "html.legacy-light { color-scheme: light; }",
      "html.legacy-light body { filter: invert(1) hue-rotate(180deg); }",
      "html.legacy-light img, html.legacy-light video, html.legacy-light svg { filter: invert(1) hue-rotate(180deg); }",
      ".legacy-topbar-notification-panel { position: fixed; top: 70px; right: 16px; width: 340px; max-height: 420px; overflow: auto; background: rgba(19,27,46,0.98); border: 1px solid rgba(173,198,255,0.2); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,0.45); z-index: 9999; }",
      ".legacy-topbar-notification-panel[hidden] { display: none; }",
      ".legacy-notif-header { display:flex; align-items:center; justify-content:space-between; padding: 12px 14px; border-bottom: 1px solid rgba(173,198,255,0.12); }",
      ".legacy-notif-list { list-style:none; margin:0; padding: 8px; display:flex; flex-direction:column; gap:8px; }",
      ".legacy-notif-item { background: rgba(45,52,73,0.65); border: 1px solid rgba(173,198,255,0.08); border-radius:10px; padding: 10px; }",
      ".legacy-notif-item.unread { border-color: rgba(173,198,255,0.35); }",
      ".legacy-notif-title { color:#dae2fd; font-size:13px; font-weight:700; margin:0 0 4px 0; }",
      ".legacy-notif-body { color:#c2c6d6; font-size:12px; margin:0; }",
      ".legacy-notif-time { color:#8c909f; font-size:10px; text-transform:uppercase; letter-spacing:.1em; margin-top:6px; }",
      ".legacy-notif-empty { padding:16px; color:#8c909f; font-size:12px; text-align:center; }",
      ".legacy-notif-badge { position:absolute; top:4px; right:4px; min-width:15px; height:15px; border-radius:9999px; background:#ffb4ab; color:#690005; font-size:10px; font-weight:800; display:flex; align-items:center; justify-content:center; padding:0 4px; }",
      ".legacy-notif-btn { background: transparent; border: 1px solid rgba(173,198,255,0.18); color:#adc6ff; border-radius: 9999px; font-size:10px; font-weight:700; text-transform: uppercase; letter-spacing:.1em; padding: 4px 8px; }",
      ".legacy-notif-btn:hover { background: rgba(173,198,255,0.1); }",
    ].join("\n");
    document.head.appendChild(style);
  };

  var applyTheme = function (theme) {
    var isLight = theme === "light";
    document.documentElement.classList.toggle("dark", !isLight);
    document.documentElement.classList.toggle("legacy-light", isLight);
  };

  ensureThemeStyle();
  applyTheme(window.localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark");

  // Replace native alert() with an in-app modal so it matches UI.
  // (Most legacy pages use alert() for demo / validation messages; they don't rely on it being blocking.)
  (function () {
    try {
      if (window.__legacyAlertInstalled) return;
      window.__legacyAlertInstalled = true;

      var nativeAlert = window.alert;
      var queue = [];
      var isOpen = false;

      var ensureAlertStyle = function () {
        if (document.getElementById(ALERT_STYLE_ID)) return;
        var style = document.createElement("style");
        style.id = ALERT_STYLE_ID;
        style.textContent = [
          ".legacy-alert-backdrop{position:fixed;inset:0;background:rgba(6,14,32,.65);backdrop-filter:blur(3px);z-index:10001;display:flex;align-items:center;justify-content:center;padding:16px}",
          ".legacy-alert-modal{width:min(520px,100%);background:#171f33;border:1px solid rgba(173,198,255,.24);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.5);padding:18px;color:#dae2fd}",
          ".legacy-alert-title{margin:0 0 8px;font-size:16px;font-weight:900;font-family:Manrope, sans-serif;letter-spacing:-.01em}",
          ".legacy-alert-body{margin:0;color:#c2c6d6;font-size:13px;line-height:1.5;white-space:pre-wrap}",
          ".legacy-alert-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}",
          ".legacy-alert-btn{border:1px solid rgba(173,198,255,.2);background:transparent;color:#adc6ff;border-radius:9999px;padding:8px 12px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}",
          ".legacy-alert-btn-primary{border:0;background:linear-gradient(90deg,#adc6ff,#4d8eff);color:#002e6a}",
        ].join("\n");
        document.head.appendChild(style);
      };

      var showNext = function () {
        if (isOpen) return;
        var item = queue.shift();
        if (!item) return;
        if (!document || !document.body) {
          // Fallback if DOM not ready.
          nativeAlert(item.message);
          showNext();
          return;
        }

        ensureAlertStyle();
        isOpen = true;

        var backdrop = document.createElement("div");
        backdrop.className = "legacy-alert-backdrop";

        var modal = document.createElement("div");
        modal.className = "legacy-alert-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", "Message");

        var title = document.createElement("h3");
        title.className = "legacy-alert-title";
        title.textContent = item.title || "Notice";

        var body = document.createElement("p");
        body.className = "legacy-alert-body";
        body.textContent = item.message;

        var actions = document.createElement("div");
        actions.className = "legacy-alert-actions";

        var ok = document.createElement("button");
        ok.type = "button";
        ok.className = "legacy-alert-btn legacy-alert-btn-primary";
        ok.textContent = "OK";

        actions.appendChild(ok);
        modal.appendChild(title);
        modal.appendChild(body);
        modal.appendChild(actions);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        var close = function () {
          backdrop.remove();
          isOpen = false;
          showNext();
        };

        ok.addEventListener("click", close);
        backdrop.addEventListener("click", function (event) {
          if (event.target === backdrop) close();
        });

        var onKeyDown = function (event) {
          if (!event) return;
          if (event.key === "Escape" || event.key === "Enter") {
            event.preventDefault();
            close();
          }
        };

        document.addEventListener("keydown", onKeyDown);
        // Clean up listener when closed.
        var originalClose = close;
        close = function () {
          document.removeEventListener("keydown", onKeyDown);
          originalClose();
        };

        // Focus OK for keyboard users.
        try {
          ok.focus();
        } catch {
          // ignore
        }
      };

      window.alert = function (message) {
        queue.push({ message: String(message == null ? "" : message) });
        showNext();
      };

      window.legacyAlert = function (message, title) {
        queue.push({ message: String(message == null ? "" : message), title: title ? String(title) : "Notice" });
        showNext();
      };
    } catch {
      // If anything goes wrong, keep native alert.
    }
  })();

  var header = document.querySelector("header");
  if (!header) return;

  header.className = "flex justify-between items-center w-full px-6 h-16 bg-[#0b1326] sticky top-0 z-50 border-b border-[#131b2e]";
  header.innerHTML = [
    '<div class="flex items-center gap-8">',
    '  <a href="/dashboard" class="text-xl font-bold tracking-tighter text-[#adc6ff] font-headline">Lumiere IoT</a>',
    '  <a href="/dashboard" class="hidden lg:block text-[#adc6ff] border-b-2 border-[#adc6ff] pb-1 font-semibold text-sm">Live Status</a>',
    '</div>',
    '<div class="flex items-center gap-2">',
    '  <button data-topbar="1" data-action="search" class="p-2 text-slate-400 hover:bg-[#171f33] rounded-full transition-colors"><span class="material-symbols-outlined">search</span></button>',
    '  <button data-topbar="1" data-action="notifications" class="relative p-2 text-slate-400 hover:bg-[#171f33] rounded-full transition-colors"><span class="material-symbols-outlined">notifications</span><span class="legacy-notif-badge" data-notif-badge hidden>0</span></button>',
    '  <button data-topbar="1" data-action="theme" class="p-2 text-slate-400 hover:bg-[#171f33] rounded-full transition-colors"><span class="material-symbols-outlined">contrast</span></button>',
    '  <button data-topbar="1" data-action="support" class="px-4 py-2 rounded-full text-sm font-bold text-[#adc6ff] bg-[#adc6ff]/10 hover:bg-[#adc6ff]/20 transition-colors">Support</button>',
    '</div>',
  ].join("");

  var postNavigate = function (href) {
    try {
      if (window.top && window.top !== window) {
        window.top.postMessage({ type: "lumiere:navigate", href: href }, window.location.origin);
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  var go = function (href) {
    // Prefer SPA navigation when embedded in the Next shell.
    if (postNavigate(href)) return;
    window.location.href = href;
  };

  // Intercept topbar links to avoid full reloads.
  header.querySelectorAll('a[href^="/"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (event) {
      event.preventDefault();
      var href = anchor.getAttribute("href") || "/dashboard";
      go(href);
    });
  });

  if (window.location.pathname.indexOf("plan.html") !== -1) {
    var mapShell = document.querySelector(".flex.h-screen.pt-16");
    if (mapShell) {
      mapShell.classList.remove("pt-16");
    }
  }

  var searchBtn = header.querySelector('[data-action="search"]');
  var notifyBtn = header.querySelector('[data-action="notifications"]');
  var notifBadge = header.querySelector("[data-notif-badge]");
  var themeBtn = header.querySelector('[data-action="theme"]');
  var supportBtn = header.querySelector('[data-action="support"]');

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      go("/sensors#search");
    });
  }

  var loadNotifications = function () {
    try {
      var parsed = JSON.parse(window.localStorage.getItem(NOTIF_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  var saveNotifications = function (items) {
    window.localStorage.setItem(NOTIF_KEY, JSON.stringify(items.slice(0, MAX_NOTIFICATIONS)));
  };

  var notifications = loadNotifications();

  if (!notifications.length) {
    notifications = [
      {
        id: "seed-1",
        title: "System Ready",
        body: "Nocturne Protocol is online and synchronized.",
        timestamp: new Date().toISOString(),
        read: false,
      },
      {
        id: "seed-2",
        title: "Daily Brief",
        body: "3 priority alerts and 1 low battery incident pending review.",
        timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
        read: true,
      },
    ];
    saveNotifications(notifications);
  }

  var notifPanel = document.createElement("section");
  notifPanel.className = "legacy-topbar-notification-panel";
  notifPanel.hidden = true;
  notifPanel.innerHTML = [
    '<div class="legacy-notif-header">',
    '  <strong style="color:#dae2fd;font-size:13px;">Notifications</strong>',
    '  <div style="display:flex;gap:6px;">',
    '    <button type="button" class="legacy-notif-btn" data-notif-action="mark-all">Mark all read</button>',
    '    <button type="button" class="legacy-notif-btn" data-notif-action="clear">Clear</button>',
    "  </div>",
    "</div>",
    '<ul class="legacy-notif-list" data-notif-list></ul>',
  ].join("");
  document.body.appendChild(notifPanel);

  var notifList = notifPanel.querySelector("[data-notif-list]");

  var toRelative = function (iso) {
    var diffMs = Date.now() - new Date(iso).getTime();
    var min = Math.max(1, Math.round(diffMs / 60000));
    if (min < 60) return min + " min ago";
    var hr = Math.round(min / 60);
    if (hr < 24) return hr + " h ago";
    return Math.round(hr / 24) + " d ago";
  };

  var renderNotifications = function () {
    if (!notifList) return;

    var unread = notifications.filter(function (item) {
      return !item.read;
    }).length;

    if (notifBadge) {
      notifBadge.hidden = unread === 0;
      notifBadge.textContent = unread > 9 ? "9+" : String(unread);
    }

    if (!notifications.length) {
      notifList.innerHTML = '<li class="legacy-notif-empty">No notifications yet.</li>';
      return;
    }

    notifList.innerHTML = notifications
      .map(function (item) {
        return [
          '<li class="legacy-notif-item ' + (item.read ? "" : "unread") + '" data-notif-id="' + item.id + '">',
          '  <p class="legacy-notif-title">' + item.title + "</p>",
          '  <p class="legacy-notif-body">' + item.body + "</p>",
          '  <p class="legacy-notif-time">' + toRelative(item.timestamp) + "</p>",
          "</li>",
        ].join("");
      })
      .join("");
  };

  var addNotification = function (payload) {
    var entry = {
      id: "notif-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
      title: payload && payload.title ? payload.title : "New Update",
      body: payload && payload.body ? payload.body : "A new protocol event was received.",
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifications.unshift(entry);
    notifications = notifications.slice(0, MAX_NOTIFICATIONS);
    saveNotifications(notifications);
    renderNotifications();
    return entry;
  };

  var markAllRead = function () {
    notifications = notifications.map(function (item) {
      return {
        id: item.id,
        title: item.title,
        body: item.body,
        timestamp: item.timestamp,
        read: true,
      };
    });
    saveNotifications(notifications);
    renderNotifications();
  };

  var clearNotifications = function () {
    notifications = [];
    saveNotifications(notifications);
    renderNotifications();
  };

  window.LumiereNotifications = {
    add: addNotification,
    list: function () {
      return notifications.slice();
    },
    markAllRead: markAllRead,
    clear: clearNotifications,
  };

  notifPanel.addEventListener("click", function (event) {
    var target = event.target;
    if (!(target instanceof Element)) return;

    var actionButton = target.closest("[data-notif-action]");
    if (actionButton) {
      var action = actionButton.getAttribute("data-notif-action");
      if (action === "mark-all") markAllRead();
      if (action === "clear") clearNotifications();
      return;
    }

    var item = target.closest("[data-notif-id]");
    if (!item) return;
    var id = item.getAttribute("data-notif-id");
    notifications = notifications.map(function (notif) {
      if (notif.id === id) {
        return {
          id: notif.id,
          title: notif.title,
          body: notif.body,
          timestamp: notif.timestamp,
          read: true,
        };
      }
      return notif;
    });
    saveNotifications(notifications);
    renderNotifications();
  });

  if (notifyBtn) {
    notifyBtn.addEventListener("click", function () {
      notifPanel.hidden = !notifPanel.hidden;
      if (!notifPanel.hidden) {
        renderNotifications();
      }
    });
  }

  document.addEventListener("click", function (event) {
    if (notifPanel.hidden) return;
    var target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-action=notifications]") || target.closest(".legacy-topbar-notification-panel")) {
      return;
    }
    notifPanel.hidden = true;
  });

  // Lightweight feed updates to keep the list dynamic and reusable for later API consumption.
  setInterval(function () {
    if (Math.random() < 0.55) {
      var samples = [
        { title: "Trap Triggered", body: "Kitchen Storage node detected movement." },
        { title: "Battery Warning", body: "Trap NT-088 battery dropped below 15%." },
        { title: "Sync Complete", body: "Telemetry sync completed for all active floors." },
      ];
      addNotification(samples[Math.floor(Math.random() * samples.length)]);
    }
  }, 30000);

  renderNotifications();

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var isLight = document.documentElement.classList.contains("legacy-light");
      var next = isLight ? "dark" : "light";
      applyTheme(next);
      window.localStorage.setItem(THEME_KEY, next);
    });
  }

  if (supportBtn) {
    supportBtn.addEventListener("click", function () {
      window.location.href = "mailto:support@lumiere-iot.local";
    });
  }
})();
