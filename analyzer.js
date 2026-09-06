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

// ---------- Splits ----------

function parseSplits(text) {
  if (!text || !text.trim()) return [];
  return text.split(",").map(s => s.trim()).filter(Boolean).map(part => {
    const bits = part.split(":").map(Number);
    if (bits.length === 2) return bits[0] * 60 + bits[1];
    return Number(part) || 0;
  }).filter(v => v > 0);
}

function splitStats(splitsSec) {
  if (!splitsSec.length) return null;
  const fastestSplitSec = Math.min(...splitsSec);
  const slowestSplitSec = Math.max(...splitsSec);
  const mean = splitsSec.reduce((a, b) => a + b, 0) / splitsSec.length;
  const variance = splitsSec.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / splitsSec.length;
  const stdDev = Math.sqrt(variance);
  const consistency = stdDev < 5 ? "Very consistent" : stdDev < 12 ? "Fairly consistent" : stdDev < 25 ? "Variable" : "Highly variable";
  return { fastestSplitSec, slowestSplitSec, stdDev, consistency,
    fastestIdx: splitsSec.indexOf(fastestSplitSec), slowestIdx: splitsSec.indexOf(slowestSplitSec) };
}

// ---------- Stride length & running efficiency (rough estimates) ----------

function estimateStrideLength(speedKph, cadence) {
  if (!cadence) return null;
  const speedMPerMin = (speedKph * 1000) / 60;
  return speedMPerMin / cadence; // meters per stride, approximate
}

function estimateEfficiency(splitStatsResult) {
  if (!splitStatsResult) return null;
  if (splitStatsResult.stdDev < 5) return 90;
  if (splitStatsResult.stdDev < 12) return 75;
  if (splitStatsResult.stdDev < 25) return 55;
  return 35;
}

// ---------- GPX / TCX import ----------

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const points = Array.from(doc.getElementsByTagName("trkpt")).map(pt => ({
    lat: parseFloat(pt.getAttribute("lat")),
    lon: parseFloat(pt.getAttribute("lon")),
    ele: pt.getElementsByTagName("ele")[0] ? parseFloat(pt.getElementsByTagName("ele")[0].textContent) : null,
    time: pt.getElementsByTagName("time")[0] ? new Date(pt.getElementsByTagName("time")[0].textContent) : null,
  }));
  return summarizeTrack(points);
}

function parseTCX(text) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const points = Array.from(doc.getElementsByTagName("Trackpoint")).map(pt => {
    const posEl = pt.getElementsByTagName("Position")[0];
    return {
      lat: posEl ? parseFloat(posEl.getElementsByTagName("LatitudeDegrees")[0].textContent) : null,
      lon: posEl ? parseFloat(posEl.getElementsByTagName("LongitudeDegrees")[0].textContent) : null,
      ele: pt.getElementsByTagName("AltitudeMeters")[0] ? parseFloat(pt.getElementsByTagName("AltitudeMeters")[0].textContent) : null,
      time: pt.getElementsByTagName("Time")[0] ? new Date(pt.getElementsByTagName("Time")[0].textContent) : null,
    };
  });
  return summarizeTrack(points);
}

function summarizeTrack(points) {
  let distanceKm = 0;
  let elevationGain = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    if (a.lat != null && b.lat != null) distanceKm += haversineKm(a.lat, a.lon, b.lat, b.lon);
    if (a.ele != null && b.ele != null && b.ele > a.ele) elevationGain += (b.ele - a.ele);
  }
  const times = points.map(p => p.time).filter(Boolean);
  const totalSeconds = times.length > 1 ? (times[times.length - 1] - times[0]) / 1000 : 0;
  return { distanceKm, totalSeconds, elevationGain: Math.round(elevationGain) };
}

// ---------- Smart analysis (rule-based, compared against past logged runs) ----------

function buildSmartAnalysis(run) {
  const pastRuns = getRuns();
  const stats = computeStats(pastRuns);
  const avgPace = stats ? stats.avgPaceSecPerKm : run.secPerKm;

  let rating;
  if (run.secPerKm <= avgPace * 0.95) rating = "Excellent";
  else if (run.secPerKm <= avgPace * 1.02) rating = "Good";
  else if (run.secPerKm <= avgPace * 1.1) rating = "Average";
  else rating = "Needs improvement";
  if (!stats) rating = "First run logged";

  let comparisonLine = "";
  const previous = [...pastRuns].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  if (previous) {
    const diff = run.secPerKm - previous.secPerKm;
    if (diff < -3) comparisonLine = `That's ${formatPace(Math.abs(diff))} faster per km than your last logged run.`;
    else if (diff > 3) comparisonLine = `That's ${formatPace(diff)} slower per km than your last logged run.`;
    else comparisonLine = "That's almost identical pace to your last logged run.";
  }

  let strongestLine = "";
  let improvementLine = "";
  let focusLine = "";

  const sStats = run.splits && run.splits.length > 1 ? splitStats(run.splits) : null;
  if (sStats) {
    strongestLine = `Your strongest section was km ${sStats.fastestIdx + 1}, run at ${formatPace(sStats.fastestSplitSec)}/km.`;
    improvementLine = `Pace dropped the most around km ${sStats.slowestIdx + 1} (${formatPace(sStats.slowestSplitSec)}/km) — likely fatigue or a hill, depending on the route.`;
    focusLine = sStats.stdDev > 12
      ? "Next time, aim for more even splits — try starting 5-10 seconds/km slower than feels natural."
      : "Your pacing was already solid — next session, try holding this same pace for a slightly longer distance.";
  } else {
    focusLine = "Log your per-km splits next time to unlock a breakdown of your strongest and weakest sections.";
  }

  return { rating, comparisonLine, strongestLine, improvementLine, focusLine };
}

