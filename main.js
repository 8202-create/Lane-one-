// Shared across every page: theme toggle (light/dark) and mobile nav

const THEME_KEY = "laneone_theme";

const themeToggle = document.getElementById("themeToggle");

// Apply a saved theme preference on load, before wiring up the click handler.
if (localStorage.getItem(THEME_KEY) === "light") {
  document.body.classList.add("light");
}

function updateThemeButtonLabel() {
  if (!themeToggle) return;
  // Label describes the action the button will take, not the current state.
  themeToggle.textContent = document.body.classList.contains("light") ? "Switch to dark" : "Switch to light";
}

if (themeToggle) {
  updateThemeButtonLabel();
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem(THEME_KEY, document.body.classList.contains("light") ? "light" : "dark");
    updateThemeButtonLabel();
  });
}

const navToggle = document.getElementById("navToggle");
const siteNav = document.getElementById("siteNav");
if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    siteNav.classList.toggle("open");
  });
}
