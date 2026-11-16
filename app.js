const $ = id => document.getElementById(id);
const GAS_URL = window.GAS_URL;

// ── ฟังก์ชันติดต่อ GAS ───────────────────────────────────
async function callGas(action, payload = {}) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload }),
    redirect: "follow"
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

// ── สุ่มตัวเลข ───────────────────────────────────────────
$("btn-generate").addEventListener("click", async () => {
  const btn = $("btn-generate");
  btn.disabled = true;
  btn.textContent = "กำลังคำนวณ...";
  
  try {
    const data = await callGas("generate", { mode: $("mode").value });
    if (data.error) throw new Error(data.error);
    
    $("generated-digits").textContent = data.digits.split("").join(" ");
    $("generated-time").textContent = new Date(data.createdAt).toLocaleString("th-TH");
    
    const box = $("result-box");
    box.classList.remove("hidden");
    box.dataset.digits = data.digits;
    box.dataset.mode = data.mode;
    box.dataset.time = new Date(data.createdAt).toLocaleString("th-TH");
    
    loadHistory(); // อัปเดตประวัติ
  } catch (e) { 
    alert("เกิดข้อผิดพลาด: " + e.message); 
  } finally { 
    btn.disabled = false; 
    btn.textContent = "🎲 กดเพื่อสุ่มเลข";
  }
});

// ── ดาวน์โหลด PDF ────────────────────────────────────────
$("btn-export-pdf").addEventListener("click", async () => {
  const box = $("result-box");
  $("pdf-digits").textContent = box.dataset.digits.split("").join(" ");
  $("pdf-mode").textContent = box.dataset.mode === "weighted" ? "Weighted Frequency" : "Uniform Random";
  $("pdf-time").textContent = box.dataset.time;
  
  const canvas = await html2canvas($("pdf-template"), { scale: 2, backgroundColor: "#fff" });
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");
  const w = pdf.internal.pageSize.getWidth();
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, w, (canvas.height * w) / canvas.width);
  pdf.save(`lottery-${box.dataset.digits}.pdf`);
});

// ── โหลดประวัติ ──────────────────────────────────────────
async function loadHistory() {
  try {
    const data = await callGas("history");
    const list = $("history-list");
    list.innerHTML = "";
    if (!data.history || data.history.length === 0) {
      list.innerHTML = "<li class='muted'>ยังไม่มีประวัติการสุ่ม</li>";
      return;
    }
    data.history.forEach(h => {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${h.digits.split("").join(" ")}</strong> <br><span class="muted small">${new Date(h.createdAt).toLocaleString("th-TH")}</span>`;
      list.appendChild(li);
    });
  } catch (e) {
    console.error("Load history failed", e);
  }
}

// ── โหลดสถิติ ────────────────────────────────────────────
async function loadFrequency() {
  try {
    const data = await callGas("frequency");
    const c = $("frequency-chart");
    c.innerHTML = "";
    
    if (!data.frequencies || data.frequencies.length === 0) {
      c.innerHTML = "<p class='muted'>ยังไม่มีข้อมูลสถิติ (รอระบบซิงค์ข้อมูลจาก สลากกินแบ่งรัฐบาล)</p>";
      return;
    }
    
    data.frequencies.forEach(f => {
      const div = document.createElement("div");
      div.className = "freq-row";
      div.innerHTML = `
        <span style="width: 60px;">หลัก ${f.position}</span>
        <div class="freq-bar" style="width:${Math.min(f.count * 8, 100)}%"></div>
        <span>${f.mostFrequent} (${f.count}%)</span>
      `;
      c.appendChild(div);
    });
  } catch (e) {
    console.error("Load frequency failed", e);
  }
}

// ── เริ่มต้นระบบ ──────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadFrequency();
  loadHistory();
});
