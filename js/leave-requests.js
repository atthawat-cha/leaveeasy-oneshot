// ─────────────────────────────────────────────────────────────
// js/leave-requests.js — หน้าที่ 1 รายการใบลา
// สัปดาห์ที่ 6: อ่านจากฐานข้อมูลจริง (Firestore) — โฟลเดอร์ leaveRequests
// สัปดาห์ที่ 9: employee เห็นเฉพาะใบของตัวเอง · manager/hr เห็นทุกใบ (ตาม ACL.md)
// ─────────────────────────────────────────────────────────────

import { db, auth } from "./firebase-config.js";
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

onAuthStateChanged(auth, async function (ผู้ใช้) {
  if (!ผู้ใช้) return; // js/auth-guard.js จะพาไปหน้าเข้าสู่ระบบเอง

  var กล่อง = document.getElementById("ผลลัพธ์");

  var ใบลาทั้งหมด;
  try {
    var เอกสารผู้ใช้ = await getDoc(doc(db, "users", ผู้ใช้.uid));
    var บทบาท = เอกสารผู้ใช้.exists() ? เอกสารผู้ใช้.data().role : "employee";

    var แหล่งข้อมูล = (บทบาท === "manager" || บทบาท === "hr")
      ? collection(db, "leaveRequests")
      : query(collection(db, "leaveRequests"), where("requesterId", "==", ผู้ใช้.uid));

    var สแนปช็อต = await getDocs(แหล่งข้อมูล);
    ใบลาทั้งหมด = [];
    สแนปช็อต.forEach(function (เอกสาร) {
      ใบลาทั้งหมด.push(Object.assign({ id: เอกสาร.id }, เอกสาร.data()));
    });
  } catch (ข้อผิดพลาด) {
    กล่อง.innerHTML = "<p>โหลดข้อมูลจาก Firestore ไม่สำเร็จ: " + esc(ข้อผิดพลาด.message) + "</p>";
    return;
  }

  // ถ้ามีสถานะติดมาท้าย URL ให้กรองเฉพาะสถานะนั้น
  var สถานะที่กรอง = ค่าจากURL("status");
  if (สถานะที่กรอง) {
    ใบลาทั้งหมด = ใบลาทั้งหมด.filter(function (ใบ) { return ใบ.status === สถานะที่กรอง; });
    document.querySelector(".subtitle").textContent =
      "กำลังแสดงเฉพาะใบลาที่สถานะ " + สถานะที่กรอง + " · กดเมนู รายการใบลา เพื่อดูทั้งหมด";
  }

  document.getElementById("จำนวนทั้งหมด").textContent = "ทั้งหมด " + ใบลาทั้งหมด.length + " ใบ";

  แสดงตาราง(ใบลาทั้งหมด);

  function แสดงตาราง(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีใบขอลาในระบบ</p>";
      return;
    }

    var html =
      "<table><thead><tr>" +
      "<th>หัวข้อ</th>" +
      "<th>ประเภทการลา</th>" +
      "<th>สถานะ</th>" +
      '<th class="hide-mobile">ผู้ขอลา</th>' +
      '<th class="hide-mobile">วันที่ลา</th>' +
      "</tr></thead><tbody>";

    รายการ.forEach(function (ใบ) {
      html +=
        '<tr class="clickable" data-id="' + esc(ใบ.id) + '">' +
        "<td>" + esc(ใบ.title) + "</td>" +
        "<td>" + esc(ใบ.leaveTypeName) + "</td>" +
        "<td>" + ป้ายสถานะ(ใบ.status) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.requesterName) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    กล่อง.innerHTML = html;

    // กดที่แถวไหน ไปหน้ารายละเอียดของใบนั้น
    กล่อง.querySelectorAll("tr.clickable").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        location.href = "leave-request-detail.html?id=" + แถว.dataset.id;
      });
    });
  }
});
