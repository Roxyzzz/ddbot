require('dotenv').config();
const { getCredit, hasActiveSubscription, addCredit, useCredit, getUserProfile } = require('./database');

const userId = 'test_user_credit';
addCredit(userId, 20); // give 20 credits
console.log('Credit:', getCredit(userId));
console.log('VIP:', hasActiveSubscription(userId));

// simulate handleEvent for "ดูดวงละเอียด"
const credit = getCredit(userId);
if (credit >= 20) {
    console.log('Success: User has credit, will ask for DOB');
} else {
    console.log('Fail: User has no credit');
}

// simulate DOB
if (credit >= 20) {
    console.log('Credit before use:', getCredit(userId));
    useCredit(userId, 20);
    console.log('Credit after use:', getCredit(userId));
}
