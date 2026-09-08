// ===== Lane One Gym Planner logic =====

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const plan = getGymPlan();
let activeDay = DAYS[0];

// Prefill age/gender from a previously saved profile, if any.
(() => {
  const savedProfile = getProfile();
  if (savedProfile.age) document.getElementById("generatorAge").value = savedProfile.age;
  if (savedProfile.gender) document.getElementById("generatorGender").value = savedProfile.gender;
})();

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
  "Chest": ["Bench press 4x8", "Incline dumbbell press 3x10", "Chest fly 3x12", "Push-ups 3x15"],
  "Back": ["Pull-ups 3x8", "Bent-over rows 4x8", "Lat pulldown 3x10", "Face pulls 3x15"],
  "Shoulders": ["Overhead press 3x10", "Lateral raises 3x12", "Front raises 3x12", "Face pulls 3x15"],
  "Arms": ["Bicep curls 3x12", "Hammer curls 3x12", "Tricep dips 3x12", "Tricep pushdowns 3x12"],
  "Abs": ["Plank 3x40s", "Hanging leg raises 3x12", "Cable crunches 3x15", "Russian twists 3x20"],
  "Glutes": ["Hip thrusts 4x10", "Bulgarian split squats 3x10/leg", "Glute bridges 3x15", "Cable kickbacks 3x12"],
  "Calves": ["Standing calf raises 4x15", "Seated calf raises 3x15", "Jump rope 3x1min"],
};

