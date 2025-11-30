/* -------------------------- Helpers -------------------------- */
const API = location.origin;
const $ = (id) => document.getElementById(id);
const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));

const session = {
  token: localStorage.getItem("token") || "",
  email: localStorage.getItem("email") || "",
  role: localStorage.getItem("role") || "",
  name: localStorage.getItem("name") || ""
};
let charts = {};
let currentStudio = { assignmentId: null, modelKey: null, expected: null, validation: null };
let lastExpected = null;
let lastValidation = null;

/* ==========================================================================
   APP.JS - Minimalist Redesign
   ========================================================================== */

const API_URL = "http://localhost:4000/api";

// State
let currentUser = null;
let currentTheme = localStorage.getItem("theme") || "light";

// Init
document.addEventListener("DOMContentLoaded", () => {
  lucide.createIcons();
  applyTheme(currentTheme);
  checkSession();

  // Global Event Listeners
  document.getElementById("themeToggle").addEventListener("click", toggleTheme);
  document.getElementById("btnLogout").addEventListener("click", () => {
    clearSession();
    toast("Sesión cerrada", "success");
  });

  // Navigation
  document.querySelectorAll(".nav-icon[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => selectTab(btn.dataset.tab));
  });
});

/* --- Theme Logic --- */
/* --- Theme Logic --- */
function toggleTheme() {
  if (!currentTheme) currentTheme = "light";
  const newTheme = currentTheme === "light" ? "dark" : "light";
  console.log("Toggling theme:", currentTheme, "->", newTheme);
  currentTheme = newTheme;
  applyTheme(currentTheme);
}

