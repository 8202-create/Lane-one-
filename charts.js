// ===== Lane One shared chart drawer (plain canvas, no external library) =====

function drawLineChart(canvasId, points, opts = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!points || points.length < 1) {
    ctx.fillStyle = "#8b93a1";
    ctx.font = "14px Inter, sans-serif";
    ctx.fillText("Not enough data yet", 20, h / 2);
    return;
  }

  const isLight = document.body.classList.contains("light");
  const axisColor = isLight ? "#d8d4c8" : "#2a3040";
  const textColor = isLight ? "#5a6270" : "#8b93a1";
  const lineColor = opts.color || "#d4ff3d";
  const padding = 44;

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if (minY === maxY) { minY -= 1; maxY += 1; }
  minY -= (maxY - minY) * 0.1;
  maxY += (maxY - minY) * 0.1;

  const toPx = (p) => {
    const x = padding + ((p.x - minX) / (maxX - minX || 1)) * (w - padding * 1.5);
    const y = h - padding - ((p.y - minY) / (maxY - minY || 1)) * (h - padding * 1.6);
    return [x, y];
  };

  // axes
  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, 20);
  ctx.lineTo(padding, h - padding);
  ctx.lineTo(w - 10, h - padding);
  ctx.stroke();

  // line
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  points.forEach((p, i) => {
    const [x, y] = toPx(p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // dots
  ctx.fillStyle = lineColor;
  points.forEach(p => {
    const [x, y] = toPx(p);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // labels
  ctx.fillStyle = textColor;
  ctx.font = "12px Inter, sans-serif";
  if (opts.yLabel) ctx.fillText(opts.yLabel, 8, 14);
  if (opts.xLabel) ctx.fillText(opts.xLabel, w - ctx.measureText(opts.xLabel).width - 10, h - 8);
}
