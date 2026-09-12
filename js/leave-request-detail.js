// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้าที่ 3 รายละเอียดใบลา
// สัปดาห์ที่ 6: อ่านใบลาและความเห็นจากฐานข้อมูลจริง (Firestore)
// สัปดาห์ที่ 7: ปุ่มอนุมัติ/ไม่อนุมัติ เขียนสถานะกลับ Firestore จริง (แก้เฉพาะช่อง status)
// การส่งความเห็น ยังเปลี่ยนแค่ในหน่วยความจำ (เขียนจริงทีหลัง)
// ─────────────────────────────────────────────────────────────

import { db } from "./firebase-config.js";
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

(async function () {
  var รหัสใบลา = ค่าจากURL("id");
  var กล่องใบลา = document.getElementById("กล่องใบลา");
  var กล่องความเห็น = document.getElementById("กล่องความเห็น");

  var ใบ, ความเห็น;
  try {
    var เอกสารใบลา = await getDoc(doc(db, "leaveRequests", รหัสใบลา));
    if (เอกสารใบลา.exists()) {
      ใบ = Object.assign({ id: เอกสารใบลา.id }, เอกสารใบลา.data());
      var สแนปช็อตความเห็น = await getDocs(collection(db, "leaveRequests", รหัสใบลา, "approvals"));
      ความเห็น = [];
      สแนปช็อตความเห็น.forEach(function (c) {
        ความเห็น.push(Object.assign({ id: c.id }, c.data()));
      });
    } else {
      ใบ = null;
      ความเห็น = [];
    }
  } catch (ข้อผิดพลาด) {
    กล่องใบลา.innerHTML = "<p>โหลดข้อมูลจาก Firestore ไม่สำเร็จ: " + esc(ข้อผิดพลาด.message) + "</p>";
    return;
  }

  if (!ใบ) {
    กล่องใบลา.innerHTML = "<p>ไม่พบใบขอลาที่ต้องการ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>";
    return;
  }

  วาดใบลา();
  วาดความเห็น();
  กล่องความเห็น.classList.remove("hidden");

  document.getElementById("ปุ่มส่งความเห็น").addEventListener("click", ส่งความเห็น);

  // ── วาดข้อมูลใบลาลงหน้าจอ ──
  function วาดใบลา() {
    var แถว = [
      ["หัวข้อ", esc(ใบ.title)],
      ["เหตุผลการลา", esc(ใบ.reason)],
      ["ประเภทการลา", esc(ใบ.leaveTypeName)],
      ["วันที่ลา", esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate)],
      ["ผู้ขอลา", esc(ใบ.requesterName)],
      ["ผู้อนุมัติ", ใบ.approverName ? esc(ใบ.approverName) : "ยังไม่ได้กำหนดผู้อนุมัติ"],
      ["สถานะ", ป้ายสถานะ(ใบ.status)],
      ["วันที่ยื่น", esc(ใบ.createdAt)]
    ];

    var html = แถว.map(function (r) {
      return '<div class="field-row"><span class="k">' + r[0] + "</span><span>" + r[1] + "</span></div>";
    }).join("");

    // ปุ่มอนุมัติ / ไม่อนุมัติ — กดได้เฉพาะใบที่ยังรอพิจารณา นอกนั้น disabled
    var กดได้ = ใบ.status === "รอพิจารณา";
    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-ok" id="ปุ่มอนุมัติ"' + (กดได้ ? "" : " disabled") + '>อนุมัติ</button>' +
      '<button type="button" class="btn-danger" id="ปุ่มไม่อนุมัติ"' + (กดได้ ? "" : " disabled") + '>ไม่อนุมัติ</button>' +
      "</div>";
    if (!กดได้) {
      html += '<p class="hint">ใบนี้พิจารณาแล้ว จึงเปลี่ยนสถานะต่อไม่ได้</p>';
    }

    // ปุ่มลบ — ลบได้เฉพาะใบที่ยังรอพิจารณา นอกนั้น disabled
    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-danger" id="ปุ่มลบ"' + (กดได้ ? "" : " disabled") + '>ลบใบลานี้</button>' +
      "</div>";

    // ปุ่มผู้ช่วย AI ระดับ 2 — สรุปใบลาให้หัวหน้าอ่าน (ไม่ตัดสินอนุมัติ/ไม่อนุมัติแทนคน ไม่แตะช่อง status)
    html +=
      '<div class="btn-row">' +
      '<button type="button" id="ปุ่มสรุปAI">ให้ AI ช่วยสรุปใบลาให้หัวหน้าอ่าน</button>' +
      "</div>" +
      '<div id="กล่องสรุปAI" class="alert alert-ai' + (ใบ.aiSuggestion ? "" : " hidden") + '">' +
      (ใบ.aiSuggestion ? esc(ใบ.aiSuggestion) : "") +
      "</div>";

    กล่องใบลา.innerHTML = html;

    document.getElementById("ปุ่มอนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
    document.getElementById("ปุ่มไม่อนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
    document.getElementById("ปุ่มลบ").addEventListener("click", ลบใบลา);
    document.getElementById("ปุ่มสรุปAI").addEventListener("click", สรุปด้วยAI);
  }

  // ── ผู้ช่วย AI ระดับ 2 (agentic): อ่านใบลา → เขียนสรุปสั้น ๆ → เขียนสรุปกลับฐาน ──
  // AI แค่สรุปให้อ่าน ไม่ตัดสินอนุมัติ/ไม่อนุมัติแทนคน — ฟังก์ชันนี้ไม่แตะช่อง status เลย
  async function สรุปด้วยAI() {
    var ปุ่ม = document.getElementById("ปุ่มสรุปAI");
    var กล่องสรุป = document.getElementById("กล่องสรุปAI");

    if (!window.AI_CONFIG || !window.AI_CONFIG.apiKey) {
      กล่องสรุป.textContent = "⚠️ ยังไม่ได้ตั้งค่า js/ai-config.js — คัดลอกจาก js/ai-config.example.js แล้วใส่ API key";
      กล่องสรุป.classList.remove("hidden");
      return;
    }

    ปุ่ม.disabled = true;
    var ข้อความปุ่มเดิม = ปุ่ม.textContent;
    ปุ่ม.textContent = "กำลังสรุป...";

    var ตัวยกเลิก = new AbortController();
    var ตัวจับเวลา = setTimeout(function () { ตัวยกเลิก.abort(); }, 15000);

    // ขั้นที่ 1: อ่านใบลาใบนี้ — ใช้ข้อมูลที่โหลดไว้แล้วตอนเปิดหน้า
    var คำสั่ง =
      "สรุปใบลานี้สั้น ๆ 2-3 ประโยคภาษาไทย ให้หัวหน้าอ่านก่อนตัดสินใจอนุมัติ/ไม่อนุมัติ:\n" +
      "หัวข้อ: " + ใบ.title + "\n" +
      "เหตุผล: " + ใบ.reason + "\n" +
      "ประเภทการลา: " + ใบ.leaveTypeName + "\n" +
      "ผู้ขอลา: " + ใบ.requesterName + "\n" +
      "วันที่ลา: " + ใบ.startDate + " ถึง " + ใบ.endDate + "\n" +
      "ตอบเฉพาะเนื้อความสรุป ห้ามแนะนำว่าควรอนุมัติหรือไม่อนุมัติ";

    try {
      // ขั้นที่ 2: เขียนสรุปสั้น ๆ
      var ผลตอบกลับ = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: ตัวยกเลิก.signal,
        headers: {
          "Authorization": "Bearer " + window.AI_CONFIG.apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: window.AI_CONFIG.model,
          messages: [{ role: "user", content: คำสั่ง }]
        })
      });

      if (!ผลตอบกลับ.ok) {
        throw new Error("HTTP " + ผลตอบกลับ.status);
      }

      var ข้อมูล = await ผลตอบกลับ.json();
      var สรุป = ((ข้อมูล.choices && ข้อมูล.choices[0] && ข้อมูล.choices[0].message.content) || "").trim();

      if (!สรุป) {
        throw new Error("AI ไม่ตอบข้อความสรุปกลับมา");
      }

      // ขั้นที่ 3: เขียนสรุปกลับฐาน — แก้เฉพาะช่อง aiSuggestion ช่องเดียว ไม่แตะ status
      await updateDoc(doc(db, "leaveRequests", รหัสใบลา), { aiSuggestion: สรุป });
      await addDoc(collection(db, "leaveRequests", รหัสใบลา, "aiLog"), {
        input: คำสั่ง,
        output: สรุป,
        createdAt: เวลาตอนนี้()
      });

      ใบ.aiSuggestion = สรุป;
      กล่องสรุป.textContent = สรุป;
      กล่องสรุป.classList.remove("hidden");
    } catch (ข้อผิดพลาด) {
      console.error("สรุปด้วยAI ล้มเหลว:", ข้อผิดพลาด);
      กล่องสรุป.textContent = "⚠️ เรียก AI ไม่สำเร็จหรือใช้เวลานานเกินไป — ลองใหม่ได้ภายหลัง";
      กล่องสรุป.classList.remove("hidden");
    } finally {
      clearTimeout(ตัวจับเวลา);
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความปุ่มเดิม;
    }
  }

  // ── เปลี่ยนสถานะ — เขียนกลับ Firestore เฉพาะช่อง status เท่านั้น ──
  async function เปลี่ยนสถานะ(สถานะใหม่) {
    if (ใบ.status !== "รอพิจารณา") return;

    // กฎ: จะไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการก่อน
    if (สถานะใหม่ === "ไม่อนุมัติ" && ความเห็น.length === 0) {
      alert("ต้องเขียนความเห็นอย่างน้อย 1 รายการก่อน จึงจะกดไม่อนุมัติได้");
      return;
    }

    try {
      await updateDoc(doc(db, "leaveRequests", รหัสใบลา), { status: สถานะใหม่ });
    } catch (ข้อผิดพลาด) {
      alert("บันทึกสถานะลง Firestore ไม่สำเร็จ: " + ข้อผิดพลาด.message);
      return;
    }

    ใบ.status = สถานะใหม่;
    วาดใบลา();
  }

  // ── ลบใบลา — ลบได้เฉพาะใบที่ยังรอพิจารณา ต้องยืนยันก่อนเสมอ ──
  async function ลบใบลา() {
    if (ใบ.status !== "รอพิจารณา") return;

    if (!confirm("ยืนยันการลบใบลานี้หรือไม่ — ลบแล้วกู้คืนไม่ได้")) return;

    try {
      await deleteDoc(doc(db, "leaveRequests", รหัสใบลา));
    } catch (ข้อผิดพลาด) {
      alert("ลบใบลาไม่สำเร็จ: " + ข้อผิดพลาด.message);
      return;
    }

    location.href = "leave-requests.html";
  }

  // ── รายการความเห็น เรียงจากเก่าไปใหม่ ──
  function วาดความเห็น() {
    var ที่วาง = document.getElementById("รายการความเห็น");
    if (ความเห็น.length === 0) {
      ที่วาง.innerHTML = "<p>ยังไม่มีความเห็นในใบนี้</p>";
      return;
    }
    ที่วาง.innerHTML = ความเห็น
      .slice()
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })
      .map(function (c) {
        return '<div class="comment"><div class="meta">' + esc(c.authorName) + " · " + esc(c.createdAt) +
               "</div><div>" + esc(c.message) + "</div></div>";
      }).join("");
  }

  // ── ส่งความเห็นใหม่ (สัปดาห์นี้เก็บแค่ในหน่วยความจำ ยังไม่เขียนกลับ Firestore) ──
  function ส่งความเห็น() {
    var ช่อง = document.getElementById("ข้อความความเห็น");
    var เตือน = document.getElementById("เตือนความเห็น");
    var ข้อความ = ช่อง.value.trim();

    if (!ข้อความ) {
      เตือน.textContent = "⚠️ พิมพ์ข้อความก่อน จึงจะส่งความเห็นได้";
      เตือน.classList.remove("hidden");
      return;
    }
    เตือน.classList.add("hidden");

    // สัปดาห์ที่ 6 ยังไม่มีล็อกอิน จึงสมมติว่าผู้เขียนคือ สมหญิง รักงาน
    ความเห็น.push({
      id: "ap-ใหม่-" + Date.now(),
      authorId: "u002", authorName: "สมหญิง รักงาน",
      message: ข้อความ,
      createdAt: เวลาตอนนี้()
    });
    ช่อง.value = "";
    วาดความเห็น();
  }
})();
