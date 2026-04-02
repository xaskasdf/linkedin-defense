// LinkedIn BrowserGate Flooder
// Blocks extension scanning AND floods telemetry with realistic fake data
// Every time LinkedIn tries to scan your extensions, we respond with garbage
// AND fire fake telemetry events back at them
// Reference: https://browsergate.eu

(function () {
  "use strict";

  // --- Config ---
  const FAKE_EXTENSIONS_PER_BURST = 50;
  const FLOOD_MULTIPLIER = 5; // send N fake events per each real scan attempt
  const JITTER_MS = 200; // max random delay between floods

  // --- Fake extension ID generator (valid Chrome Web Store format) ---
  function randomExtId() {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let id = "";
    for (let i = 0; i < 32; i++) id += chars[Math.floor(Math.random() * 26)];
    return id;
  }

  // --- Fake resource paths ---
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

  // --- Generate a batch of fake extension IDs ---
  function generateFakeBatch(count) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      batch.push({ id: randomExtId(), file: randomResource() });
    }
    return batch;
  }

  // --- Random tracking ID (mimics LinkedIn's format) ---
  function trackingId() {
    const seg = (n) => Math.random().toString(36).substring(2, 2 + n);
    return `${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}`;
  }

  // --- Random user agent ---
  function randomUA() {
    const v = 120 + Math.floor(Math.random() * 16);
    const b = 6000 + Math.floor(Math.random() * 1000);
    const p = Math.floor(Math.random() * 200);
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v}.0.${b}.${p} Safari/537.36`;
  }

  // --- Build fake AedEvent ---
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

  // --- Build fake SpectroscopyEvent ---
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

  // --- Fire fake telemetry directly to LinkedIn ---
  const realXHRSend = XMLHttpRequest.prototype.send;
  const realXHROpen = XMLHttpRequest.prototype.open;

  function fireFakeEvent(event) {
    try {
      const xhr = new XMLHttpRequest();
      realXHROpen.call(xhr, "POST", "https://www.linkedin.com/li/track", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.setRequestHeader("X-Restli-Protocol-Version", "2.0.0");
      realXHRSend.call(xhr, JSON.stringify(event));
    } catch (e) {
      // silent fail
    }
  }

  function floodBurst() {
    for (let i = 0; i < FLOOD_MULTIPLIER; i++) {
      const fakeExts = generateFakeBatch(FAKE_EXTENSIONS_PER_BURST);
      const event =
        Math.random() < 0.5
          ? buildAedEvent(fakeExts)
          : buildSpectroscopyEvent(fakeExts);

      const delay = Math.floor(Math.random() * JITTER_MS);
      setTimeout(() => fireFakeEvent(event), delay);
    }
  }

  // --- Scan counter for logging ---
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
      // Every 100 blocked scans, fire a flood burst
      if (scanCount % 100 === 0) {
        floodCount++;
        console.log(
          `[BG Flooder] Blocked ${scanCount} scans, flood burst #${floodCount} (${FLOOD_MULTIPLIER * FAKE_EXTENSIONS_PER_BURST} fake extensions sent)`
        );
        floodBurst();
      }
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    return originalFetch.apply(this, arguments);
  };

  // --- Override XHR to also catch extension probes ---
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

  // --- Initial flood on page load (proactive) ---
  // Fire fake data immediately, don't wait for their scan
  setTimeout(() => {
    console.log(
      "[BG Flooder] Proactive flood: sending initial fake extension data"
    );
    floodBurst();
    floodBurst();
  }, 2000 + Math.floor(Math.random() * 3000));

  // --- Periodic background flooding ---
  // Every 30-60 seconds, send another burst while on LinkedIn
  function schedulePeriodicFlood() {
    const interval = 30000 + Math.floor(Math.random() * 30000);
    setTimeout(() => {
      floodBurst();
      console.log("[BG Flooder] Periodic flood burst sent");
      schedulePeriodicFlood();
    }, interval);
  }
  schedulePeriodicFlood();

  console.log(
    "[BG Flooder] Active. Blocking scans + flooding telemetry with fake data."
  );
  console.log(
    `[BG Flooder] Config: ${FAKE_EXTENSIONS_PER_BURST} fake exts/burst, ${FLOOD_MULTIPLIER}x multiplier, periodic floods every 30-60s`
  );
})();
