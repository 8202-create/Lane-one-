// ---------- Reference data ----------

// Natural/athletic speed references (km/h), used for the fun comparison line
const SPEED_REFERENCES = [
  { name: "a garden snail", kph: 0.05 },
  { name: "a giant tortoise", kph: 0.27 },
  { name: "a brisk walker", kph: 5.0 },
  { name: "a chicken at full sprint", kph: 14.5 },
  { name: "a pig on the run", kph: 17.7 },
  { name: "an elephant charging", kph: 25 },
  { name: "a racing greyhound", kph: 63 },
  { name: "a cheetah at top speed", kph: 112 },
];

const USAIN_BOLT_KPH = 37.6; // his 100m world record average speed

// Effort zones by pace (seconds per km), fastest first
const EFFORT_ZONES = [
  { max: 240, label: "Sprint effort", angle: 165 },
  { max: 300, label: "Hard effort", angle: 125 },
  { max: 360, label: "Tempo effort", angle: 85 },
  { max: 420, label: "Steady effort", angle: 45 },
  { max: Infinity, label: "Easy effort", angle: 10 },
];

// ---------- Helpers ----------

function formatPace(secondsPerUnit) {
  if (!isFinite(secondsPerUnit) || secondsPerUnit <= 0) return "0:00";
  const m = Math.floor(secondsPerUnit / 60);
  const s = Math.round(secondsPerUnit % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function metFromSpeedKph(kph) {
  // Approximate MET values for running at various speeds
  if (kph < 6.4) return 6.0;
  if (kph < 8.0) return 8.3;
  if (kph < 9.7) return 9.8;
  if (kph < 10.8) return 11.0;
  if (kph < 11.3) return 11.8;
  if (kph < 12.1) return 12.8;
  if (kph < 12.9) return 14.5;
  if (kph < 13.8) return 16.0;
  if (kph < 16.0) return 19.0;
  return 19.8;
}

function effortZoneFor(secondsPerKm) {
  return EFFORT_ZONES.find(z => secondsPerKm <= z.max) || EFFORT_ZONES[EFFORT_ZONES.length - 1];
}

// ---------- Badge definitions ----------
// Each returns true/false given the computed run stats
const BADGE_DEFINITIONS = [
  { id: "5k", name: "5K finisher", test: r => r.distanceKm >= 5 },
  { id: "10k", name: "10K finisher", test: r => r.distanceKm >= 10 },
  { id: "half", name: "Half marathon", test: r => r.distanceKm >= 21.0975 },
  { id: "marathon", name: "Marathon", test: r => r.distanceKm >= 42.195 },
  { id: "sub5", name: "Sub 5:00 pace", test: r => r.secPerKm < 300 },
  { id: "hour", name: "Ran an hour+", test: r => r.totalSeconds >= 3600 },
];

// ---------- Main calculation ----------

function analyzeRun({ distance, unit, hours, minutes, seconds, weight }) {
  const distanceKm = unit === "mi" ? distance * 1.60934 : distance;
  const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

  const secPerKm = totalSeconds / distanceKm;
  const secPerMi = secPerKm * 1.60934;
  const speedKph = distanceKm / (totalSeconds / 3600);
  const speedMph = speedKph / 1.60934;

  const weightKg = weight && weight > 0 ? weight : 70;
  const met = metFromSpeedKph(speedKph);
  const calories = Math.round(met * weightKg * (totalSeconds / 3600));

  return { distanceKm, distanceMi: distanceKm / 1.60934, totalSeconds, secPerKm, secPerMi, speedKph, speedMph, calories, weightKg };
}

function buildCoachReport(r, unit) {
  const zone = effortZoneFor(r.secPerKm);
  const paceStr = unit === "mi" ? `${formatPace(r.secPerMi)} min/mi` : `${formatPace(r.secPerKm)} min/km`;

  let distanceLine;
  if (r.distanceKm < 3) {
    distanceLine = "a short, sharp effort";
  } else if (r.distanceKm < 8) {
    distanceLine = "a solid mid-distance run";
  } else if (r.distanceKm < 15) {
    distanceLine = "a proper long run";
  } else {
    distanceLine = "serious distance — the kind that takes real endurance";
  }

  let tip;
  if (zone.label === "Sprint effort") {
    tip = "That's close to an all-out pace — make sure your next session is an easy recovery run.";
  } else if (zone.label === "Hard effort") {
    tip = "That's threshold-territory pace. Good for building speed, but don't run it back-to-back days.";
  } else if (zone.label === "Tempo effort") {
    tip = "A comfortably hard pace — this is the sweet spot for building fitness without overreaching.";
  } else if (zone.label === "Steady effort") {
    tip = "A controlled, sustainable pace. Great for building your aerobic base.";
  } else {
    tip = "An easy, conversational pace — ideal for recovery days or building mileage safely.";
  }

  return `You covered ${distanceLine} at ${paceStr}, averaging ${r.speedKph.toFixed(1)} km/h. ${zone.label}. ${tip}`;
}

function buildComparison(r) {
  const below = [...SPEED_REFERENCES].reverse().find(ref => ref.kph <= r.speedKph);
  const above = SPEED_REFERENCES.find(ref => ref.kph > r.speedKph);

  let line = "";
  if (below) line += `You're faster than ${below.name}. `;
  if (above) {
    line += `Still behind ${above.name}. `;
  } else {
    line += `You're outrunning every reference on the list. `;
  }
  const boltPct = ((r.speedKph / USAIN_BOLT_KPH) * 100).toFixed(0);
  line += `That's about ${boltPct}% of Usain Bolt's world-record sprint speed.`;
  return line;
}

function renderBadges(r) {
  const list = document.getElementById("badgeList");
  list.innerHTML = "";
  BADGE_DEFINITIONS.forEach(b => {
    const earned = b.test(r);
    const el = document.createElement("span");
    el.className = "badge" + (earned ? "" : " locked");
    el.textContent = b.name;
    list.appendChild(el);
  });
}

function updateGauge(r) {
  const zone = effortZoneFor(r.secPerKm);
  const needle = document.getElementById("gaugeNeedle");
  const fill = document.getElementById("gaugeFill");
  const label = document.getElementById("effortLabel");

  // angle: 0 = far left (easy), 180 = far right (sprint), needle drawn pointing up at rest
  const rotation = zone.angle - 90;
  needle.style.transform = `rotate(${rotation}deg)`;

  const pct = Math.min(1, Math.max(0, zone.angle / 180));
  const dashOffset = 251 - (251 * pct);
  fill.style.strokeDashoffset = dashOffset;

  label.textContent = zone.label;
}

function drawShareCard(r, unit) {
  const canvas = document.getElementById("shareCanvas");
  const ctx = canvas.getContext("2d");
  const isLight = document.body.classList.contains("light");

  ctx.fillStyle = isLight ? "#f2f0ea" : "#10131a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = isLight ? "#d8d4c8" : "#2a3040";
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.fillStyle = isLight ? "#171b24" : "#f2f0ea";
  ctx.font = "600 32px Oswald, sans-serif";
  ctx.fillText("LANE ONE", 60, 90);

  ctx.fillStyle = "#d4ff3d";
  ctx.font = "600 120px Oswald, sans-serif";
  const paceStr = unit === "mi" ? formatPace(r.secPerMi) : formatPace(r.secPerKm);
  ctx.fillText(paceStr, 60, 250);

  ctx.fillStyle = isLight ? "#5a6270" : "#8b93a1";
  ctx.font = "400 26px Inter, sans-serif";
  ctx.fillText(unit === "mi" ? "min / mile" : "min / km", 60, 290);

  const dist = unit === "mi" ? r.distanceMi.toFixed(2) + " mi" : r.distanceKm.toFixed(2) + " km";
  ctx.fillStyle = isLight ? "#171b24" : "#f2f0ea";
  ctx.font = "500 30px Inter, sans-serif";
  ctx.fillText(`${dist}  •  ${r.speedKph.toFixed(1)} km/h  •  ${r.calories} cal`, 60, 360);

  ctx.fillStyle = isLight ? "#5a6270" : "#8b93a1";
  ctx.font = "400 22px Inter, sans-serif";
  ctx.fillText("Track your own run — built with Lane One", 60, 500);
}

// ---------- Wire up events ----------

document.getElementById("runForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const distance = parseFloat(document.getElementById("distance").value);
  const unit = document.getElementById("unit").value;
  const hours = parseFloat(document.getElementById("hours").value) || 0;
  const minutes = parseFloat(document.getElementById("minutes").value) || 0;
  const seconds = parseFloat(document.getElementById("seconds").value) || 0;
  const weight = parseFloat(document.getElementById("weight").value);

  if (!distance || distance <= 0 || (hours + minutes + seconds) <= 0) return;

  const r = analyzeRun({ distance, unit, hours, minutes, seconds, weight });

  document.getElementById("paceMain").textContent = unit === "mi" ? formatPace(r.secPerMi) : formatPace(r.secPerKm);
  document.getElementById("paceUnit").textContent = unit === "mi" ? "min / mile" : "min / km";
  document.getElementById("paceAlt").textContent = unit === "mi"
    ? `${formatPace(r.secPerKm)} min/km`
    : `${formatPace(r.secPerMi)} min/mile`;

  document.getElementById("statSpeed").textContent = r.speedKph.toFixed(1);
  document.getElementById("statCalories").textContent = r.calories;

  const fiveKPct = Math.round((r.distanceKm / 5) * 100);
  document.getElementById("statDistancePct").textContent = `${fiveKPct}%`;
  document.getElementById("statDistanceLabel").textContent = "of a 5K";

  document.getElementById("coachReport").textContent = buildCoachReport(r, unit);
  document.getElementById("comparisonText").textContent = buildComparison(r);

  renderBadges(r);
  updateGauge(r);
  drawShareCard(r, unit);

  document.getElementById("results").hidden = false;
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  const btn = document.getElementById("themeToggle");
  btn.textContent = document.body.classList.contains("light") ? "Night track" : "Day track";
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const canvas = document.getElementById("shareCanvas");
  const link = document.createElement("a");
  link.download = "lane-one-run.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});