function applyTheme(theme) {
  if (!theme) theme = "light";
  localStorage.setItem("theme", theme);
  const btn = document.getElementById("themeToggle");

  if (theme === "dark") {
    document.body.classList.add("theme-dark");
    if (btn) btn.innerHTML = '<i data-lucide="sun" class="w-5 h-5"></i>';
  } else {
    document.body.classList.remove("theme-dark");
    if (btn) btn.innerHTML = '<i data-lucide="moon" class="w-5 h-5"></i>';
  }
  // Re-initialize icons only if lucide is available
  if (window.lucide && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}
/* -------------------------- UI Helpers -------------------------- */
function roleChip(role) {
  const cls = role === "ADMIN" ? "tag tag-admin" : role === "LEADER" ? "tag tag-lead" : role === "DESIGNER" ? "tag tag-des" : "tag";
  return '<span class="' + cls + '">' + (role || "N/A") + '</span>';
}
function toast(msg, type = "info") {
  const el = document.createElement("div");
  el.className = "toast " + (type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : 'toast-info');
  el.innerHTML = '<i data-lucide="' + (type === 'error' ? 'alert-triangle' : type === 'success' ? 'check-circle-2' : 'info') + '" class="w-5 h-5"></i><span class="flex-1">' + msg + '</span><button class="x">&times;</button>';
  $("toast").appendChild(el);
  if (window.lucide) lucide.createIcons();
  el.querySelector(".x").onclick = () => el.remove();
  setTimeout(() => { el.style.opacity = .0; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 250) }, 3800);
}
function spinner(btn, on = true) {
  if (!btn) return;
  if (on) { btn.dataset._txt = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Procesando...'; if (window.lucide) lucide.createIcons(); }
  else { btn.disabled = false; btn.innerHTML = btn.dataset._txt; }
}
/* Tabs */
function selectTab(tabId) {
  console.log("Selecting tab:", tabId);
  qsa(".nav-icon").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  qsa("main > section").forEach(s => s.classList.add("hidden"));
  const sec = $(tabId) || $("tab-dashboard");
  if (sec) {
    sec.classList.remove("hidden");
    sec.classList.remove("fade-in"); void sec.offsetWidth; sec.classList.add("fade-in");
  }
  if (window.lucide) lucide.createIcons();

  // si abre Diseñador, carga tareas sin picar
  if (tabId === "tab-designer" && session.role === "DESIGNER") {
    autoLoadDesignerTasks();
  }
  if (tabId === "tab-templates" && (session.role === "LEADER" || session.role === "ADMIN")) {
    loadSkeletons({ force: true });
  }
}
function renderTop() {
  $("roleBadge").innerHTML = roleChip(session.role);
  $("userBadge").innerHTML = session.token ? ('<b>' + (session.name || session.email) + '</b>') : '<span>No autenticado</span>';
  qs('[data-tab="tab-designer"]').classList.toggle("hidden", session.role !== "DESIGNER");
  qs('[data-tab="tab-studio"]').classList.toggle("hidden", session.role !== "DESIGNER");
  qs('[data-tab="tab-leader"]').classList.toggle("hidden", session.role !== "LEADER");
  qs('[data-tab="tab-templates"]').classList.toggle("hidden", session.role !== "LEADER" && session.role !== "ADMIN");
  qs('[data-tab="tab-admin"]').classList.toggle("hidden", session.role !== "ADMIN");
  qs('[data-tab="tab-designs"]').classList.toggle("hidden", session.role !== "LEADER" && session.role !== "ADMIN");
  qs('[data-tab="tab-files"]').classList.toggle("hidden", session.role !== "ADMIN");
  $("btnLogout").classList.toggle("hidden", !session.token);
  if (window.lucide) lucide.createIcons();
}
function saveSession(data) {
  session.token = data?.data?.token || "";
  session.email = data?.data?.user?.email || "";
  session.role = data?.data?.user?.role || "";
  session.name = data?.data?.user?.name || "";
  localStorage.setItem("token", session.token);
  localStorage.setItem("email", session.email);
  localStorage.setItem("role", session.role);
  localStorage.setItem("name", session.name);
  renderTop();
  const map = { ADMIN: "tab-admin", LEADER: "tab-leader", DESIGNER: "tab-designer" };
  selectTab(map[session.role] || "tab-dashboard");
  toast("Bienvenido " + (session.name || session.email), "success");
  if (session.role === "DESIGNER") { setTimeout(autoLoadDesignerTasks, 150); }
}
function clearSession() { ["token", "email", "role", "name"].forEach(k => localStorage.removeItem(k)); session.token = session.email = session.role = session.name = ""; renderTop(); selectTab("tab-login"); }

/* -------------------------- Nav -------------------------- */

/* -------------------------- Login -------------------------- */
$("btnLogin").onclick = async () => {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return toast("Completa email y password", "error");
  spinner($("btnLogin"), true);
  try {
    const res = await fetch(API + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok || !data.ok) return toast(data.message || "Login falló", "error");
    saveSession(data);
    ensurePersonalThread(); loadDashboard();
  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnLogin"), false); }
};
$("btnPing").onclick = async () => { const r = await fetch(API + "/health"); const j = await r.json(); toast("Health: " + (j.status || "n/a"), "info"); };

/* -------------------------- Diseñador -------------------------- */
// --- helpers de tabla (reemplaza tu renderTable por este) ---
function escapeHTML(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderTable(headers, rows) {
  const thead = '<thead><tr>' + headers.map(h => '<th>' + escapeHTML(h) + '</th>').join("") + '</tr></thead>';

  const body = '<tbody>' + rows.map(r => {
    const tds = r.map(c => {
      // Soporte para { html:true, content:"<button>...</button>" }
      if (c && typeof c === "object" && c.html && typeof c.content === "string") {
        return '<td>' + c.content + '</td>';
      }
      return '<td>' + escapeHTML(c) + '</td>';
    }).join("");
    return '<tr>' + tds + '</tr>';
  }).join("") + '</tbody>';

  return '<div class="table-wrap"><table class="table">' + thead + body + '</table></div>';
}
// --- pinta los textos esperados de forma entendible para el diseñador ---
function renderExpectedLayout(layout) {
  if (!layout) return "<em>Sin información de textos para este modelo.</em>";

  const parts = [];
  const packaging = layout.packaging || layout.packagingSuggestion || null;

  const requirements = Array.isArray(layout.globalRequirements) ? layout.globalRequirements : [];
  const faces = layout.textosPorCara || layout.caras || {};

  if (layout.resumenModelo || layout.humanSummary) {
    parts.push(
      '<p class="text-sm mb-2"><b>Resumen del modelo:</b> ' +
      escapeHTML(layout.resumenModelo || layout.humanSummary) + '</p>'
    );
  }

  if (requirements.length) {
    parts.push('<div class="text-xs space-y-1"><b>Requerimientos globales (sin caras):</b>');
    parts.push('<ul class="list-disc ml-4 mt-1">');
    requirements.forEach(r => {
      const typeIcon = r.type === "VISUAL" ? '<i data-lucide="image" class="w-3 h-3 inline mr-1"></i>' : '<i data-lucide="type" class="w-3 h-3 inline mr-1"></i>';
      parts.push('<li>' + typeIcon + escapeHTML(r.requirement || "") + '</li>');
    });
    parts.push('</ul></div>');
  }

  if (faces && typeof faces === "object" && Object.keys(faces).length) {
    parts.push('<div class="text-[11px] space-y-1 opacity-70"><b>Referencia de estructura (solo guía, no se valida por cara):</b>');
    for (const [cara, textos] of Object.entries(faces)) {
      const list = Array.isArray(textos) ? textos : [];
      const safeList = list.map(t => '<span class="px-1 py-[1px] bg-gray-200/60 rounded mr-1 inline-block mb-1">' + escapeHTML(t) + '</span>').join("");
      parts.push('<div class="ml-1"><b>' + escapeHTML(cara) + ':</b> ' + (safeList || '<span class="opacity-60">Sin textos definidos.</span>') + '</div>');
    }
    parts.push('</div>');
  }

  if (packaging) {
    const pkgType = escapeHTML(packaging.type || packaging.name || packaging.packaging || "Empaque");
    const pkgFaces = packaging.faces ? ` · ${escapeHTML(String(packaging.faces))} caras` : "";
    const pkgNotes = (packaging.notes || []).map(n => '<li>' + escapeHTML(n) + '</li>').join("");
    const skeletonBtn = renderSkeletonButton(packaging.type || packaging.name || "");
    const fallbackLink = packaging.templateFile
      ? `<a href="${escapeHTML(packaging.templateFile)}" target="_blank" class="btn btn-xs btn-outline btn-primary ml-2">Descargar dieline</a>`
      : "";
    parts.push(`
      <div class="p-3 rounded-lg bg-indigo-50 text-indigo-900 text-xs flex items-start justify-between">
        <div>
          <b>Tipo de empaque:</b> ${pkgType}${pkgFaces}
          ${pkgNotes ? `<ul class="list-disc ml-4 mt-1 text-indigo-800">${pkgNotes}</ul>` : ""}
        </div>
        <div class="flex items-center gap-2">
          ${skeletonBtn || fallbackLink || '<span class="text-[11px] opacity-70">Sin plantilla</span>'}
        </div>
      </div>
    `);
  }

  if (Array.isArray(layout.checklist) && layout.checklist.length) {
    parts.push('<div class="text-[11px] mt-3 opacity-80"><b>Checklist:</b><ul class="list-disc ml-4 mt-1">');
    layout.checklist.forEach(n => {
      parts.push('<li>' + escapeHTML(n) + '</li>');
    });
    parts.push('</ul></div>');
  }

  if (Array.isArray(layout.notasExtras) && layout.notasExtras.length) {
    parts.push('<div class="text-[11px] mt-3 opacity-80"><b>Notas:</b><ul class="list-disc ml-4 mt-1">');
    layout.notasExtras.forEach(n => {
      parts.push('<li>' + escapeHTML(n) + '</li>');
    });
    parts.push('</ul></div>');
  }

  if (!parts.length) {
    return "<em>Sin información de textos para este modelo.</em>";
  }
  if (layout.packaging || layout.packagingSuggestion) {
    const p = layout.packaging || layout.packagingSuggestion;
    parts.push('<div class="text-xs mt-3"><b>Empaque sugerido:</b> ' + escapeHTML(p.type || p.name || "Caja") + ' · ' + (p.faces || "") + ' caras' + (p.templateFile ? (' · ' + escapeHTML(p.templateFile)) : "") + '</div>');
    if (p.notes?.length) {
      parts.push('<div class="text-[11px] opacity-80"><ul class="list-disc ml-4 mt-1">' + p.notes.map(n => '<li>' + escapeHTML(n) + '</li>').join("") + '</ul></div>');
    }
  }
  return parts.join("");
}

// --- pinta resultado de validación en texto legible ---
function renderValidationResult(result) {
  if (!result) return "<em>Sin validación</em>";
  if (result.ok === false) return '<div class="text-red-300 text-sm">' + escapeHTML(result.message || "Error") + '</div>';

  const parts = [];

  // Special handling for OCR Errors to show the specific message
  if (result.overall === "OCR_ERROR") {
    parts.push('<div class="text-sm mb-2 text-red-400 font-bold">⚠️ Error de Lectura (OCR)</div>');
    parts.push('<div class="text-sm mb-2">' + escapeHTML(result.summary || result.message || "No se pudo procesar el archivo.") + '</div>');
    if (result.ocrInfo?.errors?.length) {
      parts.push('<div class="text-xs text-red-300">Detalles: ' + escapeHTML(result.ocrInfo.errors.join(", ")) + '</div>');
    }
    return parts.join("");
  }

  parts.push('<div class="text-sm mb-2"><b>Estado:</b> ' + escapeHTML(result.overall || "-") + '</div>');

  if (result.globalValidation && Array.isArray(result.globalValidation.requirements)) {
    const reqs = result.globalValidation.requirements;
    parts.push('<div class="text-xs mb-2"><b>Validación global:</b><ul class="list-disc ml-4">');
    reqs.forEach(r => {
      parts.push('<li>[' + escapeHTML(r.status || "-") + '] (' + escapeHTML(r.type || "TEXT") + ') ' + escapeHTML(r.requirement || "") + (r.foundText?.length ? ' — ' + escapeHTML(r.foundText.join(" | ")) : "") + '</li>');
    });
    parts.push('</ul></div>');
    if (result.globalValidation.missing?.length) {
      parts.push('<div class="text-[11px] text-amber-300 mb-2"><b>Faltantes:</b> ' + escapeHTML(result.globalValidation.missing.join(", ")) + '</div>');
    }
  }

  if (Array.isArray(result.fields)) {
    parts.push('<div class="text-xs mb-2"><b>Campos clave:</b><ul class="list-disc ml-4">');
    result.fields.forEach(v => {
      parts.push('<li>[' + escapeHTML(v.status || "-") + '] ' + escapeHTML(v.name || "") + ': ' + escapeHTML(v.found || "") + (v.detail ? (' — ' + escapeHTML(v.detail)) : "") + '</li>');
    });
    parts.push('</ul></div>');
  }

  if (result.claims) {
    parts.push('<div class="text-xs mb-2"><b>Claims detectados:</b> ' + escapeHTML((result.claims.detectados || []).join(", ") || "-") + '</div>');
    if (result.claims.faltantes?.length) {
      parts.push('<div class="text-xs mb-2 text-amber-300"><b>Claims faltantes:</b> ' + escapeHTML(result.claims.faltantes.join(", ")) + '</div>');
    }
  }

  if (result.globalSummary) {
    parts.push('<div class="text-xs mt-2"><b>Resumen global:</b> ' + escapeHTML(result.globalSummary.status || "-") + '</div>');
    if (result.globalSummary.missing?.length) {
      parts.push('<div class="text-[11px] text-amber-300"><b>Faltantes:</b> ' + escapeHTML(result.globalSummary.missing.join(", ")) + '</div>');
    }
    if (result.globalSummary.notes?.length) {
      parts.push('<div class="text-[10px] opacity-70">' + escapeHTML(result.globalSummary.notes.join(" · ")) + '</div>');
    }
  }

  if (result.fuente?.fallback) {
    parts.push('<div class="text-[11px] opacity-70">OCR simulado: ' + escapeHTML(result.fuente.fallback) + '</div>');
  }

  return parts.join("");
}

function refreshRolePanels() {
  if (!session.token) return;
  if (session.role === "DESIGNER") { autoLoadDesignerTasks(); }
  if (session.role === "LEADER" || session.role === "ADMIN") {
    $("btnRefreshDelegation").click();
    $("btnLeaderValidations").click();
    $("btnRefreshDesigns").click();
    loadLeaderAssigned();
    loadLeaderRejected();
  }
  // Mantén esqueletos actualizados para todos los roles activos
  loadSkeletons({ force: true }).catch(() => { /* silencioso */ });
}

async function autoLoadDesignerTasks() {
  const btn = $("btnMyAssignments");
  if (!btn || btn.disabled) return;
  btn.click();
}

$("btnMyAssignments").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");

  $("assignmentsBox").innerHTML = '<div class="skeleton"></div><div class="skeleton mt-2"></div>';

  try {
    await loadSkeletons({ force: true });
    const r = await fetch(API + "/api/assignments/me", {
      headers: { Authorization: "Bearer " + session.token },
      cache: "no-store"
    });
    const j = await r.json();

    if (!r.ok || !j.ok) {
      $("assignmentsBox").innerHTML = "";
      return toast(j.message || "Error cargando tareas", "error");
    }

    const rows = (j.data || []).map(a => [
      a.id,
      a.modelKey,
      a.title,
      a.status,
      a.projectType || "-",
      a.deadline ? new Date(a.deadline).toLocaleDateString() : "-",
      `<span class="task-timer font-mono text-xs" data-start="${a.createdAt}">--</span>`,
      {
        html: true,
        content: `
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-xs open-studio" 
              data-id="${a.id}" 
              data-model="${a.modelKey}">
              <i data-lucide="app-window" class="w-4 h-4"></i> Studio
            </button>
            ${renderSkeletonButton(a.projectType)}
          </div>
        `
      }
    ]);

    $("assignmentsBox").innerHTML = renderTable(
      ["ID", "ModelKey", "Título", "Estado", "Tipo", "Deadline", "Tiempo", "Acciones"],
      rows
    );

    startTaskTimers();

    // Event delegation for robustness
    $("assignmentsBox").onclick = (e) => {
      const btn = e.target.closest(".open-studio");
      if (btn) {
        openStudio({
          assignmentId: Number(btn.dataset.id),
          modelKey: btn.dataset.model
        });
      }
    };

    if (window.lucide) lucide.createIcons();
    checkDesignerNotifications();
  } catch (e) {
    console.error("Error loading tasks:", e);
    $("assignmentsBox").innerHTML = "";
    toast("Error de red al cargar tareas", "error");
  }
};

let timerInterval;
function startTaskTimers() {
  if (timerInterval) clearInterval(timerInterval);

  const update = () => {
    document.querySelectorAll(".task-timer").forEach(el => {
      const start = new Date(el.dataset.start).getTime();
      if (isNaN(start)) return;
      const now = Date.now();
      const diff = now - start;

      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      el.textContent = `${d}d ${h}h ${m}m ${s}s`;
    });
  };

  update();
  timerInterval = setInterval(update, 1000);
}

async function checkDesignerNotifications() {
  if (session.role !== "DESIGNER") return;
  const box = $("designerNotifications");
  if (!box) return;

  try {
    const r = await fetch(API + "/api/review", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok || !j.ok) return;

    const reviews = j.data || [];
    const notifications = [];

    // Check for Rejected
    const rejected = reviews.filter(x => x.leaderStatus === "REJECTED");
    rejected.forEach(r => {
      notifications.push(`<div class="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <i data-lucide="alert-circle" class="w-5 h-5 text-red-500 mt-0.5"></i>
          <div>
             <div class="font-bold text-red-700 text-sm">Tarea Rechazada: ${r.modelKey}</div>
             <div class="text-xs text-red-600">${escapeHTML(r.leaderNotes || "Sin motivos especificados")}</div>
          </div>
       </div>`);
    });

    // Check for Approved (recently? for now just list them if status is DONE in assignment, but review status is APPROVED)
    // To avoid spam, maybe only show approved if they are recent? 
    // For simplicity, let's show approved reviews that correspond to DONE assignments.
    // Actually, let's just show the last 3 approved.
    const approved = reviews.filter(x => x.leaderStatus === "APPROVED").sort((a, b) => new Date(b.leaderAt) - new Date(a.leaderAt)).slice(0, 3);
    approved.forEach(r => {
      notifications.push(`<div class="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <i data-lucide="check-circle-2" class="w-5 h-5 text-green-500 mt-0.5"></i>
          <div>
             <div class="font-bold text-green-700 text-sm">Tarea Aprobada: ${r.modelKey}</div>
             <div class="text-xs text-green-600">${escapeHTML(r.leaderNotes || "¡Buen trabajo!")}</div>
          </div>
       </div>`);
    });

    if (notifications.length) {
      box.innerHTML = notifications.join("");
      box.classList.remove("hidden");
      if (window.lucide) lucide.createIcons();
    } else {
      box.innerHTML = "";
      box.classList.add("hidden");
    }
  } catch (e) { console.error(e); }
}


$("btnExpected").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = $("designerModelKey").value.trim();
  if (!key) return toast("Indica modelKey", "error");

  const r = await fetch(API + "/api/expected/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + session.token }
  });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "Error leyendo Excel", "error");

  const layout = j.requiredTexts || {};
  lastExpected = layout;

  $("expectedBox").innerHTML =
    `<h4 class="font-semibold mb-1">Modelo ${j.modelKey}</h4>` +
    renderExpectedLayout(layout);
  toast("Textos requeridos listos", "success");
};



