const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Modify getZodiacFromDOB
code = code.replace(/function getZodiacFromDOB\(dobText\) \{[\s\S]*?return null;\n\}/, 
`function getZodiacFromDOB(dobText) {
  const patterns = [
    /(\\d{1,2})[\\/\\-\\s](\\d{1,2})[\\/\\-\\s](\\d{2,4})/,
    /(\\d{1,2})\\s+(\\S+)\\s+(\\d{4})/
  ];
  const THAI_MONTHS = { 'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12,'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12 };

  let day, month, year, matchedStr;
  const m1 = dobText.match(patterns[0]);
  if (m1) { day = +m1[1]; month = +m1[2]; year = +m1[3]; matchedStr = m1[0]; }
  else {
    const m2 = dobText.match(patterns[1]);
    if (m2) { day = +m2[1]; month = THAI_MONTHS[m2[2]] || 0; year = +m2[3]; matchedStr = m2[0]; }
  }
  if (!day || !month) return null;
  if (year > 2400) year -= 543;

  const ZODIACS = [
    { name:'ราศีมกร (Capricorn)',   from:[12,22], to:[1,19]  },
    { name:'ราศีกุมภ์ (Aquarius)',  from:[1,20],  to:[2,18]  },
    { name:'ราศีมีน (Pisces)',      from:[2,19],  to:[3,20]  },
    { name:'ราศีเมษ (Aries)',       from:[3,21],  to:[4,19]  },
    { name:'ราศีพฤษภ (Taurus)',     from:[4,20],  to:[5,20]  },
    { name:'ราศีเมถุน (Gemini)',    from:[5,21],  to:[6,20]  },
    { name:'ราศีกรกฎ (Cancer)',     from:[6,21],  to:[7,22]  },
    { name:'ราศีสิงห์ (Leo)',       from:[7,23],  to:[8,22]  },
    { name:'ราศีกันย์ (Virgo)',     from:[8,23],  to:[9,22]  },
    { name:'ราศีตุลย์ (Libra)',     from:[9,23],  to:[10,22] },
    { name:'ราศีพิจิก (Scorpio)',   from:[10,23], to:[11,21] },
    { name:'ราศีธนู (Sagittarius)', from:[11,22], to:[12,21] },
    { name:'ราศีมกร (Capricorn)',   from:[12,22], to:[12,31] },
  ];

  const md = month * 100 + day;
  for (const z of ZODIACS) {
    const from = z.from[0] * 100 + z.from[1];
    const to   = z.to[0]   * 100 + z.to[1];
    if (from <= to) { if (md >= from && md <= to) return { zodiac: z.name, dobStr: matchedStr }; }
    else            { if (md >= from || md <= to) return { zodiac: z.name, dobStr: matchedStr }; }
  }
  return null;
}`);

// Update usages of getZodiacFromDOB
code = code.replace(/const zodiacInfo = getZodiacFromDOB\(context\);\n\s*zodiacLine = zodiacInfo \? `\\n\[ราศีเกิด \(คำนวณแล้ว\): \$\{zodiacInfo\}\]` : '';/g, 
`const zodiacInfo = getZodiacFromDOB(context);
        zodiacLine = zodiacInfo ? \`\\n[ราศีเกิด (คำนวณแล้ว): \${zodiacInfo.zodiac}]\` : '';`);

code = code.replace(/const dobZodiac = getZodiacFromDOB\(dob\);\n\s*if \(dobZodiac\) await saveUserDOB\(userId, dob, dobZodiac\);/g, 
`const dobZodiac = getZodiacFromDOB(dob);
      if (dobZodiac) await saveUserDOB(userId, dob, dobZodiac.zodiac);`);


