/**
 * World Ministries International — site scripts
 */
(function () {
  "use strict";

  const header = document.getElementById("site-header");
  const menuToggle = document.getElementById("menu-toggle");
  const menuClose = document.getElementById("menu-close");
  const mobileNav = document.getElementById("mobile-nav");
  const yearEl = document.getElementById("year");
  const thoughtDate = document.getElementById("thought-date");
  const newsForm = document.getElementById("news-form");

  // Sticky header background after scroll
  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add("is-stuck");
    } else {
      header.classList.remove("is-stuck");
    }
  }

  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  // Mobile menu
  function openMenu() {
    if (!mobileNav || !menuToggle) return;
    mobileNav.hidden = false;
    mobileNav.classList.add("is-open");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    if (!mobileNav || !menuToggle) return;
    mobileNav.classList.remove("is-open");
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  if (menuToggle) menuToggle.addEventListener("click", openMenu);
  if (menuClose) menuClose.addEventListener("click", closeMenu);

  if (mobileNav) {
    mobileNav.addEventListener("click", function (e) {
      if (e.target === mobileNav) closeMenu();
    });

    mobileNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeMenu();
  });

  // Footer year
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Thought-for-the-day date (today, formatted like live site)
  if (thoughtDate) {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    thoughtDate.textContent = formatted;
  }

  // Newsletter form — UI-only until backend is wired
  if (newsForm) {
    newsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = newsForm.querySelector("#email");
      if (!email || !email.value) return;

      const section = document.getElementById("news-section");
      if (section) {
        const container = section.querySelector(".container");
        if (container) {
          container.innerHTML =
            "<div style='text-align:center;padding:4rem 0;'>" +
            "<h4 style='color:#271241;font-size:2.5rem;'>Thank you for signing up for our newsletter!</h4>" +
            "</div>";
        }
      }
    });
  }
})();
