/**
 * Reading (Pastoral Articles) — match live blog UI.
 *
 * Dev:  reading.html | ?cat=493 | ?post=14080&title=slug
 * Goal: /reading | /reading/category/{slug} | /reading/{id}/{slug}
 */
(function () {
  "use strict";

  var root = document.getElementById("reading-app");
  if (!root) return;

  // Per-page config (defaults = Pastoral Reading hub)
  var CATALOG_URL =
    root.getAttribute("data-catalog") || "data/reading-catalog.json";
  var PAGE_BASE =
    root.getAttribute("data-page") ||
    (function () {
      var path = window.location.pathname || "";
      var file = path.split("/").pop() || "reading.html";
      return file.indexOf(".html") !== -1 ? file.split("?")[0] : "reading.html";
    })();
  var DEFAULT_CAT = root.getAttribute("data-default-cat") || "";

  // View toggles via delegation (one listener for the life of the page).
  // Important: only match *buttons* — the listing wrap also has data-view1/2,
  // and closest() would catch that and preventDefault on article links.
  root.addEventListener("click", function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var v1 = t.closest("button[data-view1]");
    if (v1 && root.contains(v1)) {
      e.preventDefault();
      state.view1 = v1.getAttribute("data-view1") || "compact-view";
      renderListing(root.getAttribute("data-listing-cat") || "");
      return;
    }
    var v2 = t.closest("button[data-view2]");
    if (v2 && root.contains(v2)) {
      e.preventDefault();
      state.view2 = v2.getAttribute("data-view2") || "grid-view";
      renderListing(root.getAttribute("data-listing-cat") || "");
    }
  });

  var SNIPPET_INDEX_URL = "content/articles/_index.json";

  var state = {
    catalog: null,
    snippetIndex: null, // { posts: { id: { file, title, ... } } }
    view1: "compact-view", // compact | expanded
    view2: "grid-view", // grid | list
    search: "",
    year: "",
  };

  function qs() {
    return new URLSearchParams(window.location.search);
  }

  function params() {
    var p = qs();
    return {
      post: p.get("post") || "",
      title: p.get("title") || "",
      cat: p.get("cat") || "",
      srch: p.get("srch") || "",
      year: p.get("year") || "",
    };
  }

  function yearsFromCatalog() {
    var set = {};
    (state.catalog.posts || []).forEach(function (p) {
      var m = /(\d{4})$/.exec(p.date || "");
      // also M/D/YYYY
      var m2 = /\/(\d{4})$/.exec(p.date || "");
      var y = (m2 && m2[1]) || (m && m[1]);
      if (y) set[y] = true;
    });
    return Object.keys(set).sort().reverse();
  }

  function hrefListing() {
    return PAGE_BASE;
  }
  function hrefCat(id) {
    return PAGE_BASE + "?cat=" + encodeURIComponent(id);
  }
  function hrefPost(post) {
    return (
      PAGE_BASE +
      "?post=" +
      encodeURIComponent(post.id) +
      "&title=" +
      encodeURIComponent(post.slug || "post")
    );
  }

  function catById(id) {
    var cats = state.catalog.categories;
    for (var i = 0; i < cats.length; i++) {
      if (String(cats[i].id) === String(id)) return cats[i];
    }
    return null;
  }

  function postById(id) {
    var posts = state.catalog.posts;
    for (var i = 0; i < posts.length; i++) {
      if (String(posts[i].id) === String(id)) return posts[i];
    }
    return null;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Sample/catalog scrapes often include trailing CMS chrome after the real
   * article (end-post markers, hidden fields, page-stats modal). That junk
   * breaks the DOM (early </div>) and pollutes the article editor region.
   */
  function cleanArticleBody(html) {
    if (!html) return "<p></p>";
    var h = String(html);
    var cutMarkers = [
      "<!-- end post content -->",
      "<!--end post content-->",
      "<!-- end blog single -->",
      '<div id="counterBox"',
      "id=\"counterBox\"",
      'name="ucBlog',
      'id="ucBlog',
      'id="statsModalOverlay"',
      "id=\"statsModalOverlay\"",
    ];
    for (var i = 0; i < cutMarkers.length; i++) {
      var idx = h.indexOf(cutMarkers[i]);
      if (idx !== -1) h = h.slice(0, idx);
    }
    // Drop leftover wrapper closers from partial scrapes
    h = h.replace(/(?:\s*<\/div>)+\s*$/i, "");
    h = h.replace(
      /<div\b[^>]*class="[^"]*specDivVSM[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
      ""
    );
    h = h.trim();
    return h || "<p></p>";
  }

  /** Strip optional tooling comment header from snippet files. */
  function stripSnippetHeader(html) {
    if (!html) return "";
    return String(html)
      .replace(/^\s*<!--[\s\S]*?-->\s*/, "")
      .trim();
  }

  function snippetMetaFor(postId) {
    var posts = state.snippetIndex && state.snippetIndex.posts;
    if (!posts) return null;
    return posts[String(postId)] || null;
  }

  /**
   * Prefer content/articles snippet when indexed; else catalog bodyHtml.
   * Returns a Promise<string> of cleaned body HTML.
   */
  function loadArticleBody(post) {
    var meta = snippetMetaFor(post.id);
    var path =
      (meta && meta.file && "content/articles/" + meta.file) ||
      post.bodyPath ||
      null;
    if (!path) {
      return Promise.resolve(cleanArticleBody(post.bodyHtml));
    }
    return fetch(path, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("snippet " + r.status);
        return r.text();
      })
      .then(function (text) {
        return cleanArticleBody(stripSnippetHeader(text));
      })
      .catch(function () {
        return cleanArticleBody(post.bodyHtml);
      });
  }

  function filterPosts(catId, search, year) {
    var list = state.catalog.posts.slice();
    if (catId) {
      list = list.filter(function (p) {
        return (p.categoryIds || []).indexOf(String(catId)) !== -1;
      });
    }
    if (year) {
      list = list.filter(function (p) {
        return (p.date || "").indexOf(String(year)) !== -1;
      });
    }
    if (search) {
      var q = search.toLowerCase();
      list = list.filter(function (p) {
        return (
          (p.title || "").toLowerCase().indexOf(q) !== -1 ||
          (p.excerpt || "").toLowerCase().indexOf(q) !== -1
        );
      });
    }
    return list;
  }

  function categoryLinksHtml(post) {
    var ids = post.categoryIds || [];
    if (!ids.length) return "";
    var parts = [];
    ids.forEach(function (id) {
      var c = catById(id);
      if (!c) return;
      parts.push(
        '<a href="' + esc(hrefCat(c.id)) + '">' + esc(c.name) + "</a>"
      );
    });
    if (!parts.length) return "";
    return (
      '<div class="post-categories">' + parts.join(", ") + "</div>"
    );
  }

  function hidePageName(hide) {
    var h1 = document.querySelector("h1.pagename");
    if (!h1) return;
    // Live removes .pagename on reading; keep for a11y but hide visually on listing
    h1.classList.toggle("reading-pagename-hidden", !!hide);
    if (!hide) {
      /* article sets text later */
    }
  }

  function renderToolbar(catId, opts) {
    opts = opts || {};
    var showToggles = opts.showToggles !== false;
    var catOptions = state.catalog.categories
      .map(function (c) {
        var sel = String(c.id) === String(catId) ? " selected" : "";
        return (
          '<option value="' +
          esc(c.id) +
          '"' +
          sel +
          ">" +
          esc(c.name) +
          "</option>"
        );
      })
      .join("");

    var yearOptions = yearsFromCatalog()
      .map(function (y) {
        var sel = String(y) === String(state.year) ? " selected" : "";
        return (
          '<option value="' + esc(y) + '"' + sel + ">" + esc(y) + "</option>"
        );
      })
      .join("");

    var compactOn = state.view1 === "compact-view";
    var gridOn = state.view2 === "grid-view";

    var html =
      '<div class="blog-top">' +
      '<div class="blog-search">' +
      '<input type="text" id="reading-search" placeholder="" value="' +
      esc(state.search) +
      '" aria-label="Search articles">' +
      '<button type="button" class="button reading-search-btn" id="reading-search-btn">Search</button>' +
      '<a href="' +
      esc(hrefListing()) +
      '" class="button back-button">View All</a>' +
      "</div>" +
      '<div class="blog-filters">' +
      '<div class="blog-select-wrap">' +
      '<select id="reading-year-select" class="reading-native-select" aria-label="Filter Year">' +
      '<option value="">Filter Year</option>' +
      yearOptions +
      "</select>" +
      "</div>" +
      '<div class="blog-select-wrap">' +
      '<select id="reading-cat-select" class="reading-native-select" aria-label="Category">' +
      '<option value="">Category</option>' +
      catOptions +
      "</select>" +
      "</div>" +
      "</div>" +
      "</div>";

    if (showToggles) {
      html +=
        '<div class="blog-view-toggles" role="group" aria-label="Display options">' +
        '<button type="button" class="blog-view-btn' +
        (compactOn ? " is-active" : "") +
        '" data-view1="compact-view">Compact</button>' +
        '<button type="button" class="blog-view-btn blog-view-btn-text' +
        (!compactOn ? " is-active" : "") +
        '" data-view1="expanded-view">Expanded</button>' +
        '<span class="blog-view-sep" aria-hidden="true">|</span>' +
        '<button type="button" class="blog-view-btn' +
        (gridOn ? " is-active" : "") +
        '" data-view2="grid-view">Grid</button>' +
        '<button type="button" class="blog-view-btn blog-view-btn-text' +
        (!gridOn ? " is-active" : "") +
        '" data-view2="list-view">List</button>' +
        "</div>";
    }
    return html;
  }

  function renderPostCard(post) {
    var compact = state.view1 === "compact-view";
    var html = '<div class="blog-post">';
    html +=
      '<h2 class="post-title"><a href="' +
      esc(hrefPost(post)) +
      '">' +
      esc(post.title) +
      "</a></h2>";
    html += '<div class="meta clear">';
    if (post.date) {
      html += '<div class="post-date">' + esc(post.date) + "</div>";
    }
    if (!compact) {
      html += categoryLinksHtml(post);
    }
    html += "</div>";
    if (!compact && post.excerpt) {
      html +=
        '<div class="post-content"><p>' +
        esc(post.excerpt) +
        ' <a href="' +
        esc(hrefPost(post)) +
        '">Read More</a></p></div>';
    }
    html += "</div>";
    return html;
  }

  function bindToolbarEvents(catId) {
    var searchBtn = document.getElementById("reading-search-btn");
    var searchInput = document.getElementById("reading-search");
    var catSelect = document.getElementById("reading-cat-select");
    var yearSelect = document.getElementById("reading-year-select");

    function listingUrl(extra) {
      extra = extra || {};
      var parts = [];
      var q = extra.srch != null ? extra.srch : state.search;
      var c = extra.cat != null ? extra.cat : catId;
      var y = extra.year != null ? extra.year : state.year;
      if (q) parts.push("srch=" + encodeURIComponent(q.trim()));
      if (c) parts.push("cat=" + encodeURIComponent(c));
      if (y) parts.push("year=" + encodeURIComponent(y));
      return parts.length ? PAGE_BASE + "?" + parts.join("&") : PAGE_BASE;
    }

    function doSearch() {
      var q = (searchInput && searchInput.value) || "";
      window.location = listingUrl({ srch: q });
    }

    if (searchBtn) searchBtn.addEventListener("click", doSearch);
    if (searchInput) {
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          doSearch();
        }
      });
    }
    if (catSelect) {
      catSelect.addEventListener("change", function () {
        window.location = listingUrl({ cat: catSelect.value });
      });
    }
    if (yearSelect) {
      yearSelect.addEventListener("change", function () {
        window.location = listingUrl({ year: yearSelect.value });
      });
    }

    root.setAttribute("data-listing-cat", catId || "");
  }

  function renderListing(catId) {
    hidePageName(true);
    var blogTitle =
      (state.catalog && state.catalog.title) || "Reading";
    var cat = catId ? catById(catId) : null;
    document.title =
      (cat ? cat.name : blogTitle) + " | World Ministries International";

    var list = filterPosts(catId, state.search, state.year);
    var wrapClass =
      "blog-content-wrap pastoral articles" +
      (state.view1 === "compact-view" ? " is-compact" : " is-expanded") +
      (state.view2 === "grid-view" ? " is-grid" : " is-list");

    var html =
      '<div class="' +
      wrapClass +
      '" data-view1="' +
      esc(state.view1) +
      '" data-view2="' +
      esc(state.view2) +
      '">' +
      '<div class="blog-main">' +
      renderToolbar(catId, { showToggles: true }) +
      '<div class="blog-post-wrap">' +
      list.map(renderPostCard).join("") +
      "</div>";

    if (!list.length) {
      html +=
        '<p class="phase-note">No posts match this filter in the sample catalog.</p>';
    }

    html += "</div></div>";
    root.innerHTML = html;
    bindToolbarEvents(catId);
  }

  function renderArticle(post) {
    hidePageName(true);
    document.title = post.title + " | World Ministries International";

    // Shell first; body filled after snippet/catalog resolve
    var html =
      '<div class="blog-content-wrap pastoral articles">' +
      '<div class="blog-main">' +
      renderToolbar("", { showToggles: false }) +
      '<div class="blog-single">' +
      '<h1 class="post-title">' +
      esc(post.title) +
      "</h1>" +
      '<div class="meta row">' +
      (post.date
        ? '<div class="post-date">' + esc(post.date) + "</div>"
        : "") +
      categoryLinksHtml(post) +
      "</div>" +
      '<div class="post-content article-edit-region" data-edit="rich" data-edit-id="article-body"' +
      ' data-post-id="' +
      esc(post.id) +
      '" data-post-title="' +
      esc(post.title) +
      '" data-post-date="' +
      esc(post.date || "") +
      '" data-post-blog="' +
      esc(post.blog || (state.catalog && state.catalog.blog) || "") +
      '" data-post-slug="' +
      esc(post.slug || "") +
      '"><p class="phase-note">Loading article…</p></div>' +
      "</div></div></div>";

    root.innerHTML = html;
    bindToolbarEvents("");

    loadArticleBody(post).then(function (body) {
      var region = root.querySelector(".article-edit-region");
      if (!region) return;
      // Still on this post?
      if (region.getAttribute("data-post-id") !== String(post.id)) return;
      region.innerHTML = body;
      root.querySelectorAll(".specDivVSM").forEach(function (el) {
        el.remove();
      });
      var leaked = document.getElementById("counterBox");
      if (leaked && !leaked.classList.contains("page-stats")) {
        var overlay = document.getElementById("statsModalOverlay");
        if (overlay) overlay.remove();
        leaked.remove();
      }
      try {
        document.dispatchEvent(
          new CustomEvent("wmi:article-ready", {
            detail: {
              postId: post.id,
              title: post.title,
              fromSnippet: !!snippetMetaFor(post.id),
            },
          })
        );
      } catch (e) {
        /* ignore */
      }
    });
  }

  function renderError(msg) {
    hidePageName(false);
    root.innerHTML =
      '<div class="phase-note"><strong>Reading.</strong> ' +
      esc(msg) +
      "</div>";
  }

  function start(catalog) {
    state.catalog = catalog;
    var p = params();
    state.search = p.srch || "";
    state.year = p.year || "";

    if (p.post) {
      var post = postById(p.post);
      if (!post) {
        renderError("Post not found in sample catalog (id " + p.post + ").");
        return;
      }
      renderArticle(post);
      return;
    }
    renderListing(p.cat || DEFAULT_CAT || "");
  }

  function loadSnippetIndex() {
    return fetch(SNIPPET_INDEX_URL, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) return null;
        return r.json();
      })
      .then(function (idx) {
        state.snippetIndex = idx || { version: 1, posts: {} };
      })
      .catch(function () {
        state.snippetIndex = { version: 1, posts: {} };
      });
  }

  Promise.all([
    fetch(CATALOG_URL).then(function (r) {
      if (!r.ok) throw new Error("Could not load catalog");
      return r.json();
    }),
    loadSnippetIndex(),
  ])
    .then(function (results) {
      start(results[0]);
    })
    .catch(function (err) {
      renderError(String(err.message || err));
    });
})();