$("btnValidate").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = $("designerModelKey").value.trim();
  if (!key) return toast("Indica modelKey", "error");
  spinner($("btnValidate"), true);
  try {
    const r = await fetch(API + "/api/validate/" + encodeURIComponent(key), { method: "POST", headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const j = await r.json();
    lastValidation = j;
    $("validateBox").innerHTML = renderValidationResult(j);
    if (!r.ok || !j.ok) { $("btnSubmit").disabled = true; return toast(j.message || "Error en validación", "error"); }
    const ok = j.overall === "APPROVED" || j.overall === "WARNING";
    $("btnSubmit").disabled = !ok;
    toast(ok ? "Validación lista, puedes enviar" : "Validación pendiente", ok ? "success" : "info");
  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnValidate"), false); }
};

$("btnSubmit").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const id = prompt("ID de la tarea a enviar (DONE)");
  if (!id) return;
  const r = await fetch(API + "/api/assignments/" + id + "/submit", { method: "PUT", headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" } });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "No se pudo enviar", "error");
  toast("Enviado al admin", "success"); loadDashboard();
};

/* -------- STUDIO (detalle) -------- */
function openStudio({ assignmentId, modelKey }) {
  console.log("Opening studio for:", assignmentId, modelKey);
  currentStudio = { assignmentId, modelKey, expected: null, validation: null };
  // $("studioBadge") does not exist in HTML, removing.
  $("studioModelKey").textContent = modelKey;
  $("studioUploadResp").textContent = "";
  $("studioTexts").textContent = "";
  $("studioValidateBox").textContent = "";
  $("btnStudioSend").disabled = true;
  $("btnStudioRequest").disabled = true;
  $("studioIABox").innerHTML = '<span class="opacity-80">Pulsa <b>IA: contexto</b> para preparar el resumen de esta tarea.</span>';
  selectTab("tab-studio");
  $("btnStudioLoadTexts").click(); // precargar textos
}

$("btnStudioBack").onclick = () => selectTab("tab-designer");

$("btnStudioLoadTexts").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = currentStudio.modelKey;
  if (!key) return toast("Falta modelKey", "error");

  const r = await fetch(API + "/api/expected/" + encodeURIComponent(key), {
    headers: { Authorization: "Bearer " + session.token }
  });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "Error leyendo Excel", "error");

  currentStudio.expected = j;
  const layout = j.requiredTexts || {};

  $("studioTexts").innerHTML =
    `<h4 class="font-semibold mb-1">Modelo ${j.modelKey}</h4>` +
    renderExpectedLayout(layout);
  toast("Textos listos", "success");
};



$("btnStudioValidate").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = currentStudio.modelKey;
  if (!key) return toast("Falta modelKey", "error");
  spinner($("btnStudioValidate"), true);
  try {
    const r = await fetch(API + "/api/validate/" + encodeURIComponent(key), { method: "POST", headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" }, body: JSON.stringify({}) });
    const j = await r.json();
    currentStudio.validation = j;
    $("studioValidateBox").innerHTML = renderValidationResult(j);
    if (r.ok && j.ok && j.overall === "APPROVED") { $("btnStudioSend").disabled = false; }
    $("btnStudioRequest").disabled = false;
    if (!r.ok || !j.ok) toast(j.message || "Error en validación", "error"); else toast("Validación ejecutada", "success");
  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnStudioValidate"), false); }
};

$("btnStudioUpload").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = currentStudio.modelKey;
  const file = $("studioFile").files[0];
  if (!key || !file) return toast("modelKey + archivo", "error");
  const fd = new FormData(); fd.append("modelKey", key); fd.append("file", file);
  spinner($("btnStudioUpload"), true);
  try {
    const r = await fetch(API + "/api/files/upload-design", { method: "POST", headers: { Authorization: "Bearer " + session.token }, body: fd });
    const j = await r.json();
    if (!r.ok || !j.ok) return toast(j.message || "Error al subir diseño", "error");

    // Success Animation
    $("uploadSuccess").classList.remove("hidden");
    if (window.lucide) lucide.createIcons();
    toast("Diseño subido correctamente", "success");

    setTimeout(() => {
      $("uploadSuccess").classList.add("hidden");
    }, 2500);

  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnStudioUpload"), false); }
};

$("btnStudioSend").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const id = currentStudio.assignmentId;
  if (!id) return toast("Falta ID de tarea", "error");

  const overall = currentStudio.validation?.overall || "PENDING";

  const r = await fetch(API + "/api/assignments/" + id + "/submit", {
    method: "PUT",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({ overall })
  });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "No se pudo enviar", "error");
  toast("Enviado al líder", "success");
};

// Solicitar aprobación del líder
$("btnStudioRequest").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const id = currentStudio.assignmentId;
  if (!id) return toast("Falta ID de tarea", "error");
  const overall = currentStudio.validation?.overall || "PENDING";
  const r = await fetch(API + "/api/assignments/" + id + "/request-approval", {
    method: "POST",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({ overall })
  });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "No se pudo solicitar", "error");
  toast("Aprobación solicitada al líder", "success");
};

