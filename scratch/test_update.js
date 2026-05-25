const { updateLineProfile, ensureUserExists } = require('../database');

async function run() {
  const userId = 'U9068618bad02e083bee1e96b59df3bf0';
  console.log('Testing updateLineProfile for user:', userId);
  try {
    await ensureUserExists(userId);
    await updateLineProfile(userId, 'PreeM_Test', 'https://example.com/pic.png');
    console.log('Update success!');
  } catch (err) {
    console.error('Update failed:', err);
  }
}

run();
