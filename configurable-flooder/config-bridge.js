// Bridge between ISOLATED world (can access chrome.storage)
// and MAIN world (where the flooder runs)
// Reads config from storage and injects it into the page

chrome.storage.local.get(
  ["payloads", "batchSize", "multiplier", "interval"],
  (data) => {
    const script = document.createElement("script");
    script.textContent = `window.__BG_FLOODER_CONFIG__ = ${JSON.stringify({
      payloads: data.payloads || "",
      batchSize: data.batchSize || 50,
      multiplier: data.multiplier || 5,
      interval: data.interval || 45,
    })};`;
    document.documentElement.prepend(script);
  }
);