// ---------- Wire up events ----------

let lastRun = null; // holds the most recently analyzed run, ready to save

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

  // advanced optional fields
  const elevationGain = parseFloat(document.getElementById("elevation").value) || 0;
  const heartRate = parseFloat(document.getElementById("heartrate").value) || null;
  const cadence = parseFloat(document.getElementById("cadence").value) || null;
  const splitsSec = parseSplits(document.getElementById("splits").value);
  const sStats = splitStats(splitsSec);
  const strideLength = estimateStrideLength(r.speedKph, cadence);
  const efficiency = estimateEfficiency(sStats);

  Object.assign(r, {
    elevationGain, heartRate, cadence,
    splits: splitsSec,
    fastestSplitSec: sStats ? sStats.fastestSplitSec : null,
    strideLength, efficiency,
  });

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

  document.getElementById("comparisonText").textContent = buildComparison(r);

  // smart analysis (rating + comparison to past logged runs)
  const smart = buildSmartAnalysis(r);
  document.getElementById("ratingLabel").textContent = `Overall: ${smart.rating}`;
  document.getElementById("coachReport").textContent = buildCoachReport(r, unit);
  document.getElementById("comparisonLine").textContent = smart.comparisonLine;
  document.getElementById("strongestLine").textContent = smart.strongestLine;
  document.getElementById("improvementLine").textContent = smart.improvementLine;
  document.getElementById("focusLine").textContent = smart.focusLine;

  // advanced stats grid (only show fields the user actually filled in)
  const grid = document.getElementById("advancedStatsGrid");
  grid.innerHTML = "";
  const advancedEntries = [];
  if (elevationGain > 0) advancedEntries.push([elevationGain + " m", "elevation gain"]);
  if (heartRate) advancedEntries.push([heartRate, "avg heart rate (bpm)"]);
  if (cadence) advancedEntries.push([cadence, "avg cadence (spm)"]);
  if (strideLength) advancedEntries.push([strideLength.toFixed(2) + " m", "est. stride length"]);
  if (efficiency) advancedEntries.push([efficiency + "/100", "est. running efficiency"]);
  advancedEntries.forEach(([value, label]) => {
    const stat = document.createElement("div");
    stat.className = "stat";
    stat.innerHTML = `<span class="stat-value">${value}</span><span class="stat-label">${label}</span>`;
    grid.appendChild(stat);
  });
  document.getElementById("advancedStatsRow").hidden = advancedEntries.length === 0;

  // splits chart
  const splitsRow = document.getElementById("splitsRow");
  if (sStats) {
    splitsRow.hidden = false;
    const points = splitsSec.map((s, i) => ({ x: i + 1, y: s }));
    drawLineChart("splitsChart", points, { color: "#ff5a46", yLabel: "seconds per km" });
    document.getElementById("splitsSummary").textContent =
      `Fastest: km ${sStats.fastestIdx + 1} (${formatPace(sStats.fastestSplitSec)}). Slowest: km ${sStats.slowestIdx + 1} (${formatPace(sStats.slowestSplitSec)}). ${sStats.consistency} pacing.`;
  } else {
    splitsRow.hidden = true;
  }

  renderBadges(r);
  updateGauge(r);
  drawShareCard(r, unit);

  lastRun = r;
  document.getElementById("saveConfirm").hidden = true;

  document.getElementById("results").hidden = false;
  document.getElementById("results").scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  const canvas = document.getElementById("shareCanvas");
  const link = document.createElement("a");
  link.download = "lane-one-run.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

document.getElementById("saveRunBtn").addEventListener("click", () => {
  if (!lastRun) return;
  addRun(lastRun);
  document.getElementById("saveConfirm").hidden = false;
});

document.getElementById("fileUpload").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    const text = evt.target.result;
    const isGpx = file.name.toLowerCase().endsWith(".gpx");
    const summary = isGpx ? parseGPX(text) : parseTCX(text);

    document.getElementById("distance").value = summary.distanceKm.toFixed(2);
    document.getElementById("unit").value = "km";
    const h = Math.floor(summary.totalSeconds / 3600);
    const m = Math.floor((summary.totalSeconds % 3600) / 60);
    const s = Math.round(summary.totalSeconds % 60);
    document.getElementById("hours").value = h;
    document.getElementById("minutes").value = m;
    document.getElementById("seconds").value = s;
    if (summary.elevationGain) document.getElementById("elevation").value = summary.elevationGain;

    document.getElementById("uploadNote").textContent = `Imported: ${summary.distanceKm.toFixed(2)} km, elevation gain ${summary.elevationGain} m.`;
  };
  reader.readAsText(file);
});
