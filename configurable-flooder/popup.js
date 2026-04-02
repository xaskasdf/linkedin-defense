const $ = (id) => document.getElementById(id);

// Load saved config on popup open
chrome.storage.local.get(
  ["payloads", "batchSize", "multiplier", "interval"],
  (data) => {
    if (data.payloads) $("payloads").value = data.payloads;
    if (data.batchSize) $("batchSize").value = data.batchSize;
    if (data.multiplier) $("multiplier").value = data.multiplier;
    if (data.interval) $("interval").value = data.interval;
  }
);

// Save config
$("save").addEventListener("click", () => {
  const config = {
    payloads: $("payloads").value,
    batchSize: parseInt($("batchSize").value) || 50,
    multiplier: parseInt($("multiplier").value) || 5,
    interval: parseInt($("interval").value) || 45,
  };

  chrome.storage.local.set(config, () => {
    $("status").textContent = "Guardado. Recarga LinkedIn para aplicar.";
    setTimeout(() => ($("status").textContent = ""), 3000);
  });
});

// Load from .txt file
$("loadFile").addEventListener("click", () => $("fileInput").click());

$("fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = ev.target.result;
    $("payloads").value = text;
    $("status").textContent = `Cargado: ${file.name} (${text.split("\n").filter(Boolean).length} lineas)`;
    setTimeout(() => ($("status").textContent = ""), 3000);
  };
  reader.readAsText(file);
});
