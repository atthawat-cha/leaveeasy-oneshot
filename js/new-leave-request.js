// ─────────────────────────────────────────────────────────────
// js/new-leave-request.js — หน้าที่ 2 ยื่นใบลาใหม่
// สัปดาห์ที่ 7: บันทึกใบลาใหม่ลงฐานข้อมูลจริง (Firestore) — โฟลเดอร์ leaveRequests
// requesterId/requesterName มาจากผู้ใช้ที่ล็อกอินอยู่จริง (js/auth-guard.js บังคับล็อกอินก่อนแล้ว)
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มใบลา");
  var ช่องประเภท = document.getElementById("leaveTypeId");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ปุ่มบันทึก = document.getElementById("ปุ่มบันทึก");
  var ช่องเหตุผล = document.getElementById("reason");
  var ปุ่มAI = document.getElementById("ปุ่มAI");
  var ป้ายAI = document.getElementById("ป้ายAI");
  var ข้อความปุ่มAIเดิม = ปุ่มAI.textContent;

  // เติมรายการเลื่อนลงด้วยประเภทการลาที่มีอยู่
  window.LEAVE_DATA.leaveTypes.forEach(function (ประเภท) {
    var ตัวเลือก = document.createElement("option");
    ตัวเลือก.value = ประเภท.id;
    ตัวเลือก.textContent = ประเภท.name;
    ช่องประเภท.appendChild(ตัวเลือก);
  });

  // ปุ่ม AI ช่วยจัดประเภทการลา (US-09) — อ่านเหตุผล ส่งไปพร้อมรายชื่อประเภทที่มีอยู่จริง
  // แล้วเลือกประเภทให้ ผลต้องเป็นชื่อที่ตรงกับรายการจริงเท่านั้น ไม่งั้นไม่แตะค่าเดิม
  ปุ่มAI.addEventListener("click", async function () {
    var เหตุผล = ช่องเหตุผล.value.trim();
    ป้ายAI.classList.add("hidden");
    กล่องเตือน.classList.add("hidden");

    if (!เหตุผล) {
      เตือน("กรอกเหตุผลการลาก่อน จึงจะให้ AI ช่วยจัดประเภทได้");
      return;
    }
    if (!window.AI_CONFIG || !window.AI_CONFIG.apiKey) {
      เตือน("ยังไม่ได้ตั้งค่า js/ai-config.js — คัดลอกจาก js/ai-config.example.js แล้วใส่ API key");
      return;
    }

    var รายชื่อประเภท = window.LEAVE_DATA.leaveTypes.map(function (t) { return t.name; });

    ปุ่มAI.disabled = true;
    ปุ่มAI.textContent = "กำลังวิเคราะห์...";

    var ตัวยกเลิก = new AbortController();
    var ตัวจับเวลา = setTimeout(function () { ตัวยกเลิก.abort(); }, 15000);

    try {
      var คำสั่ง = "เหตุผลการลาคือ: \"" + เหตุผล + "\"\n" +
        "ประเภทการลาที่มีอยู่จริงในระบบมีเท่านี้: " + รายชื่อประเภท.join(", ") + "\n" +
        "เลือกประเภทที่ตรงกับเหตุผลนี้ที่สุด แล้วตอบกลับด้วยชื่อประเภทนั้น " +
        "ให้สะกดตรงกับที่ให้ไปเป๊ะคำเดียวเท่านั้น ห้ามมีข้อความอื่นปน " +
        "ถ้าไม่มีประเภทไหนเข้ากับเหตุผลนี้จริง ๆ ให้ตอบคำว่า \"ไม่ตรง\" คำเดียว";

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
      var คำตอบดิบ = (ข้อมูล.choices && ข้อมูล.choices[0] && ข้อมูล.choices[0].message.content) || "";
      var ชื่อประเภทที่AIเลือก = คำตอบดิบ.trim().replace(/^["']|["']$/g, "");

      var ประเภทที่ตรง = window.LEAVE_DATA.leaveTypes.find(function (t) {
        return t.name === ชื่อประเภทที่AIเลือก;
      });

      if (ประเภทที่ตรง) {
        ช่องประเภท.value = ประเภทที่ตรง.id;
        ป้ายAI.classList.remove("hidden");
      } else {
        เตือน("AI จัดประเภทให้ไม่ได้ — กรุณาเลือกประเภทเอง");
      }
    } catch (ข้อผิดพลาด) {
      เตือน("เรียก AI ไม่สำเร็จหรือใช้เวลานานเกินไป — เลือกประเภทเองได้ตามปกติ");
    } finally {
      clearTimeout(ตัวจับเวลา);
      ปุ่มAI.disabled = false;
      ปุ่มAI.textContent = ข้อความปุ่มAIเดิม;
    }
  });

  ฟอร์ม.addEventListener("submit", async function (e) {
    e.preventDefault();

    var ผู้ใช้ = auth.currentUser;
    if (!ผู้ใช้) {
      location.href = "login.html";
      return;
    }

    var ค่า = {
      title: document.getElementById("title").value.trim(),
      reason: document.getElementById("reason").value.trim(),
      leaveTypeId: ช่องประเภท.value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value
    };

    // ตรวจว่ากรอกครบก่อนบันทึก
    if (!ค่า.title || !ค่า.reason || !ค่า.leaveTypeId || !ค่า.startDate || !ค่า.endDate) {
      เตือน("กรอกไม่ครบ — ต้องกรอกทุกช่องก่อนกดบันทึก");
      return;
    }
    if (ค่า.endDate < ค่า.startDate) {
      เตือน("วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มลา");
      return;
    }

    var ประเภท = window.LEAVE_DATA.leaveTypes.find(function (t) { return t.id === ค่า.leaveTypeId; });

    ปุ่มบันทึก.disabled = true;

    try {
      var เอกสารผู้ใช้ = await getDoc(doc(db, "users", ผู้ใช้.uid));
      var ชื่อผู้ขอลา = เอกสารผู้ใช้.exists() ? เอกสารผู้ใช้.data().name : ผู้ใช้.email;

      var ใบใหม่ = {
        title: ค่า.title,
        reason: ค่า.reason,
        status: "รอพิจารณา",                       // ใบใหม่เริ่มที่ รอพิจารณา เสมอ
        requesterId: ผู้ใช้.uid, requesterName: ชื่อผู้ขอลา,
        approverId: "",      approverName: "",
        leaveTypeId: ประเภท.id, leaveTypeName: ประเภท.name,
        startDate: ค่า.startDate,
        endDate: ค่า.endDate,
        createdAt: เวลาตอนนี้()
      };

      await addDoc(collection(db, "leaveRequests"), ใบใหม่);
      location.href = "leave-requests.html";
    } catch (ข้อผิดพลาด) {
      เตือน("บันทึกลง Firestore ไม่สำเร็จ: " + ข้อผิดพลาด.message);
      ปุ่มบันทึก.disabled = false;
    }
  });

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
