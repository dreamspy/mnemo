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

  // --- UUID generation (fallback for non-secure contexts) ---

  function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, function (c) {
      return (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16);
    });
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
      id: generateUUID(),
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

  // --- Query ---

  var queryInput = document.getElementById("query-input");
  var queryAnswer = document.getElementById("query-answer");

  async function submitQuery() {
    var question = queryInput.value.trim();
    if (!question) return;

    var token = getToken();
    if (!token) {
      promptForToken();
      return;
    }

    queryAnswer.textContent = "Thinking...";
    queryAnswer.className = "query-answer loading";

    try {
      var res = await fetch(API_BASE + "/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ question: question }),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      var data = await res.json();
      queryAnswer.textContent = data.answer;
      queryAnswer.className = "query-answer";
    } catch (err) {
      queryAnswer.textContent = "Error: " + (err.message || "Network error");
      queryAnswer.className = "query-answer";
    }
  }

  document.getElementById("btn-ask").addEventListener("click", submitQuery);

  queryInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      submitQuery();
    }
  });

  // --- Service worker registration ---

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
