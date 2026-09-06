// ===== Lane One shared storage layer (browser localStorage — no account needed) =====

function formatPace(secondsPerUnit) {
  if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "0:00";
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const STORAGE_KEYS = {
  RUNS: "laneone_runs",
  GOALS: "laneone_goals",
  PROFILE: "laneone_profile",
  GYM_PLAN: "laneone_gymplan",
  GYM_HISTORY: "laneone_gym_history",
  GYM_GOALS: "laneone_gym_goals",
};

// Gym plan model: { Monday: [ {id, type, exercises:[{id,name,done}]}, ... up to 2 sessions ], ... }

function getGymPlan() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GYM_PLAN)) || {}; }
  catch (e) { return {}; }
}

function saveGymPlan(plan) {
  localStorage.setItem(STORAGE_KEYS.GYM_PLAN, JSON.stringify(plan));
}

function getGymHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GYM_HISTORY)) || []; }
  catch (e) { return []; }
}

function saveGymHistoryList(list) {
  localStorage.setItem(STORAGE_KEYS.GYM_HISTORY, JSON.stringify(list));
}

function logGymWorkout(entry) {
  const list = getGymHistory();
  entry.id = Date.now();
  entry.date = entry.date || new Date().toISOString();
  list.push(entry);
  saveGymHistoryList(list);
  return entry;
}

function deleteGymHistoryEntry(id) {
  saveGymHistoryList(getGymHistory().filter(h => h.id !== id));
}

function getGymGoals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GYM_GOALS)) || []; }
  catch (e) { return []; }
}

function saveGymGoals(goals) {
  localStorage.setItem(STORAGE_KEYS.GYM_GOALS, JSON.stringify(goals));
}

function computeGymStreak(history) {
  const daySet = new Set(history.map(h => new Date(h.date).toDateString()));
  let streak = 0;
  let cursor = new Date();
  if (!daySet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

const GYM_ACHIEVEMENT_DEFS = [
  { id: "first_workout", name: "First workout logged", test: s => s.total >= 1 },
  { id: "10_workouts", name: "10 workouts logged", test: s => s.total >= 10 },
  { id: "50_workouts", name: "50 workouts logged", test: s => s.total >= 50 },
  { id: "gym_streak3", name: "3-day streak", test: s => s.streak >= 3 },
  { id: "gym_streak7", name: "7-day streak", test: s => s.streak >= 7 },
  { id: "gym_streak30", name: "30-day streak", test: s => s.streak >= 30 },
];

function computeGymAchievements(history) {
  const stats = { total: history.length, streak: computeGymStreak(history) };
  return GYM_ACHIEVEMENT_DEFS.map(a => ({ ...a, earned: a.test(stats) }));
}


function getRuns() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.RUNS)) || []; }
  catch (e) { return []; }
}

function saveRuns(runs) {
  localStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
}

function addRun(run) {
  const runs = getRuns();
  run.id = Date.now();
  run.date = run.date || new Date().toISOString();
  runs.push(run);
  saveRuns(runs);
  return run;
}

function deleteRun(id) {
  saveRuns(getRuns().filter(r => r.id !== id));
}

function getGoals() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.GOALS)) || []; }
  catch (e) { return []; }
}

function saveGoals(goals) {
  localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
}

function getProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILE)) || {}; }
  catch (e) { return {}; }
}

function saveProfile(profile) {
  localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
}

// ---------- Aggregate stats ----------

function computeStats(runs) {
  if (!runs.length) return null;
  const totalDistanceKm = runs.reduce((s, r) => s + r.distanceKm, 0);
  const totalSeconds = runs.reduce((s, r) => s + r.totalSeconds, 0);
  const totalCalories = runs.reduce((s, r) => s + (r.calories || 0), 0);
  return {
    totalRuns: runs.length,
    totalDistanceKm,
    totalSeconds,
    totalCalories,
    avgPaceSecPerKm: totalSeconds / totalDistanceKm,
    avgSpeedKph: totalDistanceKm / (totalSeconds / 3600),
  };
}

function computePersonalBests(runs) {
  if (!runs.length) return null;
  const bestNear = (target, tolerance) => {
    const candidates = runs.filter(r => Math.abs(r.distanceKm - target) <= tolerance);
    return candidates.reduce((best, r) => (!best || r.totalSeconds < best.totalSeconds) ? r : best, null);
  };
  const reduceBest = (filterFn, compareFn) => {
    const candidates = runs.filter(filterFn);
    return candidates.reduce((best, r) => (!best || compareFn(r, best)) ? r : best, null);
  };
  return {
    fastestPace: reduceBest(() => true, (r, best) => r.secPerKm < best.secPerKm),
    longest: reduceBest(() => true, (r, best) => r.distanceKm > best.distanceKm),
    mostElevation: reduceBest(r => r.elevationGain, (r, best) => r.elevationGain > best.elevationGain),
    bestSplit: reduceBest(r => r.fastestSplitSec, (r, best) => r.fastestSplitSec < best.fastestSplitSec),
    best1k: bestNear(1, 0.15),
    best5k: bestNear(5, 0.3),
    best10k: bestNear(10, 0.5),
  };
}

function computeStreak(runs) {
  const daySet = new Set(runs.map(r => new Date(r.date).toDateString()));
  let streak = 0;
  let cursor = new Date();
  if (!daySet.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (daySet.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return [monday, nextMonday];
}

function getMonthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return [start, end];
}

function mileageInRange(runs, start, end) {
  return runs
    .filter(r => { const d = new Date(r.date); return d >= start && d < end; })
    .reduce((s, r) => s + r.distanceKm, 0);
}

// ---------- Achievements (gamification) ----------

const ACHIEVEMENT_DEFS = [
  { id: "first_run", name: "First run logged", test: s => s.totalRuns >= 1 },
  { id: "5_runs", name: "5 runs logged", test: s => s.totalRuns >= 5 },
  { id: "25_runs", name: "25 runs logged", test: s => s.totalRuns >= 25 },
  { id: "10km_life", name: "10km lifetime", test: s => s.totalDistanceKm >= 10 },
  { id: "50km_life", name: "50km lifetime", test: s => s.totalDistanceKm >= 50 },
  { id: "100km_life", name: "100km lifetime", test: s => s.totalDistanceKm >= 100 },
  { id: "500km_life", name: "500km lifetime", test: s => s.totalDistanceKm >= 500 },
  { id: "streak3", name: "3-day streak", test: s => s.streak >= 3 },
  { id: "streak7", name: "7-day streak", test: s => s.streak >= 7 },
  { id: "streak30", name: "30-day streak", test: s => s.streak >= 30 },
];

function computeAchievements(runs) {
  const stats = computeStats(runs) || { totalRuns: 0, totalDistanceKm: 0 };
  stats.streak = computeStreak(runs);
  return ACHIEVEMENT_DEFS.map(a => ({ ...a, earned: a.test(stats) }));
}
