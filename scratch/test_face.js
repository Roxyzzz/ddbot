// Polyfill util.isNullOrUndefined for Node 23+ / 25+ before requiring tfjs-node
const util = require('util');
if (typeof util.isNullOrUndefined === 'undefined') {
  util.isNullOrUndefined = (val) => val === null || val === undefined;
}

const path = require('path');
const { Canvas, Image, ImageData } = require('canvas');
require('@tensorflow/tfjs-node');
const faceapi = require('@vladmandic/face-api');

// Monkey patch for Node.js
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

async function run() {
  const modelPath = path.join(__dirname, '../node_modules/@vladmandic/face-api/model');
  console.log('Loading models from:', modelPath);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  console.log('Models loaded successfully!');
}

run().catch(console.error);
