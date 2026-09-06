// ===== Lane One Gym Dashboard logic =====

const history = getGymHistory();

if (!history.length) {
  document.getElementById("emptyState").hidden = false;
  document.getElementById("dashboardContent").hidden = true;
} else {
  renderOverview(history);
  renderStreak(history);
  renderWeekCompare(history);
  renderAchievements(history);
  renderHistoryList(history);
}

function renderOverview(history) {
  const totalWorkouts = history.length;
  const totalExercises = history.reduce((s, h) => s + (h.completedExercises || 0), 0);
  const daysActive = new Set(history.map(h => new Date(h.date).toDateString())).size;
  const grid = document.getElementById("overviewStats");
  const rows = [
    [totalWorkouts, "workouts logged"],
    [daysActive, "distinct days trained"],
    [totalExercises, "exercises completed"],
  ];
  grid.innerHTML = rows.map(([value, label]) =>
    `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`
  ).join("");
}

function renderStreak(history) {
  const streak = computeGymStreak(history);
  document.getElementById("streakLine").textContent =
    streak === 0 ? "No active streak — log a workout today to start one." : `${streak} day${streak > 1 ? "s" : ""} in a row`;
}

function renderWeekCompare(history) {
  const [thisStart, thisEnd] = getWeekRange(0);
  const [lastStart, lastEnd] = getWeekRange(-1);
  const countInRange = (start, end) => history.filter(h => { const d = new Date(h.date); return d >= start && d < end; }).length;
  const thisWeek = countInRange(thisStart, thisEnd);
  const lastWeek = countInRange(lastStart, lastEnd);
  const max = Math.max(thisWeek, lastWeek, 1);
  const bar = (value, label) => `
    <div class="compare-bar-row">
      <span class="compare-bar-label">${label}</span>
      <div class="compare-bar-track"><div class="compare-bar-fill" style="width:${(value / max) * 100}%"></div></div>
      <span class="compare-bar-value">${value} workouts</span>
    </div>`;
  document.getElementById("weekCompare").innerHTML = bar(thisWeek, "This week") + bar(lastWeek, "Last week");
}

function renderAchievements(history) {
  const achievements = computeGymAchievements(history);
  document.getElementById("achievementList").innerHTML = achievements.map(a =>
    `<span class="badge${a.earned ? "" : " locked"}">${a.name}</span>`
  ).join("");
}

function renderHistoryList(history) {
  const recent = [...history].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 15);
  const container = document.getElementById("historyList");
  container.innerHTML = recent.map(h => {
    const types = (h.sessions || []).map(s => s.type || "Untitled").join(" + ") || "—";
    return `
      <div class="history-row">
        <span class="history-date">${new Date(h.date).toLocaleDateString()}</span>
        <span class="history-day">${h.day}</span>
        <span class="history-type">${types}</span>
        <span class="history-progress">${h.completedExercises}/${h.totalExercises}</span>
        <button class="text-link history-delete-btn" data-id="${h.id}">Delete</button>
      </div>`;
  }).join("");

  container.querySelectorAll(".history-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteGymHistoryEntry(Number(btn.dataset.id));
      location.reload();
    });
  });
}
