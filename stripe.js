require('dotenv').config();
const Stripe = require('stripe');

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRODUCTS = {
  credit: {
    name: '🔮 ดูดวงละเอียด 1 ครั้ง',
    description: 'ดูดวงชะตาแบบละเอียด ครอบคลุม ความรัก การงาน การเงิน สุขภาพ',
    amount: 2000, // 20 THB (หน่วย สตางค์)
  },
  subscription: {
    name: '👑 DD Jang Premium 1 เดือน',
    description: 'ดูดวงละเอียดได้วันละ 2 ครั้ง ไม่ต้องเสียเครดิต ตลอด 30 วัน',
    amount: 19900, // 199 THB
  },
};

/**
 * สร้าง Stripe Checkout Session
 * @param {string} userId - LINE User ID
 * @param {'credit'|'subscription'} type
 * @param {string} baseUrl - BASE_URL ของ server
 * @returns {Promise<{url: string, sessionId: string}>}
 */
async function createCheckoutSession(userId, type, baseUrl, amountOverride = null) {
  const product = PRODUCTS[type];
  if (!product) throw new Error(`Unknown payment type: ${type}`);

  let finalAmount = product.amount;
  let finalName = product.name;
  let finalDesc = product.description;

  if (type === 'credit' && amountOverride && !isNaN(amountOverride)) {
    finalAmount = Math.round(amountOverride * 100);
    finalName = `💎 เติมเครดิต ${amountOverride} บาท`;
    finalDesc = 'ใช้สำหรับเปิดไพ่ดูดวงแบบเจาะลึก 1 เครดิต = 1 บาท';
  }

  const session = await stripeClient.checkout.sessions.create({
    payment_method_types: ['card', 'promptpay'],
    line_items: [{
      price_data: {
        currency: 'thb',
        product_data: {
          name: finalName,
          description: finalDesc,
        },
        unit_amount: finalAmount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${baseUrl}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/stripe/cancel`,
    metadata: { userId, type },
    locale: 'th',
  });

  return { url: session.url, sessionId: session.id };
}

module.exports = { createCheckoutSession, stripeClient };
