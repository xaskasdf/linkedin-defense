// LinkedIn Extension Scan Blocker
// Intercepts and neutralizes LinkedIn's covert extension fingerprinting
// Reference: https://browsergate.eu

(function () {
  "use strict";

  // Override fetch to block chrome-extension:// probes
  const originalFetch = window.fetch;
  window.fetch = function (resource, init) {
    const url =
      typeof resource === "string"
        ? resource
        : resource instanceof Request
          ? resource.url
          : String(resource);

    if (url.startsWith("chrome-extension://")) {
      // Return a fake network error — same as if extension wasn't installed
      return Promise.reject(new TypeError("Failed to fetch"));
    }

    return originalFetch.apply(this, arguments);
  };

  // Override XMLHttpRequest to block extension probes too
  const originalXHROpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === "string" && url.startsWith("chrome-extension://")) {
      // Redirect to a URL that will fail silently
      arguments[1] = "data:text/plain,";
    }
    return originalXHROpen.apply(this, arguments);
  };

  // Prevent DOM scanning by overriding TreeWalker to hide extension URLs
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

  // Block requestIdleCallback abuse (LinkedIn defers scanning to idle time)
  const originalRIC = window.requestIdleCallback;
  if (originalRIC) {
    window.requestIdleCallback = function (callback, options) {
      // Wrap callback to neuter extension scanning calls
      const wrappedCallback = function (deadline) {
        try {
          callback(deadline);
        } catch (e) {
          // Silently swallow errors from blocked scans
        }
      };
      return originalRIC.call(window, wrappedCallback, options);
    };
  }

  console.log("[BrowserGate Blocker] Extension scan protection active");
})();