// Direct muscle mentions, checked before the broader split-style templates so
// "focus on chest, back and legs" builds exactly that instead of a generic split.
const MUSCLE_KEYWORDS = {
  chest: "Chest", pecs: "Chest",
  back: "Back", lats: "Back",
  shoulders: "Shoulders", delts: "Shoulders", deltoids: "Shoulders",
  arms: "Arms", biceps: "Arms", triceps: "Arms",
  abs: "Abs", core: "Abs", stomach: "Abs", "six pack": "Abs", sixpack: "Abs",
  glutes: "Glutes", butt: "Glutes",
  calves: "Calves",
  legs: "Legs", quads: "Legs", hamstrings: "Legs",
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

const NUMBER_WORDS = {
  once: 1, one: 1, twice: 2, two: 2, thrice: 3, three: 3,
  four: 4, five: 5, six: 6, seven: 7,
};

const BODYWEIGHT_SWAPS = {
  "Bench press 4x8": "Push-ups 4x15", "Bench press 5x5": "Decline push-ups 4x12",
  "Squats 4x8": "Bodyweight squats 4x20", "Squats 3x10": "Bodyweight squats 3x20",
  "Back squats 5x5": "Jump squats 4x15",
  "Deadlifts 3x6": "Single-leg RDLs (bodyweight) 3x10/leg", "Deadlifts 5x5": "Glute bridges 4x15",
  "Overhead press 3x10": "Pike push-ups 3x12", "Overhead press 5x5": "Pike push-ups 4x12",
  "Bent-over rows 4x8": "Inverted rows or towel rows 3x12", "Bent-over rows 3x10": "Inverted rows or towel rows 3x12",
  "Leg press 3x10": "Bulgarian split squats 3x10/leg",
  "Incline dumbbell press 3x10": "Incline push-ups 3x15",
  "Lat pulldown 3x10": "Pull-ups or doorframe rows 3x10",
  "Chest fly 3x12": "Wide push-ups 3x15",
};

function extractMuscleGroups(text) {
  const t = text.toLowerCase();
  const found = [];
  Object.keys(MUSCLE_KEYWORDS).forEach(keyword => {
    const re = new RegExp(`\\b${keyword}\\b`);
    if (re.test(t) && !found.includes(MUSCLE_KEYWORDS[keyword])) found.push(MUSCLE_KEYWORDS[keyword]);
  });
  return found;
}

function pickTemplate(text) {
  const t = text.toLowerCase();
  if (t.includes("push") && t.includes("pull")) return "ppl";
  if (t.includes("upper") && t.includes("lower")) return "upper_lower";
  if (/\bbeginner|full ?body|new to (the )?gym|just start/.test(t)) return "full_body";
  if (/\bcardio|fat ?loss|weight ?loss|lose weight|lean|shred|cutting|endurance|stamina|marathon/.test(t)) return "cardio_mix";
  if (/\bstrength|powerlifting|power ?lifting|powerbuilding|1rm|one rep max|get stronger/.test(t)) return "strength";
  if (/\bhypertrophy|bodybuilding|bulk|bulking|gain (weight|muscle|mass)|build muscle|tone|toning|muscle mass/.test(t)) return "bro_split";
  return "bro_split"; // sensible default for general/unclear gym goals
}

function pickDayCount(text) {
  const t = text.toLowerCase();
  if (/every ?day|daily|7 ?days?/.test(t)) return 7;
  const digitMatch = t.match(/(\d)\s*(?:days?|x|times|sessions?)/);
  if (digitMatch) return Math.min(7, Math.max(1, parseInt(digitMatch[1])));
  for (const [word, num] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b(?!\\s*(?:hour|min|rep|set))`).test(t)) return num;
  }
  return null; // let the template's own default decide
}

function wantsBodyweight(text) {
  return /no equipment|bodyweight|body weight|home workout|without (a )?gym|no gym|no weights/i.test(text);
}

function applyEquipment(exerciseName, bodyweight) {
  if (!bodyweight) return exerciseName;
  return BODYWEIGHT_SWAPS[exerciseName] || exerciseName;
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

// Light, general heuristic only — not personalized medical or training advice.
// For older users, swap heavy low-rep schemes for moderate higher-rep ones.
function adjustForAge(exerciseName, age) {
  if (!age || age < 55) return exerciseName;
  return exerciseName
    .replace(/5x5/g, "3x10")
    .replace(/4x6/g, "3x10")
    .replace(/3x6/g, "3x10");
}

let idCounter = 0;
function nextId() { return Date.now() + (idCounter++); }

function hasSplitStyleKeywords(text) {
  const t = text.toLowerCase();
  return (t.includes("push") && t.includes("pull")) || (t.includes("upper") && t.includes("lower"));
}

function generatePlanFromDescription(text, age) {
  const muscleGroups = hasSplitStyleKeywords(text) ? [] : extractMuscleGroups(text);
  const bodyweight = wantsBodyweight(text);
  const explicitDays = pickDayCount(text);

  let sequence, dayCount, templateKey;

  if (muscleGroups.length >= 1) {
    // User named specific muscle groups directly — build the split around exactly those.
    sequence = muscleGroups;
    dayCount = explicitDays || muscleGroups.length;
    templateKey = "custom";
  } else {
    templateKey = pickTemplate(text);
    sequence = TEMPLATE_SEQUENCES[templateKey];
    dayCount = explicitDays || TEMPLATE_DEFAULT_DAYS[templateKey];
  }

  const slots = distributeTrainingDays(dayCount);
  const newPlan = {};
  let seqIndex = Math.floor(Math.random() * sequence.length);

  DAYS.forEach((day, i) => {
    if (slots[i]) {
      const type = sequence[seqIndex % sequence.length];
      seqIndex++;
      const pool = EXERCISES_BY_TYPE[type] || EXERCISES_BY_TYPE["Full Body"];
      const exerciseNames = shuffle(pool)
        .map(name => adjustForAge(name, age))
        .map(name => applyEquipment(name, bodyweight));
      newPlan[day] = [{
        id: nextId(),
        type,
        exercises: exerciseNames.map(name => ({ id: nextId(), name, done: false })),
      }];
    } else {
      newPlan[day] = [];
    }
  });

  return {
    plan: newPlan,
    summary: {
      days: dayCount,
      focus: muscleGroups.length ? muscleGroups.join(", ") : templateKey.replace("_", "/"),
      bodyweight,
    },
  };
}

document.getElementById("generateBtn").addEventListener("click", () => {
  const text = document.getElementById("generatorInput").value.trim();
  if (!text) return;

  const age = parseInt(document.getElementById("generatorAge").value) || null;
  const gender = document.getElementById("generatorGender").value || null;
  const profile = getProfile();
  if (age) profile.age = age;
  if (gender) profile.gender = gender;
  saveProfile(profile);

  const { plan: generated, summary } = generatePlanFromDescription(text, age);
  DAYS.forEach(d => plan[d] = generated[d]);
  saveGymPlan(plan);
  renderTabs();
  renderDay();

  const understoodEl = document.getElementById("generatorUnderstood");
  understoodEl.hidden = false;
  understoodEl.textContent = `Understood: ${summary.days} day${summary.days > 1 ? "s" : ""} a week, focused on ${summary.focus}${summary.bodyweight ? ", bodyweight-friendly" : ""}. Not quite right? Try rewording and generate again.`;

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