/* -------- IA contextual dentro del Studio (usa tu /api/assist) -------- */
function threadKey() { return session.email ? "thread_" + session.email : "thread_guest"; }
function ensurePersonalThread() { if (!localStorage.getItem(threadKey())) localStorage.setItem(threadKey(), ""); }
let currentThreadId = localStorage.getItem(threadKey()) || null;

function renderStudioBubble(role, content) {
  const box = $("studioIABox");
  const div = document.createElement("div");
  div.className = "mb-3 text-xs " + (role === "user" ? "text-right" : "");
  div.innerHTML = `
    <div class="inline-block px-3 py-2 rounded-lg ${role === "user" ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"}">
      ${escapeHTML(content).replace(/\n/g, "<br>")}
    </div>
  `;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

$("btnStudioAskIA").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");

  const mk = currentStudio.modelKey || "";
  const expected = currentStudio.expected?.requiredTexts || lastExpected || {};
  const requirements = expected.globalRequirements || [];
  const masterSummary = expected.resumenModelo || expected.humanSummary || "";
  const val = currentStudio.validation || lastValidation;
  const packaging = expected.packaging || expected.packagingSuggestion;
  const reqBullets = requirements.slice(0, 12).map(r => `- [${r.type || "TEXT"}] ${r.requirement || ""}`).join("\n");

  const ctxMsg = [
    `Ayuda a revisar el diseño del modelo ${mk} (tarea #${currentStudio.assignmentId}).`,
    "Genera un checklist global (sin dividir por caras) con los elementos obligatorios que debe contener el arte.",
    masterSummary ? `Resumen del master: ${masterSummary}` : "",
    reqBullets ? `Requerimientos clave:\n${reqBullets}` : "No hay requerimientos cargados, incluye NOM, UPC y claims básicos si aplican.",
    val ? `Resultado de validación actual:\n${JSON.stringify(val, null, 2)}` : "",
    "Entrega bullets claros y señala campos faltantes o inconsistentes. No respondas en JSON.",
  ].filter(Boolean).join("\n\n");

  $("studioIABox").innerHTML = '<div class="text-center py-4"><i data-lucide="loader-2" class="w-5 h-5 animate-spin mx-auto opacity-50"></i></div>';
  if (window.lucide) lucide.createIcons();

  try {
    const r = await fetch(API + "/api/assist/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({
        threadId: currentThreadId,
        message: ctxMsg,
        context: { modelKey: mk, masterSummary, expectedRequirements: requirements, validation: val, packaging }
      })
    });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      $("studioIABox").innerHTML = "";
      return toast(j.message || "Error con asistente", "error");
    }

    currentThreadId = j.threadId || currentThreadId;
    if (currentThreadId) localStorage.setItem(threadKey(), currentThreadId);

    $("studioIABox").innerHTML = ""; // Clear loader
    renderStudioBubble("assistant", j.reply || "Contexto analizado. ¿Qué necesitas?");

    // Enable Chat
    $("studioChatInput").disabled = false;
    $("btnStudioChatSend").disabled = false;
    $("studioChatInput").focus();

  } catch {
    toast("Error de red", "error");
    $("studioIABox").innerHTML = '<span class="text-sm text-red-300">No se pudo contactar al asistente.</span>';
  }
};

$("btnStudioChatSend").onclick = async () => {
  const msg = $("studioChatInput").value.trim();
  if (!msg) return;

  renderStudioBubble("user", msg);
  $("studioChatInput").value = "";
  $("studioChatInput").disabled = true;
  $("btnStudioChatSend").disabled = true;

  try {
    const r = await fetch(API + "/api/assist/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: currentThreadId, message: msg })
    });
    const j = await r.json();
    if (r.ok && j.ok) {
      renderStudioBubble("assistant", j.reply);
    } else {
      toast("Error al responder", "error");
    }
  } catch {
    toast("Error de red", "error");
  } finally {
    $("studioChatInput").disabled = false;
    $("btnStudioChatSend").disabled = false;
    $("studioChatInput").focus();
  }
};

$("studioChatInput").onkeydown = (e) => {
  if (e.key === "Enter") $("btnStudioChatSend").click();
};



