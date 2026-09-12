const sendBtn = document.getElementById('sendBtn');
const output = document.getElementById('output');

async function sendHello() {
  if (!window.OPENROUTER_CONFIG || !window.OPENROUTER_CONFIG.apiKey) {
    output.textContent = 'ยังไม่ได้ตั้งค่า config.js — คัดลอกจาก config.example.js แล้วใส่ API key ของคุณ';
    return;
  }

  sendBtn.disabled = true;
  output.textContent = 'กำลังส่งข้อความ...';

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${window.OPENROUTER_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: window.OPENROUTER_CONFIG.model,
        messages: [{ role: 'user', content: 'สวัสดี' }]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    output.textContent = data.choices?.[0]?.message?.content ?? '(ไม่มีคำตอบจากโมเดล)';
  } catch (err) {
    output.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
  } finally {
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener('click', sendHello);
