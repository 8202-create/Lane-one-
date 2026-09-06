// ===== Lane One profile & goals logic =====

const savedProfile = getProfile();
if (savedProfile.name) document.getElementById("runnerName").value = savedProfile.name;
if (savedProfile.experience) document.getElementById("experience").value = savedProfile.experience;
if (savedProfile.preferredDistance) document.getElementById("preferredDistance").value = savedProfile.preferredDistance;

document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  saveProfile({
    name: document.getElementById("runnerName").value.trim(),
    experience: document.getElementById("experience").value,
    preferredDistance: document.getElementById("preferredDistance").value,
  });
  const confirm = document.getElementById("profileSaved");
  confirm.hidden = false;
  setTimeout(() => confirm.hidden = true, 2000);
});

// ---------- Running history summary ----------

function renderHistoryStats() {
  const runs = getRuns();
  const grid = document.getElementById("historyStats");
  if (!runs.length) {
    grid.innerHTML = `<p class="footer-note">No runs logged yet — save one from the <a href="analyzer.html" class="text-link">Analyzer</a> to see your history here.</p>`;
    return;
  }
  const stats = computeStats(runs);
  const pbs = computePersonalBests(runs);
  const rows = [
    [stats.totalRuns, "runs logged"],
    [stats.totalDistanceKm.toFixed(1) + " km", "total distance"],
    [formatDuration(stats.totalSeconds), "total time running"],
  ];
  if (pbs.fastestPace) rows.push([formatPace(pbs.fastestPace.secPerKm) + " /km", "personal best pace"]);
  grid.innerHTML = rows.map(([value, label]) =>
    `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`
  ).join("");
}
renderHistoryStats();

// ---------- Goals ----------

const goalUnitLabels = {
  weekly_distance: "km", monthly_distance: "km", runs_per_week: "runs",
  target_pace: "min/km", race_distance: "km",
};

document.getElementById("goalType").addEventListener("change", (e) => {
  document.getElementById("goalUnit").textContent = goalUnitLabels[e.target.value];
});

document.getElementById("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("goalType").value;
  const target = parseFloat(document.getElementById("goalTarget").value);
  if (!target || target <= 0) return;
  const goals = getGoals();
  goals.push({ id: Date.now(), type, target, createdAt: new Date().toISOString() });
  saveGoals(goals);
  document.getElementById("goalTarget").value = "";
  renderGoals();
});

function goalProgress(goal, runs) {
  if (goal.type === "weekly_distance") {
    const [start, end] = getWeekRange(0);
    const current = mileageInRange(runs, start, end);
    return { current, label: `${current.toFixed(1)} / ${goal.target} km this week` };
  }
  if (goal.type === "monthly_distance") {
    const [start, end] = getMonthRange(0);
    const current = mileageInRange(runs, start, end);
    return { current, label: `${current.toFixed(1)} / ${goal.target} km this month` };
  }
  if (goal.type === "runs_per_week") {
    const [start, end] = getWeekRange(0);
    const current = runs.filter(r => { const d = new Date(r.date); return d >= start && d < end; }).length;
    return { current, label: `${current} / ${goal.target} runs this week` };
  }
  if (goal.type === "target_pace") {
    const stats = computeStats(runs);
    const current = stats ? stats.avgPaceSecPerKm : null;
    const pct = current ? Math.min(100, (goal.target * 60 / current) * 100) : 0;
    return { current: pct, label: current ? `Current avg: ${formatPace(current)} /km — target ${goal.target}:00 /km` : "No runs logged yet", overridePct: pct };
  }
  if (goal.type === "race_distance") {
    const longest = runs.reduce((max, r) => Math.max(max, r.distanceKm), 0);
    return { current: longest, label: `Longest run so far: ${longest.toFixed(1)} / ${goal.target} km` };
  }
  return { current: 0, label: "" };
}

function renderGoals() {
  const goals = getGoals();
  const runs = getRuns();
  const list = document.getElementById("goalsList");

  if (!goals.length) {
    list.innerHTML = `<p class="footer-note">No goals set yet — add one above.</p>`;
    return;
  }

  list.innerHTML = goals.map(goal => {
    const progress = goalProgress(goal, runs);
    const pct = progress.overridePct != null ? progress.overridePct : Math.min(100, (progress.current / goal.target) * 100);
    return `
      <div class="goal-item">
        <div class="goal-item-top">
          <span>${progress.label}</span>
          <button class="text-link goal-delete-btn" data-id="${goal.id}">Remove</button>
        </div>
        <div class="compare-bar-track"><div class="compare-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  }).join("");

  list.querySelectorAll(".goal-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      saveGoals(getGoals().filter(g => g.id !== Number(btn.dataset.id)));
      renderGoals();
    });
  });
}
renderGoals();