// 2. Add Helper Functions above handleEvent
const helpers = `
// =========================================================
// Helpers สำหรับดูดวงละเอียด และตามหัวข้อ
// =========================================================
async function executeTopicReading(userId, dob, topic, replyToken) {
  const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
  const topicContext = \`ผู้ใช้เกิดวันที่: \${dob}
วันนี้คือ \${today} ไพ่ที่สุ่มได้คือ "\${picked.card}" (ความหมาย: \${picked.meaning}, คำแนะนำ: \${picked.advice})
จงวิเคราะห์ดวงเรื่อง"\${topic}" ให้ลูกค้าโดยเฉพาะ โดยอิงจากวันเกิด ราศีเกิด และพลังไพ่
อธิบายละเอียด อบอุ่น เป็นกันเอง ให้กำลังใจ ความยาว 5-8 ประโยค\`;

  try {
    const aiResponse = await callGeminiAI(userId, \`ดูดวงเรื่อง\${topic}\`, topicContext);
    await saveReading(userId, \`ดูดวง-\${topic}\`);
    const recordId = await saveAITrainingData(userId, \`ดูดวง-\${topic}\`, dob, picked.card, \`ดูดวงเรื่อง\${topic}\`, aiResponse);
    return client.replyMessage({
      replyToken,
      messages: [
        { type: 'image', originalContentUrl: \`\${BASE_URL}/public/images/\${picked.file}\`, previewImageUrl: \`\${BASE_URL}/public/images/\${picked.file}\` },
        { type: 'text', text: aiResponse },
        { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: buildRatingFlexMessage(recordId) },
        {
          type: 'text',
          text: '✨ อยากดูดวงแบบละเอียดครอบคลุมทุกด้านเพิ่มเติมได้เลยนะคะ 🔮',
          quickReply: {
            items: [
              { type: 'action', action: { type: 'message', label: '🔮 ดูดวงละเอียด', text: 'ดูดวงละเอียด' } },
              { type: 'action', action: { type: 'message', label: '🌅 ดูดวงรายวัน', text: 'ดูดวงรายวัน' } },
            ],
          },
        },
      ],
    });
  } catch (err) {
    console.error('Gemini AI Error (Topic):', err);
    return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว รบกวนลองใหม่อีกครั้งนะคะ 🙏' }] });
  }
}

async function executeDetailedReading(userId, dob, paymentType, replyToken) {
  if (paymentType === 'subscription') {
    if (!(await hasActiveSubscription(userId))) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'สิทธิ์ของท่านหมดอายุแล้วค่ะ' }] });
    }
    const { canRead } = await canUseSubscriptionDaily(userId);
    if (!canRead) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: '👑 สิทธิ์ดูดวงวันนี้หมดแล้วค่ะ (2/2 ครั้ง)' }] });
    }

    const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const context = \`ผู้ใช้เกิดวันที่: \${dob}\\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "\${picked.card}" (ความหมาย: \${picked.meaning}, คำแนะนำ: \${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด\`;
    
    try {
      const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
      await recordSubscriptionRead(userId);
      await saveReading(userId, 'ดูดวงละเอียด');
      const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
      const { remaining } = await canUseSubscriptionDaily(userId);
      
      return client.replyMessage({
        replyToken,
        messages: [
          { type: 'image', originalContentUrl: \`\${BASE_URL}/public/images/\${picked.file}\`, previewImageUrl: \`\${BASE_URL}/public/images/\${picked.file}\` },
          { type: 'text', text: \`\${aiResponse}\\n\\n━━━━━━━━━━━━━━\\n👑 สมาชิก Premium | เหลือสิทธิ์วันนี้: \${remaining} ครั้ง\` },
          { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: buildRatingFlexMessage(recordId) }
        ],
      });
    } catch (aiError) {
      console.error('Gemini AI Error (VIP):', aiError);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้ตัดโควตา VIP ของคุณนะคะ รบกวนพิมพ์มาใหม่อีกครั้งค่ะ ✨' }]
      });
    }
  } else if (paymentType === 'credit') {
    const credit = await getCredit(userId);
    if (credit < DETAILED_PRICE) {
      return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'เครดิตของท่านไม่เพียงพอค่ะ กรุณาเติมเครดิต' }] });
    }
    
    const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    const context = \`ผู้ใช้เกิดวันที่: \${dob}\\nผู้ใช้เป็นสมาชิก Premium ดูดวงแบบละเอียด ไพ่ที่สุ่มได้คือ "\${picked.card}" (ความหมาย: \${picked.meaning}, คำแนะนำ: \${picked.advice}) จงวิเคราะห์ดวงอย่างละเอียดลึกซึ้ง ครอบคลุมทุกด้าน ความรัก การงาน การเงิน สุขภาพ และช่วงเวลาที่ควรระวัง พร้อมคำนวณหาราศีเกิด (ให้ใช้เกณฑ์แบบสากล Western Astrology เท่านั้น เช่น 20 เม.ย.-20 พ.ค. คือราศีพฤษภ) สีนำโชค และเลขนำโชคให้ด้วย ตอบประมาณ 8-10 บรรทัด\`;
    
    try {
      const aiResponse = await callGeminiAI(userId, "ตรวจดวงชะตาแบบละเอียด", context);
      await useCredit(userId, DETAILED_PRICE);
      await saveReading(userId, 'ดูดวงละเอียด');
      const recordId = await saveAITrainingData(userId, 'ดูดวงละเอียด', dob, picked.card, "ตรวจดวงชะตาแบบละเอียด", aiResponse);
      const remainingCredit = await getCredit(userId);
      
      return client.replyMessage({
        replyToken,
        messages: [
          { type: 'image', originalContentUrl: \`\${BASE_URL}/public/images/\${picked.file}\`, previewImageUrl: \`\${BASE_URL}/public/images/\${picked.file}\` },
          { type: 'text', text: \`\${aiResponse}\\n\\n━━━━━━━━━━━━━━\\n💎 เครดิตคงเหลือ: \${remainingCredit} บาท\` },
          { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: buildRatingFlexMessage(recordId) }
        ],
      });
    } catch (aiError) {
      console.error('Gemini AI Error (Credit):', aiError);
      return client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: 'ขออภัยค่ะ 🙏 พลังงานจักรวาลขัดข้องชั่วคราว (ระบบ AI ตอบสนองช้า) ดีจังยังไม่ได้หักเครดิตของคุณนะคะ รบกวนพิมพ์มาใหม่อีกครั้งค่ะ ✨' }]
      });
    }
  }
}

async function handleEvent(event) {`;

