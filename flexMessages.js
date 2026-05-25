const { getSetting } = require('./database');

const BOOKING_STATUS_CONFIG = {
  pending:   { label: '⏳ รอยืนยัน',  color: '#f59e0b', bgColor: '#1a1000' },
  confirmed: { label: '✅ ยืนยันแล้ว', color: '#10b981', bgColor: '#001a0e' },
  rejected:  { label: '❌ ปฏิเสธ',    color: '#ef4444', bgColor: '#1a0000' },
  completed: { label: '🌟 เสร็จสิ้น', color: '#3b82f6', bgColor: '#00081a' },
  cancelled: { label: '🚫 ยกเลิก',   color: '#9ca3af', bgColor: '#111111' },
};

const BOOKING_TYPE_LABEL = {
  online:    '📱 ออนไลน์',
  in_person: '🏠 เจอตัว',
};

async function buildBookingFlexMessage(booking, overrideTitle = 'รายละเอียดการจองคิว', note = null, readerName = null) {
  const statusConfig = BOOKING_STATUS_CONFIG[booking.status] || BOOKING_STATUS_CONFIG.pending;
  const typeLabel    = BOOKING_TYPE_LABEL[booking.booking_type] || booking.booking_type || '-';

  // สร้าง row สำหรับแต่ละรายการข้อมูล
  function row(label, value) {
    return {
      type: 'box',
      layout: 'horizontal',
      paddingTop: '4px',
      paddingBottom: '4px',
      contents: [
        { type: 'text', text: label, size: 'sm', color: '#aaaaaa', flex: 3 },
        { type: 'text', text: String(value || '-'), size: 'sm', color: '#eeeeee', align: 'end', flex: 5, wrap: true },
      ],
    };
  }

  const infoRows = [
    row('หมายเลขคิว', `#${booking.id}`),
    row('ประเภท', typeLabel),
    row('วันที่ต้องการ', booking.preferred_date),
  ];

  if (booking.confirmed_date) {
    infoRows.push(row('🗓️ วันเวลาที่นัด', booking.confirmed_date));
  }

  if (readerName) {
    infoRows.push(row('🔮 หมอดูผู้ดูแล', readerName));
  }

  const displayNote = note || booking.admin_note || '';

  if (!global.__DD_BYPASS_FLEX_OVERRIDE) {
    const overrideTpl = await getSetting('flex_booking');
    if (overrideTpl) {
      try {
        const parsed = overrideTpl
          .replace(/{{statusLabel}}/g, statusConfig.label)
          .replace(/{{statusColor}}/g, statusConfig.color)
          .replace(/{{statusBgColor}}/g, statusConfig.bgColor)
          .replace(/{{typeLabel}}/g, typeLabel)
          .replace(/{{id}}/g, booking.id || '')
          .replace(/{{preferredDate}}/g, booking.preferred_date || '')
          .replace(/{{confirmedDate}}/g, booking.confirmed_date || '')
          .replace(/{{readerName}}/g, readerName || '')
          .replace(/{{note}}/g, displayNote || '')
          .replace(/{{overrideTitle}}/g, overrideTitle || '');
        return JSON.parse(parsed);
      } catch (err) {
        console.error('Failed to parse flex_booking override:', err);
      }
    }
  }

  if (displayNote) {
    infoRows.push(row('💬 หมายเหตุ', displayNote));
  }

  return {
    type: 'bubble',
    styles: {
      header: { backgroundColor: statusConfig.bgColor },
      body:   { backgroundColor: '#1a1a2e' },
      footer: { backgroundColor: '#1a1a2e' },
    },
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      contents: [
        {
          type: 'text',
          text: statusConfig.label,
          size: 'sm',
          color: statusConfig.color,
          weight: 'bold',
        },
        {
          type: 'text',
          text: overrideTitle,
          size: 'lg',
          color: '#ffffff',
          weight: 'bold',
          wrap: true,
          margin: 'sm',
        },
        {
          type: 'text',
          text: 'DD Jang — หมอดูส่วนตัวของคุณ 🔮',
          size: 'xs',
          color: '#8888aa',
          margin: 'sm',
        },
      ],
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '16px',
      spacing: 'xs',
      contents: [
        {
          type: 'separator',
          color: '#333355',
          margin: 'none',
        },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'none',
          margin: 'md',
          contents: infoRows,
        },
      ],
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: statusConfig.color,
          height: 'sm',
          action: {
            type: 'message',
            label: '📋 เช็คคิว',
            text: 'เช็คคิว',
          },
        },
      ],
    },
  };
}