/* -------------------------- Líder -------------------------- */
$("btnCreateTask").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const payload = {
    modelKey: $("taskModelKey").value.trim(),
    title: $("taskTitle").value.trim(),
    description: $("taskDesc").value.trim(),
    packagingType: $("taskPackaging")?.value.trim() || "",
    retailer: $("taskRetailer").value,
    deadline: $("taskDeadline").value
  };
  if (!payload.modelKey || !payload.title) return toast("modelKey + título", "error");
  spinner($("btnCreateTask"), true);
  try {
    const r = await fetch(API + "/api/assignments", { method: "POST", headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    $("taskCreateResp").textContent = JSON.stringify(j, null, 2);
    if (!r.ok || !j.ok) return toast(j.message || "Error creando tarea", "error");
    toast("Tarea creada", "success"); loadDashboard();
  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnCreateTask"), false); }
};

$("btnRefreshDelegation").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const [aRes, uRes] = await Promise.all([
    fetch(API + "/api/assignments/me", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" }),
    fetch(API + "/api/users", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" })
  ]);
  const a = await aRes.json(); const u = await uRes.json();
  $("selectAssignment").innerHTML = (a.data || []).map(x => '<option value="' + x.id + '">#' + x.id + ' — ' + x.title + ' (' + (x.projectType || x.modelKey) + ')</option>').join("") || '<option value="">Sin tareas</option>';
  const designers = (u.data || []).filter(z => z.role === "DESIGNER");
  $("selectDesigner").innerHTML = designers.map(d => '<option value="' + d.id + '">' + d.name + ' (' + d.email + ')</option>').join("") || '<option value="">Sin diseñadores</option>';
  $("metricsDesignerSelect").innerHTML = designers.map(d => '<option value="' + d.id + '">' + d.name + '</option>').join("");
  toast("Listas actualizadas", "success");
};

$("btnDelegate").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const selectedOpts = Array.from($("selectAssignment").selectedOptions);
  const assignmentIds = selectedOpts.map(o => o.value);
  const dId = $("selectDesigner").value;

  if (!assignmentIds.length || !dId) return toast("Elige tarea(s) y diseñador", "error");

  const r = await fetch(API + "/api/assignments/delegate", {
    method: "PUT",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({ assignmentIds, assigneeId: Number(dId) })
  });
  const j = await r.json();
  $("delegateResp").textContent = JSON.stringify(j, null, 2);
  if (!r.ok || !j.ok) return toast(j.message || "Error al delegar", "error");
  toast("Tarea delegada", "success"); loadDashboard();
};

$("btnUploadExcel").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const key = $("excelModelKey").value.trim();
  const file = $("excelFile").files[0];
  if (!file) return toast("Selecciona un archivo Excel", "error");

  const fd = new FormData();
  fd.append("file", file);    // ← IMPORTANTE: SOLO "file"
  fd.append("modelKey", key); // opcional, si lo usas

  spinner($("btnUploadExcel"), true);

  try {
    const r = await fetch(API + "/api/files/upload-excel", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token },
      body: fd,
    });

    const j = await r.json();
    $("excelResp").textContent = JSON.stringify(j, null, 2);

    if (!r.ok || !j.ok) {
      return toast(j.message || "Error al subir Excel", "error");
    }

    toast("Excel subido y procesado", "success");
  }
  catch (e) {
    toast("Error subiendo Excel", "error");
  }
  finally {
    spinner($("btnUploadExcel"), false);
  }
};

/* -------------------------- Leader: New Panels -------------------------- */

async function loadLeaderAssigned() {
  if (session.role !== "LEADER" && session.role !== "ADMIN") return;
  const box = $("leaderAssignedBox");
  box.innerHTML = '<div class="skeleton"></div>';

  try {
    const r = await fetch(API + "/api/assignments/assigned", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      box.innerHTML = '<div class="text-sm text-red-400">Error cargando asignadas</div>';
      return;
    }
    const rows = (j.data || []).map(a => [
      a.modelKey,
      a.title,
      a.assigneeId ? `User #${a.assigneeId}` : "N/A", // Could map to name if we had user list handy
      {
        html: true,
        content: `<button class="text-red-500 hover:text-red-700 btn-delete-task" data-id="${a.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
      }
    ]);

    if (rows.length === 0) {
      box.innerHTML = '<div class="text-sm text-gray-400 italic">No hay tareas asignadas.</div>';
    } else {
      box.innerHTML = renderTable(["SKU", "Título", "Asignado a", "Acción"], rows);
    }

    // Update Total Tasks count
    if ($("leaderTotalTasks")) {
      $("leaderTotalTasks").textContent = (j.data || []).length;
    }
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="text-sm text-red-400">Error de red</div>';
  }
}

async function loadLeaderRejected() {
  if (session.role !== "LEADER" && session.role !== "ADMIN") return;
  const box = $("leaderRejectedBox");
  box.innerHTML = '<div class="skeleton"></div>';

  try {
    const r = await fetch(API + "/api/assignments/rejected", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      box.innerHTML = '<div class="text-sm text-red-400">Error cargando rechazadas</div>';
      return;
    }
    const rows = (j.data || []).map(a => [
      a.modelKey,
      a.title,
      {
        html: true,
        content: `<button class="text-red-500 hover:text-red-700 btn-delete-task" data-id="${a.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>`
      }
    ]);

    if (rows.length === 0) {
      box.innerHTML = '<div class="text-sm text-gray-400 italic">No hay tareas rechazadas.</div>';
    } else {
      box.innerHTML = renderTable(["SKU", "Título", "Acción"], rows);
    }
    if (window.lucide) lucide.createIcons();
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="text-sm text-red-400">Error de red</div>';
  }
}

// Event listeners for refresh buttons
$("btnLeaderAssigned").onclick = loadLeaderAssigned;
$("btnLeaderRejected").onclick = loadLeaderRejected;

// Global listener for delete buttons (since they are dynamic)
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-delete-task");
  if (btn) {
    const id = btn.dataset.id;
    if (confirm(`¿Seguro que deseas eliminar la tarea #${id}?`)) {
      try {
        const r = await fetch(API + "/api/assignments/" + id, {
          method: "DELETE",
          headers: { Authorization: "Bearer " + session.token }
        });
        const j = await r.json();
        if (r.ok && j.ok) {
          toast("Tarea eliminada", "success");
          loadDashboard(); // Refresh all panels
        } else {
          toast(j.message || "Error al eliminar", "error");
        }
      } catch (e) {
        toast("Error de red", "error");
      }
    }
  }
});


/* -------------------------- Admin -------------------------- */
function openModal() { $("modalBackdrop").classList.remove("hidden"); $("createUserModal").classList.remove("hidden"); }
function closeModal() { $("modalBackdrop").classList.add("hidden"); $("createUserModal").classList.add("hidden"); }
$("btnOpenCreateUser").onclick = () => openModal();
$("closeCreateUser").onclick = () => closeModal();
$("cancelCreateUser").onclick = () => closeModal();

$("saveCreateUser").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const payload = { name: $("cu_name").value.trim(), email: $("cu_email").value.trim(), password: $("cu_password").value, role: $("cu_role").value };
  if (!payload.name || !payload.email || !payload.password) return toast("Completa todos los campos", "error");
  spinner($("saveCreateUser"), true);
  try {
    const r = await fetch(API + "/api/auth/register", { method: "POST", headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok || !j.ok) return toast(j.message || "No se pudo crear el usuario", "error");
    toast("Usuario creado: " + payload.email, "success"); closeModal();
    ["cu_name", "cu_email", "cu_password"].forEach(id => $(id).value = "");
    loadDashboard();
  } catch { toast("Error de red", "error"); }
  finally { spinner($("saveCreateUser"), false); }
};

