/**
 * World Ministries International — site interactions
 * Depends on chrome already mounted (or mounts after chrome).
 */
(function () {
  "use strict";

  function init() {
    const header = document.getElementById("site-header");
    const menuToggle = document.getElementById("menu-toggle");
    const menuClose = document.getElementById("menu-close");
    const mobileNav = document.getElementById("mobile-nav");
    const yearEl = document.getElementById("year");
    const thoughtDate = document.getElementById("thought-date");
    const newsForm = document.getElementById("news-form");

    function updateHeader() {
      if (!header) return;
      if (window.scrollY > 40) header.classList.add("is-stuck");
      else header.classList.remove("is-stuck");
    }

    window.addEventListener("scroll", updateHeader, { passive: true });
    updateHeader();

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

    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    if (thoughtDate) {
      thoughtDate.textContent = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }

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
  }

  // Chrome mounts on DOMContentLoaded; run after so mounts exist
  function boot() {
    // site-chrome may still be mounting in same tick
    requestAnimationFrame(function () {
      init();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
