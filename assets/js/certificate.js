/* ============================================================
   SETU GenAI Literacy — certificate of completion
   Learner enters their name; the certificate renders and can be
   previewed on screen or downloaded as a real PDF file with an
   explicit filename (SETU-AI-Literacy-Certificate-<Name>.pdf) via
   the vendored html2canvas + jsPDF (assets/js/vendor/, no CDN —
   keeps the SCORM package self-contained/offline-safe). This
   avoids relying on the browser's print/"Save as PDF" dialog,
   whose suggested filename comes from the *outer* LMS page's URL
   when the course runs inside a SCORM iframe, not this document's
   title. Falls back to window.print() (with a best-effort title
   swap) if those libraries fail to load for any reason. Works in
   the website and in the SCORM package (the LMS separately
   records completion).
   ============================================================ */
(function () {
  "use strict";

  var NAME_KEY = "setu-genai-m1-certname";
  var COURSE_SLUG = "Literacy";
  var ORIGINAL_TITLE = document.title;
  var input   = document.getElementById("certName");
  var cert    = document.getElementById("certificate");
  var nameOut = document.getElementById("certNameOut");
  var dateOut = document.getElementById("certDate");
  var previewBtn  = document.getElementById("certPreviewBtn");
  var downloadBtn = document.getElementById("certDownloadBtn");
  var hint    = document.getElementById("certHint");
  if (!input || !cert || !nameOut) return;

  function today() {
    try {
      return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    } catch (e) {
      return new Date().toDateString();
    }
  }

  // Restore a previously entered name.
  try {
    var saved = localStorage.getItem(NAME_KEY);
    if (saved) input.value = saved;
  } catch (e) {}

  input.addEventListener("input", function () {
    try { localStorage.setItem(NAME_KEY, input.value); } catch (e) {}
  });

  function fillCertificate() {
    var name = (input.value || "").trim();
    nameOut.textContent = name || "Your Name";
    if (dateOut) dateOut.textContent = today();
    return name;
  }

  function requireName() {
    if ((input.value || "").trim()) return true;
    input.focus();
    if (hint) {
      hint.textContent = "Please enter your name first.";
      hint.style.color = "var(--danger)";
    }
    return false;
  }

  function slugify(text) {
    var s = (text || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return s || "Certificate";
  }

  if (previewBtn) previewBtn.addEventListener("click", function () {
    if (!requireName()) return;
    fillCertificate();
    cert.classList.add("is-preview");
    cert.setAttribute("aria-hidden", "false");
    cert.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Print fallback — only used if the vendored PDF libraries are missing.
  // Sets document.title so a same-tab / non-iframe print at least gets a
  // sensible suggested filename; can't fix the filename when the LMS embeds
  // the course in an iframe (the outer page's URL wins in that case), hence
  // downloadAsPdf() below being the primary path.
  function printFallback(filename) {
    document.title = filename;
    document.body.classList.add("printing-cert");
    var cleanup = function () {
      document.body.classList.remove("printing-cert");
      document.title = ORIGINAL_TITLE;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 1500);
    window.print();
  }

  function downloadAsPdf(filename) {
    var jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!window.html2canvas || !jsPDFCtor) {
      printFallback(filename);
      return;
    }
    var originalLabel = downloadBtn.innerHTML;
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing…";
    cert.classList.add("is-capturing");
    // Two rAFs: let the "is-preview"/"is-capturing" classes actually paint
    // before snapshotting.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.html2canvas(cert, {
          scale: 2,
          backgroundColor: "#ffffff",
          // The page's hidden icon-sprite <svg> (dozens of <symbol>/<use>
          // definitions, unrelated to the certificate) makes html2canvas's
          // default node-walking renderer hang indefinitely if it isn't
          // skipped.
          ignoreElements: function (el) {
            return el.tagName === "svg" && el.getAttribute("style") &&
              el.getAttribute("style").indexOf("display:none") !== -1;
          }
        }).then(function (canvas) {
          // JPEG, not PNG: jsPDF's addImage stores PNG data unencoded (raw
          // RGBA — roughly width*height*4 bytes), which balloons a ~2400px
          // certificate to a 12MB+ PDF. JPEG lets it embed an already-
          // compressed stream directly, cutting the file to under 200KB with
          // no visible quality loss on this mostly-flat, text-on-white design.
          var img = canvas.toDataURL("image/jpeg", 0.92);
          var pdf = new jsPDFCtor({
            orientation: canvas.width >= canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(img, "JPEG", 0, 0, canvas.width, canvas.height);
          pdf.save(filename + ".pdf");
        }).catch(function () {
          printFallback(filename);
        }).finally(function () {
          cert.classList.remove("is-capturing");
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = originalLabel;
        });
      });
    });
  }

  if (downloadBtn) downloadBtn.addEventListener("click", function () {
    if (!requireName()) return;
    var name = fillCertificate();
    cert.classList.add("is-preview");
    cert.setAttribute("aria-hidden", "false");
    var filename = "SETU-AI-" + COURSE_SLUG + "-Certificate-" + slugify(name);
    // html2canvas's capture window is viewport-sized from the current scroll
    // position — the certificate sits far down the page (after .layout), so
    // without this it gets captured empty/off-screen.
    cert.scrollIntoView({ block: "start" });
    downloadAsPdf(filename);
  });
})();
