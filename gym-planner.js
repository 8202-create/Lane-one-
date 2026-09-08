// ===== Lane One Gym Planner logic =====

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const plan = getGymPlan();
let activeDay = DAYS[0];

function ensureDay(day) {
  if (!plan[day]) plan[day] = [];
  return plan[day];
}

// ---------- Plan generator (rule-based, no external AI) ----------

const EXERCISES_BY_TYPE = {
  "Full Body": ["Squats 3x10", "Push-ups 3x12", "Bent-over rows 3x10", "Plank 3x30s", "Lunges 3x10/leg"],
  "Upper Body": ["Bench press 4x8", "Bent-over rows 4x8", "Overhead press 3x10", "Bicep curls 3x12", "Tricep dips 3x12"],
  "Lower Body": ["Squats 4x8", "Romanian deadlifts 3x10", "Leg press 3x10", "Calf raises 3x15", "Lunges 3x10/leg"],
  "Push": ["Bench press 4x8", "Overhead press 3x10", "Incline dumbbell press 3x10", "Tricep pushdowns 3x12", "Lateral raises 3x12"],
  "Pull": ["Deadlifts 3x6", "Pull-ups 3x8", "Bent-over rows 4x8", "Face pulls 3x15", "Bicep curls 3x12"],
  "Legs": ["Squats 4x8", "Romanian deadlifts 3x10", "Leg press 3x10", "Calf raises 3x15", "Leg curls 3x12"],
  "Chest & Triceps": ["Bench press 4x8", "Incline dumbbell press 3x10", "Chest fly 3x12", "Tricep dips 3x12", "Tricep pushdowns 3x12"],
  "Back & Biceps": ["Pull-ups 3x8", "Bent-over rows 4x8", "Lat pulldown 3x10", "Bicep curls 3x12", "Hammer curls 3x12"],
  "Shoulders & Abs": ["Overhead press 3x10", "Lateral raises 3x12", "Face pulls 3x15", "Plank 3x40s", "Hanging leg raises 3x12"],
  "Cardio": ["Warm-up walk, 10 min", "Steady jog or cycle, 25 min", "Cool-down stretch, 10 min"],
  "Squat Focus": ["Back squats 5x5", "Leg press 3x10", "Walking lunges 3x10/leg", "Calf raises 3x15"],
  "Bench Focus": ["Bench press 5x5", "Incline dumbbell press 3x10", "Tricep pushdowns 3x12", "Chest fly 3x12"],
  "Deadlift Focus": ["Deadlifts 5x5", "Bent-over rows 4x8", "Face pulls 3x15", "Plank 3x40s"],
  "Overhead Press Focus": ["Overhead press 5x5", "Lateral raises 3x12", "Pull-ups 3x8", "Bicep curls 3x12"],
};

const TEMPLATE_SEQUENCES = {
  full_body: ["Full Body"],
  upper_lower: ["Upper Body", "Lower Body"],
  ppl: ["Push", "Pull", "Legs"],
  cardio_mix: ["Cardio", "Full Body"],
  strength: ["Squat Focus", "Bench Focus", "Deadlift Focus", "Overhead Press Focus"],
  bro_split: ["Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Abs", "Full Body"],
};

const TEMPLATE_DEFAULT_DAYS = { full_body: 3, upper_lower: 4, ppl: 6, cardio_mix: 4, strength: 4, bro_split: 5 };

function pickTemplate(text) {
  const t = text.toLowerCase();
  if (t.includes("push") && t.includes("pull")) return "ppl";
  if (t.includes("upper") && t.includes("lower")) return "upper_lower";
  if (t.includes("beginner") || t.includes("full body") || t.includes("fullbody")) return "full_body";
  if (t.includes("cardio") || t.includes("fat loss") || t.includes("weight loss") || t.includes("lose weight") || t.includes("endurance")) return "cardio_mix";
  if (t.includes("strength") || t.includes("powerlifting") || t.includes("power lifting")) return "strength";
  return "bro_split"; // default: muscle building / hypertrophy / general gym goals
}

function pickDayCount(text, templateKey) {
  const match = text.match(/(\d)\s*(?:days?|x|times)/i);
  if (match) return Math.min(7, Math.max(1, parseInt(match[1])));
  return TEMPLATE_DEFAULT_DAYS[templateKey];
}

