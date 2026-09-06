// ===== Lane One dashboard logic =====

const runs = getRuns();

if (!runs.length) {
  document.getElementById("emptyState").hidden = false;
  document.getElementById("dashboardContent").hidden = true;
} else {
  renderOverview(runs);
  renderStreak(runs);
  renderWeekCompare(runs);
  renderMonthCompare(runs);
  renderPersonalBests(runs);
  renderCharts(runs);
  renderAchievements(runs);
  renderRecentRuns(runs);
}

function renderOverview(runs) {
  const stats = computeStats(runs);
  const grid = document.getElementById("overviewStats");
  const rows = [
    [stats.totalRuns, "total runs"],
    [stats.totalDistanceKm.toFixed(1) + " km", "total distance"],
    [formatDuration(stats.totalSeconds), "total time"],
    [formatPace(stats.avgPaceSecPerKm) + " /km", "average pace"],
    [stats.avgSpeedKph.toFixed(1) + " km/h", "average speed"],
    [Math.round(stats.totalCalories), "calories burned"],
  ];
  grid.innerHTML = rows.map(([value, label]) =>
    `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`
  ).join("");
}

function renderStreak(runs) {
  const streak = computeStreak(runs);
  document.getElementById("streakLine").textContent =
    streak === 0 ? "No active streak — log a run today to start one." : `${streak} day${streak > 1 ? "s" : ""} in a row`;
}

function renderWeekCompare(runs) {
  const [thisStart, thisEnd] = getWeekRange(0);
  const [lastStart, lastEnd] = getWeekRange(-1);
  const thisWeek = mileageInRange(runs, thisStart, thisEnd);
  const lastWeek = mileageInRange(runs, lastStart, lastEnd);
  document.getElementById("weekCompare").innerHTML = renderCompareBars(thisWeek, lastWeek, "This week", "Last week");
}

function renderMonthCompare(runs) {
  const [thisStart, thisEnd] = getMonthRange(0);
  const [lastStart, lastEnd] = getMonthRange(-1);
  const thisMonth = mileageInRange(runs, thisStart, thisEnd);
  const lastMonth = mileageInRange(runs, lastStart, lastEnd);
  document.getElementById("monthCompare").innerHTML = renderCompareBars(thisMonth, lastMonth, "This month", "Last month");
}

function renderCompareBars(current, previous, currentLabel, previousLabel) {
  const max = Math.max(current, previous, 1);
  const bar = (value, label) => `
    <div class="compare-bar-row">
      <span class="compare-bar-label">${label}</span>
      <div class="compare-bar-track"><div class="compare-bar-fill" style="width:${(value / max) * 100}%"></div></div>
      <span class="compare-bar-value">${value.toFixed(1)} km</span>
    </div>`;
  return bar(current, currentLabel) + bar(previous, previousLabel);
}

function renderPersonalBests(runs) {
  const pbs = computePersonalBests(runs);
  const grid = document.getElementById("personalBests");
  const entries = [];
  if (pbs.fastestPace) entries.push([formatPace(pbs.fastestPace.secPerKm) + " /km", "best average pace"]);
  if (pbs.longest) entries.push([pbs.longest.distanceKm.toFixed(1) + " km", "longest run"]);
  if (pbs.best1k) entries.push([formatDuration(pbs.best1k.totalSeconds), "fastest ~1K"]);
  if (pbs.best5k) entries.push([formatDuration(pbs.best5k.totalSeconds), "fastest ~5K"]);
  if (pbs.best10k) entries.push([formatDuration(pbs.best10k.totalSeconds), "fastest ~10K"]);
  if (pbs.mostElevation) entries.push([pbs.mostElevation.elevationGain + " m", "highest elevation gain"]);
  if (pbs.bestSplit) entries.push([formatPace(pbs.bestSplit.fastestSplitSec), "best single km split"]);

  grid.innerHTML = entries.length
    ? entries.map(([value, label]) => `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`).join("")
    : `<p class="footer-note">Log a few more runs to start unlocking personal bests.</p>`;
}

function renderCharts(runs) {
  const sorted = [...runs].sort((a, b) => new Date(a.date) - new Date(b.date));

  drawLineChart("paceChart", sorted.map((r, i) => ({ x: i + 1, y: r.secPerKm })), { color: "#d4ff3d", yLabel: "seconds/km (lower = faster)" });
  drawLineChart("speedChart", sorted.map((r, i) => ({ x: i + 1, y: r.speedKph })), { color: "#ff5a46", yLabel: "km/h" });

  const withElevation = sorted.filter(r => r.elevationGain);
  if (withElevation.length > 1) {
    document.getElementById("elevationChartRow").hidden = false;
    drawLineChart("elevationChart", withElevation.map((r, i) => ({ x: i + 1, y: r.elevationGain })), { color: "#7ee1ff", yLabel: "meters" });
  }

  const withCadence = sorted.filter(r => r.cadence);
  if (withCadence.length > 1) {
    document.getElementById("cadenceChartRow").hidden = false;
    drawLineChart("cadenceChart", withCadence.map((r, i) => ({ x: i + 1, y: r.cadence })), { color: "#d4ff3d", yLabel: "steps/min" });
  }
}

function renderAchievements(runs) {
  const achievements = computeAchievements(runs);
  const list = document.getElementById("achievementList");
  list.innerHTML = achievements.map(a =>
    `<span class="badge${a.earned ? "" : " locked"}">${a.name}</span>`
  ).join("");
}

function renderRecentRuns(runs) {
  const recent = [...runs].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  const container = document.getElementById("recentRuns");
  container.innerHTML = recent.map(r => `
    <div class="run-row">
      <span class="run-row-date">${new Date(r.date).toLocaleDateString()}</span>
      <span class="run-row-dist">${r.distanceKm.toFixed(2)} km</span>
      <span class="run-row-pace">${formatPace(r.secPerKm)} /km</span>
      <span class="run-row-time">${formatDuration(r.totalSeconds)}</span>
      <button class="text-link run-delete-btn" data-id="${r.id}">Delete</button>
    </div>
  `).join("");

  container.querySelectorAll(".run-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      deleteRun(Number(btn.dataset.id));
      location.reload();
    });
  });
}
