// Polyfill util.isNullOrUndefined for Node 23+ / 25+ before requiring tfjs-node
const util = require('util');
if (typeof util.isNullOrUndefined === 'undefined') {
  util.isNullOrUndefined = (val) => val === null || val === undefined;
}

const path = require('path');
const fs = require('fs');
const { Canvas, Image, ImageData, loadImage } = require('canvas');
require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');

// Monkey patch for Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

let modelsLoaded = false;

async function initModels() {
  if (modelsLoaded) return;
  const modelPath = path.join(__dirname, 'node_modules', '@vladmandic', 'face-api', 'model');
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  modelsLoaded = true;
  console.log('Face API models loaded');
}

async function drawPhysiognomy(inputPath, outputPath) {
  await initModels();

  if (!fs.existsSync(inputPath)) {
    throw new Error('Input image not found: ' + inputPath);
  }

  const img = await loadImage(inputPath);
  
  // Detect faces and landmarks
  const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();
  
  if (!detection) {
    return false; // No face detected
  }

  // Create a canvas the same size as the image
  const canvas = faceapi.createCanvasFromMedia(img);
  const ctx = canvas.getContext('2d');

  // Draw original image onto canvas
  ctx.drawImage(img, 0, 0, img.width, img.height);

  const landmarks = detection.landmarks;
  const positions = landmarks.positions;
  const box = detection.detection.box;

  // Calculate key Y coordinates
  const yTop = box.y; // Top of bounding box
  const yChin = positions[8].y; // Chin bottom
  
  // Average Y of eyebrows
  const leftEyebrowY = positions.slice(17, 22).reduce((sum, pt) => sum + pt.y, 0) / 5;
  const rightEyebrowY = positions.slice(22, 27).reduce((sum, pt) => sum + pt.y, 0) / 5;
  const yEyebrow = (leftEyebrowY + rightEyebrowY) / 2;

  // Nose tip
  const yNose = positions[33].y;

  // Draw styles
  ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
  ctx.lineWidth = Math.max(2, Math.floor(img.width / 200));
  ctx.font = `${Math.max(16, Math.floor(img.width / 25))}px sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'left';

  // Helper to draw horizontal line
  const drawLine = (y, label) => {
    ctx.beginPath();
    ctx.moveTo(box.x - 20, y);
    ctx.lineTo(box.x + box.width + 20, y);
    ctx.stroke();

    if (label) {
      // Draw text background
      const textWidth = ctx.measureText(label).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(box.x + box.width + 25, y - 10, textWidth + 10, 20);
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(label, box.x + box.width + 30, y + 5);
    }
  };

  drawLine(yTop, 'หน้าผาก');
  drawLine(yEyebrow, 'คิ้ว');
  drawLine(yNose, 'ปลายจมูก');
  drawLine(yChin, 'คาง');

  // Draw some basic face mesh connections
  ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
  ctx.lineWidth = Math.max(1, Math.floor(img.width / 400));
  faceapi.draw.drawFaceLandmarks(canvas, detection);

  // Add overall text
  ctx.fillStyle = '#ffcc00';
  ctx.font = `bold ${Math.max(24, Math.floor(img.width / 15))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.shadowColor = 'black';
  ctx.shadowBlur = 5;
  ctx.fillText('วิเคราะห์โหงวเฮ้ง', img.width / 2, Math.max(40, box.y - 20));

  // Save to file
  const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
  fs.writeFileSync(outputPath, buffer);

  return true;
}

module.exports = {
  drawPhysiognomy
};
