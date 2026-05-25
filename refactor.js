const fs = require('fs');

const dbFuncs = [
  'getCredit', 'addCredit', 'useCredit', 'getReferralCode', 'applyReferralCode',
  'hasActiveSubscription', 'activateSubscription', 'revokeSubscription', 'getAllVIPs',
  'getSubscriptionInfo', 'canUseSubscriptionDaily', 'recordSubscriptionRead',
  'getUserProfile', 'saveReading', 'getReadingStats', 'getGlobalStats',
  'saveUserDOB', 'getUserDOB', 'addPendingSlip', 'addPendingAngPao', 'addStripeRecord',
  'saveChatLog', 'createBooking', 'getUserBookings', 'ensureUserExists',
  'updateLineProfile', 'isStripeEnabled', 'saveAITrainingData', 'updateAIRating'
];

let content = fs.readFileSync('index.js', 'utf8');

// We need to replace `func(` with `await func(`
// But we must NOT replace if it already has `await ` before it.
// We also need to be careful with `const { getCredit } = require(...)` which shouldn't be touched.

dbFuncs.forEach(func => {
  // Regex explanation:
  // (?<!await\s+) : negative lookbehind, so we don't match if "await " precedes it
  // (?<!function\s+) : don't match function declarations (not applicable here but safe)
  // (?<!const\s+\{\s*.*) : difficult to do cleanly in regex, so we just avoid replacing if it doesn't end with `(`
  
  // We only target `func(`
  const regex = new RegExp(`(?<!await\\s+)\\b${func}\\s*\\(`, 'g');
  
  content = content.replace(regex, `await ${func}(`);
});

fs.writeFileSync('index.js', content, 'utf8');
console.log('Refactored index.js');