code = code.replace(/async function handleEvent\(event\) \{/, helpers);

// 3. Update "ดูดวงละเอียด" Flow (line 907-942 -> replace pending push logic)
const oldDetailedLogic = `      // กรณีใช้สิทธิ์ VIP ได้
      if (isUsingSubscription) {
        userPendingDOB.set(userId, 'subscription');
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '👑 ใช้สิทธิ์ VIP ดูดวงละเอียด\\n🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)' }],
        });
      }

      // กรณีไม่มี VIP หรือ สิทธิ์ VIP รายวันหมดแล้ว -> มาเช็ค Credit
      const credit = await getCredit(userId);

      if (credit >= DETAILED_PRICE) {
        userPendingDOB.set(userId, 'credit');
        
        // เพิ่มข้อความแจ้งเตือนนิดหน่อยให้ลูกค้ารู้ว่าสิทธิ์ VIP หมดและกำลังจะใช้ Credit แทน
        let alertMsg = await hasActiveSubscription(userId) 
          ? '👑 สิทธิ์ VIP ประจำวันหมดแล้ว ดีจังจะขอใช้เครดิตแทนนะคะ\\n\\n' 
          : '';

        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: \`\${alertMsg}🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)\` }],
        });
      }`;

const newDetailedLogic = `      // กรณีใช้สิทธิ์ VIP ได้
      if (isUsingSubscription) {
        const cachedDOB = await getUserDOB(userId);
        if (cachedDOB && cachedDOB.dob) {
          return executeDetailedReading(userId, cachedDOB.dob, 'subscription', replyToken);
        }
        userPendingDOB.set(userId, 'subscription');
        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: '👑 ใช้สิทธิ์ VIP ดูดวงละเอียด\\n🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)' }],
        });
      }

      // กรณีไม่มี VIP หรือ สิทธิ์ VIP รายวันหมดแล้ว -> มาเช็ค Credit
      const credit = await getCredit(userId);

      if (credit >= DETAILED_PRICE) {
        const cachedDOB = await getUserDOB(userId);
        if (cachedDOB && cachedDOB.dob) {
          return executeDetailedReading(userId, cachedDOB.dob, 'credit', replyToken);
        }
        userPendingDOB.set(userId, 'credit');
        
        // เพิ่มข้อความแจ้งเตือนนิดหน่อยให้ลูกค้ารู้ว่าสิทธิ์ VIP หมดและกำลังจะใช้ Credit แทน
        let alertMsg = await hasActiveSubscription(userId) 
          ? '👑 สิทธิ์ VIP ประจำวันหมดแล้ว ดีจังจะขอใช้เครดิตแทนนะคะ\\n\\n' 
          : '';

        return client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: \`\${alertMsg}🔮 รบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณให้ดีจังหน่อยนะคะ\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530 ค่ะ)\` }],
        });
      }`;
code = code.replace(oldDetailedLogic, newDetailedLogic);

// 4. Update Pending DOB Execution blocks
// Delete the old topic reading execution
const oldTopicExecution = `      const today = new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const picked = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
      const topicContext = \`ผู้ใช้เกิดวันที่: \${dob}
วันนี้คือ \${today} ไพ่ที่สุ่มได้คือ "\${picked.card}" (ความหมาย: \${picked.meaning}, คำแนะนำ: \${picked.advice})
จงวิเคราะห์ดวงเรื่อง"\${topic}" ให้ลูกค้าโดยเฉพาะ โดยอิงจากวันเกิด ราศีเกิด และพลังไพ่
อธิบายละเอียด อบอุ่น เป็นกันเอง ให้กำลังใจ ความยาว 5-8 ประโยค\`;

      try {
        const aiResponse = await callGeminiAI(userId, \`ดูดวงเรื่อง\${topic}\`, topicContext);
        await saveReading(userId, \`ดูดวง-\${topic}\`);
        const recordId = await saveAITrainingData(userId, \`ดูดวง-\${topic}\`, dob, picked.card, \`ดูดวงเรื่อง\${topic}\`, aiResponse);
        return client.replyMessage({
          replyToken,
          messages: [
            { type: 'image', originalContentUrl: \`\${BASE_URL}/public/images/\${picked.file}\`, previewImageUrl: \`\${BASE_URL}/public/images/\${picked.file}\` },
            { type: 'text', text: aiResponse },
            { type: 'flex', altText: 'รบกวนให้คะแนนคำทำนายค่ะ', contents: buildRatingFlexMessage(recordId) },
            {
              type: 'text',
              text: '✨ อยากดูดวงแบบละเอียดครอบคลุมทุกด้านเพิ่มเติมได้เลยนะคะ 🔮',
              quickReply: {
                items: [
                  { type: 'action', action: { type: 'message', label: '🔮 ดูดวงละเอียด', text: 'ดูดวงละเอียด' } },
                  { type: 'action', action: { type: 'message', label: '🌅 ดูดวงรายวัน', text: 'ดูดวงรายวัน' } },
                ],
              },
            },
          ],
        });
      } catch (err) {
        userPendingTopic.set(userId, topic); // คืน state ถ้า AI พัง
        return client.replyMessage({ replyToken, messages: [{ type: 'text', text: 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว รบกวนพิมพ์วันเกิดมาใหม่อีกครั้งนะคะ 🙏' }] });
      }`;

code = code.replace(oldTopicExecution, `      return executeTopicReading(userId, dob, topic, replyToken);`);

// Delete old detailed reading execution
const oldDetailedExecutionMatch = /if \(paymentType === 'subscription'\) \{[\s\S]*?\}\n\s*\}\n\s*\}/;
const oldDetailedExecution = code.match(oldDetailedExecutionMatch)[0];
code = code.replace(oldDetailedExecutionMatch, `return executeDetailedReading(userId, dob, paymentType, replyToken);\n    }`);

