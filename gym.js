// ===== Lane One Gym Planner logic =====

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const plan = getGymPlan();
let activeDay = DAYS[0];

function ensureDay(day) {
  if (!plan[day]) plan[day] = { type: "", exercises: [] };
  return plan[day];
}

function renderTabs() {
  const tabsEl = document.getElementById("dayTabs");
  tabsEl.innerHTML = DAYS.map(d =>
    `<button type="button" class="day-tab${d === activeDay ? " active" : ""}" data-day="${d}">${d.slice(0, 3)}</button>`
  ).join("");
  tabsEl.querySelectorAll(".day-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeDay = btn.dataset.day;
      renderTabs();
      renderDay();
    });
  });
}

function renderDay() {
  const day = ensureDay(activeDay);
  document.getElementById("dayTitle").textContent = activeDay;
  document.getElementById("workoutType").value = day.type || "";

  const list = document.getElementById("exerciseList");
  if (!day.exercises.length) {
    list.innerHTML = `<p class="footer-note">No exercises added for ${activeDay} yet.</p>`;
  } else {
    list.innerHTML = day.exercises.map(ex => `
      <div class="exercise-row">
        <label class="exercise-check">
          <input type="checkbox" ${ex.done ? "checked" : ""} data-id="${ex.id}">
          <span class="${ex.done ? "exercise-done" : ""}">${ex.name}</span>
        </label>
        <button type="button" class="text-link exercise-delete" data-id="${ex.id}">Remove</button>
      </div>
    `).join("");

    list.querySelectorAll("input[type='checkbox']").forEach(cb => {
      cb.addEventListener("change", () => {
        const ex = day.exercises.find(e => e.id === Number(cb.dataset.id));
        ex.done = cb.checked;
        saveGymPlan(plan);
        renderDay();
      });
    });

    list.querySelectorAll(".exercise-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        day.exercises = day.exercises.filter(e => e.id !== Number(btn.dataset.id));
        saveGymPlan(plan);
        renderDay();
      });
    });
  }

  renderWeekOverview();
}

document.getElementById("workoutType").addEventListener("change", (e) => {
  ensureDay(activeDay).type = e.target.value;
  saveGymPlan(plan);
  renderWeekOverview();
});

document.getElementById("addExerciseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("exerciseInput");
  const name = input.value.trim();
  if (!name) return;
  ensureDay(activeDay).exercises.push({ id: Date.now(), name, done: false });
  saveGymPlan(plan);
  input.value = "";
  renderDay();
});

document.getElementById("resetWeekBtn").addEventListener("click", () => {
  DAYS.forEach(d => {
    if (plan[d]) plan[d].exercises.forEach(e => e.done = false);
  });
  saveGymPlan(plan);
  renderDay();
});

function renderWeekOverview() {
  const grid = document.getElementById("weekOverview");
  grid.innerHTML = DAYS.map(d => {
    const day = plan[d] || { type: "", exercises: [] };
    const total = day.exercises.length;
    const done = day.exercises.filter(e => e.done).length;
    return `
      <div class="week-overview-item${d === activeDay ? " active" : ""}">
        <span class="week-overview-day">${d.slice(0, 3)}</span>
        <span class="week-overview-type">${day.type || "Rest day"}</span>
        <span class="week-overview-progress">${total ? done + "/" + total : "—"}</span>
      </div>`;
  }).join("");
}

renderTabs();
renderDay();
