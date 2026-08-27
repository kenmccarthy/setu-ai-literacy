/* ============================================================
   SETU GenAI Literacy — Module 1
   Course navigation, progress persistence, and interactions.
   Vanilla JS, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  var STORAGE_KEY = "setu-genai-m1";
  var sections = Array.prototype.slice.call(document.querySelectorAll(".section"));
  var total = sections.length;
  var current = 0;

  // ---- Persisted state ------------------------------------------------
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveState(patch) {
    var s = loadState();
    for (var k in patch) s[k] = patch[k];
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }
  var state = loadState();
  var furthest = state.furthest || 0;      // furthest section index reached
  var reflections = state.reflections || {};
  var scorm = window.SCORM || null;        // SCORM adapter (no-op if not in an LMS)

  // ---- Build the table of contents -----------------------------------
  var tocList = document.getElementById("tocList");
  sections.forEach(function (sec, i) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = "#";
    a.textContent = sec.getAttribute("data-nav") || sec.getAttribute("data-title") || ("Section " + i);
    a.setAttribute("data-index", i);
    a.addEventListener("click", function (e) { e.preventDefault(); go(i); closeToc(); });
    li.appendChild(a);
    tocList.appendChild(li);
  });
  var tocLinks = Array.prototype.slice.call(tocList.querySelectorAll("a"));

  // ---- Progress -------------------------------------------------------
  var fill = document.getElementById("progressFill");
  var pctLabel = document.getElementById("progressPct");
  var track = document.querySelector(".progress__track");
  function updateProgress() {
    // Progress = furthest section reached out of the last index.
    var pct = Math.round((furthest / (total - 1)) * 100);
    fill.style.width = pct + "%";
    pctLabel.textContent = pct + "%";
    track.setAttribute("aria-valuenow", String(pct));
  }

  // ---- Navigation -----------------------------------------------------
  var pagerCount = document.getElementById("pagerCount");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");

  function go(i) {
    i = Math.max(0, Math.min(total - 1, i));
    sections[current].classList.remove("is-active");
    sections[i].classList.add("is-active");
    current = i;

    if (i > furthest) { furthest = i; saveState({ furthest: furthest }); }

    // TOC active + done states
    tocLinks.forEach(function (a, idx) {
      a.removeAttribute("aria-current");
      a.classList.toggle("is-done", idx < furthest && idx !== i);
      if (idx === i) a.setAttribute("aria-current", "step");
    });

    // Pager
    prevBtn.disabled = i === 0;
    nextBtn.textContent = i === total - 1 ? "Finish ✓" : "Next →";
    pagerCount.textContent = "Section " + (i + 1) + " of " + total;

    updateProgress();

    // Report to the LMS (no-op when running as plain HTML)
    if (scorm) {
      var pct = Math.round((furthest / (total - 1)) * 100);
      scorm.setProgress(pct);
      scorm.setLocation(current);
      if (furthest >= total - 1) scorm.complete();
    }

    document.getElementById("main").scrollIntoView({ block: "start" });
    window.scrollTo(0, 0);
  }

  prevBtn.addEventListener("click", function () { go(current - 1); });
  nextBtn.addEventListener("click", function () {
    if (current === total - 1) { go(0); } else { go(current + 1); }
  });

  // Buttons with data-goto ("next" | index)
  document.querySelectorAll("[data-goto]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var t = btn.getAttribute("data-goto");
      if (t === "next") go(current + 1); else go(parseInt(t, 10));
    });
  });

  // Keyboard: left/right arrows when not typing
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "input") return;
    if (isLightboxOpen()) return;
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });

  // ---- Mobile TOC drawer ---------------------------------------------
  var menuBtn = document.getElementById("menuBtn");
  var toc = document.getElementById("toc");
  var backdrop = document.getElementById("tocBackdrop");
  function openToc() { toc.classList.add("is-open"); backdrop.classList.add("is-open"); menuBtn.setAttribute("aria-expanded", "true"); }
  function closeToc() { toc.classList.remove("is-open"); backdrop.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", function () {
    toc.classList.contains("is-open") ? closeToc() : openToc();
  });
  backdrop.addEventListener("click", closeToc);

  // ====================================================================
  // Activity: "Which of these are AI?"
  // ====================================================================
  (function () {
    var wrap = document.getElementById("activity-ai");
    if (!wrap) return;
    var chips = Array.prototype.slice.call(wrap.querySelectorAll(".chip"));
    var revealBtn = wrap.querySelector("[data-reveal]");
    var resetBtn = wrap.querySelector("[data-reset-activity]");
    var result = document.getElementById("ai-result");
    var revealed = false;

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        if (revealed) return;
        var on = chip.getAttribute("aria-pressed") === "true";
        chip.setAttribute("aria-pressed", on ? "false" : "true");
      });
    });

    revealBtn.addEventListener("click", function () {
      revealed = true;
      var correct = 0, totalAI = 0;
      var listHtml = "";
      chips.forEach(function (chip) {
        var isAI = chip.getAttribute("data-ai") === "true";
        var picked = chip.getAttribute("aria-pressed") === "true";
        if (isAI) totalAI++;
        chip.classList.add(isAI ? "reveal-yes" : "reveal-no");
        var mark = document.createElement("span");
        mark.className = "mark";
        mark.textContent = isAI ? "✓" : "✕";
        chip.insertBefore(mark, chip.firstChild);
        if (picked === isAI) correct++;
        listHtml += "<li><strong>" + (isAI ? "Yes — " : "No — ") + "</strong>" +
                    chip.textContent.replace(/^[✓✕]/, "").trim() +
                    ": " + chip.getAttribute("data-why") + "</li>";
      });
      result.hidden = false;
      result.innerHTML = "<p><strong>You matched " + correct + " of " + chips.length +
        ".</strong> " + totalAI + " of these are AI:</p><ul>" + listHtml + "</ul>";
    });

    resetBtn.addEventListener("click", function () {
      revealed = false;
      chips.forEach(function (chip) {
        chip.setAttribute("aria-pressed", "false");
        chip.classList.remove("reveal-yes", "reveal-no");
        var m = chip.querySelector(".mark");
        if (m) m.remove();
      });
      result.hidden = true; result.innerHTML = "";
    });
  })();

  // ====================================================================
  // Animation: next-token predictor
  // ====================================================================
  (function () {
    var host = document.getElementById("predictor");
    if (!host) return;
    var sentenceEl = document.getElementById("predSentence");
    var candsEl = document.getElementById("predCands");
    var playBtn = document.getElementById("predPlay");
    var resetBtn = document.getElementById("predReset");

    // Each step: the chosen word + the alternatives it "considered" with rough odds.
    var steps = [
      { word: "The",        cands: [["The", 62], ["A", 21], ["Our", 9]] },
      { word: "university", cands: [["university", 48], ["student", 27], ["future", 14]] },
      { word: "of",         cands: [["of", 71], ["will", 12], ["is", 9]] },
      { word: "the",        cands: [["the", 66], ["tomorrow", 17], ["today", 8]] },
      { word: "future",     cands: [["future", 58], ["region", 19], ["world", 12]] },
      { word: "treats",     cands: [["treats", 41], ["will", 24], ["uses", 18]] },
      { word: "AI",         cands: [["AI", 55], ["technology", 22], ["it", 11]] },
      { word: "as",         cands: [["as", 63], ["like", 16], ["with", 10]] },
      { word: "an",         cands: [["an", 44], ["a", 31], ["ordinary", 12]] },
      { word: "everyday",   cands: [["everyday", 46], ["ordinary", 28], ["essential", 14]] },
      { word: "skill.",     cands: [["skill.", 52], ["tool.", 26], ["ability.", 13]] }
    ];

    var i = 0, timer = null, playing = false;
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function reset() {
      clearTimeout(timer); playing = false; i = 0;
      sentenceEl.innerHTML = '<span class="cursor"></span>';
      candsEl.innerHTML = ""; playBtn.textContent = "▶ Play"; playBtn.disabled = false;
    }

    function renderCands(step, chosenShown) {
      candsEl.innerHTML = "";
      step.cands.forEach(function (c, idx) {
        var el = document.createElement("div");
        el.className = "cand" + (chosenShown && idx === 0 ? " is-picked" : "");
        el.innerHTML = c[0] + ' <span class="bar" style="width:' + Math.max(8, c[1] * 0.6) + 'px"></span> <span style="font-size:11px">' + c[1] + "%</span>";
        candsEl.appendChild(el);
      });
    }

    function step() {
      if (i >= steps.length) {
        playing = false; playBtn.textContent = "▶ Replay"; playBtn.disabled = false;
        candsEl.innerHTML = ""; return;
      }
      var s = steps[i];
      renderCands(s, false);
      var delay = reduceMotion ? 0 : 620;
      timer = setTimeout(function () {
        renderCands(s, true);
        var cursor = sentenceEl.querySelector(".cursor");
        var tok = document.createElement("span");
        tok.className = "tok tok--new";
        tok.textContent = (i === 0 ? "" : " ") + s.word;
        sentenceEl.insertBefore(tok, cursor);
        setTimeout(function () { tok.classList.remove("tok--new"); tok.classList.add("tok"); }, 350);
        i++;
        timer = setTimeout(step, reduceMotion ? 60 : 420);
      }, delay);
    }

    playBtn.addEventListener("click", function () {
      if (playing) return;
      if (i >= steps.length) reset();
      playing = true; playBtn.disabled = true; playBtn.textContent = "Predicting…";
      step();
    });
    resetBtn.addEventListener("click", reset);
    reset();
  })();

  // ====================================================================
  // Self-check quizzes (radio + reveal feedback)
  // ====================================================================
  document.querySelectorAll("[data-quiz]").forEach(function (quiz) {
    var answer = quiz.getAttribute("data-answer");
    var feedback = quiz.querySelector("[data-feedback]");
    var opts = Array.prototype.slice.call(quiz.querySelectorAll(".opt"));
    quiz.querySelectorAll('input[type="radio"]').forEach(function (input) {
      input.addEventListener("change", function () {
        opts.forEach(function (o) { o.classList.remove("correct", "incorrect"); });
        opts.forEach(function (o) {
          var inp = o.querySelector("input");
          if (inp.value === answer) o.classList.add("correct");
          else if (inp.checked) o.classList.add("incorrect");
        });
        feedback.classList.add("show");
      });
    });
  });

  // ====================================================================
  // Reflection: autosave + download
  // ====================================================================
  (function () {
    var areas = Array.prototype.slice.call(document.querySelectorAll("[data-reflect]"));
    if (!areas.length) return;
    var savedLabel = document.getElementById("reflectSaved");
    var saveTimer = null;

    areas.forEach(function (a) {
      var key = a.getAttribute("data-reflect");
      if (reflections[key]) a.value = reflections[key];
      a.addEventListener("input", function () {
        reflections[key] = a.value;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(function () {
          saveState({ reflections: reflections });
          if (savedLabel) {
            savedLabel.textContent = "✓ Saved on this device · " + new Date().toLocaleTimeString();
          }
        }, 400);
      });
    });

    var dl = document.getElementById("reflectDownload");
    if (dl) dl.addEventListener("click", function () {
      var lines = [
        "SETU GenAI — Module 1: AI Literacy",
        "My reflection · " + new Date().toLocaleString(),
        "",
        "Opportunities I see in my role:",
        reflections.opp || "(not answered)",
        "",
        "Challenges and concerns:",
        reflections.challenge || "(not answered)",
        "",
        "One small action I'll take over the next month:",
        reflections.action || "(not answered)",
        ""
      ];
      var blob = new Blob([lines.join("\n")], { type: "text/plain" });
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url; link.download = "SETU-AI-Literacy-reflection.txt";
      document.body.appendChild(link); link.click();
      document.body.removeChild(link); URL.revokeObjectURL(url);
    });

    var clr = document.getElementById("reflectClear");
    if (clr) clr.addEventListener("click", function () {
      if (!confirm("Clear your reflection notes on this device?")) return;
      areas.forEach(function (a) { a.value = ""; });
      reflections = {}; saveState({ reflections: {} });
      if (savedLabel) savedLabel.textContent = "Cleared.";
    });
  })();

  // ====================================================================
  // Simple reveal buttons (data-sentence-reveal, data-reveal-simple)
  // ====================================================================
  document.querySelectorAll("[data-sentence-demo]").forEach(function (demo) {
    var btn = demo.querySelector("[data-sentence-reveal]");
    var res = demo.querySelector("[data-sentence-result]");
    if (btn && res) btn.addEventListener("click", function () {
      res.hidden = false; btn.disabled = true;
    });
  });
  document.querySelectorAll("[data-reveal-simple]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var el = document.getElementById(btn.getAttribute("data-reveal-simple"));
      if (el) { el.hidden = false; btn.disabled = true; }
    });
  });

  // ====================================================================
  // Spectrum activity (AI or Human?)
  // ====================================================================
  document.querySelectorAll("[data-spectrum] .srow").forEach(function (row) {
    var note = row.querySelector(".srow__note");
    var opts = Array.prototype.slice.call(row.querySelectorAll(".srow__opts button"));
    opts.forEach(function (b) {
      b.addEventListener("click", function () {
        opts.forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        b.setAttribute("aria-pressed", "true");
        if (note) { note.textContent = row.getAttribute("data-note"); note.classList.add("show"); }
      });
    });
  });

  // ====================================================================
  // Trust-check activity (Would you trust this?)
  // ====================================================================
  document.querySelectorAll("[data-trust]").forEach(function (trust) {
    var flags = Array.prototype.slice.call(trust.querySelectorAll(".flag"));
    var tally = trust.querySelector("#trust-tally") || trust.querySelector(".trust__tally");
    var revealBtn = trust.querySelector("[data-trust-reveal]");
    var box = trust.querySelector("[data-trust-reveal-box]");
    function count() {
      var n = trust.querySelectorAll(".flag.found").length;
      if (tally) tally.textContent = "Found " + n + " of " + flags.length + ".";
    }
    flags.forEach(function (f) {
      f.setAttribute("role", "button");
      f.setAttribute("tabindex", "0");
      function toggle() { f.classList.toggle("found"); count(); }
      f.addEventListener("click", toggle);
      f.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
    if (revealBtn && box) revealBtn.addEventListener("click", function () {
      flags.forEach(function (f) { f.classList.add("found"); });
      count();
      box.classList.add("show");
      revealBtn.disabled = true;
    });
  });

  // ====================================================================
  // Role pathway tabs (AI in Practice)
  // ====================================================================
  document.querySelectorAll("[data-pathway]").forEach(function (pw) {
    var tabs = Array.prototype.slice.call(pw.querySelectorAll(".ptab"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
        tab.setAttribute("aria-selected", "true");
        pw.querySelectorAll(".ppanel").forEach(function (p) { p.classList.remove("is-active"); });
        var panel = document.getElementById(tab.getAttribute("data-panel"));
        if (panel) panel.classList.add("is-active");
      });
    });
  });

  // ====================================================================
  // Flip cards (What AI does well; AI Principles)
  // ====================================================================
  document.querySelectorAll(".flip-card").forEach(function (card) {
    function toggle() {
      var open = card.getAttribute("aria-expanded") === "true";
      card.setAttribute("aria-expanded", open ? "false" : "true");
    }
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });

  // ====================================================================
  // Image lightbox — click any course image to view it enlarged
  // ====================================================================
  var lightbox = document.getElementById("lightbox");
  var lightboxImg = document.getElementById("lightboxImg");
  var lightboxCaption = document.getElementById("lightboxCaption");
  var lightboxTrigger = null; // element to restore focus to on close

  function isLightboxOpen() {
    return !!(lightbox && !lightbox.hidden);
  }

  function openLightbox(img) {
    if (!lightbox) return;
    lightboxTrigger = img;
    lightboxImg.src = img.getAttribute("src");
    lightboxImg.alt = img.getAttribute("alt") || "";
    var figcaption = img.closest("figure") && img.closest("figure").querySelector("figcaption");
    lightboxCaption.textContent = figcaption ? figcaption.textContent : "";
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightbox.querySelector(".lightbox__close").focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxImg.src = "";
    if (lightboxTrigger) { lightboxTrigger.focus(); lightboxTrigger = null; }
  }

  if (lightbox) {
    document.querySelectorAll(".figure__img").forEach(function (img) {
      img.setAttribute("tabindex", "0");
      img.setAttribute("role", "button");
      img.setAttribute("aria-label", "View larger image: " + (img.getAttribute("alt") || ""));
      img.addEventListener("click", function () { openLightbox(img); });
      img.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLightbox(img); }
      });
    });

    lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
      el.addEventListener("click", closeLightbox);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isLightboxOpen()) closeLightbox();
    });
  }

  // ---- Init -----------------------------------------------------------
  var startAt = 0;
  if (scorm && scorm.init()) {
    // Inside an LMS: resume to the last-viewed section if recorded.
    var loc = scorm.getLocation();
    if (loc !== null && loc >= 0 && loc < total) {
      furthest = Math.max(furthest, loc);
      startAt = loc;
    }
  }
  go(startAt);
  updateProgress();
})();

// ====================================================================
// Theme toggle (light/dark) — independent of course state above.
// ====================================================================
(function () {
  "use strict";

  var THEME_KEY = "setu-genai-theme";
  var btn = document.getElementById("themeToggle");
  if (!btn) return;

  var root = document.documentElement;
  var sunIcon = btn.querySelector(".theme-toggle__sun");
  var moonIcon = btn.querySelector(".theme-toggle__moon");
  var media = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function currentTheme() {
    var attr = root.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
    return media && media.matches ? "dark" : "light";
  }
  function render(theme) {
    var isDark = theme === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    btn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    sunIcon.hidden = isDark;
    moonIcon.hidden = !isDark;
  }
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    render(theme);
  }

  render(currentTheme());
  btn.addEventListener("click", function () {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });
})();