$("btnListUsers").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  $("usersBox").innerHTML = '<div class="skeleton"></div><div class="skeleton mt-2"></div>';
  const r = await fetch(API + "/api/users", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "Error listando usuarios", "error");
  $("usersBox").innerHTML = renderTable(["ID", "Nombre", "Email", "Rol", "Team"], (j.data || []).map(u => [u.id, u.name, u.email, roleChip(u.role), u.teamId || "-"]));
};

$("btnLoadValidations").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  $("validationsBox").innerHTML = '<div class="skeleton"></div>';
  const r = await fetch(API + "/api/review", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "Error cargando validaciones", "error");
  $("validationsBox").innerHTML = renderTable(["ID", "modelKey", "status", "createdAt", "details"], (j.data || []).map(v => [v.id, v.modelKey, v.status, v.createdAt, JSON.stringify(v.details)]));
};

// Líder: validaciones de sus tareas
// Líder: validaciones de sus tareas
async function loadLeaderReviews() {
  if (session.role !== "LEADER" && session.role !== "ADMIN") return;
  const boxPending = $("leaderValidationsBox");
  const boxApproved = $("leaderApprovedBox");

  // Only show skeleton if empty (to avoid flicker on refresh)
  if (!boxPending.innerHTML.trim()) boxPending.innerHTML = '<div class="skeleton"></div>';
  if (!boxApproved.innerHTML.trim()) boxApproved.innerHTML = '<div class="skeleton"></div>';

  try {
    const r = await fetch(API + "/api/review", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
    const j = await r.json();
    if (!r.ok || !j.ok) {
      const err = '<div class="text-sm text-red-400">Error cargando validaciones</div>';
      boxPending.innerHTML = err;
      boxApproved.innerHTML = err;
      return toast(j.message || "Error cargando validaciones", "error");
    }

    const all = j.data || [];
    const pending = all.filter(x => x.leaderStatus !== "APPROVED" && x.leaderStatus !== "REJECTED");
    const approved = all.filter(x => x.leaderStatus === "APPROVED");

    // Update Stats
    if ($("leaderTotalTasks")) {
      const total = all.length; // This is reviews, not tasks. We might need assignments count.
      // But for now, let's use reviews as proxy or fetch assignments.
      // Actually, let's fetch assignments count in loadLeaderAssigned or here.
      // Let's use the reviews count for "Validaciones" stats.
      $("leaderTotalPending").textContent = pending.length;
      $("leaderTotalApproved").textContent = approved.length;
    }

    // Render Pending
    const pendingRows = pending.map(v => {
      let iaBadge = `<span class="badge badge-ghost text-xs">PENDING</span>`;
      if (v.iaStatus === "APPROVED") iaBadge = `<span class="badge badge-success text-xs">IA APPROVED</span>`;
      if (v.iaStatus === "WARNING") iaBadge = `<span class="badge badge-warning text-xs">IA WARNING</span>`;

      return [
        v.id,
        v.modelKey,
        v.designerName || "Desconocido",
        iaBadge,
        {
          html: true,
          content: `<div class="text-xs max-w-[200px] truncate" title="${escapeHTML(v.details?.notes || "")}">${escapeHTML(v.details?.notes || "Sin notas")}</div>`
        },
        {
          html: true, content: `<div class="flex gap-2">
        <button class="btn btn-green btn-sm leader-approve" data-id="${v.id}">Aprobar</button>
        <button class="btn btn-red btn-sm leader-reject" data-id="${v.id}">Rechazar</button>
        ${v.fileUrl ? `<a href="${v.fileUrl}" target="_blank" class="btn btn-ghost btn-sm" title="Ver archivo"><i data-lucide="eye" class="w-4 h-4"></i></a>` : ''}
      </div>`}
      ]
    });

    boxPending.innerHTML = pendingRows.length ? renderTable(["ID", "Model", "Diseñador", "IA Status", "Contexto", "Acciones"], pendingRows) : '<div class="text-sm text-gray-400 italic p-4">No hay validaciones pendientes.</div>';

    // Render Approved
    const approvedRows = approved.map(v => [
      v.id,
      v.modelKey,
      v.designerName || "Desconocido",
      v.iaStatus === "WARNING" ? `<span class="badge badge-warning text-xs flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> WARNING</span>` : `<span class="badge badge-success text-xs">OK</span>`,
      new Date(v.leaderAt || v.updatedAt).toLocaleDateString(),
      {
        html: true,
        content: `<div class="flex gap-2">
          ${v.fileUrl ? `<a href="${v.fileUrl}" download="${v.fileName || 'archivo'}" class="btn btn-primary btn-sm"><i data-lucide="download" class="w-4 h-4"></i> Descargar</a>` : '<span class="text-gray-400 text-xs">Sin archivo</span>'}
        </div>`
      }
    ]);

    boxApproved.innerHTML = approvedRows.length ? renderTable(["ID", "Model", "Diseñador", "Estado", "Fecha", "Descarga"], approvedRows) : '<div class="text-sm text-gray-400 italic p-4">No hay diseños aprobados aún.</div>';

    // Re-attach events
    boxPending.querySelectorAll(".leader-approve").forEach(b => {
      b.onclick = () => updateReviewStatus(b.dataset.id, "approve");
    });
    boxPending.querySelectorAll(".leader-reject").forEach(b => {
      b.onclick = () => updateReviewStatus(b.dataset.id, "reject");
    });
    if (window.lucide) lucide.createIcons();

  } catch (e) {
    console.error(e);
    const err = '<div class="text-sm text-red-400">Error de red</div>';
    boxPending.innerHTML = err;
    boxApproved.innerHTML = err;
  }
};

$("btnLeaderValidations").onclick = loadLeaderReviews;
if ($("btnLeaderApproved")) $("btnLeaderApproved").onclick = loadLeaderReviews;

async function updateReviewStatus(id, action) {
  if (!session.token) return toast("Inicia sesión", "error");
  // Removed confirm/prompt for reliability in this environment
  // if (!confirm("¿Confirmar acción?")) return;

  const endpoint = action === "approve" ? "leader-approve" : "leader-reject";
  const note = action === "reject" ? "Rechazado por líder (Demo)" : "Aprobado por líder";

  const r = await fetch(API + "/api/review/" + id + "/" + endpoint, {
    method: "PUT",
    headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
    body: JSON.stringify({ notes: note })
  });

  const j = await r.json();
  if (r.ok && j.ok) {
    toast("Actualizado", "success");
    $("btnLeaderValidations").click();
  } else {
    toast(j.message || "Error", "error");
  }
}

/* -------------------------- Archivos -------------------------- */
$("btnFilesList").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const mk = $("filesModelKey").value.trim();
  if (!mk) return toast("Indica modelKey", "error");
  $("filesBox").innerHTML = "<div class='skeleton'></div>";
  const r = await fetch(API + "/api/files/list/" + encodeURIComponent(mk), { headers: { Authorization: "Bearer " + session.token } });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast(j.message || "Error listando archivos", "error");
  const list = (j.data || []).map(f => `• ${f.type} — <a href="${f.url}" target="_blank">${f.filename}</a> (${new Date(f.createdAt).toLocaleString()})`).join("<br>");
  $("filesBox").innerHTML = "<pre class='text-xs'>" + (list || "Sin archivos") + "</pre>";
};
$("btnFilesListLatest").onclick = async () => {
  $("filesModelKey").value = ""; $("filesBox").innerHTML = "<pre class='text-xs'>Ingresa un modelKey para listar por SKU.</pre>";
};

/* -------------------------- Asistente global (thread por usuario) -------------------------- */
function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#FFFFFF"; }

let globalThread = localStorage.getItem(threadKey()) || null;

