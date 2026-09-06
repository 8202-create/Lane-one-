// ===== Lane One Gym profile & goals logic =====

const savedProfile = getProfile();
if (savedProfile.gymName) document.getElementById("gymName").value = savedProfile.gymName;
if (savedProfile.trainingExperience) document.getElementById("trainingExperience").value = savedProfile.trainingExperience;
if (savedProfile.gymGoal) document.getElementById("gymGoal").value = savedProfile.gymGoal;

document.getElementById("profileForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const profile = getProfile();
  profile.gymName = document.getElementById("gymName").value.trim();
  profile.trainingExperience = document.getElementById("trainingExperience").value;
  profile.gymGoal = document.getElementById("gymGoal").value;
  saveProfile(profile);
  const confirmEl = document.getElementById("profileSaved");
  confirmEl.hidden = false;
  setTimeout(() => confirmEl.hidden = true, 2000);
});

function renderHistoryStats() {
  const history = getGymHistory();
  const grid = document.getElementById("historyStats");
  if (!history.length) {
    grid.innerHTML = `<p class="footer-note">No workouts logged yet — save one from the <a href="gym-planner.html" class="text-link">Planner</a> to see your history here.</p>`;
    return;
  }
  const totalExercises = history.reduce((s, h) => s + (h.completedExercises || 0), 0);
  const rows = [
    [history.length, "workouts logged"],
    [totalExercises, "exercises completed"],
    [computeGymStreak(history), "day current streak"],
  ];
  grid.innerHTML = rows.map(([value, label]) =>
    `<div class="stat"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>`
  ).join("");
}
renderHistoryStats();

const goalUnitLabels = { workouts_per_week: "workouts", monthly_workouts: "workouts", streak_target: "days" };

document.getElementById("goalType").addEventListener("change", (e) => {
  document.getElementById("goalUnit").textContent = goalUnitLabels[e.target.value];
});

document.getElementById("goalForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("goalType").value;
  const target = parseFloat(document.getElementById("goalTarget").value);
  if (!target || target <= 0) return;
  const goals = getGymGoals();
  goals.push({ id: Date.now(), type, target });
  saveGymGoals(goals);
  document.getElementById("goalTarget").value = "";
  renderGoals();
});

function goalProgress(goal, history) {
  if (goal.type === "workouts_per_week") {
    const [start, end] = getWeekRange(0);
    const current = history.filter(h => { const d = new Date(h.date); return d >= start && d < end; }).length;
    return { current, label: `${current} / ${goal.target} workouts this week` };
  }
  if (goal.type === "monthly_workouts") {
    const [start, end] = getMonthRange(0);
    const current = history.filter(h => { const d = new Date(h.date); return d >= start && d < end; }).length;
    return { current, label: `${current} / ${goal.target} workouts this month` };
  }
  if (goal.type === "streak_target") {
    const current = computeGymStreak(history);
    return { current, label: `${current} / ${goal.target} day streak` };
  }
  return { current: 0, label: "" };
}

function renderGoals() {
  const goals = getGymGoals();
  const history = getGymHistory();
  const list = document.getElementById("goalsList");

  if (!goals.length) {
    list.innerHTML = `<p class="footer-note">No goals set yet — add one above.</p>`;
    return;
  }

  list.innerHTML = goals.map(goal => {
    const progress = goalProgress(goal, history);
    const pct = Math.min(100, (progress.current / goal.target) * 100);
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
      saveGymGoals(getGymGoals().filter(g => g.id !== Number(btn.dataset.id)));
      renderGoals();
    });
  });
}
renderGoals();
