/**
 * Subtle per-page view counter (interim until full analytics).
 *
 * Opt-in: place anywhere in page content:
 *   <div id="counterBox" class="page-stats" data-page="donate"></div>
 *
 * Optional: data-worker to override the Worker base URL.
 * Modal markup is injected automatically — pages only need the mount.
 */
(function () {
  "use strict";

  var DEFAULT_WORKER =
    "https://divine-dew-3ed7.jonathan-hansen-ministries.workers.dev";

  function ensureModal() {
    var existing = document.getElementById("statsModalOverlay");
    if (existing) return existing;

    var overlay = document.createElement("div");
    overlay.id = "statsModalOverlay";
    overlay.className = "page-stats-overlay";
    overlay.setAttribute("hidden", "");
    overlay.innerHTML =
      '<div id="statsModal" class="page-stats-modal" role="dialog" aria-modal="true" aria-labelledby="statsModalTitle">' +
      '<div class="page-stats-modal-header">' +
      '<div id="statsModalTitle" class="page-stats-modal-title">Page stats (last 60 days)</div>' +
      '<button id="statsModalCloseBtn" type="button" class="page-stats-modal-close" aria-label="Close">&times;</button>' +
      "</div>" +
      '<div class="page-stats-modal-body">' +
      '<div id="statsModalContent" class="page-stats-modal-content"></div>' +
      "</div>" +
      '<div class="page-stats-modal-footer">' +
      '<button id="statsModalCopyBtn" type="button" class="page-stats-modal-btn">Copy</button>' +
      '<button id="statsModalOkBtn" type="button" class="page-stats-modal-btn page-stats-modal-btn-primary">OK</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(overlay);
    return overlay;
  }

  function init() {
    var counterBox = document.getElementById("counterBox");
    if (!counterBox) return;

    var pageId =
      counterBox.getAttribute("data-page") ||
      counterBox.dataset.page ||
      "";
    if (!pageId) {
      // Infer from filename when data-page omitted: /donate.html → donate
      var path = (location.pathname || "").replace(/\/+$/, "");
      var base = path.split("/").pop() || "";
      pageId = base.replace(/\.html?$/i, "") || "home";
    }

    var workerBase = (
      counterBox.getAttribute("data-worker") || DEFAULT_WORKER
    ).replace(/\/+$/, "");

    counterBox.classList.add("page-stats");
    if (!counterBox.getAttribute("role")) {
      counterBox.setAttribute("role", "button");
    }
    if (!counterBox.hasAttribute("tabindex")) {
      counterBox.setAttribute("tabindex", "0");
    }
    if (!counterBox.getAttribute("title")) {
      counterBox.setAttribute("title", "Page view stats (click for details)");
    }
    if (!counterBox.textContent.trim()) {
      counterBox.textContent = "Loading stats…";
    }

    var overlay = ensureModal();
    var content = document.getElementById("statsModalContent");
    var btnClose = document.getElementById("statsModalCloseBtn");
    var btnOk = document.getElementById("statsModalOkBtn");
    var btnCopy = document.getElementById("statsModalCopyBtn");

    if (!overlay || !content || !btnClose || !btnOk || !btnCopy) return;

    var busy = false;
    var lastDay = null;
    var lastMonth = null;

    function setCounterText(extra) {
      var day = lastDay != null ? lastDay : "?";
      var month = lastMonth != null ? lastMonth : "?";
      counterBox.textContent =
        "Day: " + day + " | Month: " + month + (extra ? " " + extra : "");
    }

    function setBusy(on) {
      busy = on;
      counterBox.classList.toggle("is-busy", on);
      setCounterText(on ? "(checking)" : "");
    }

    function closeModal() {
      overlay.setAttribute("hidden", "");
      overlay.style.display = "none";
      if (busy) setBusy(false);
    }

    function openModal(text) {
      content.textContent = text || "";
      overlay.removeAttribute("hidden");
      overlay.style.display = "flex";
    }

    btnClose.addEventListener("click", closeModal);
    btnOk.addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hasAttribute("hidden")) closeModal();
    });

    btnCopy.addEventListener("click", function () {
      var text = content.textContent || "";
      function done() {
        btnCopy.textContent = "Copied";
        setTimeout(function () {
          btnCopy.textContent = "Copy";
        }, 1200);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text);
          done();
        });
      } else {
        fallbackCopy(text);
        done();
      }
    });

    function fallbackCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch (e) {
        /* ignore */
      }
      document.body.removeChild(ta);
    }

    // Session gating (no cookies): count once per tab session, then peek
    var sessionKey = "wm_counted:" + pageId;
    var endpoint = sessionStorage.getItem(sessionKey) ? "/peek" : "/count";

    fetch(workerBase + endpoint + "?page=" + encodeURIComponent(pageId))
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!sessionStorage.getItem(sessionKey) && !data.skipped) {
          sessionStorage.setItem(sessionKey, "1");
        }
        lastDay = data.day;
        lastMonth = data.month;
        setCounterText("");
      })
      .catch(function () {
        setCounterText("(counts unavailable)");
      });

    function loadDetails() {
      if (busy) return;
      setBusy(true);
      fetch(workerBase + "/stats?page=" + encodeURIComponent(pageId))
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var days = data.last60days || [];
          var top = data.topIPsToday || [];
          var text = "Last 60 Days:\n";
          days.forEach(function (d) {
            var adj = d.countMinusTopIps != null ? d.countMinusTopIps : "(n/a)";
            text += d.date + ": " + d.count + " (minus top IPs: " + adj + ")\n";
          });
          text += "\nTop 3 IP hashes today:\n";
          top.forEach(function (x) {
            text +=
              String(x.ipHash).slice(0, 12) + "... : " + x.count + "\n";
          });
          openModal(text);
        })
        .catch(function (err) {
          openModal("Could not load stats:\n" + err);
        })
        .finally(function () {
          setBusy(false);
        });
    }

    counterBox.addEventListener("click", loadDetails);
    counterBox.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        loadDetails();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