async function buildPaymentMenuFlex(type, price, stripeUrl) {
  const isSub = type === 'subscription';
  const title = isSub ? '👑 สมัครสมาชิก VIP' : '💎 เติมเครดิตดูดวง';
  const desc = isSub ? 'ดูดวงละเอียดได้วันละ 2 ครั้ง ไม่เสียเครดิต' : 'ใช้สำหรับเปิดไพ่ดูดวงแบบเจาะลึก';
  const color = isSub ? '#f59e0b' : '#3b82f6';
  const bgColor = isSub ? '#2d1a00' : '#001a33';

  if (!global.__DD_BYPASS_FLEX_OVERRIDE) {
    const overrideTpl = await getSetting('flex_payment_menu');
    if (overrideTpl) {
      try {
        const parsed = overrideTpl
          .replace(/{{type}}/g, type)
          .replace(/{{title}}/g, title)
          .replace(/{{price}}/g, price)
          .replace(/{{desc}}/g, desc)
          .replace(/{{color}}/g, color)
          .replace(/{{bgColor}}/g, bgColor)
          .replace(/{{stripeUrl}}/g, stripeUrl || '')
          .replace(/{{angpaoActionText}}/g, isSub ? 'ชำระ-angpao-subscription' : 'ชำระ-angpao-credit');
        return JSON.parse(parsed);
      } catch (err) {
        console.error('Failed to parse flex_payment_menu override:', err);
      }
    }
  }

  return {
    type: 'bubble',
    size: 'mega',
    styles: {
      header: { backgroundColor: bgColor },
      body: { backgroundColor: '#1a1a2e' },
      footer: { backgroundColor: '#1a1a2e' },
    },
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      contents: [
        {
          type: 'text',
          text: title,
          size: 'xl',
          color: color,
          weight: 'bold',
        },
        {
          type: 'text',
          text: `ยอดชำระ: ${price} บาท`,
          size: 'md',
          color: '#ffffff',
          margin: 'md',
          weight: 'bold'
        },
        {
          type: 'text',
          text: desc,
          size: 'xs',
          color: '#8888aa',
          margin: 'sm',
          wrap: true
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      spacing: 'md',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: color,
          height: 'sm',
          action: {
            type: 'uri',
            label: '💳 ชำระเงินปกติ',
            uri: stripeUrl
          }
        },
        {
          type: 'button',
          style: 'secondary',
          color: '#2a2a4a',
          height: 'sm',
          action: {
            type: 'message',
            label: '🧧 ชำระด้วยซอง TrueMoney',
            text: isSub ? 'ชำระ-angpao-subscription' : 'ชำระ-angpao-credit'
          }
        }
      ]
    }
  };
}

