const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const oldImageBlockMatch = /\/\/ \-\-\-\- จัดการ event รูปภาพ \(ผู้ใช้ส่งสลิป\) \-\-\-\-[\s\S]*?catch \(e\) \{\n\s*console\.error\('Error handling image:', e\);\n\s*\}\n\s*return;\n\s*\}/;

const newImageBlock = `// ---- จัดการ event รูปภาพ ----
  if (event.type === 'message' && event.message.type === 'image') {
    const pendingAction = userPendingSlipAction.get(userId);
    
    // 1. ถ้าผู้ใช้กำลังอยู่ในสถานะรอส่งสลิป
    if (pendingAction) {
      userPendingSlipAction.delete(userId);
      const slipType = pendingAction;
      
      client.replyMessage({
        replyToken,
        messages: [{ type: 'text', text: '✅ ได้รับสลิปของคุณแล้วค่ะ!\\n\\nดีจังกำลังส่งสลิปให้แอดมินตรวจสอบ กรุณารอสักครู่นะคะ 🙏' }],
      });

      try {
        const stream = await blobClient.getMessageContent(event.message.id);
        const chunks = [];
        for await (const chunk of stream) { chunks.push(chunk); }
        const imageBuffer = Buffer.concat(chunks);

        const slipsDir = path.join(__dirname, 'public', 'slips');
        if (!fs.existsSync(slipsDir)) fs.mkdirSync(slipsDir, { recursive: true });
        const filename = \`\${slipType}_\${userId}_\${Date.now()}.jpg\`;
        const filepath = path.join(slipsDir, filename);
        fs.writeFileSync(filepath, imageBuffer);

        await addPendingSlip(userId, slipType, filename);
        console.log(\`✅ Slip saved: \${filename} (type: \${slipType}, user: \${userId})\`);
      } catch (e) {
        console.error('Error handling slip image:', e);
      }
      return;
    } 
    
    // 2. ไม่ได้รอส่งสลิป -> มองเป็นรูปแชทปกติ
    try {
      const stream = await blobClient.getMessageContent(event.message.id);
      const chunks = [];
      for await (const chunk of stream) { chunks.push(chunk); }
      const imageBuffer = Buffer.concat(chunks);

      const chatImgDir = path.join(__dirname, 'public', 'chat_images');
      if (!fs.existsSync(chatImgDir)) fs.mkdirSync(chatImgDir, { recursive: true });
      const filename = \`img_\${userId}_\${Date.now()}.jpg\`;
      const filepath = path.join(chatImgDir, filename);
      fs.writeFileSync(filepath, imageBuffer);
      const imageUrl = \`/public/chat_images/\${filename}\`;

      if (liveChatUsers.has(userId)) {
        // อยู่ในโหมด Live Chat ให้บันทึกลง log เฉยๆ (หน้าเว็บจะ pull ไปโชว์เอง)
        await saveChatLog(userId, \`[IMAGE: \${imageUrl}]\`, '');
      } else {
        // ไม่ได้อยู่ใน Live Chat -> บอทตอบกลับ
        const replyText = 'ตอนนี้ดีจังยังดูรูปไม่ได้นะคะ หากต้องการให้หมอดูช่วยดูโหงวเฮ้งหรือลายมือ สามารถจองคิวแบบส่วนตัวได้เลยค่ะ 🔮';
        await saveChatLog(userId, \`[IMAGE: \${imageUrl}]\`, replyText);
        client.replyMessage({
          replyToken,
          messages: [{ type: 'text', text: replyText }]
        });
      }
    } catch (e) {
      console.error('Error handling chat image:', e);
    }
    return;
  }`;

code = code.replace(oldImageBlockMatch, newImageBlock);
fs.writeFileSync('index.js', code);
console.log('index.js updated');