function distributeTrainingDays(count) {
  const slots = new Array(7).fill(false);
  if (count >= 7) return slots.fill(true);
  const interval = 7 / count;
  for (let i = 0; i < count; i++) {
    slots[Math.min(6, Math.round(i * interval))] = true;
  }
  return slots;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let idCounter = 0;
function nextId() { return Date.now() + (idCounter++); }

function generatePlanFromDescription(text) {
  const templateKey = pickTemplate(text);
  const dayCount = pickDayCount(text, templateKey);
  const sequence = TEMPLATE_SEQUENCES[templateKey];
  const slots = distributeTrainingDays(dayCount);

  const newPlan = {};
  // Random starting point in the sequence and a shuffled exercise pick order,
  // so regenerating (even with a similar prompt) gives a visibly different result.
  let seqIndex = Math.floor(Math.random() * sequence.length);
  DAYS.forEach((day, i) => {
    if (slots[i]) {
      const type = sequence[seqIndex % sequence.length];
      seqIndex++;
      const exerciseNames = shuffle(EXERCISES_BY_TYPE[type]);
      newPlan[day] = [{
        id: nextId(),
        type,
        exercises: exerciseNames.map(name => ({ id: nextId(), name, done: false })),
      }];
    } else {
      newPlan[day] = [];
    }
  });
  return newPlan;
}

document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("generatorInput").value.trim();
  if (!text) return;

  const generated = generatePlanFromDescription(text);
  DAYS.forEach(d => plan[d] = generated[d]);
  saveGymPlan(plan);
  renderTabs();
  renderDay();

  const btn = document.getElementById("generateBtn");
  const original = btn.textContent;
  btn.textContent = "New plan generated ✓";
  setTimeout(() => btn.textContent = original, 1500);
});

// ---------- Rendering ----------

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
  const sessions = ensureDay(activeDay);
  document.getElementById("dayTitle").textContent = activeDay;
  document.getElementById("logDate").value = new Date().toISOString().split("T")[0];

  const container = document.getElementById("sessionsContainer");
  if (!sessions.length) {
    container.innerHTML = `<p class="footer-note">Rest day — no sessions planned. Add one below if you want to train ${activeDay}.</p>`;
  } else {
    container.innerHTML = sessions.map((session, sIdx) => `
      <div class="session-block" data-session-id="${session.id}">
        <div class="session-block-top">
          <input type="text" class="session-type-input" list="workoutTypes" value="${session.type}" placeholder="Workout type" data-session-id="${session.id}" style="font-family: var(--font-display); font-size:18px; background:transparent; border:none; border-bottom:2px solid var(--lane); color:var(--text); padding:4px 0; flex:1; min-width:160px;">
          ${sessions.length > 1 ? `<button type="button" class="session-remove-btn" data-session-id="${session.id}">Remove this session</button>` : ""}
        </div>
        <div class="exercise-list" data-session-id="${session.id}"></div>
        <form class="add-exercise-form run-form" data-session-id="${session.id}" style="border-top:none; padding-top:12px;">
          <div class="field-combo" style="max-width:360px;">
            <input type="text" class="exercise-input" placeholder="Add an exercise, e.g. Bench press 4x8">
          </div>
          <button type="submit" class="ghost-btn" style="margin-top:10px;">Add exercise</button>
        </form>
      </div>
    `).join("");

    sessions.forEach(session => renderExercises(session));

    container.querySelectorAll(".session-type-input").forEach(input => {
      input.addEventListener("change", () => {
        const session = sessions.find(s => s.id === Number(input.dataset.sessionId));
        session.type = input.value.trim() || "Untitled";
        saveGymPlan(plan);
        renderWeekOverview();
      });
    });

    container.querySelectorAll(".session-remove-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        plan[activeDay] = sessions.filter(s => s.id !== Number(btn.dataset.sessionId));
        saveGymPlan(plan);
        renderDay();
      });
    });

    container.querySelectorAll(".add-exercise-form").forEach(form => {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = form.querySelector(".exercise-input");
        const name = input.value.trim();
        if (!name) return;
        const session = sessions.find(s => s.id === Number(form.dataset.sessionId));
        session.exercises.push({ id: Date.now(), name, done: false });
        saveGymPlan(plan);
        input.value = "";
        renderDay();
      });
    });
  }

  document.getElementById("addSessionBtn").hidden = sessions.length >= 2;
  renderWeekOverview();
}