$("btnAssistSend").onclick = async () => {
  if (!session.token) return toast("Inicia sesión", "error");
  const imageUrl = $("assistImage").value.trim();
  const message = $("assistMsg").value.trim();
  if (!message && !imageUrl) return toast("Escribe algo o adjunta imagen", "error");

  renderChatBubble("user", message, Date.now());
  $("assistMsg").value = ""; $("assistImage").value = "";
  spinner($("btnAssistSend"), true);

  try {
    const r = await fetch(API + "/api/assist/chat", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token, "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: globalThread, message, imageUrl })
    });
    const j = await r.json();
    if (!r.ok || !j.ok) return toast(j.message || "Error con asistente", "error");
    globalThread = j.threadId || globalThread;
    if (globalThread) localStorage.setItem(threadKey(), globalThread);

    const h = await fetch(API + "/api/assist/thread/" + globalThread, { headers: { Authorization: "Bearer " + session.token } });
    const hj = await h.json();
    if (h.ok && hj.ok) {
      $("assistBox").innerHTML = (hj.data || []).map(m => {
        const time = new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isA = m.role === "assistant";
        return '<div style="max-width:720px" class="' + (isA ? '' : 'ml-auto') + '">' +
          '<div class="' + (isA ? 'chat-bubble-ai' : 'chat-bubble-user') + ' rounded-2xl px-4 py-3 text-sm">' +
          (m.content || "").replace(/\n/g, '<br>') + '</div>' +
          '<div class="text-[10px] opacity-70 mt-1 ' + (isA ? '' : 'text-right') + '">' + time + '</div></div>';
      }).join("");
      $("assistBox").scrollTop = $("assistBox").scrollHeight;
    }
  } catch { toast("Error de red", "error"); }
  finally { spinner($("btnAssistSend"), false); }
};

function renderChatBubble(role, content, ts) {
  const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const wrap = document.createElement("div"); wrap.style.maxWidth = "720px"; if (role !== "assistant") wrap.className = "ml-auto";
  wrap.innerHTML = '<div class="' + (role === "assistant" ? 'chat-bubble-ai' : 'chat-bubble-user') + ' rounded-2xl px-4 py-3 text-sm">' +
    (content || "").replace(/\n/g, '<br>') + '</div><div class="text-[10px] opacity-70 mt-1 ' + (role === "assistant" ? '' : 'text-right') + '">' + time + '</div>';
  $("assistBox").appendChild(wrap); $("assistBox").scrollTop = $("assistBox").scrollHeight;
}
$("btnResetThread").onclick = () => { localStorage.removeItem(threadKey()); globalThread = null; $("assistBox").innerHTML = ""; toast("Thread del chat reiniciado", "success"); };

/* -------------------------- Dashboard (Chart.js) -------------------------- */
function drawChart(id, title, labels, data, colors) {
  const ctx = $(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();

  const legendColor = cssVar('--text');
  const titleColor = cssVar('--text');

  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: "rgba(255,255,255,.18)", borderWidth: 1.2, hoverOffset: 10, hoverBorderWidth: 2, hoverBorderColor: "rgba(255,255,255,.35)" }] },
    options: {
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: { legend: { labels: { color: legendColor, font: { weight: 700, size: 12 } } }, title: { display: true, text: title, color: titleColor, font: { weight: 800, size: 14 } } },
      cutout: "62%"
    }
  });
  ctx.parentElement.classList.add('dash-legend');
}

async function loadDashboardCharts() {
  if (!session.token) return;
  try {
    const [aRes, vRes, uRes] = await Promise.all([
      fetch(API + "/api/assignments/me", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" }).catch(() => ({ ok: false })),
      fetch(API + "/api/review", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" }).catch(() => ({ ok: false })),
      fetch(API + "/api/users", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" }).catch(() => ({ ok: false }))
    ]);
    const a = aRes.ok ? await aRes.json() : { data: [] };
    const v = vRes.ok ? await vRes.json() : { data: [] };
    const u = uRes.ok ? await uRes.json() : { data: [] };

    const statuses = ["NEW", "IN_PROGRESS", "DONE", "REVIEW"];
    const counts = statuses.map(s => (a.data || []).filter(x => x.status === s).length);
    drawChart("chartAssignments", "Tareas por estado", statuses, counts, ["#FF4D67", "#FF7C98", "#a855f7", "#22d3ee"]);

    const ok = (v.data || []).filter(x => x.status === "OK").length;
    const fail = (v.data || []).filter(x => x.status !== "OK").length;
    drawChart("chartValidation", "Validaciones", ["OK", "FALLA"], [ok, fail], ["#22c55e", "#ef4444"]);

    const roles = ["ADMIN", "LEADER", "DESIGNER"];
    const rc = roles.map(r => (u.data || []).filter(x => x.role === r).length);
    drawChart("chartUsers", "Usuarios por rol", roles, rc, ["#fde68a", "#d8b4fe", "#aaf7ff"]);

    // Refresh Designs if visible
    if (!qs('[data-tab="tab-designs"]').classList.contains("hidden")) {
      $("btnRefreshDesigns").click();
    }
  } catch (e) { /* ignore */ }
}
$("btnDashRefresh").onclick = () => { loadDashboard(); };

async function loadDashboard() {
  refreshRolePanels();
  await loadDashboardCharts();
}

/* -------------------------- Metrics & Designs -------------------------- */
$("btnLoadMetrics").onclick = async () => {
  const dId = $("metricsDesignerSelect").value;
  if (!dId) return toast("Selecciona diseñador", "error");

  const r = await fetch(API + "/api/metrics/designer/" + dId, { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j.ok) return toast("Error cargando métricas", "error");

  const m = j.data;
  $("designerMetricsContainer").classList.remove("hidden");
  const total = (m.total !== undefined && m.total !== null) ? m.total : 0;
  const completed = (m.completed !== undefined && m.completed !== null) ? m.completed : 0;
  const pending = (m.pending !== undefined && m.pending !== null) ? m.pending : 0;

  $("metTotal").textContent = total;
  $("metCompleted").textContent = completed;
  $("metPending").textContent = pending;
  $("metAvgTime").textContent = m.avgTimeHours ? m.avgTimeHours.toFixed(2) : "0";

  // Update Rings
  const pctCompleted = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pctPending = total > 0 ? Math.round((pending / total) * 100) : 0;

  if ($("ringCompleted")) $("ringCompleted").style.setProperty("--value", pctCompleted);
  if ($("ringPending")) $("ringPending").style.setProperty("--value", pctPending);

  renderPieChart("chartMetProjects", m.byProject);
  renderBarChart("chartMetErrors", m.errors);
};

function renderPieChart(id, data) {
  const ctx = $(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(data),
      datasets: [{ data: Object.values(data), backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }]
    }
  });
}

function renderBarChart(id, data) {
  const ctx = $(id).getContext('2d');
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{ label: 'Errores', data: Object.values(data), backgroundColor: '#ef4444' }]
    }
  });
}

