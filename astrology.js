/**
 * astrology.js
 * ระบบคำนวณเลข 7 ตัว 4 ฐาน (มหาภูติ) สำหรับโหราศาสตร์ไทย
 */

// หาค่าเลข 1-7 (ถ้าได้ 0 ให้เป็น 7)
function mod7(num) {
    const res = num % 7;
    return res === 0 ? 7 : res;
}

/**
 * แปลงข้อมูลวันเกิดเป็นตารางเลข 7 ตัว 4 ฐาน
 * @param {number} dayOfWeek - 1 (อาทิตย์) ถึง 7 (เสาร์)
 * @param {number} thaiMonth - 1 (ธ.ค.) ถึง 12 (พ.ย.) (เดือนไทย)
 * @param {number} zodiacYear - 1 (ชวด) ถึง 12 (กุน)
 */
function calculate7Numbers(dayOfWeek, thaiMonth, zodiacYear) {
    const table = [];

    // ฐาน 1: วัน
    const base1 = [];
    for (let i = 0; i < 7; i++) {
        base1.push(mod7(dayOfWeek + i));
    }
    table.push(base1);

    // ฐาน 2: เดือน
    const base2 = [];
    for (let i = 0; i < 7; i++) {
        base2.push(mod7(thaiMonth + i));
    }
    table.push(base2);

    // ฐาน 3: ปี
    const base3 = [];
    for (let i = 0; i < 7; i++) {
        base3.push(mod7(zodiacYear + i));
    }
    table.push(base3);

    // ฐาน 4: ผลรวม (ฐาน 1 + ฐาน 2 + ฐาน 3)
    const base4 = [];
    for (let i = 0; i < 7; i++) {
        base4.push(base1[i] + base2[i] + base3[i]);
    }
    table.push(base4);

    return table;
}

/**
 * แมปชื่อภพ (ตนุ, กดุมภะ, สหัชชะ, ...)
 */
const houses = [
    // แถวที่ 1 (วัน)
    ["อัตตะ", "หินะ", "ธะนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
    // แถวที่ 2 (เดือน)
    ["ตนุ", "กดุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
    // แถวที่ 3 (ปี)
    ["มรณะ", "ศุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"]
];

function convertDateToThaiNumerology(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error("Invalid date");
    }

    // วันในสัปดาห์ (Sunday = 0 -> 1 (อาทิตย์), Monday = 1 -> 2 (จันทร์))
    const jsDay = date.getDay();
    const dayOfWeek = jsDay === 0 ? 1 : jsDay + 1; // 1 = อาทิตย์, 7 = เสาร์

    // เดือนไทย (โดยประมาณ)
    // 1=ธ.ค., 2=ม.ค., 3=ก.พ., 4=มี.ค., 5=เม.ย., 6=พ.ค., 7=มิ.ย., 8=ก.ค., 9=ส.ค., 10=ก.ย., 11=ต.ค., 12=พ.ย.
    const month = date.getMonth(); // 0 = Jan, 11 = Dec
    let thaiMonth;
    if (month === 11) thaiMonth = 1; // Dec
    else thaiMonth = month + 2;      // Jan(0)->2, Feb(1)->3, etc.

    // ปีนักษัตร
    // คำนวณแบบง่าย: (Year % 12). 2020 = ปีชวด. 2020 % 12 = 4. ชวดคือ 1.
    // ดังนั้น Zodiac = (Year + 8) % 12 + 1
    const year = date.getFullYear();
    let zodiacYear = ((year + 8) % 12) + 1; // 1 = ชวด, 12 = กุน

    const table = calculate7Numbers(dayOfWeek, thaiMonth, zodiacYear);

    return {
        table,
        dayOfWeek,
        thaiMonth,
        zodiacYear,
        houses
    };
}

module.exports = {
    convertDateToThaiNumerology,
    calculate7Numbers
};