// 5. Update Topic keyword detection (line 1600)
const oldTopicTrigger = `    // topic keyword เจอแล้ว trigger เลย (ไม่บังคับ intent แยก)
    if (detectedTopic) {
      // ถามวันเกิดก่อน แล้วค่อยดูดวงตามหัวข้อ
      userPendingTopic.set(userId, detectedTopic);
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: \`🔮 ดีจังจะดูดวงเรื่อง\${detectedTopic}ให้เลยค่ะ ✨\\n\\nรบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณด้วยนะคะ เพื่อให้คำทำนายแม่นยำที่สุด 🙏\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530)\`,
        }],
      });
    }`;

const newTopicTrigger = `    // topic keyword เจอแล้ว trigger เลย (ไม่บังคับ intent แยก)
    if (detectedTopic) {
      const cachedDOB = await getUserDOB(userId);
      if (cachedDOB && cachedDOB.dob) {
        return executeTopicReading(userId, cachedDOB.dob, detectedTopic, replyToken);
      }
      // ถามวันเกิดก่อน แล้วค่อยดูดวงตามหัวข้อ
      userPendingTopic.set(userId, detectedTopic);
      return client.replyMessage({
        replyToken,
        messages: [{
          type: 'text',
          text: \`🔮 ดีจังจะดูดวงเรื่อง\${detectedTopic}ให้เลยค่ะ ✨\\n\\nรบกวนพิมพ์ "วัน/เดือน/ปีเกิด" ของคุณด้วยนะคะ เพื่อให้คำทำนายแม่นยำที่สุด 🙏\\n(เช่น 15 มกราคม 2530 หรือ 15/01/2530)\`,
        }],
      });
    }`;
code = code.replace(oldTopicTrigger, newTopicTrigger);

// 6. Update Natural Chat Flow (intercept DOB)
const oldNaturalChat = `    // ============================================
    // 11. ข้อความทั่วไป → Gemini AI
    // ============================================
    try {
      const aiResponse = await callGeminiAI(userId, userMessage);`;

const newNaturalChat = `    // ============================================
    // 11. ข้อความทั่วไป → Gemini AI
    // ============================================
    try {
      // ดักจับวันเกิดจากแชททั่วไปอัตโนมัติ
      const possibleDOB = getZodiacFromDOB(userMessage);
      if (possibleDOB) {
        const cachedDOB = await getUserDOB(userId);
        if (!cachedDOB) {
          await saveUserDOB(userId, possibleDOB.dobStr, possibleDOB.zodiac);
        }
      }
      
      const aiResponse = await callGeminiAI(userId, userMessage);`;
code = code.replace(oldNaturalChat, newNaturalChat);

fs.writeFileSync('index.js', code);
console.log('Refactoring completed!');
