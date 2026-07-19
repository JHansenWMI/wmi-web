/**
 * Renders shared header, mobile nav, and footer from window.WMI_NAV.
 * Pages provide empty mounts:
 *   <div id="site-header-mount"></div>
 *   <div id="site-footer-mount"></div>
 */
(function () {
  "use strict";

  const NAV = window.WMI_NAV;
  if (!NAV) {
    console.error("WMI_NAV missing — load js/nav-data.js first");
    return;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function linkAttrs(item) {
    const href = esc(item.href || "#");
    if (item.external) {
      return `href="${href}" target="_blank" rel="noopener"`;
    }
    return `href="${href}"`;
  }

  /** Desktop header: parent links only — no hover dropdowns (side sub-nav instead). */
  function renderItems(items) {
    return items
      .map(function (item) {
        const classes = [];
        if (item.donate) classes.push("nav-donate");
        if (item.children && item.children.length) classes.push("has-children");

        let html =
          "<li" +
          (classes.length ? ' class="' + classes.join(" ") + '"' : "") +
          ">";
        html +=
          "<a " +
          linkAttrs(item) +
          ' data-nav-href="' +
          esc(item.href || "") +
          '">' +
          esc(item.label) +
          "</a>";
        html += "</li>";
        return html;
      })
      .join("");
  }

  function currentPageFile() {
    let path = window.location.pathname || "";
    // "/about.html" or "/foo/bar/" or ""
    path = path.replace(/\/+$/, "");
    const parts = path.split("/");
    let file = parts[parts.length - 1] || "index.html";
    if (!file || file.indexOf(".") === -1) file = "index.html";
    return file;
  }

  function pageMatches(href, file) {
    if (!href || href.indexOf("http") === 0) return false;
    const h = href.split("/").pop();
    return h === file;
  }

  /**
   * If this page is a parent-with-children or one of those children,
   * return the branch { label, href, children }.
   */
  function findNavBranch(file) {
    if (file === "index.html") return null;

    const trees = [].concat(NAV.main || [], NAV.top || []);
    for (let i = 0; i < trees.length; i++) {
      const item = trees[i];
      if (!item.children || !item.children.length) continue;
      if (pageMatches(item.href, file)) return item;
      for (let j = 0; j < item.children.length; j++) {
        if (pageMatches(item.children[j].href, file)) return item;
      }
    }
    return null;
  }

  function markHeaderActive(file, branch) {
    const links = document.querySelectorAll(
      ".main-nav a[data-nav-href], .top-nav a[data-nav-href]"
    );
    links.forEach(function (a) {
      a.classList.remove("is-active");
      const li = a.closest("li");
      if (li) li.classList.remove("is-active");
    });

    // Prefer highlighting the section parent when we have a branch
    const targetHref = branch ? branch.href : null;
    links.forEach(function (a) {
      const href = a.getAttribute("data-nav-href") || "";
      const match =
        (targetHref && pageMatches(href, targetHref.split("/").pop())) ||
        pageMatches(href, file);
      if (match) {
        a.classList.add("is-active");
        const li = a.closest("li");
        if (li) li.classList.add("is-active");
      }
    });
  }

  function injectSideSubNav(file, branch) {
    if (!branch || !branch.children || !branch.children.length) return;
    if (document.body.classList.contains("page-home")) return;

    const container = document.querySelector(".content-wrap > .container");
    if (!container || container.classList.contains("has-subnav")) return;

    // Wrap existing content
    const main = document.createElement("div");
    main.className = "content-main";
    while (container.firstChild) {
      main.appendChild(container.firstChild);
    }

    const aside = document.createElement("aside");
    aside.className = "sub-nav";
    aside.setAttribute("aria-label", branch.label + " section");

    // Large section title (like live .l1) — links to parent when different page
    let titleHtml;
    if (pageMatches(branch.href, file)) {
      titleHtml =
        '<div class="sub-nav-title">' + esc(branch.label) + "</div>";
    } else {
      titleHtml =
        '<a class="sub-nav-title" href="' +
        esc(branch.href) +
        '">' +
        esc(branch.label) +
        "</a>";
    }

    // Live side nav: large section title + children only (no duplicate parent row).
    // Parent page itself has no purple pill; only a matching child is .is-active.
    let list = "<ul>";
    branch.children.forEach(function (child) {
      if (child.external) return;
      list +=
        '<li><a class="sub-nav-link' +
        (pageMatches(child.href, file) ? " is-active" : "") +
        '" href="' +
        esc(child.href) +
        '">' +
        esc(child.label) +
        "</a></li>";
    });
    list += "</ul>";

    aside.innerHTML = titleHtml + list;
    container.classList.add("has-subnav");
    container.appendChild(aside);
    container.appendChild(main);
  }

  function renderMobileItems() {
    // Flattened mobile list: primary first, then utility
    const lines = [];
    function add(item, isSub) {
      const cls = isSub ? ' class="sub"' : item.donate ? ' class="mobile-donate"' : "";
      lines.push(
        "<li" +
          cls +
          "><a " +
          linkAttrs(item) +
          ">" +
          esc(item.label) +
          "</a></li>"
      );
      if (item.children) {
        item.children.forEach(function (c) {
          add(c, true);
        });
      }
    }
    NAV.main.forEach(function (i) {
      add(i, false);
    });
    NAV.top.forEach(function (i) {
      add(i, false);
    });
    return lines.join("");
  }

  function rumbleSvg() {
    return (
      '<svg viewBox="0 0 25 26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M5.83 23.3c.26.36.57.62.93.83 1.81 1.03 4.9.05 9.6-2.68 4.75-2.74 7.12-4.9 7.18-6.97a2.3 2.3 0 0 0-.16-.88C20.39 17.68 10.38 22.73 5.83 23.3M6.25 1.62c4.08.72 14.35 6.4 17.14 10.17.1-.26.1-.57.15-.83 0-2.06-2.32-4.28-7.12-7.02C11.72 1.26 8.67.23 6.81 1.26c-.2.1-.36.2-.56.36zM2.99 1.98c.62-.36 1.4-.52 2.22-.46.36-.47.72-.78 1.19-1.04C8.52-.7 11.87.33 16.83 3.22c5.06 2.94 7.59 5.32 7.59 7.8 0 .57-.16 1.14-.41 1.7.31.57.41 1.19.41 1.75 0 2.43-2.58 4.8-7.59 7.7-5.01 2.89-8.31 3.92-10.48 2.68-.57-.31-1.08-.83-1.5-1.5-.72 0-1.34-.21-1.91-.52C.83 21.65 0 18.3 0 12.41S.88 3.17 2.99 1.98z"></path>' +
      "</svg>"
    );
  }

  function renderSocial() {
    return NAV.social
      .map(function (s) {
        let icon;
        if (s.icon === "rumble") icon = rumbleSvg();
        else icon = '<i class="' + esc(s.icon) + '" aria-hidden="true"></i>';
        return (
          '<a aria-label="' +
          esc(s.label) +
          ' (opens in a new tab)" href="' +
          esc(s.href) +
          '" target="_blank" rel="noopener">' +
          icon +
          "</a>"
        );
      })
      .join("");
  }

  function renderHeader() {
    return (
      '<header class="site-header" id="site-header">' +
      '<div class="container header-inner">' +
      '<a class="logo" href="' +
      esc(NAV.home) +
      '" aria-label="' +
      esc(NAV.siteName) +
      ' home">' +
      '<img src="' +
      esc(NAV.logo) +
      '" alt="' +
      esc(NAV.siteName) +
      '">' +
      "</a>" +
      '<div class="header-right">' +
      '<nav class="top-nav" aria-label="Secondary"><ul>' +
      renderItems(NAV.top) +
      "</ul></nav>" +
      '<nav class="main-nav" aria-label="Primary"><ul>' +
      renderItems(NAV.main) +
      "</ul></nav>" +
      "</div>" +
      '<button class="menu-toggle" type="button" id="menu-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' +
      '<i class="fas fa-bars" aria-hidden="true"></i>' +
      "</button>" +
      "</div></header>" +
      '<div class="mobile-nav" id="mobile-nav" hidden>' +
      '<div class="mobile-nav-header">' +
      '<img src="' +
      esc(NAV.logo) +
      '" alt="' +
      esc(NAV.siteName) +
      '">' +
      '<button class="mobile-nav-close" type="button" id="menu-close" aria-label="Close menu">' +
      '<i class="fas fa-times" aria-hidden="true"></i>' +
      "</button></div>" +
      '<nav aria-label="Mobile"><ul>' +
      renderMobileItems() +
      "</ul></nav></div>"
    );
  }

  function renderFooter() {
    const c = NAV.contact;
    const address = c.addressLines.map(esc).join("<br>");
    const footerLinks = NAV.footer
      .map(function (item) {
        return (
          "<li><a " + linkAttrs(item) + ">" + esc(item.label) + "</a></li>"
        );
      })
      .join("");

    return (
      '<footer class="site-footer">' +
      '<div class="wave wave-top" aria-hidden="true">' +
      '<svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">' +
      '<path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" class="shape-fill"></path>' +
      '<path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" class="shape-fill"></path>' +
      '<path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" class="shape-fill"></path>' +
      "</svg></div>" +
      '<div class="container">' +
      '<div class="footer-top">' +
      '<div class="footer-left">' +
      '<div class="footer-logo"><a href="' +
      esc(NAV.home) +
      '"><img src="' +
      esc(NAV.logo) +
      '" alt="' +
      esc(NAV.siteName) +
      '"></a></div>' +
      '<nav class="footer-nav" aria-label="Footer"><ul>' +
      footerLinks +
      "</ul></nav></div>" +
      '<div class="footer-right">' +
      '<div class="footer-contact">' +
      address +
      "<br>" +
      '<a href="' +
      esc(c.phoneHref) +
      '">' +
      esc(c.phone) +
      "</a>" +
      "<div>" +
      esc(c.fax) +
      "</div></div>" +
      '<div class="footer-social">' +
      renderSocial() +
      "</div></div></div>" +
      '<div class="credits"><p>&copy; <span id="year"></span> ' +
      esc(NAV.siteName) +
      ". All Rights Reserved.</p></div>" +
      "</div></footer>"
    );
  }

  function mount() {
    const headerMount = document.getElementById("site-header-mount");
    const footerMount = document.getElementById("site-footer-mount");
    if (headerMount) headerMount.outerHTML = renderHeader();
    if (footerMount) footerMount.outerHTML = renderFooter();

    // Newsletter block optional mount (interior pages)
    const newsMount = document.getElementById("site-newsletter-mount");
    if (newsMount) {
      newsMount.outerHTML =
        '<section class="newsletter-section" id="news-section">' +
        '<div class="wave wave-top" aria-hidden="true">' +
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">' +
        '<path d="M0,0V7.23C0,65.52,268.63,112.77,600,112.77S1200,65.52,1200,7.23V0Z" class="shape-fill"></path>' +
        "</svg></div>" +
        '<div class="container">' +
        "<h2>Get The Newsletter</h2>" +
        "<p>Enter your email address below for Dr. Hansen's free bi-monthly email newsletter</p>" +
        '<form class="news-form" id="news-form" action="#" method="post">' +
        '<label class="sr-only" for="email">Email address</label>' +
        '<input type="email" id="email" name="Email" maxlength="150" placeholder="email@domain.com" required autocomplete="email">' +
        '<input type="submit" id="news-submit" value="Subscribe">' +
        "</form></div></section>";
    }

    const file = currentPageFile();
    const branch = findNavBranch(file);
    markHeaderActive(file, branch);
    injectSideSubNav(file, branch);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