async function buildPaymentSuccessFlex(type, amountPaid, creditAdded = 0, expiryDate = null) {
  const isSub = type === 'subscription';
  const title = isSub ? '✨ สมัคร VIP สำเร็จ' : '✅ เติมเครดิตสำเร็จ';
  const color = isSub ? '#f59e0b' : '#10b981';

  if (!global.__DD_BYPASS_FLEX_OVERRIDE) {
    const overrideTpl = await getSetting('flex_payment_success');
    if (overrideTpl) {
      try {
        const parsed = overrideTpl
          .replace(/{{type}}/g, type)
          .replace(/{{title}}/g, title)
          .replace(/{{color}}/g, color)
          .replace(/{{amountPaid}}/g, amountPaid || 0)
          .replace(/{{creditAdded}}/g, creditAdded || 0)
          .replace(/{{expiryDate}}/g, expiryDate || '');
        return JSON.parse(parsed);
      } catch (err) {
        console.error('Failed to parse flex_payment_success override:', err);
      }
    }
  }
  
  const infoRows = [
    {
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'ยอดชำระ', size: 'sm', color: '#aaaaaa', flex: 1 },
        { type: 'text', text: `${amountPaid} บาท`, size: 'sm', color: '#ffffff', align: 'end', weight: 'bold', flex: 2 }
      ]
    }
  ];

  if (isSub && expiryDate) {
    infoRows.push({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'สิทธิ์ VIP', size: 'sm', color: '#aaaaaa', flex: 1 },
        { type: 'text', text: 'ใช้งานได้ 30 วัน', size: 'sm', color: '#ffffff', align: 'end', flex: 2 }
      ]
    });
  } else if (!isSub) {
    infoRows.push({
      type: 'box', layout: 'horizontal', margin: 'md',
      contents: [
        { type: 'text', text: 'ได้รับเครดิต', size: 'sm', color: '#aaaaaa', flex: 1 },
        { type: 'text', text: `+${creditAdded} บาท`, size: 'sm', color: '#10b981', align: 'end', weight: 'bold', flex: 2 }
      ]
    });
  }

  return {
    type: 'bubble',
    styles: {
      header: { backgroundColor: '#001a0e' },
      body: { backgroundColor: '#1a1a2e' },
      footer: { backgroundColor: '#1a1a2e' }
    },
    header: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      contents: [
        {
          type: 'text',
          text: title,
          size: 'lg',
          color: color,
          weight: 'bold',
        },
        {
          type: 'text',
          text: 'ระบบยืนยันการชำระเงินอัตโนมัติ',
          size: 'xs',
          color: '#8888aa',
          margin: 'sm',
        }
      ]
    },
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '20px',
      contents: [
        { type: 'separator', color: '#333355' },
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          spacing: 'sm',
          contents: infoRows
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '12px',
      contents: [
        {
          type: 'button',
          style: 'primary',
          color: color,
          height: 'sm',
          action: {
            type: 'message',
            label: '🔮 ดูดวงละเอียด',
            text: 'ดูดวงละเอียด'
          }
        }
      ]
    }
  };
}

async function buildRatingFlexMessage(recordId) {
  if (!global.__DD_BYPASS_FLEX_OVERRIDE) {
    const overrideTpl = await getSetting('flex_rating');
    if (overrideTpl) {
      try {
        const parsed = overrideTpl.replace(/{{recordId}}/g, recordId || '');
        return JSON.parse(parsed);
      } catch (err) {
        console.error('Failed to parse flex_rating override:', err);
      }
    }
  }

  return {
    type: 'bubble',
    size: 'kilo',
    body: {
      type: 'box',
      layout: 'vertical',
      paddingAll: '15px',
      contents: [
        {
          type: 'text',
          text: 'คำทำนายแม่นยำไหมคะ?',
          weight: 'bold',
          size: 'md',
          color: '#111111',
          wrap: true,
          align: 'center'
        },
        {
          type: 'text',
          text: 'ช่วยให้คะแนนเพื่อพัฒนา AI ของดีจังให้เก่งขึ้นค่ะ 💖',
          size: 'xs',
          color: '#aaaaaa',
          wrap: true,
          align: 'center',
          margin: 'sm'
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'md',
          spacing: 'sm',
          justifyContent: 'center',
          contents: [1, 2, 3, 4, 5].map(score => ({
            type: 'box',
            layout: 'vertical',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f5',
            cornerRadius: 'md',
            paddingAll: '8px',
            action: {
              type: 'postback',
              data: `action=rate&id=${recordId}&score=${score}`,
              displayText: `ให้คะแนน ${score} ดาว`
            },
            contents: [
              {
                type: 'text',
                text: '⭐',
                size: 'md',
                align: 'center'
              },
              {
                type: 'text',
                text: `${score}`,
                size: 'xxs',
                color: '#888888',
                align: 'center',
                margin: 'sm'
              }
            ]
          }))
        }
      ]
    }
  };
}