$("btnRefreshDesigns").onclick = async () => {
  const r = await fetch(API + "/api/review", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
  const j = await r.json();
  if (!r.ok || !j.ok) return;

  const approved = (j.data || []).filter(x => x.leaderStatus === "APPROVED");
  $("designsGrid").innerHTML = approved.map(d => `
        <div class="card p-4 flex flex-col items-center text-center">
            <div class="w-full h-32 bg-gray-100 rounded mb-3 flex items-center justify-center overflow-hidden">
                ${d.fileUrl ? `<img src="${d.fileUrl}" class="object-cover w-full h-full">` : '<i data-lucide="image" class="w-8 h-8 text-gray-400"></i>'}
            </div>
            <h4 class="font-bold text-sm">${d.modelKey}</h4>
            <p class="text-xs text-gray-500 mb-2">${d.designerName}</p>
            ${d.fileUrl ? `<a href="${d.fileUrl}" download class="btn btn-primary btn-xs w-full">Descargar</a>` : ''}
        </div>
    `).join("");
  if (window.lucide) lucide.createIcons();
};

/* -------------------------- Search en tablas -------------------------- */
$('tableSearchInput').onkeyup = (e) => {
  const q = e.target.value.toLowerCase().trim();
  const active = qs('main > section:not(.hidden)'); if (!active) return;
  const table = active.querySelector('table'); if (!table) return;
  table.querySelectorAll('tbody tr').forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
};

/* -------------------------- Init -------------------------- */
renderTop();
if (window.lucide) lucide.createIcons();
selectTab("tab-dashboard");
ensurePersonalThread();
loadDashboard();

function checkSession() {
  if (!session.token) {
    clearSession();
  } else {
    renderTop();
  }
}

// Activar panel scrollable en contenedores del Studio
document.addEventListener("DOMContentLoaded", () => {
  $("studioTexts")?.classList.add("studio-panel");
  $("studioValidateBox")?.classList.add("studio-panel");
});

/* -------------------------- Skeletons -------------------------- */
let globalTemplates = [];
let skeletonsLoadedOnce = false;

async function loadSkeletons({ force = false } = {}) {
  if (!session.token) return [];
  if (session.role !== "LEADER" && session.role !== "ADMIN" && session.role !== "DESIGNER") return [];
  if (!force && skeletonsLoadedOnce && globalTemplates.length) return globalTemplates;
  try {
    const r = await fetch(API + "/api/templates", { headers: { Authorization: "Bearer " + session.token }, cache: "no-store" });
    const j = await r.json();
    if (j.ok) {
      skeletonsLoadedOnce = true;
      globalTemplates = j.data || [];
      if (session.role === "LEADER" || session.role === "ADMIN") renderSkeletonList();
    }
    return globalTemplates;
  } catch (e) {
    console.error(e);
    return globalTemplates;
  }
}

function renderSkeletonList() {
  const box = $("skeletonList");
  if (!box) return;
  if (globalTemplates.length === 0) {
    box.innerHTML = '<div class="text-sm text-gray-400 italic">No hay esqueletos subidos.</div>';
    return;
  }
  box.innerHTML = globalTemplates.map(t => `
    <div class="flex items-center justify-between p-2 bg-base-100 rounded border">
      <div>
        <div class="font-bold text-sm">${escapeHTML(t.type)}</div>
        <div class="text-xs opacity-70">${escapeHTML(t.name)}</div>
      </div>
      <button class="btn btn-xs btn-error btn-square" onclick="deleteSkeleton(${t.id})">
        <i data-lucide="trash-2" class="w-3 h-3"></i>
      </button>
    </div>
  `).join("");
  if (window.lucide) lucide.createIcons();
}

window.deleteSkeleton = async (id) => {
  if (!confirm("¿Eliminar esqueleto?")) return;
  await fetch(API + "/api/templates/" + id, { method: "DELETE", headers: { Authorization: "Bearer " + session.token } });
  loadSkeletons({ force: true });
};

if ($("btnUploadSkeleton")) {
  $("btnUploadSkeleton").onclick = async () => {
    const type = $("skeletonType").value.trim();
    const file = $("skeletonFile").files[0];
    if (!type || !file) return toast("Faltan datos", "error");

    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);

    const r = await fetch(API + "/api/templates", {
      method: "POST",
      headers: { Authorization: "Bearer " + session.token },
      body: fd
    });
    const j = await r.json();
    if (j.ok) {
      toast("Esqueleto subido", "success");
      $("skeletonType").value = "";
      $("skeletonFile").value = "";
      loadSkeletons({ force: true });
    } else {
      toast(j.message || "Error", "error");
    }
  };
}

function renderSkeletonButton(projectType) {
  const normalize = (t) => (t || "").trim().toLowerCase();
  const requested = normalize(projectType);
  if (!requested) return "";

  const t = globalTemplates.find(x => normalize(x.type) === requested) ||
    globalTemplates.find(x => normalize(x.type).includes(requested) || requested.includes(normalize(x.type)));
  if (!t) return "";
  return `
    <a href="${API}/api/templates/download/${t.id}" target="_blank" class="btn btn-xs btn-outline btn-info" title="Descargar Esqueleto">
      <i data-lucide="download" class="w-3 h-3"></i> AI
    </a>
  `;
}

// Init Skeletons
setInterval(() => loadSkeletons({ force: true }), 10000); // Refresh periodically
setTimeout(() => loadSkeletons({ force: true }), 1000); // Initial load

/* -------------------------- User Guide -------------------------- */
window.showUserGuide = () => {
  const role = session.role;
  const hero = (title, subtitle, accent) => `
    <div class="flex items-center gap-3 mb-3">
      <div class="w-10 h-10 rounded-full ${accent} text-white flex items-center justify-center">
        <i data-lucide="sparkles" class="w-5 h-5"></i>
      </div>
      <div>
        <h4 class="text-lg font-semibold">${title}</h4>
        <p class="text-sm text-gray-500">${subtitle}</p>
      </div>
    </div>
  `;

  const step = (n, title, desc) => `
    <div class="flex gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <div class="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold">${n}</div>
      <div>
        <p class="font-semibold">${title}</p>
        <p class="text-sm text-gray-600">${desc}</p>
      </div>
    </div>
  `;

  const cards = {
    DESIGNER: `
      ${hero("Guía rápida: Diseñador", "Descarga el esqueleto, valida y envía", "bg-indigo-600")}
      <div class="space-y-2">
        ${step(1, "Revisa tus tareas", "En “Mis Tareas” ves tus pendientes. Si hay un esqueleto, aparece un botón azul “AI” para descargar el .ai/.pdf.")}
        ${step(2, "Abre Studio", "Pulsa “Studio” para cargar textos esperados y contexto.")}
        ${step(3, "Valida con IA", "Sube tu arte (PDF/PNG/JPG) y ejecuta “Validar Contenido”. Corrige según las observaciones.")}
        ${step(4, "Envía o solicita aprobación", "Cuando esté listo, pulsa “Enviar” o “Solicitar Aprob.”. Revisa notificaciones de rechazos en tu panel.")}
      </div>
    `,
    LEADER: `
      ${hero("Guía rápida: Líder", "Crea tareas, sube esqueletos y aprueba", "bg-amber-500")}
      <div class="space-y-2">
        ${step(1, "Crear + Delegar", "En “Panel de Líder” crea tareas y asígnalas al diseñador correcto.")}
        ${step(2, "Subir esqueletos", "En “Esqueletos (.ai)” sube plantillas por tipo de empaque (ej. Full Color Box). El nombre debe coincidir con el campo “Tipo de empaque / esqueleto” de la tarea.")}
        ${step(3, "Validar envíos", "Revisa “Validaciones Pendientes” y aprueba o rechaza con notas claras.")}
        ${step(4, "Métricas", "Monitorea rendimiento y errores frecuentes para priorizar coaching.")}
      </div>
    `,
    ADMIN: `
      ${hero("Guía rápida: Admin", "Gobierna usuarios y accesos", "bg-emerald-600")}
      <div class="space-y-2">
        ${step(1, "Usuarios", "Crea, lista y gestiona roles desde la pestaña Admin.")}
        ${step(2, "Auditoría", "Accede a Archivos y Diseños aprobados para control de calidad.")}
        ${step(3, "Soporte", "Ayuda a líderes/diseñadores a restablecer sesiones o permisos.")}
      </div>
    `,
    UNKNOWN: `
      ${hero("Guía rápida", "Inicia sesión para ver tu flujo", "bg-gray-500")}
      <p class="text-sm text-gray-600">Accede con tus credenciales para ver la guía personalizada de tu rol.</p>
    `
  };

  $("guideContent").innerHTML = cards[role] || cards.UNKNOWN;
  document.getElementById("guideModal").showModal();
  if (window.lucide) lucide.createIcons();
};
