const { drawPhysiognomy } = require('../astrology_face');
const path = require('path');

async function test() {
  const input = path.join(__dirname, 'test_face.jpg');
  const output = path.join(__dirname, 'test_face_out.jpg');
  console.log('Running face detection and drawing...');
  const result = await drawPhysiognomy(input, output);
  if (result) {
    console.log('Success! Output saved to ' + output);
  } else {
    console.log('Failed to detect face.');
  }
}

test().catch(console.error);
