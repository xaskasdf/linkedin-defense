// LinkedIn BrowserGate Configurable Flooder
// Blocks extension scanning + floods telemetry with data from config
// Config is loaded from the popup UI or a .txt file
// Reference: https://browsergate.eu

(function () {
  "use strict";

  // --- Wait for config from bridge, with defaults ---
  function getConfig() {
    const cfg = window.__BG_FLOODER_CONFIG__ || {};
    return {
      customPayloads: (cfg.payloads || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      batchSize: cfg.batchSize || 50,
      multiplier: cfg.multiplier || 5,
      intervalSec: cfg.interval || 45,
    };
  }

  // --- Fake extension ID generator ---
  function randomExtId() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let id = "";
    for (let i = 0; i < 32; i++) id += chars[Math.floor(Math.random() * 26)];
    return id;
  }

  // --- Resource paths ---
  const RESOURCE_PATHS = [
    "manifest.json",
    "popup.html",
    "popup.js",
    "background.js",
    "content.js",
    "options.html",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png",
    "css/content.css",
    "js/content-script.js",
    "img/logo.png",
    "_metadata/verified_contents.json",
  ];

  function randomResource() {
    if (Math.random() < 0.3) {
      const hash = Math.random().toString(36).substring(2, 10);
      return `assets/index-${hash}.js`;
    }
    return RESOURCE_PATHS[Math.floor(Math.random() * RESOURCE_PATHS.length)];
  }

  // --- Get extension IDs: custom payloads or random ---
  function getExtensionIds(count) {
    const cfg = getConfig();
    const ids = [];

    for (let i = 0; i < count; i++) {
      if (cfg.customPayloads.length > 0) {
        // Pick from custom payloads, cycling through them
        ids.push({
          id: cfg.customPayloads[i % cfg.customPayloads.length],
          file: randomResource(),
        });
      } else {
        ids.push({ id: randomExtId(), file: randomResource() });
      }
    }
    return ids;
  }

  // --- Random helpers ---
  function trackingId() {
    const seg = (n) => Math.random().toString(36).substring(2, 2 + n);
    return `${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}`;
  }

  function randomUA() {
    const v = 120 + Math.floor(Math.random() * 16);
    const b = 6000 + Math.floor(Math.random() * 1000);
    const p = Math.floor(Math.random() * 200);
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${b}.${p} Safari/537.36`;
  }

  function randomPageKey() {
    const pages = [
      "d_flagship3_feed",
      "d_flagship3_profile",
      "d_flagship3_messaging",
      "d_flagship3_search",
      "d_flagship3_notifications",
      "d_flagship3_jobs",
      "d_flagship3_mynetwork",
    ];
    return pages[Math.floor(Math.random() * pages.length)];
  }

  function buildFingerprint() {
    const resolutions = ["1920x1080", "2560x1440", "1366x768", "3840x2160"];
    const timezones = [
      "America/Santiago",
      "America/New_York",
      "Europe/London",
      "Asia/Tokyo",
      "America/Los_Angeles",
      "America/Sao_Paulo",
    ];
    const langs = ["es-CL", "en-US", "pt-BR", "de-DE", "ja-JP", "fr-FR"];
    return {
      userAgent: randomUA(),
      screenResolution:
        resolutions[Math.floor(Math.random() * resolutions.length)],
      colorDepth: Math.random() < 0.5 ? 24 : 32,
      timezone: timezones[Math.floor(Math.random() * timezones.length)],
      language: langs[Math.floor(Math.random() * langs.length)],
      platform: "Win32",
      hardwareConcurrency: [4, 8, 12, 16][Math.floor(Math.random() * 4)],
      deviceMemory: [4, 8, 16, 32][Math.floor(Math.random() * 4)],
    };
  }

  // --- Build events ---
  function buildAedEvent(extensions) {
    return {
      eventName: "AedEvent",
      eventBody: {
        browserExtensionIds: extensions.map((e) => e.id),
        detectionMethod: Math.random() < 0.5 ? "fetch" : "dom_scan",
        scanDurationMs: 200 + Math.floor(Math.random() * 2800),
        extensionCount: extensions.length,
        fingerprint: buildFingerprint(),
      },
      eventInfo: {
        pageKey: randomPageKey(),
        trackingId: trackingId(),
      },
    };
  }

  function buildSpectroscopyEvent(extensions) {
    return {
      eventName: "SpectroscopyEvent",
      eventBody: {
        detectedExtensions: extensions.map((e) => ({
          extensionId: e.id,
          source: "dom_prefix_scan",
        })),
        scanType: "passive",
        documentNodeCount: 500 + Math.floor(Math.random() * 4500),
        fingerprint: buildFingerprint(),
      },
      eventInfo: {
        pageKey: randomPageKey(),
        trackingId: trackingId(),
      },
    };
  }

  // --- Fire fake telemetry ---
  const realXHRSend = XMLHttpRequest.prototype.send;
  const realXHROpen = XMLHttpRequest.prototype.open;

  const ENDPOINTS = [
    "https://www.linkedin.com/li/track",
    "https://www.linkedin.com/platform-telemetry/li/apfcDf",
  ];

  function fireFakeEvent(event) {
    try {
      const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
      const xhr = new XMLHttpRequest();
      realXHROpen.call(xhr, "POST", endpoint, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-Restli-Protocol-Version", "2.0.0");
      realXHRSend.call(xhr, JSON.stringify(event));
    } catch (e) {
      // silent
    }
  }

  function floodBurst() {
    const cfg = getConfig();
    for (let i = 0; i < cfg.multiplier; i++) {
      const fakeExts = getExtensionIds(cfg.batchSize);
      const event =
        Math.random() < 0.5
          ? buildAedEvent(fakeExts)
          : buildSpectroscopyEvent(fakeExts);

      const delay = Math.floor(Math.random() * 300);
      setTimeout(() => fireFakeEvent(event), delay);
    }
  }

  // --- Scan counter ---
  let scanCount = 0;
  let floodCount = 0;

  // --- Override fetch: block scans + trigger flood ---
  const originalFetch = window.fetch;
  window.fetch = function (resource) {
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof Request
          ? resource.url
          : String(resource);

    if (url.startsWith("chrome-extension://")) {
      scanCount++;
      if (scanCount % 100 === 0) {
        floodCount++;
        const cfg = getConfig();
        const source =
          cfg.customPayloads.length > 0
            ? `custom payloads (${cfg.customPayloads.length} loaded)`
            : "random IDs";
        console.log(
          `[BG Flooder] Blocked ${scanCount} scans, burst #${floodCount} using ${source}`
        );
        floodBurst();
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    return originalFetch.apply(this, arguments);
  };

  // --- Override XHR ---
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === "string" && url.startsWith("chrome-extension://")) {
      arguments[1] = "data:text/plain,";
    }
    return realXHROpen.apply(this, arguments);
  };

  // --- Block DOM scanning ---
  const originalCreateTreeWalker = document.createTreeWalker;
  document.createTreeWalker = function (root, whatToShow, filter) {
    const walker = originalCreateTreeWalker.call(
      document,
      root,
      whatToShow,
      filter
    );
    const originalNextNode = walker.nextNode.bind(walker);
    walker.nextNode = function () {
      let node = originalNextNode();
      while (node) {
        const text = node.textContent || node.nodeValue || "";
        if (text.includes("chrome-extension://")) {
          node = originalNextNode();
          continue;
        }
        return node;
      }
      return null;
    };
    return walker;
  };

  // --- Initial proactive flood ---
  setTimeout(() => {
    const cfg = getConfig();
    const source =
      cfg.customPayloads.length > 0
        ? `${cfg.customPayloads.length} custom payloads`
        : "random IDs";
    console.log(`[BG Flooder] Proactive flood using ${source}`);
    floodBurst();
    floodBurst();
  }, 2000 + Math.floor(Math.random() * 3000));

  // --- Periodic flooding ---
  function schedulePeriodicFlood() {
    const cfg = getConfig();
    const jitter = cfg.intervalSec * 500; // +/- 50%
    const interval = cfg.intervalSec * 1000 + (Math.random() * jitter * 2 - jitter);

    setTimeout(() => {
      floodBurst();
      console.log("[BG Flooder] Periodic burst sent");
      schedulePeriodicFlood();
    }, Math.max(5000, interval));
  }
  schedulePeriodicFlood();

  // --- Startup log ---
  setTimeout(() => {
    const cfg = getConfig();
    const source =
      cfg.customPayloads.length > 0
        ? `${cfg.customPayloads.length} custom payloads from config`
        : "auto-generated random IDs";
    console.log(`[BG Flooder] Active. Source: ${source}`);
    console.log(
      `[BG Flooder] Config: ${cfg.batchSize}/burst, ${cfg.multiplier}x multi, ~${cfg.intervalSec}s interval`
    );
  }, 100);
})();
