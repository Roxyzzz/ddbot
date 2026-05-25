const { createCanvas, loadImage } = require('canvas');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Use Gemini Vision to verify a hand is present in the image.
 * Returns true if a hand/palm is detected, false otherwise.
 */
async function verifyHandInImage(imagePath) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
    const imageData = fs.readFileSync(imagePath);
    const base64 = imageData.toString('base64');
    const result = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: 'image/jpeg',
        },
      },
      'ในรูปนี้มีฝ่ามือหรือมือของมนุษย์อยู่หรือไม่? ตอบแค่ "YES" หรือ "NO" เท่านั้น',
    ]);
    const answer = result.response.text().trim().toUpperCase();
    return answer.includes('YES');
  } catch (e) {
    console.error('verifyHandInImage error:', e.message);
    return true; // fail-open: attempt drawing anyway
  }
}

/**
 * Draw palmistry lines on the image and save to outputPath.
 * Returns true on success.
 */
async function drawPalmReading(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    throw new Error('Input image not found: ' + inputPath);
  }

  const img = await loadImage(inputPath);
  const W = img.width;
  const H = img.height;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, W, H);

  // ── Layout assumptions ───────────────────────────────────────────────
  // The palm typically occupies roughly the centre of the frame.
  // We define a "palm box" and place the 3 main lines relative to it.
  // These proportions work well for a typical held-up palm photo.

  const palmLeft   = W * 0.30;
  const palmRight  = W * 0.70;
  const palmTop    = H * 0.35;
  const palmBottom = H * 0.75;
  const palmW = palmRight - palmLeft;
  const palmH = palmBottom - palmTop;

  // Line thickness proportional to image width
  const lw = Math.max(3, Math.round(W / 150));
  const fontSize = Math.max(18, Math.round(W / 25)); // Slightly smaller font
  const shadowBlur = 6;

  // ── Helper: draw a curved line through waypoints ──────────────────────
  function drawCurve(points, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = shadowBlur;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2;
      const my = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last[0], last[1]);
    ctx.stroke();
    ctx.restore();
  }

  // ── Helper: draw a label badge ───────────────────────────────────────
  function drawLabel(x, y, text, color) {
    ctx.save();
    ctx.font = `bold ${fontSize}px sans-serif`;
    const tw = ctx.measureText(text).width;
    const pad = 10;
    
    // Clamp X and Y to ensure fully visible
    if (x + tw + pad > W) x = W - tw - pad * 2;
    if (x - pad < 0) x = pad;
    if (y - fontSize * 1.5 < 0) y = fontSize * 1.5;
    if (y + pad > H) y = H - pad;

    // Background pill
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath();
    ctx.roundRect(x - pad, y - fontSize * 0.85, tw + pad * 2, fontSize * 1.3, 6);
    ctx.fill();
    // Text
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ══════════════════════════════════════════════════════════════════════
  // 1. HEART LINE (เส้นหัวใจ) — upper palm
  // ══════════════════════════════════════════════════════════════════════
  const heartY = palmTop + palmH * 0.20;
  const heartPoints = [
    [palmLeft + palmW * 0.10, heartY + palmH * 0.10],
    [palmLeft + palmW * 0.35, heartY - palmH * 0.05],
    [palmLeft + palmW * 0.65, heartY - palmH * 0.05],
    [palmLeft + palmW * 0.90, heartY + palmH * 0.10],
  ];
  drawCurve(heartPoints, 'rgba(59,130,246,0.92)');  // blue

  // 2. HEAD LINE (เส้นสมอง) — middle of palm
  const headY = palmTop + palmH * 0.45;
  const headPoints = [
    [palmLeft + palmW * 0.15, headY + palmH * 0.05],
    [palmLeft + palmW * 0.40, headY - palmH * 0.02],
    [palmLeft + palmW * 0.65, headY + palmH * 0.05],
    [palmLeft + palmW * 0.85, headY + palmH * 0.15],
  ];
  drawCurve(headPoints, 'rgba(34,197,94,0.92)');    // green

  // 3. LIFE LINE (เส้นชีวิต) — curves from mid-left down to bottom center
  const lifePoints = [
    [palmLeft + palmW * 0.25, palmTop + palmH * 0.35],
    [palmLeft + palmW * 0.20, palmTop + palmH * 0.55],
    [palmLeft + palmW * 0.30, palmTop + palmH * 0.75],
    [palmLeft + palmW * 0.45, palmTop + palmH * 0.95],
  ];
  drawCurve(lifePoints, 'rgba(239,68,68,0.92)');    // red

  // ── Labels ───────────────────────────────────────────────────────────
  drawLabel(palmRight + W * 0.02, heartY,           '💙 เส้นหัวใจ',  '#93c5fd');
  drawLabel(palmRight + W * 0.02, headY + fontSize, '💚 เส้นสมอง',  '#86efac');
  // For life line, put label on the left side
  drawLabel(palmLeft - W * 0.05 - (fontSize * 4), palmTop + palmH * 0.60, '❤️ เส้นชีวิต', '#fca5a5');

  // ── Title banner ─────────────────────────────────────────────────────
  const titleSize = Math.max(26, Math.round(W / 14));
  ctx.save();
  ctx.font = `bold ${titleSize}px sans-serif`;
  const titleText = 'วิเคราะห์ลายมือ';
  const titleW = ctx.measureText(titleText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(W / 2 - titleW / 2 - 12, 10, titleW + 24, titleSize + 14);
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.fillText(titleText, W / 2, titleSize + 12);
  ctx.restore();

  // ── Save ─────────────────────────────────────────────────────────────
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.92 });
  fs.writeFileSync(outputPath, buffer);
  return true;
}

module.exports = { drawPalmReading, verifyHandInImage };