/**
 * buildProfileFlexMessage — Flex Message แสดงข้อมูลสมาชิก
 */
async function buildProfileFlexMessage({
  displayName,
  pictureUrl,
  credit,
  isVIP,
  vipExpiry,
  vipRemaining,
  dob,
  zodiac,
  totalReadings,
}) {
  if (!global.__DD_BYPASS_FLEX_OVERRIDE) {
    const overrideKey = isVIP ? 'flex_profile_vip' : 'flex_profile';
    const overrideTpl = await getSetting(overrideKey);
    if (overrideTpl) {
      try {
        const parsed = overrideTpl
          .replace(/{{displayName}}/g, displayName || 'สมาชิก')
          .replace(/{{pictureUrl}}/g, pictureUrl || '')
          .replace(/{{credit}}/g, credit || 0)
          .replace(/{{isVIP}}/g, isVIP ? 'true' : 'false')
          .replace(/{{vipExpiry}}/g, vipExpiry || '-')
          .replace(/{{vipRemaining}}/g, vipRemaining || 0)
          .replace(/{{dob}}/g, dob || '')
          .replace(/{{zodiac}}/g, zodiac || '')
          .replace(/{{totalReadings}}/g, totalReadings || 0);
        return JSON.parse(parsed);
      } catch (err) {
        console.error(`Failed to parse ${overrideKey} override:`, err);
      }
    }
  }

  const accent    = isVIP ? '#f59e0b' : '#818cf8';
  const accentDim = isVIP ? '#b45309' : '#4f46e5';
  const bgDark    = isVIP ? '#120a00' : '#0d0d20';
  const bgBody    = '#111128';
  const bgRow     = '#1a1a38';
  const badge     = isVIP ? '✦ VIP Premium ✦' : '· สมาชิกทั่วไป ·';

  function infoRow(emoji, label, value, vc) {
    return {
      type: 'box', layout: 'horizontal',
      backgroundColor: bgRow, cornerRadius: '10px', paddingAll: '10px',
      contents: [
        {
          type: 'box', layout: 'horizontal', flex: 1, spacing: 'sm',
          contents: [
            { type: 'text', text: emoji, size: 'sm', flex: 0, gravity: 'center' },
            { type: 'text', text: label, size: 'sm', color: '#9999cc', flex: 1, gravity: 'center' },
          ],
        },
        {
          type: 'text', text: String(value ?? '-'),
          size: 'sm', color: vc || '#e2e8f0',
          align: 'end', weight: 'bold', flex: 1, wrap: true, gravity: 'center',
        },
      ],
    };
  }

  const bodyContents = [];

  // เครดิต - กล่องใหญ่
  bodyContents.push({
    type: 'box', layout: 'vertical',
    backgroundColor: isVIP ? '#1c1000' : '#0f0f28',
    cornerRadius: '12px', paddingAll: '14px',
    contents: [
      { type: 'text', text: '💎 เครดิตคงเหลือ', size: 'xs', color: '#8888bb', weight: 'bold' },
      { type: 'text', text: credit + ' บาท', size: 'xxl', color: '#60a5fa', weight: 'bold', margin: 'xs' },
    ],
  });

  // VIP
  if (isVIP) {
    bodyContents.push({
      type: 'box', layout: 'vertical', margin: 'sm', spacing: 'sm',
      contents: [
        infoRow('👑', 'VIP หมดอายุ', vipExpiry || '-', '#f59e0b'),
        infoRow('🔮', 'สิทธิ์ดูดวงวันนี้', vipRemaining + ' ครั้ง', vipRemaining > 0 ? '#34d399' : '#f87171'),
      ],
    });
  } else {
    bodyContents.push({
      type: 'box', layout: 'vertical', margin: 'sm',
      contents: [infoRow('👑', 'สถานะ VIP', 'ยังไม่ได้สมัคร', '#9ca3af')],
    });
  }

  // วันเกิด / ราศี / สถิติ
  const extras = [];
  if (dob)    extras.push(infoRow('🎂', 'วันเกิด', dob, '#c4b5fd'));
  if (zodiac) extras.push(infoRow('⭐', 'ราศี', zodiac, '#fbbf24'));
  extras.push(infoRow('📊', 'ดูดวงทั้งหมด', totalReadings + ' ครั้ง', '#94a3b8'));
  bodyContents.push({ type: 'box', layout: 'vertical', margin: 'sm', spacing: 'sm', contents: extras });

  // รูปโปรไฟล์
  const profilePic = pictureUrl
    ? { type: 'image', url: pictureUrl, size: 'full', aspectRatio: '1:1', aspectMode: 'cover' }
    : { type: 'text', text: '👤', size: '5xl', align: 'center', gravity: 'center' };

  // ปุ่ม footer
  const footerBtns = [];
  if (!isVIP) {
    footerBtns.push({ type: 'button', style: 'primary', color: '#f59e0b', height: 'sm', action: { type: 'message', label: '👑 สมัคร VIP — 199฿/เดือน', text: 'สมัครสมาชิก' } });
  }

  return {
    type: 'bubble', size: 'mega',
    hero: {
      type: 'box', layout: 'vertical', backgroundColor: bgDark,
      paddingTop: '24px', paddingBottom: '20px', paddingStart: '20px', paddingEnd: '20px',
      contents: [
        {
          type: 'box', layout: 'vertical', alignItems: 'center', spacing: 'sm',
          contents: [
            {
              type: 'box', layout: 'vertical', alignItems: 'center', justifyContent: 'center',
              width: '88px', height: '88px', cornerRadius: '100px',
              borderColor: accent, borderWidth: '3px',
              contents: [profilePic],
            },
            { type: 'text', text: displayName || 'สมาชิก', size: 'xl', color: '#ffffff', weight: 'bold', align: 'center', wrap: true },
            {
              type: 'box', layout: 'vertical', alignItems: 'center',
              backgroundColor: isVIP ? '#2d1a00' : '#1a1a38',
              cornerRadius: '20px', paddingTop: '4px', paddingBottom: '4px', paddingStart: '14px', paddingEnd: '14px',
              contents: [{ type: 'text', text: badge, size: 'xs', color: accent, weight: 'bold', align: 'center' }],
            },
          ],
        },
        { type: 'separator', color: accentDim, margin: 'xl' },
        { type: 'text', text: 'DD Jang — หมอดูส่วนตัวของคุณ 🔮', size: 'xs', color: '#55557a', align: 'center', margin: 'md' },
      ],
    },
    body: {
      type: 'box', layout: 'vertical', backgroundColor: bgBody, paddingAll: '16px', spacing: 'md',
      contents: [
        { type: 'text', text: '📋 บัญชีของคุณ', size: 'xs', color: '#6666aa', weight: 'bold' },
        ...bodyContents,
      ],
    },
    ...(footerBtns.length > 0 ? {
      footer: {
        type: 'box', layout: 'vertical', backgroundColor: bgBody, paddingAll: '16px', spacing: 'none',
        contents: footerBtns,
      },
    } : {}),
  };
}