function renderExercises(session) {
  const list = document.querySelector(`.exercise-list[data-session-id="${session.id}"]`);
  if (!list) return;
  if (!session.exercises.length) {
    list.innerHTML = `<p class="footer-note">No exercises yet.</p>`;
    return;
  }
  list.innerHTML = session.exercises.map(ex => `
    <div class="exercise-row">
      <label class="exercise-check">
        <input type="checkbox" ${ex.done ? "checked" : ""} data-ex-id="${ex.id}" data-session-id="${session.id}">
        <span class="${ex.done ? "exercise-done" : ""}" data-ex-id="${ex.id}" data-session-id="${session.id}">${ex.name}</span>
      </label>
      <span>
        <button type="button" class="text-link exercise-edit" data-ex-id="${ex.id}" data-session-id="${session.id}">Edit</button>
        <button type="button" class="text-link exercise-delete" data-ex-id="${ex.id}" data-session-id="${session.id}">Remove</button>
      </span>
    </div>
  `).join("");

  list.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      const ex = session.exercises.find(e => e.id === Number(cb.dataset.exId));
      ex.done = cb.checked;
      saveGymPlan(plan);
      renderExercises(session);
      renderWeekOverview();
    });
  });

  list.querySelectorAll(".exercise-edit").forEach(btn => {
    btn.addEventListener("click", () => {
      const ex = session.exercises.find(e => e.id === Number(btn.dataset.exId));
      const updated = prompt("Edit exercise", ex.name);
      if (updated && updated.trim()) {
        ex.name = updated.trim();
        saveGymPlan(plan);
        renderExercises(session);
      }
    });
  });

  list.querySelectorAll(".exercise-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      session.exercises = session.exercises.filter(e => e.id !== Number(btn.dataset.exId));
      saveGymPlan(plan);
      renderExercises(session);
      renderWeekOverview();
    });
  });
}

document.getElementById("addSessionBtn").addEventListener("click", () => {
  const sessions = ensureDay(activeDay);
  if (sessions.length >= 2) return;
  sessions.push({ id: Date.now(), type: "", exercises: [] });
  saveGymPlan(plan);
  renderDay();
});

document.getElementById("resetWeekBtn").addEventListener("click", () => {
  DAYS.forEach(d => {
    (plan[d] || []).forEach(session => session.exercises.forEach(e => e.done = false));
  });
  saveGymPlan(plan);
  renderDay();
});

document.getElementById("logDayBtn").addEventListener("click", () => {
  const sessions = ensureDay(activeDay);
  const date = document.getElementById("logDate").value || new Date().toISOString().split("T")[0];
  const totalExercises = sessions.reduce((s, sess) => s + sess.exercises.length, 0);
  const completedExercises = sessions.reduce((s, sess) => s + sess.exercises.filter(e => e.done).length, 0);

  logGymWorkout({
    date: new Date(date).toISOString(),
    day: activeDay,
    sessions: sessions.map(s => ({ type: s.type, exercises: s.exercises.map(e => ({ name: e.name, done: e.done })) })),
    totalExercises,
    completedExercises,
  });

  const confirmEl = document.getElementById("logConfirm");
  confirmEl.hidden = false;
  setTimeout(() => confirmEl.hidden = true, 2000);
});

function renderWeekOverview() {
  const grid = document.getElementById("weekOverview");
  grid.innerHTML = DAYS.map(d => {
    const sessions = plan[d] || [];
    const total = sessions.reduce((s, sess) => s + sess.exercises.length, 0);
    const done = sessions.reduce((s, sess) => s + sess.exercises.filter(e => e.done).length, 0);
    const label = sessions.length ? sessions.map(s => s.type || "Untitled").join(" + ") : "Rest day";
    return `
      <div class="week-overview-item${d === activeDay ? " active" : ""}">
        <span class="week-overview-day">${d.slice(0, 3)}</span>
        <span class="week-overview-type">${label}</span>
        <span class="week-overview-progress">${total ? done + "/" + total : "—"}</span>
      </div>`;
  }).join("");
}

renderTabs();
renderDay();
