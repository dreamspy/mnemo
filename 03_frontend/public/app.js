(function () {
  "use strict";

  const isLocal = window.location.hostname === "localhost";
  const API_BASE = isLocal ? "http://localhost:8000" : "";

  // DOM refs
  const stateIdle = document.getElementById("state-idle");
  const stateCategory = document.getElementById("state-category");
  const stateCompose = document.getElementById("state-compose");
  const stateSubmitting = document.getElementById("state-submitting");
  const stateDiaryDate = document.getElementById("state-diary-date");
  const stateDiaryLoading = document.getElementById("state-diary-loading");
  const stateDiarySummary = document.getElementById("state-diary-summary");
  const stateDiaryStep = document.getElementById("state-diary-step");
  const stateDiaryReview = document.getElementById("state-diary-review");
  const stateDiarySaving = document.getElementById("state-diary-saving");
  const composeType = document.getElementById("compose-type");
  const inputText = document.getElementById("input-text");
  const inputMetrics = document.getElementById("input-metrics");
  const toast = document.getElementById("toast");
  const tokenDialog = document.getElementById("token-dialog");
  const tokenInput = document.getElementById("token-input");

  let selectedType = null;

  // --- State transitions ---

  var allStates = [
    stateIdle, stateCategory, stateCompose, stateSubmitting,
    stateDiaryDate, stateDiaryLoading, stateDiarySummary,
    stateDiaryStep, stateDiaryReview, stateDiarySaving,
  ];

  function showState(section) {
    allStates.forEach(function (s) {
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
    return localStorage.getItem("mnemo_token") || (isLocal ? "local" : null);
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

  // --- Diary ---

  var DIARY_QUESTIONS = [
    { key: "headaches", label: "Headaches", question: "How are your headaches today?", type: "scale", min: 1, max: 10 },
    { key: "energy", label: "Energy", question: "How is your energy level today?", type: "scale", min: 1, max: 10 },
    { key: "gut", label: "Gut Status", question: "How is your gut feeling today?", type: "text" },
    { key: "physical", label: "Physical Well-Being", question: "How is your general physical well-being today?", type: "text" },
    { key: "hip_pain", label: "Hip Pain", question: "How is your hip pain today?", type: "scale", min: 1, max: 10 },
    { key: "mental", label: "Mental / Emotional", question: "How is your mental or emotional state today?", type: "text" },
    { key: "life", label: "Life / Events", question: "What is happening in your life or on your mind today?", type: "text" },
    { key: "gratitude", label: "Gratitude / Small Win", question: "What is one thing you're grateful for or a small win from today?", type: "text" },
    { key: "activity", label: "Physical Activity", question: "What physical activity did you do today, if any?", type: "text" },
  ];

  var diaryDate = "";
  var diaryAnswers = {};
  var diaryStepIndex = 0;
  var activeScaleKeyHandler = null;

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // Diary: open date picker
  document.getElementById("btn-diary").addEventListener("click", function () {
    if (!getToken()) {
      promptForToken();
      return;
    }
    var dateInput = document.getElementById("diary-date-input");
    dateInput.value = todayStr();
    showState(stateDiaryDate);
  });

  document.getElementById("btn-diary-yesterday").addEventListener("click", function () {
    document.getElementById("diary-date-input").value = yesterdayStr();
  });

  document.getElementById("btn-diary-today").addEventListener("click", function () {
    document.getElementById("diary-date-input").value = todayStr();
  });

  document.getElementById("btn-diary-back-date").addEventListener("click", resetToIdle);

  // Diary: start — fetch summary + existing entry
  document.getElementById("btn-diary-start").addEventListener("click", async function () {
    diaryDate = document.getElementById("diary-date-input").value;
    if (!diaryDate) {
      showToast("Pick a date", "error");
      return;
    }

    diaryAnswers = {};
    diaryStepIndex = 0;
    showState(stateDiaryLoading);

    var token = getToken();
    var headers = { Authorization: "Bearer " + token };

    try {
      var [entryRes, summaryRes] = await Promise.all([
        fetch(API_BASE + "/diary/" + diaryDate, { headers: headers }),
        fetch(API_BASE + "/diary/" + diaryDate + "/summary", { headers: headers }),
      ]);

      // Pre-fill answers if existing entry
      if (entryRes.ok) {
        var entryData = await entryRes.json();
        diaryAnswers = entryData.answers || {};
      }

      // Show summary
      var summaryText = "No events logged for this date.";
      if (summaryRes.ok) {
        var summaryData = await summaryRes.json();
        summaryText = summaryData.summary;
      }

      document.getElementById("diary-summary-text").textContent = summaryText;
      showState(stateDiarySummary);
    } catch (err) {
      showToast(err.message || "Network error", "error");
      showState(stateDiaryDate);
    }
  });

  // Diary: continue from summary to first question
  document.getElementById("btn-diary-continue").addEventListener("click", function () {
    diaryStepIndex = 0;
    renderDiaryStep();
  });

  // Render current diary step
  function renderDiaryStep() {
    var q = DIARY_QUESTIONS[diaryStepIndex];
    document.getElementById("diary-progress").textContent = (diaryStepIndex + 1) + " / " + DIARY_QUESTIONS.length;
    document.getElementById("diary-step-label").textContent = q.label;
    document.getElementById("diary-step-question").textContent = q.question;

    var area = document.getElementById("diary-step-input-area");
    area.innerHTML = "";

    if (q.type === "scale") {
      var grid = document.createElement("div");
      grid.className = "scale-grid";
      for (var i = q.min; i <= q.max; i++) {
        (function (val) {
          var btn = document.createElement("button");
          btn.className = "btn btn-scale";
          btn.textContent = val;
          if (diaryAnswers[q.key] === val) {
            btn.classList.add("selected");
          }
          btn.addEventListener("click", function () {
            diaryAnswers[q.key] = val;
            grid.querySelectorAll(".btn-scale").forEach(function (b) {
              b.classList.remove("selected");
            });
            btn.classList.add("selected");
            // Auto-advance after selecting a scale value
            setTimeout(function () {
              if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
                diaryStepIndex++;
                renderDiaryStep();
              } else {
                renderDiaryReview();
              }
            }, 200);
          });
          grid.appendChild(btn);
        })(i);
      }
      area.appendChild(grid);
      // Keyboard shortcuts: 1-9 for 1-9, 0 for 10
      if (activeScaleKeyHandler) {
        document.removeEventListener("keydown", activeScaleKeyHandler);
      }
      var scaleKeyHandler = function (e) {
        if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
        var val = null;
        if (e.key >= "1" && e.key <= "9") val = parseInt(e.key);
        if (e.key === "0") val = 10;
        if (val !== null && val >= q.min && val <= q.max) {
          diaryAnswers[q.key] = val;
          grid.querySelectorAll(".btn-scale").forEach(function (b) {
            b.classList.remove("selected");
          });
          grid.querySelector(".btn-scale:nth-child(" + val + ")").classList.add("selected");
          document.removeEventListener("keydown", scaleKeyHandler);
          setTimeout(function () {
            if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
              diaryStepIndex++;
              renderDiaryStep();
            } else {
              renderDiaryReview();
            }
          }, 200);
        }
      };
      activeScaleKeyHandler = scaleKeyHandler;
      document.addEventListener("keydown", scaleKeyHandler);
    } else {
      if (activeScaleKeyHandler) {
        document.removeEventListener("keydown", activeScaleKeyHandler);
        activeScaleKeyHandler = null;
      }
      var textarea = document.createElement("textarea");
      textarea.className = "diary-textarea";
      textarea.placeholder = "Type your answer...";
      textarea.rows = 3;
      textarea.value = diaryAnswers[q.key] || "";
      textarea.addEventListener("input", function () {
        diaryAnswers[q.key] = textarea.value;
      });
      textarea.addEventListener("keydown", function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          diaryAnswers[q.key] = textarea.value;
          if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
            diaryStepIndex++;
            renderDiaryStep();
          } else {
            renderDiaryReview();
          }
        }
      });
      area.appendChild(textarea);
      setTimeout(function () { textarea.focus(); }, 50);
    }

    // Update button labels
    var nextBtn = document.getElementById("btn-diary-next");
    nextBtn.textContent = diaryStepIndex === DIARY_QUESTIONS.length - 1 ? "Review" : "Next";

    var prevBtn = document.getElementById("btn-diary-prev");
    prevBtn.textContent = diaryStepIndex === 0 ? "Back" : "Prev";

    showState(stateDiaryStep);
  }

  // Diary: next step
  document.getElementById("btn-diary-next").addEventListener("click", function () {
    if (diaryStepIndex < DIARY_QUESTIONS.length - 1) {
      diaryStepIndex++;
      renderDiaryStep();
    } else {
      renderDiaryReview();
    }
  });

  // Diary: prev step
  document.getElementById("btn-diary-prev").addEventListener("click", function () {
    if (diaryStepIndex > 0) {
      diaryStepIndex--;
      renderDiaryStep();
    } else {
      showState(stateDiarySummary);
    }
  });

  // Render review screen
  function renderDiaryReview() {
    var list = document.getElementById("diary-review-list");
    list.innerHTML = "";

    DIARY_QUESTIONS.forEach(function (q) {
      var item = document.createElement("div");
      item.className = "diary-review-item";

      var label = document.createElement("div");
      label.className = "review-label";
      label.textContent = q.label;

      var value = document.createElement("div");
      value.className = "review-value";
      var ans = diaryAnswers[q.key];
      value.textContent = ans !== undefined && ans !== "" ? ans : "—";

      item.appendChild(label);
      item.appendChild(value);
      list.appendChild(item);
    });

    showState(stateDiaryReview);
  }

  // Diary: back to edit from review
  document.getElementById("btn-diary-back-review").addEventListener("click", function () {
    diaryStepIndex = DIARY_QUESTIONS.length - 1;
    renderDiaryStep();
  });

  // Diary: save
  document.getElementById("btn-diary-save").addEventListener("click", async function () {
    showState(stateDiarySaving);

    var token = getToken();
    try {
      var res = await fetch(API_BASE + "/diary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ date: diaryDate, answers: diaryAnswers }),
      });

      if (!res.ok) {
        var body = await res.json().catch(function () { return {}; });
        throw new Error(body.detail || "HTTP " + res.status);
      }

      showToast("Diary saved", "success");
      resetToIdle();
    } catch (err) {
      showToast(err.message || "Network error", "error");
      showState(stateDiaryReview);
    }
  });

  // --- Token button ---

  document.getElementById("btn-token").addEventListener("click", promptForToken);

  // --- Service worker registration ---

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }
})();
