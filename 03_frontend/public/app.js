(function () {
  "use strict";

  const API_BASE = window.location.hostname === "localhost"
    ? "http://localhost:8000"
    : "";

  // DOM refs
  const stateIdle = document.getElementById("state-idle");
  const stateCategory = document.getElementById("state-category");
  const stateCompose = document.getElementById("state-compose");
  const stateSubmitting = document.getElementById("state-submitting");
  const composeType = document.getElementById("compose-type");
  const inputText = document.getElementById("input-text");
  const inputMetrics = document.getElementById("input-metrics");
  const toast = document.getElementById("toast");
  const tokenDialog = document.getElementById("token-dialog");
  const tokenInput = document.getElementById("token-input");

  let selectedType = null;

  // --- State transitions ---

  function showState(section) {
    [stateIdle, stateCategory, stateCompose, stateSubmitting].forEach(function (s) {
      s.classList.add("hidden");
    });
    section.classList.remove("hidden");
  }

  function resetToIdle() {
    selectedType = null;
    inputText.value = "";
    inputMetrics.value = "";
    showState(stateIdle);
  }

  // --- Token management ---

  function getToken() {
    return localStorage.getItem("mnemo_token");
  }

  function setToken(token) {
    localStorage.setItem("mnemo_token", token);
  }

  function promptForToken() {
    tokenInput.value = getToken() || "";
    tokenDialog.showModal();
  }

  // --- Toast ---

  let toastTimer = null;

  function showToast(message, type) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.className = "toast " + type;
    toastTimer = setTimeout(function () {
      toast.className = "toast hidden";
    }, 3000);
  }

  // --- Event submission ---

  async function submitEvent() {
    var text = inputText.value.trim();
    if (!text) {
      showToast("Text is required", "error");
      return;
    }

    var metrics = {};
    var metricsRaw = inputMetrics.value.trim();
    if (metricsRaw) {
      try {
        metrics = JSON.parse(metricsRaw);
      } catch (e) {
        showToast("Invalid metrics JSON", "error");
        return;
      }
    }

    var token = getToken();
    if (!token) {
      promptForToken();
      return;
    }

    showState(stateSubmitting);

    var event = {
      id: crypto.randomUUID(),
      client_timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      type: selectedType,
      text: text,
      metrics: metrics,
      meta: { version: 1 },
    };

    try {
      var res = await fetch(API_BASE + "/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(event),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      showToast("Logged", "success");
      resetToIdle();
    } catch (err) {
      showToast(err.message || "Network error", "error");
      showState(stateCompose);
    }
  }

  // --- Event listeners ---

  document.getElementById("btn-log").addEventListener("click", function () {
    if (!getToken()) {
      promptForToken();
      return;
    }
    showState(stateCategory);
  });

  document.querySelectorAll(".btn-category").forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectedType = btn.dataset.type;
      composeType.textContent = selectedType;
      showState(stateCompose);
      inputText.focus();
    });
  });

  document.getElementById("btn-back-category").addEventListener("click", resetToIdle);

  document.getElementById("btn-back-compose").addEventListener("click", function () {
    showState(stateCategory);
  });

  document.getElementById("btn-submit").addEventListener("click", submitEvent);

  document.getElementById("btn-save-token").addEventListener("click", function (e) {
    e.preventDefault();
    var val = tokenInput.value.trim();
    if (val) {
      setToken(val);
      tokenDialog.close();
      showToast("Token saved", "success");
    }
  });

  // Ctrl/Cmd+Enter to submit from compose
  inputText.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      submitEvent();
    }
  });

  // --- Service worker registration ---

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
