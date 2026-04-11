(function () {
  var KEY = "legacy-pending-trap";
  var SENSORS_KEY = "legacy-sensors";
  var HISTORY_KEY = "legacy-history-events";
  var MAX_HISTORY_EVENTS = 200;
  var STYLE_ID = "legacy-deploy-modal-style";

  var ensureStyle = function () {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = [
      ".legacy-deploy-backdrop{position:fixed;inset:0;background:rgba(6,14,32,.65);backdrop-filter:blur(3px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}",
      ".legacy-deploy-modal{width:min(980px,100%);background:#171f33;border:1px solid rgba(173,198,255,.24);border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.5);padding:18px;color:#dae2fd}",
      ".legacy-deploy-grid{display:grid;grid-template-columns:1fr;gap:14px}",
      "@media (min-width: 860px){.legacy-deploy-grid{grid-template-columns:360px 1fr}}",
      ".legacy-deploy-card{background:#131b2e;border:1px solid rgba(173,198,255,.16);border-radius:12px;padding:14px}",
      ".legacy-deploy-card h4{margin:0 0 6px;font-size:14px;font-weight:800}",
      ".legacy-deploy-card p{margin:0;color:#c2c6d6;font-size:12px}",
      ".legacy-deploy-input{width:100%;border:0;border-radius:10px;background:#060e20;color:#dae2fd;padding:10px 12px;font-size:13px}",
      ".legacy-deploy-label{display:block;margin:10px 0 6px;font-size:11px;color:#8c909f;text-transform:uppercase;letter-spacing:.08em;font-weight:800}",
      ".legacy-deploy-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:14px}",
      ".legacy-btn{border:1px solid rgba(173,198,255,.2);background:transparent;color:#adc6ff;border-radius:9999px;padding:7px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}",
      ".legacy-btn-primary{border:0;background:linear-gradient(90deg,#adc6ff,#4d8eff);color:#002e6a}",
      ".legacy-deploy-summary{margin-top:10px;padding:8px 10px;border-radius:9999px;background:rgba(74,225,118,.12);border:1px solid rgba(74,225,118,.35);font-size:11px;color:#6bff8f}",
      ".legacy-deploy-map{position:relative;min-height:420px;border-radius:12px;overflow:hidden;background:#060e20;border:1px solid rgba(173,198,255,.16)}",
      ".legacy-deploy-map-bg{position:absolute;inset:0;opacity:.55;mix-blend-mode:luminosity;background-size:cover;background-position:center}",
      ".legacy-deploy-map-hud{position:absolute;top:12px;left:12px;display:flex;gap:8px;align-items:center;z-index:2}",
      ".legacy-deploy-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(19,27,46,.92);border:1px solid rgba(173,198,255,.18);border-radius:9999px;padding:6px 10px;font-size:11px;color:#dae2fd;backdrop-filter:blur(6px)}",
      ".legacy-deploy-map-note{position:absolute;bottom:12px;left:12px;right:12px;z-index:2;display:flex;justify-content:space-between;gap:10px;align-items:center}",
      ".legacy-deploy-map-note span{color:#c2c6d6;font-size:11px}",
      ".legacy-deploy-pin{position:absolute;width:14px;height:14px;border-radius:9999px;background:#ffb4ab;box-shadow:0 0 0 6px rgba(255,180,171,.18), 0 0 18px rgba(255,180,171,.35);transform:translate(-50%,-50%);z-index:3;display:none}",
      ".legacy-deploy-crosshair{position:absolute;inset:0;pointer-events:none;z-index:1;background:radial-gradient(circle at center, rgba(173,198,255,.08), transparent 55%)}",
    ].join("\n");
    document.head.appendChild(style);
  };

  var safeJsonParse = function (value, fallback) {
    try {
      if (!value) return fallback;
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  var nowIso = function () {
    return new Date().toISOString();
  };

  var loadSensors = function () {
    var parsed = safeJsonParse(window.localStorage.getItem(SENSORS_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  };

  var saveSensors = function (items) {
    window.localStorage.setItem(SENSORS_KEY, JSON.stringify(items));
    try {
      window.dispatchEvent(new Event("legacy-sensors-updated"));
    } catch {
      // ignore
    }
  };

  var loadHistoryEvents = function () {
    var parsed = safeJsonParse(window.localStorage.getItem(HISTORY_KEY), []);
    return Array.isArray(parsed) ? parsed : [];
  };

  var saveHistoryEvents = function (events) {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(events.slice(0, MAX_HISTORY_EVENTS)));
    try {
      window.dispatchEvent(new Event("legacy-history-updated"));
    } catch {
      // ignore
    }
  };

  var pushHistoryEvent = function (payload) {
    var events = loadHistoryEvents();
    var entry = {
      id: "evt-" + Date.now() + "-" + Math.floor(Math.random() * 100000),
      timestamp: nowIso(),
      type: payload && payload.type ? String(payload.type) : "sensor",
      severity: payload && payload.severity ? String(payload.severity) : "info",
      title: payload && payload.title ? String(payload.title) : "Trap Deployed",
      detail: payload && payload.detail ? String(payload.detail) : "",
    };
    events.unshift(entry);
    saveHistoryEvents(events);
    return entry;
  };

  var loadFloorConfig = function () {
    var parsed = safeJsonParse(window.localStorage.getItem("legacy-floors"), null);
    return Array.isArray(parsed) ? parsed : null;
  };

  var buildFloorModel = function () {
    var fallback = [
      { id: "floor1", label: "Floor 1" },
      { id: "floor2", label: "Floor 2" },
      { id: "floor3", label: "Floor 3" },
      { id: "basement", label: "Basement" },
    ];

    var cfg = loadFloorConfig();
    if (!cfg || !cfg.length) return fallback;
    return cfg
      .map(function (f) {
        return f && f.id
          ? { id: String(f.id), label: f.label ? String(f.label) : String(f.id) }
          : null;
      })
      .filter(Boolean);
  };

  var getExisting = function () {
    var raw = localStorage.getItem(KEY);
    if (!raw) return "";
    try {
      var data = JSON.parse(raw);
      if (!data || !data.location) return "";
      if (data.location.type === "map") {
        return "Derniere position: " + (data.location.floorLabel || data.location.floor || "") + " · X=" + data.location.x + "% Y=" + data.location.y + "%";
      }
      if (data.location.type === "coordinates") {
        return "Derniere position: Coordonnees " + data.location.lat + ", " + data.location.lng;
      }
      return "";
    } catch {
      return "";
    }
  };

  var openModal = function () {
    ensureStyle();

    var DEFAULT_FLOOR_MAPS = {
      floor1: "/legacy/maps/floor1.svg",
      floor2: "/legacy/maps/floor2.svg",
      floor3: "/legacy/maps/floor3.svg",
      basement: "/legacy/maps/basement.svg",
    };

    var floorMaps = safeJsonParse(window.localStorage.getItem("legacy-floor-maps"), {}) || {};
    var floors = buildFloorModel();

    var getMapUrlForFloor = function (floorId) {
      var value = floorMaps && typeof floorMaps === "object" ? floorMaps[floorId] : null;
      if (value && typeof value === "string") return value;
      return DEFAULT_FLOOR_MAPS[floorId] || DEFAULT_FLOOR_MAPS.floor2;
    };

    var getFloorLabel = function (floorId) {
      for (var i = 0; i < floors.length; i += 1) {
        if (floors[i].id === floorId) return floors[i].label;
      }
      return floorId;
    };

    var backdrop = document.createElement("div");
    backdrop.className = "legacy-deploy-backdrop";
    backdrop.innerHTML = [
      '<div class="legacy-deploy-modal" role="dialog" aria-modal="true" aria-label="Deploy New Trap">',
      '  <h3 style="margin:0 0 4px;font-size:22px;font-weight:900;font-family:Manrope, sans-serif;">Deploy New Trap</h3>',
      '  <p style="margin:0 0 14px;color:#c2c6d6;font-size:13px;">Enter device details and pick the exact location on the map.</p>',
      '  <div class="legacy-deploy-grid">',
      '    <div class="legacy-deploy-card">',
      '      <h4>Device</h4>',
      '      <label class="legacy-deploy-label" for="deploy-trap-id">Device name / ID</label>',
      '      <input id="deploy-trap-id" class="legacy-deploy-input" data-deploy-id type="text" placeholder="TRP-1234-A" />',
      '      <label class="legacy-deploy-label" for="deploy-trap-zone">Zone / Room</label>',
      '      <input id="deploy-trap-zone" class="legacy-deploy-input" data-deploy-zone type="text" placeholder="Kitchen A" />',
      '      <label class="legacy-deploy-label" for="deploy-trap-battery">Battery % (optional)</label>',
      '      <input id="deploy-trap-battery" class="legacy-deploy-input" data-deploy-battery type="number" min="0" max="100" step="1" placeholder="85" />',
      '      <div class="legacy-deploy-actions" style="margin-top:16px;">',
      '        <button type="button" class="legacy-btn" data-deploy-action="close">Cancel</button>',
      '        <button type="button" class="legacy-btn legacy-btn-primary" data-deploy-action="deploy">Deploy trap</button>',
      '      </div>',
      '      <div class="legacy-deploy-summary" data-deploy-summary hidden></div>',
      '    </div>',
      '    <div class="legacy-deploy-map" data-deploy-map tabindex="0" aria-label="Pick a trap location">',
      '      <div class="legacy-deploy-map-bg" data-deploy-map-bg></div>',
      '      <div class="legacy-deploy-crosshair"></div>',
      '      <div class="legacy-deploy-map-hud">',
      '        <span class="legacy-deploy-pill"><span class="material-symbols-outlined" style="font-size:16px;">layers</span><strong data-deploy-floor-label>Floor</strong></span>',
      '        <span class="legacy-deploy-pill"><span class="material-symbols-outlined" style="font-size:16px;">mouse</span><span>Scroll to change floor</span></span>',
      '      </div>',
      '      <div class="legacy-deploy-pin" data-deploy-pin></div>',
      '      <div class="legacy-deploy-map-note">',
      '        <span>Click on the map to place the trap.</span>',
      '        <span data-deploy-coords>Not placed</span>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join("");

    document.body.appendChild(backdrop);

    var summary = backdrop.querySelector("[data-deploy-summary]");
    var summaryText = getExisting();
    if (summary && summaryText) {
      summary.hidden = false;
      summary.textContent = summaryText;
    }

    var close = function () {
      backdrop.remove();
    };

    // Close on escape
    backdrop.addEventListener("keydown", function (event) {
      if (event && event.key === "Escape") close();
    });

    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) close();
    });

    var mapEl = backdrop.querySelector("[data-deploy-map]");
    var mapBg = backdrop.querySelector("[data-deploy-map-bg]");
    var pin = backdrop.querySelector("[data-deploy-pin]");
    var floorLabelEl = backdrop.querySelector("[data-deploy-floor-label]");
    var coordsEl = backdrop.querySelector("[data-deploy-coords]");
    var idEl = backdrop.querySelector("[data-deploy-id]");
    var zoneEl = backdrop.querySelector("[data-deploy-zone]");
    var batteryEl = backdrop.querySelector("[data-deploy-battery]");

    var activeFloorIndex = 0;
    var savedPending = safeJsonParse(window.localStorage.getItem(KEY), null);
    var savedFloor = savedPending && savedPending.location && savedPending.location.floor ? String(savedPending.location.floor) : "";
    if (savedFloor) {
      for (var sf = 0; sf < floors.length; sf += 1) {
        if (floors[sf].id === savedFloor) {
          activeFloorIndex = sf;
          break;
        }
      }
    } else {
      for (var d = 0; d < floors.length; d += 1) {
        if (floors[d].id === "floor2") {
          activeFloorIndex = d;
          break;
        }
      }
    }

    var placed = {
      floorId: floors[activeFloorIndex] ? floors[activeFloorIndex].id : "floor2",
      x: null,
      y: null,
    };

    if (savedPending && savedPending.location && savedPending.location.type === "map") {
      placed.floorId = savedPending.location.floor || placed.floorId;
      placed.x = typeof savedPending.location.x === "number" ? savedPending.location.x : null;
      placed.y = typeof savedPending.location.y === "number" ? savedPending.location.y : null;
    }

    var updateMap = function () {
      var floorId = floors[activeFloorIndex] ? floors[activeFloorIndex].id : placed.floorId;
      placed.floorId = floorId;

      if (mapBg) {
        var url = getMapUrlForFloor(floorId);
        mapBg.style.backgroundImage = "url('" + url + "')";
      }

      if (floorLabelEl) {
        floorLabelEl.textContent = getFloorLabel(floorId);
      }

      if (pin && placed.x != null && placed.y != null) {
        pin.style.left = placed.x + "%";
        pin.style.top = placed.y + "%";
        pin.style.display = "block";
      } else if (pin) {
        pin.style.display = "none";
      }

      if (coordsEl) {
        coordsEl.textContent = placed.x == null ? "Not placed" : "X=" + placed.x.toFixed(1) + "%  Y=" + placed.y.toFixed(1) + "%";
      }
    };

    var placeAtClientPoint = function (clientX, clientY) {
      if (!mapEl) return;
      var rect = mapEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var x = ((clientX - rect.left) / rect.width) * 100;
      var y = ((clientY - rect.top) / rect.height) * 100;
      placed.x = Math.max(0, Math.min(100, x));
      placed.y = Math.max(0, Math.min(100, y));
      updateMap();
    };

    if (mapEl) {
      mapEl.addEventListener("click", function (event) {
        placeAtClientPoint(event.clientX, event.clientY);
      });

      var lastWheelAt = 0;
      mapEl.addEventListener(
        "wheel",
        function (event) {
          event.preventDefault();
          event.stopPropagation();
          var now = Date.now();
          if (now - lastWheelAt < 220) return;
          lastWheelAt = now;
          var direction = event.deltaY > 0 ? 1 : -1;
          activeFloorIndex = (activeFloorIndex + direction + floors.length) % floors.length;
          updateMap();
        },
        { passive: false }
      );
    }

    updateMap();

    var autoId = function () {
      return "TRP-" + Math.floor(1000 + Math.random() * 9000) + "-" + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    };

    var deployTrap = function () {
      var deviceId = (idEl && idEl.value ? String(idEl.value) : "").trim();
      var zone = (zoneEl && zoneEl.value ? String(zoneEl.value) : "").trim();
      var batteryRaw = (batteryEl && batteryEl.value ? String(batteryEl.value) : "").trim();
      var battery = batteryRaw === "" ? null : Number(batteryRaw);

      if (!deviceId) deviceId = autoId();
      if (!zone) {
        window.alert("Please enter a zone/room.");
        return;
      }
      if (placed.x == null || placed.y == null) {
        window.alert("Please click on the map to place the trap.");
        return;
      }

      if (battery != null) {
        if (!Number.isFinite(battery) || battery < 0 || battery > 100) {
          window.alert("Battery must be between 0 and 100.");
          return;
        }
        battery = Math.round(battery);
      }

      var floorId = placed.floorId;
      var floorLabel = getFloorLabel(floorId);

      var sensors = loadSensors();
      var exists = sensors.some(function (s) {
        return s && s.id && String(s.id).toLowerCase() === String(deviceId).toLowerCase();
      });
      if (exists) {
        window.alert("A trap with this ID already exists.");
        return;
      }

      var sensor = {
        id: deviceId,
        floor: floorLabel,
        floorId: floorId,
        zone: zone,
        status: "armed",
        lastActivity: nowIso(),
        battery: battery,
        signal: 3,
        location: {
          type: "map",
          floorId: floorId,
          x: Number(placed.x.toFixed(1)),
          y: Number(placed.y.toFixed(1)),
        },
      };

      sensors.unshift(sensor);
      saveSensors(sensors);

      pushHistoryEvent({
        type: "sensor",
        severity: "info",
        title: "Trap Deployed",
        detail: zone + " · Sensor " + deviceId + " · " + floorLabel,
      });

      var pendingPayload = {
        trapId: deviceId,
        createdAt: nowIso(),
        location: {
          type: "map",
          floor: floorId,
          floorLabel: floorLabel,
          x: Number(placed.x.toFixed(1)),
          y: Number(placed.y.toFixed(1)),
        },
      };
      window.localStorage.setItem(KEY, JSON.stringify(pendingPayload));

      if (summary) {
        summary.hidden = false;
        summary.textContent = "Deployed: " + deviceId + " · " + floorLabel + " · X=" + placed.x.toFixed(1) + "% Y=" + placed.y.toFixed(1) + "%";
      }

      window.alert("Trap deployed successfully.");
      close();
    };

    backdrop.addEventListener("click", function (event) {
      var target = event.target;
      if (!(target instanceof Element)) return;

      var action = target.getAttribute("data-deploy-action");
      if (!action) return;

      if (action === "close") {
        close();
        return;
      }

      if (action === "deploy") {
        deployTrap();
        return;
      }
    });

    // Submit via Enter from inputs
    backdrop.addEventListener("keydown", function (event) {
      var target = event.target;
      if (!target || !(target instanceof Element)) return;
      if (event.key !== "Enter") return;
      if (target.matches("input")) {
        event.preventDefault();
        deployTrap();
      }
    });

    // Seed some defaults
    if (idEl && !idEl.value) idEl.value = "";
    if (zoneEl && !zoneEl.value) zoneEl.value = "";
  };

  window.openDeployTrapModal = openModal;
})();
