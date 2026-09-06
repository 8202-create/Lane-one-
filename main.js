// Shared across every page: theme toggle (day/night track) and mobile nav

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    themeToggle.textContent = document.body.classList.contains("light") ? "Night track" : "Day track";
  });
}

const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    siteNav.classList.toggle("open");
  });
}