async function getDefaultFlexTemplate(type) {
  global.__DD_BYPASS_FLEX_OVERRIDE = true;
  let result = '{}';
  try {
    if (type === 'flex_booking') {
      result = JSON.stringify(await buildBookingFlexMessage({id:'{{id}}', status:'pending', preferred_date:'{{preferredDate}}', confirmed_date:'{{confirmedDate}}'}, '{{overrideTitle}}', '{{note}}', '{{readerName}}'), null, 2);
    } else if (type === 'flex_payment_menu') {
      result = JSON.stringify(await buildPaymentMenuFlex('{{type}}', '{{price}}', '{{stripeUrl}}'), null, 2);
    } else if (type === 'flex_payment_success') {
      result = JSON.stringify(await buildPaymentSuccessFlex('{{type}}', '{{amountPaid}}', '{{creditAdded}}', '{{expiryDate}}'), null, 2);
    } else if (type === 'flex_rating') {
      result = JSON.stringify(await buildRatingFlexMessage('{{recordId}}'), null, 2);
    } else if (type === 'flex_profile') {
      result = JSON.stringify(await buildProfileFlexMessage({
        displayName: '{{displayName}}', pictureUrl: '{{pictureUrl}}', credit: '{{credit}}', isVIP: false,
        vipExpiry: '{{vipExpiry}}', vipRemaining: '{{vipRemaining}}', dob: '{{dob}}', zodiac: '{{zodiac}}', totalReadings: '{{totalReadings}}'
      }), null, 2);
    } else if (type === 'flex_profile_vip') {
      result = JSON.stringify(await buildProfileFlexMessage({
        displayName: '{{displayName}}', pictureUrl: '{{pictureUrl}}', credit: '{{credit}}', isVIP: true,
        vipExpiry: '{{vipExpiry}}', vipRemaining: '{{vipRemaining}}', dob: '{{dob}}', zodiac: '{{zodiac}}', totalReadings: '{{totalReadings}}'
      }), null, 2);
    } else if (type === 'flex_ad') {
      result = JSON.stringify({
        "type": "bubble",
        "size": "mega",
        "header": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "🔮 HOROSCOPE & TAROT",
              "color": "#FFD700",
              "weight": "bold",
              "size": "sm",
              "align": "center"
            }
          ],
          "backgroundColor": "#2A1B3D",
          "paddingTop": "25px",
          "paddingBottom": "10px"
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "backgroundColor": "#2A1B3D",
          "contents": [
            {
              "type": "text",
              "text": "โปรโมชั่นพิเศษ! 🎉",
              "weight": "bold",
              "size": "xl",
              "color": "#FFFFFF",
              "align": "center"
            },
            {
              "type": "text",
              "text": "ดูดวงฟรี 1 ครั้งสำหรับสมาชิกใหม่ \nหรือเติมเครดิตรับโบนัส 2 เท่า",
              "wrap": true,
              "margin": "md",
              "color": "#D3C4E3",
              "size": "md",
              "align": "center"
            },
            {
              "type": "separator",
              "margin": "xl",
              "color": "#5C4B79"
            },
            {
              "type": "box",
              "layout": "horizontal",
              "margin": "lg",
              "contents": [
                {
                  "type": "text",
                  "text": "⏳ หมดเขต",
                  "size": "sm",
                  "color": "#FFD700",
                  "flex": 1,
                  "weight": "bold"
                },
                {
                  "type": "text",
                  "text": "สิ้นเดือนนี้เท่านั้น!",
                  "size": "sm",
                  "color": "#FFFFFF",
                  "align": "end",
                  "flex": 2
                }
              ]
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "spacing": "sm",
          "backgroundColor": "#2A1B3D",
          "contents": [
            {
              "type": "button",
              "style": "primary",
              "height": "sm",
              "color": "#8A2BE2",
              "action": {
                "type": "message",
                "label": "รับสิทธิ์เลย",
                "text": "เช็คคิว"
              }
            },
            {
              "type": "button",
              "style": "link",
              "height": "sm",
              "color": "#D3C4E3",
              "action": {
                "type": "message",
                "label": "สอบถามเพิ่มเติม",
                "text": "ติดต่อแอดมิน"
              }
            }
          ],
          "paddingBottom": "25px"
        }
      }, null, 2);
    }
  } catch (err) {
    console.error('Error getting default flex template:', err);
  }
  global.__DD_BYPASS_FLEX_OVERRIDE = false;
  return result;
}

module.exports = {
  buildBookingFlexMessage,
  buildPaymentMenuFlex,
  buildPaymentSuccessFlex,
  buildRatingFlexMessage,
  buildProfileFlexMessage,
  getDefaultFlexTemplate
};

