// ===== Lane One achievements page logic =====

const ACHIEVEMENT_DESCRIPTIONS = {
  first_run: "Save your first run from the Analyzer.",
  "5_runs": "Log 5 runs in total.",
  "25_runs": "Log 25 runs in total.",
  "10km_life": "Reach 10km of total distance, lifetime.",
  "50km_life": "Reach 50km of total distance, lifetime.",
  "100km_life": "Reach 100km of total distance, lifetime.",
  "500km_life": "Reach 500km of total distance, lifetime.",
  streak3: "Log a run on 3 days in a row.",
  streak7: "Log a run on 7 days in a row.",
  streak30: "Log a run on 30 days in a row.",
};

const runs = getRuns();

if (!runs.length) {
  document.getElementById("emptyState").hidden = false;
}

document.getElementById("streakLine").textContent = (() => {
  const streak = computeStreak(runs);
  return streak === 0 ? "No active streak — log a run today to start one." : `${streak} day${streak > 1 ? "s" : ""} in a row`;
})();

function renderGroup(elementId, ids) {
  const achievements = computeAchievements(runs).filter(a => ids.includes(a.id));
  document.getElementById(elementId).innerHTML = achievements.map(a => `
    <div class="achievement-card${a.earned ? " earned" : ""}">
      <span class="badge${a.earned ? "" : " locked"}">${a.name}</span>
      <p>${ACHIEVEMENT_DESCRIPTIONS[a.id]}</p>
    </div>
  `).join("");
}

renderGroup("mileageAchievements", ["first_run", "5_runs", "25_runs"]);
renderGroup("distanceAchievements", ["10km_life", "50km_life", "100km_life", "500km_life"]);
renderGroup("streakAchievements", ["streak3", "streak7", "streak30"]);
