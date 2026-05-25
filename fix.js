const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Fix `if (!(await func(...)) {` -> `if (!(await func(...))) {`
code = code.replace(/if \(!\(await hasActiveSubscription\(userId\)\) \{/g, 'if (!(await hasActiveSubscription(userId))) {');
code = code.replace(/if \(!\(await hasActiveSubscription\(userId\)\) return/g, 'if (!(await hasActiveSubscription(userId))) return');

fs.writeFileSync('index.js', code);
