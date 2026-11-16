const $ = id => document.getElementById(id);
const GAS_URL = window.GAS_URL;
let session = JSON.parse(localStorage.getItem("session") || "null");

// ── Google Sign-In callback ──────────────────────────────
window.handleGoogleLogin = async (response) => {
  try {
    const data = await callGas("verifyLogin", { idToken: response.credential });
    if (data.error) throw new Error(data.error);
    session = data;
    localStorage.setItem("session", JSON.stringify(session));
    render();
  } catch (e) {
    $("auth-message").textContent = e.message;
  }
};

// ── GAS fetch helper ────────────────────────────────────
async function callGas(action, payload = {}) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, payload: { ...payload, sessionToken: session?.sessionToken } }),
    redirect: "follow"
  });
  if (!res.ok) throw new Error("Network error");
  return res.json();
}

// ── Render ───────────────────────────────────────────────
function render() {
  $("auth-section").classList.toggle("hidden", !!session);
  $("pending-section").classList.add("hidden");
  $("dashboard-section").classList.add("hidden");
  $("admin-section").classList.add("hidden");

  if (!session) return;

  if (session.status !== "approved" && !session.isSuperAdmin) {
    $("pending-section").classList.remove("hidden");
    return;
  }

  $("dashboard-section").classList.remove("hidden");
  $("user-email").textContent = session.email;
  $("btn-admin").classList.toggle("hidden", !session.isSuperAdmin);
  loadHistory();
  loadFrequency();
}

// ── Logout ───────────────────────────────────────────────
$("btn-logout").addEventListener("click", () => {
  session = null;
  localStorage.removeItem("session");
  render();
});

// ── Generate ─────────────────────────────────────────────
$("btn-generate").addEventListener("click", async () => {
  const btn = $("btn-generate");
  btn.disabled = true;
  try {
    const data = await callGas("generate", { mode: $("mode").value });
    if (data.error) throw new Error(data.error);
    $("generated-digits").textContent = data.digits.split("").join(" ");
    $("generated-time").textContent = new Date(data.createdAt).toLocaleString("th-TH");
    $("result-box").classList.remove("hidden");
    $("result-box").dataset.digits = data.digits;
    $("result-box").dataset.mode = data.mode;
    $("result-box").dataset.time = new Date(data.createdAt).toLocaleString("th-TH");
    loadHistory();
  } catch (e) { alert(e.message); }
  finally { btn.disabled = false; }
});

// ── Export PDF ───────────────────────────────────────────
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

// ── Data loaders ─────────────────────────────────────────
async function loadHistory() {
  try {
    const data = await callGas("history");
    const list = $("history-list");
    list.innerHTML = "";
    (data.history || []).forEach(h => {
      const li = document.createElement("li");
      li.textContent = `${h.digits.split("").join(" ")} — ${new Date(h.createdAt).toLocaleString("th-TH")}`;
      list.appendChild(li);
    });
  } catch (e) {}
}

async function loadFrequency() {
  try {
    const data = await callGas("frequency");
    const c = $("frequency-chart");
    c.innerHTML = "";
    (data.frequencies || []).forEach(f => {
      const div = document.createElement("div");
      div.className = "freq-row";
      div.innerHTML = `<span>หลัก ${f.position}</span>
        <div class="freq-bar" style="width:${Math.min(f.count * 8, 100)}%"></div>
        <span>${f.mostFrequent} (${f.count}%)</span>`;
      c.appendChild(div);
    });
  } catch (e) {}
}

// ── Admin ────────────────────────────────────────────────
$("btn-admin").addEventListener("click", async () => {
  $("dashboard-section").classList.add("hidden");
  $("admin-section").classList.remove("hidden");
  const data = await callGas("adminPending");
  const list = $("pending-users-list");
  list.innerHTML = "";
  (data.users || []).forEach(u => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${u.email}</span>`;
    const b = document.createElement("button");
    b.textContent = "อนุมัติ";
    b.className = "small";
    b.onclick = async () => {
      await callGas("adminApprove", { uid: u.uid });
      li.remove();
    };
    li.appendChild(b);
    list.appendChild(li);
  });
});

$("btn-back-dashboard").addEventListener("click", () => {
  $("admin-section").classList.add("hidden");
  $("dashboard-section").classList.remove("hidden");
});

// ── Init ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  render();
});
