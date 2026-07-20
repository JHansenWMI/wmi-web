/**
 * In-page article editor (articles only).
 *
 * Scope: blog article body (.article-edit-region / [data-edit="rich"]).
 *
 * Login (dev / localhost preview):
 *   - ?editor=1 → password form in the bar
 *   - Password: "wmi-edit" (override window.WMI_EDITOR_PASSWORD)
 *   - Session: sessionStorage wmi_editor_session=1
 *
 * Save:
 *   - Preferred: POST /api/editor/save → content/articles/YYMMDD-Title.html
 *     (requires scripts/dev_server.py / npm run dev — not plain http.server)
 *   - Fallback: localStorage draft if write API is unavailable
 *
 * Flow: Log in → open article → Edit → rich tools → Save
 */
(function () {
  "use strict";

  var SESSION_KEY = "wmi_editor_session";
  var SAVE_PREFIX = "wmi_editor_draft:";
  var DEFAULT_PASSWORD = "wmi-edit";
  var API_STATUS = "/api/editor/status";
  var API_SAVE = "/api/editor/save";

  var state = {
    mode: "view", // view | edit
    bar: null,
    region: null,
    postId: null,
    originalHtml: "",
    dirty: false,
    writeEnabled: false,
    writeChecked: false,
    lastSavePath: "",
  };

  function password() {
    return window.WMI_EDITOR_PASSWORD || DEFAULT_PASSWORD;
  }

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  }

  function setLoggedIn(on) {
    if (on) sessionStorage.setItem(SESSION_KEY, "1");
    else sessionStorage.removeItem(SESSION_KEY);
  }

  function wantEditorParam() {
    try {
      return new URLSearchParams(window.location.search).get("editor") === "1";
    } catch (e) {
      return false;
    }
  }

  function findArticleRegion() {
    return (
      document.querySelector(".blog-single .post-content.article-edit-region") ||
      document.querySelector('.blog-single .post-content[data-edit="rich"]') ||
      document.querySelector(".blog-single .post-content")
    );
  }

  function findPostId() {
    var region = findArticleRegion();
    if (region && region.getAttribute("data-post-id")) {
      return region.getAttribute("data-post-id");
    }
    try {
      return new URLSearchParams(window.location.search).get("post") || "unknown";
    } catch (e) {
      return "unknown";
    }
  }

  function postMeta() {
    var region = state.region || findArticleRegion();
    var titleEl = document.querySelector(".blog-single .post-title");
    var dateEl = document.querySelector(".blog-single .post-date");
    return {
      postId: findPostId(),
      title:
        (region && region.getAttribute("data-post-title")) ||
        (titleEl && titleEl.textContent.trim()) ||
        "Untitled",
      date:
        (region && region.getAttribute("data-post-date")) ||
        (dateEl && dateEl.textContent.trim()) ||
        "",
      blog:
        (region && region.getAttribute("data-post-blog")) ||
        "pastoral-articles",
      slug: (region && region.getAttribute("data-post-slug")) || "",
    };
  }

  function probeWriteApi() {
    return fetch(API_STATUS, { method: "GET", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("no api");
        return r.json();
      })
      .then(function (data) {
        state.writeEnabled = !!(data && data.writeEnabled);
        state.writeChecked = true;
        return state.writeEnabled;
      })
      .catch(function () {
        state.writeEnabled = false;
        state.writeChecked = true;
        return false;
      });
  }

  function syncBarHeight() {
    var root = document.documentElement;
    if (!state.bar) {
      root.style.removeProperty("--wmi-editor-bar-h");
      return;
    }
    var h = Math.ceil(state.bar.getBoundingClientRect().height) || 0;
    if (h > 0) {
      root.style.setProperty("--wmi-editor-bar-h", h + "px");
    }
  }

  function ensureBar() {
    if (state.bar && document.body.contains(state.bar)) return state.bar;
    var bar = document.createElement("div");
    bar.id = "wmi-editor-bar";
    bar.className = "wmi-editor-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Article editor");
    document.body.appendChild(bar);
    document.body.classList.add("has-wmi-editor-bar");
    state.bar = bar;
    bar.addEventListener("click", onBarClick);
    if (typeof ResizeObserver !== "undefined") {
      state._barRo = new ResizeObserver(function () {
        syncBarHeight();
      });
      state._barRo.observe(bar);
    }
    return bar;
  }

  function removeBar() {
    if (state._barRo) {
      try {
        state._barRo.disconnect();
      } catch (e) {
        /* ignore */
      }
      state._barRo = null;
    }
    if (state.bar) {
      state.bar.remove();
      state.bar = null;
    }
    document.body.classList.remove("has-wmi-editor-bar");
    document.documentElement.style.removeProperty("--wmi-editor-bar-h");
    exitEditMode(true);
  }

  function onBarClick(e) {
    var btn = e.target.closest("[data-editor-action]");
    if (!btn || !state.bar.contains(btn)) return;
    var action = btn.getAttribute("data-editor-action");
    e.preventDefault();

    if (action === "login") {
      doLogin();
      return;
    }
    if (action === "logout") {
      setLoggedIn(false);
      state.mode = "view";
      exitEditMode(true);
      renderBar();
      return;
    }
    if (action === "view") {
      if (state.dirty && !confirm("Discard unsaved changes?")) return;
      state.mode = "view";
      exitEditMode(false);
      renderBar();
      return;
    }
    if (action === "edit") {
      state.mode = "edit";
      enterEditMode();
      renderBar();
      return;
    }
    if (action === "discard") {
      if (state.region && state.originalHtml != null) {
        state.region.innerHTML = state.originalHtml;
      }
      state.dirty = false;
      state.mode = "view";
      exitEditMode(true);
      renderBar();
      return;
    }
    if (action === "save") {
      doSave();
      return;
    }
    if (action.indexOf("fmt:") === 0) {
      runFormat(action.slice(4));
    }
  }

  function doLogin() {
    var input = state.bar && state.bar.querySelector("#wmi-editor-password");
    var pass = input ? input.value : "";
    if (pass === password()) {
      setLoggedIn(true);
      probeWriteApi().then(function () {
        renderBar();
        syncArticle();
      });
    } else {
      alert("Incorrect password.");
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  function saveLocalDraft(id, html) {
    try {
      localStorage.setItem(SAVE_PREFIX + id, html);
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearLocalDraft(id) {
    try {
      localStorage.removeItem(SAVE_PREFIX + id);
    } catch (e) {
      /* ignore */
    }
  }

  function doSave() {
    if (!state.region) return;
    var html = state.region.innerHTML;
    var meta = postMeta();
    var id = meta.postId;

    // Always keep a browser backup while saving
    saveLocalDraft(id, html);

    if (!state.writeEnabled) {
      // Re-probe once in case server was started after page load
      probeWriteApi().then(function (ok) {
        if (ok) {
          doSave();
          return;
        }
        state.originalHtml = html;
        state.dirty = false;
        state.mode = "view";
        exitEditMode(true);
        renderBar();
        flashStatus(
          "Browser draft only — run npm run dev for file save (content/articles/)."
        );
      });
      return;
    }

    var saveBtn = state.bar && state.bar.querySelector('[data-editor-action="save"]');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "Saving…";
    }

    fetch(API_SAVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: password(),
        postId: id,
        title: meta.title,
        date: meta.date,
        blog: meta.blog,
        slug: meta.slug,
        html: html,
      }),
    })
      .then(function (r) {
        return r.json().then(function (data) {
          return { httpOk: r.ok, data: data };
        });
      })
      .then(function (res) {
        if (!res.httpOk || !res.data || !res.data.ok) {
          var err =
            (res.data && res.data.error) || "Save failed (is npm run dev running?)";
          throw new Error(err);
        }
        state.originalHtml = html;
        state.dirty = false;
        state.mode = "view";
        state.lastSavePath = res.data.path || res.data.file || "";
        clearLocalDraft(id);
        exitEditMode(true);
        renderBar();
        flashStatus("Saved " + (res.data.path || res.data.file), 4000);
      })
      .catch(function (err) {
        // Keep edit mode; local draft already stored
        renderBar();
        flashStatus(String(err.message || err), 5000);
        alert(
          "Could not save snippet file.\n\n" +
            (err.message || err) +
            "\n\nA browser draft was kept. Use npm run dev (not plain http.server)."
        );
      });
  }

  function flashStatus(msg, ms) {
    var el = state.bar && state.bar.querySelector(".wmi-editor-status");
    if (!el) return;
    el.textContent = msg;
    setTimeout(function () {
      if (el) el.textContent = state.dirty ? "Unsaved changes" : "";
    }, ms || 2500);
  }

  function runFormat(cmd) {
    if (state.mode !== "edit" || !state.region) return;
    state.region.focus();
    if (cmd === "createLink") {
      var url = window.prompt("Link URL:", "https://");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else if (cmd === "clear") {
      document.execCommand("removeFormat", false, null);
      document.execCommand("unlink", false, null);
    } else {
      document.execCommand(cmd, false, null);
    }
    state.dirty = true;
    renderBar();
  }

  function enterEditMode() {
    var region = findArticleRegion();
    if (!region) return;
    state.region = region;
    state.postId = findPostId();
    if (!state.originalHtml) {
      state.originalHtml = region.innerHTML;
    }
    try {
      var draft = localStorage.getItem(SAVE_PREFIX + state.postId);
      if (draft && draft !== region.innerHTML) {
        if (confirm("Restore unsaved browser draft?")) {
          region.innerHTML = draft;
        }
      }
    } catch (e) {
      /* ignore */
    }
    region.setAttribute("contenteditable", "true");
    region.classList.add("is-editing");
    region.focus();
    region.addEventListener("input", onRegionInput);
  }

  function onRegionInput() {
    state.dirty = true;
    var el = state.bar && state.bar.querySelector(".wmi-editor-status");
    if (el) el.textContent = "Unsaved changes";
  }

  function exitEditMode(clearOriginal) {
    var region = state.region || findArticleRegion();
    if (region) {
      region.removeAttribute("contenteditable");
      region.classList.remove("is-editing");
      region.removeEventListener("input", onRegionInput);
    }
    if (clearOriginal) {
      state.originalHtml = "";
      state.dirty = false;
    }
    state.region = null;
  }

  function renderBar() {
    if (!isLoggedIn() && !wantEditorParam() && !document.querySelector(".blog-single")) {
      if (!wantEditorParam()) {
        removeBar();
        return;
      }
    }

    if (!isLoggedIn()) {
      if (!wantEditorParam()) {
        removeBar();
        return;
      }
      var barLogin = ensureBar();
      barLogin.innerHTML =
        '<div class="wmi-editor-bar-inner">' +
        '<span class="wmi-editor-brand">WMI Editor</span>' +
        '<label class="wmi-editor-login-label">Password ' +
        '<input type="password" id="wmi-editor-password" autocomplete="current-password" />' +
        "</label>" +
        '<button type="button" class="wmi-editor-btn" data-editor-action="login">Log in</button>' +
        '<span class="wmi-editor-hint">Dev password: wmi-edit · use npm run dev to save files</span>' +
        "</div>";
      var inp = barLogin.querySelector("#wmi-editor-password");
      if (inp) {
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") doLogin();
        });
        setTimeout(function () {
          inp.focus();
        }, 50);
      }
      setTimeout(syncBarHeight, 0);
      return;
    }

    var onArticle = !!findArticleRegion();
    var bar = ensureBar();
    var saveLabel = state.writeEnabled ? "Save" : "Save draft";
    var html =
      '<div class="wmi-editor-bar-inner">' +
      '<span class="wmi-editor-brand">WMI Editor</span>' +
      '<div class="wmi-editor-mode" role="group" aria-label="Mode">' +
      '<button type="button" class="wmi-editor-btn' +
      (state.mode === "view" ? " is-active" : "") +
      '" data-editor-action="view">View</button>' +
      '<button type="button" class="wmi-editor-btn' +
      (state.mode === "edit" ? " is-active" : "") +
      '"' +
      (onArticle ? "" : ' disabled title="Open an article to edit"') +
      ' data-editor-action="edit">Edit</button>' +
      "</div>";

    if (state.mode === "edit" && onArticle) {
      html +=
        '<div class="wmi-editor-rich" role="toolbar" aria-label="Formatting">' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:bold" title="Bold"><b>B</b></button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:italic" title="Italic"><i>I</i></button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:underline" title="Underline"><u>U</u></button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:insertUnorderedList" title="Bullet list">• List</button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:insertOrderedList" title="Numbered list">1. List</button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:createLink" title="Link">Link</button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-fmt" data-editor-action="fmt:clear" title="Clear formatting">Clear</button>' +
        "</div>" +
        '<button type="button" class="wmi-editor-btn" data-editor-action="discard">Discard</button>' +
        '<button type="button" class="wmi-editor-btn wmi-editor-btn-primary" data-editor-action="save">' +
        saveLabel +
        "</button>";
    }

    var status = "";
    if (state.dirty) status = "Unsaved changes";
    else if (!onArticle) status = "Open an article to edit";
    else if (state.lastSavePath) status = "Last save: " + state.lastSavePath;
    else if (state.writeChecked && !state.writeEnabled)
      status = "File save off (use npm run dev)";

    html +=
      '<span class="wmi-editor-status" aria-live="polite">' +
      status +
      "</span>" +
      '<button type="button" class="wmi-editor-btn wmi-editor-btn-quiet" data-editor-action="logout">Log out</button>' +
      "</div>";

    bar.innerHTML = html;
    setTimeout(syncBarHeight, 0);
  }

  function syncArticle() {
    if (!isLoggedIn()) {
      if (wantEditorParam()) renderBar();
      else removeBar();
      return;
    }
    var region = findArticleRegion();
    if (region && !region.classList.contains("article-edit-region")) {
      region.classList.add("article-edit-region");
      region.setAttribute("data-edit", "rich");
    }
    if (!region && state.mode === "edit") {
      state.mode = "view";
      exitEditMode(true);
    }
    renderBar();
  }

  function observe() {
    var app = document.getElementById("reading-app");
    if (app) {
      var mo = new MutationObserver(function () {
        setTimeout(syncArticle, 0);
      });
      mo.observe(app, { childList: true, subtree: true });
    }
    document.addEventListener("wmi:article-ready", function () {
      setTimeout(syncArticle, 0);
    });
  }

  function init() {
    observe();
    if (isLoggedIn() || wantEditorParam()) {
      if (isLoggedIn()) {
        probeWriteApi().then(function () {
          renderBar();
        });
      } else {
        renderBar();
      }
    }
    setTimeout(syncArticle, 100);
    setTimeout(syncArticle, 500);
    setTimeout(syncArticle, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
