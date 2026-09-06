// ================================================================
// ST. ANN'S COLLEGE FOR WOMEN - ADMIN DASHBOARD LOGIC
// ================================================================

let currentLeaderboard = [];
let currentSubmissions = [];
let currentFilterTab = "ALL"; // "ALL", "DEGREE", "INTER"
let currentSourceFilter = "ALL"; // "ALL", "MANAGEMENT", "PEER"
let currentAdminView = "LEADERBOARD"; // "LEADERBOARD", "SUBMISSIONS"
let selectedFacultyForReport = null;

// On Page Load
document.addEventListener("DOMContentLoaded", () => {
  checkAuth();
  updateDbStatusBadge();
});

// Authentication
function checkAuth() {
  const isAuth = sessionStorage.getItem("ST_ANNS_ADMIN_AUTH") === "true";
  if (isAuth) {
    document.getElementById("modal-login").classList.add("hidden");
    document.getElementById("dashboard-content").classList.remove("hidden");
    loadDashboardData();
  } else {
    document.getElementById("modal-login").classList.remove("hidden");
    document.getElementById("dashboard-content").classList.add("hidden");
  }
}

function verifyAdminPassword() {
  const input = document.getElementById("admin-pass-input").value;
  const err = document.getElementById("login-error");
  if (input === APP_CONFIG.adminPassword) {
    sessionStorage.setItem("ST_ANNS_ADMIN_AUTH", "true");
    err.classList.add("hidden");
    checkAuth();
  } else {
    err.classList.remove("hidden");
  }
}

function adminLogout() {
  sessionStorage.removeItem("ST_ANNS_ADMIN_AUTH");
  window.location.reload();
}

// Database status badge
function updateDbStatusBadge() {
  const label = document.getElementById("db-label");
  const dot = document.getElementById("db-dot");
  const btn = document.getElementById("db-status-btn");

  if (DataProvider.isCloud()) {
    dot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
    label.textContent = "Supabase Cloud";
    btn.className = "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 flex items-center space-x-1.5 transition";
  } else {
    dot.className = "w-2 h-2 rounded-full bg-amber-500";
    label.textContent = "Local Storage (Demo)";
    btn.className = "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-amber-300 bg-amber-50 text-amber-800 flex items-center space-x-1.5 transition";
  }
}

// View Switching: Leaderboard vs Submissions Log
function switchAdminView(view) {
  currentAdminView = view;
  const btnLeaderboard = document.getElementById("nav-btn-leaderboard");
  const btnSubmissions = document.getElementById("nav-btn-submissions");
  const viewLeaderboard = document.getElementById("view-leaderboard");
  const viewSubmissions = document.getElementById("view-submissions");

  if (view === "LEADERBOARD") {
    viewLeaderboard.classList.remove("hidden");
    viewSubmissions.classList.add("hidden");
    btnLeaderboard.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 bg-indigo-600 text-white shadow-xs";
    btnSubmissions.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200";
  } else {
    viewSubmissions.classList.remove("hidden");
    viewLeaderboard.classList.add("hidden");
    btnSubmissions.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 bg-indigo-600 text-white shadow-xs";
    btnLeaderboard.className = "px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center space-x-2 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200";
    renderSubmissionsLog();
  }
}

// Review Source Filter Tabs: All vs Management vs Peer
async function setSourceFilter(source) {
  currentSourceFilter = source;
  ["ALL", "MANAGEMENT", "PEER"].forEach(src => {
    const el = document.getElementById("src-tab-" + src);
    if (!el) return;
    if (src === source) {
      el.className = "px-2.5 py-1.5 rounded-lg transition bg-white text-indigo-700 shadow-xs whitespace-nowrap font-bold";
    } else {
      el.className = "px-2.5 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900 whitespace-nowrap";
    }
  });

  const subtitle = document.getElementById("leaderboard-subtitle");
  if (subtitle) {
    if (source === "MANAGEMENT") {
      subtitle.textContent = "👑 Showing ratings exclusively submitted by Management Sisters.";
    } else if (source === "PEER") {
      subtitle.textContent = "👥 Showing ratings exclusively submitted by Teaching Faculty Peers.";
    } else {
      subtitle.textContent = "Ranked from highest average score to end based on 7 core criteria (Max 28 marks).";
    }
  }

  // Reload leaderboard with source filter
  currentLeaderboard = await DataProvider.getLeaderboard(currentSourceFilter);
  applyFiltersAndRender();
}

// Load Leaderboard, Submissions & Summary Stats
async function loadDashboardData() {
  try {
    // 1. Stats
    const stats = await DataProvider.getStudentStats();
    document.getElementById("stat-total-students").textContent = stats.total;
    document.getElementById("stat-degree-students").textContent = stats.degree;
    document.getElementById("stat-inter-students").textContent = stats.intermediate;

    // 2. Submissions Log
    currentSubmissions = await DataProvider.getEvaluatorSubmissions();
    const navSubBadge = document.getElementById("nav-sub-count");
    if (navSubBadge) navSubBadge.textContent = currentSubmissions.length;

    // 3. Leaderboard
    currentLeaderboard = await DataProvider.getLeaderboard(currentSourceFilter);

    // 4. College Overall Average
    let totalScoreSum = 0;
    let totalEvaluations = 0;
    currentLeaderboard.forEach(f => {
      totalScoreSum += (f.avg_score * f.total_evaluations);
      totalEvaluations += f.total_evaluations;
    });

    const overallAvg = totalEvaluations > 0 ? (totalScoreSum / totalEvaluations).toFixed(2) : "0.0";
    const overallPct = totalEvaluations > 0 ? (((parseFloat(overallAvg)) / 28) * 100).toFixed(1) : "0";

    document.getElementById("stat-avg-score").textContent = overallAvg;
    document.getElementById("stat-avg-percent").textContent = `${overallPct}% Average rating across ${totalEvaluations} ratings`;

    applyFiltersAndRender();
    renderSubmissionsLog();
  } catch (err) {
    console.error("Error loading dashboard data:", err);
  }
}

// Filter Tabs (Wing)
function setTabFilter(tab) {
  currentFilterTab = tab;
  ["ALL", "DEGREE", "INTER"].forEach(t => {
    const el = document.getElementById("tab-" + t);
    if (!el) return;
    if (t === tab) {
      el.className = "px-2.5 py-1.5 rounded-lg transition bg-white text-indigo-700 shadow-xs font-bold whitespace-nowrap";
    } else {
      el.className = "px-2.5 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900 whitespace-nowrap";
    }
  });

  const thRank = document.getElementById("th-rank");
  if (thRank) {
    if (tab === "DEGREE") thRank.textContent = "Degree Rank";
    else if (tab === "INTER") thRank.textContent = "Inter Rank";
    else thRank.textContent = "Overall Rank";
  }

  applyFiltersAndRender();
}

// Apply Search + Tab Filter & Render Leaderboard Table
function applyFiltersAndRender() {
  const searchQuery = (document.getElementById("admin-search").value || "").toLowerCase().trim();
  const tbody = document.getElementById("leaderboard-tbody");

  let filtered = currentLeaderboard.filter(fac => {
    // Stream filter
    if (currentFilterTab === "DEGREE") {
      if (fac.stream_code !== 'DEGREE' && fac.stream_code !== 'BOTH') return false;
    } else if (currentFilterTab === "INTER") {
      if (fac.stream_code !== 'INTER' && fac.stream_code !== 'BOTH') return false;
    }
    // Search filter
    if (searchQuery && !fac.name.toLowerCase().includes(searchQuery)) {
      return false;
    }
    return true;
  });

  document.getElementById("table-count-badge").textContent = `${filtered.length} Staff Listed`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-8 text-slate-400">
          <i class="fa-regular fa-folder-open text-2xl mb-1 block"></i>
          No staff records found matching filter.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((fac, idx) => {
    const wingRank = idx + 1;
    let rankBadge = `<span class="font-bold text-slate-700">#${wingRank}</span>`;
    if (wingRank === 1 && fac.total_evaluations > 0) rankBadge = `<span class="font-bold text-amber-600" title="Top Scorer">🥇 #${wingRank}</span>`;
    else if (wingRank === 2 && fac.total_evaluations > 0) rankBadge = `<span class="font-bold text-slate-500">🥈 #${wingRank}</span>`;
    else if (wingRank === 3 && fac.total_evaluations > 0) rankBadge = `<span class="font-bold text-amber-800">🥉 #${wingRank}</span>`;

    let subRank = "";
    if (currentFilterTab !== "ALL") {
      subRank = `<div class="text-[10px] text-slate-400 font-normal">Overall #${fac.rank}</div>`;
    }

    // Category styling
    let catClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (fac.category.includes("Degree Teaching") || fac.stream_code === "DEGREE") {
      catClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (fac.category.includes("Intermediate Teaching") || fac.stream_code === "INTER") {
      catClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (fac.category.includes("Both") || fac.stream_code === "BOTH") {
      catClass = "bg-blue-50 text-blue-700 border-blue-200";
    }

    // Grade styling
    let gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">${fac.grade}</span>`;
    if (fac.grade.includes("A+")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">A+ Outstanding</span>`;
    else if (fac.grade.includes("A")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">A Very Good</span>`;
    else if (fac.grade.includes("B+")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">B+ Good</span>`;
    else if (fac.grade.includes("B")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">B Satisfactory</span>`;

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 text-center whitespace-nowrap">${rankBadge}${subRank}</td>
        <td class="py-3 px-4 text-center font-mono text-slate-400">#${fac.sl_no}</td>
        <td class="py-3 px-4">
          <span class="font-bold text-slate-900 block">${fac.name}</span>
          ${fac.designation && fac.designation !== 'Teaching Faculty' ? `<span class="text-[10px] text-slate-400 font-medium">${fac.designation}</span>` : ''}
        </td>
        <td class="py-3 px-4">
          <span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold ${catClass}">
            ${fac.category}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-semibold text-slate-700">${fac.total_evaluations}</td>
        <td class="py-3 px-4 text-right font-black ${fac.avg_score >= 24 ? 'text-emerald-600' : 'text-slate-800'}">
          ${fac.total_evaluations > 0 ? fac.avg_score.toFixed(2) : '-'}
        </td>
        <td class="py-3 px-4 text-right font-bold text-slate-700">
          ${fac.total_evaluations > 0 ? `${fac.avg_percentage.toFixed(1)}%` : '-'}
        </td>
        <td class="py-3 px-4 text-center">${gradeBadge}</td>
        <td class="py-3 px-4 text-center no-print">
          <button onclick="viewFacultyReport(${fac.faculty_id || fac.sl_no})"
            class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition flex items-center space-x-1 mx-auto">
            <i class="fa-regular fa-file-lines"></i>
            <span>Report Card</span>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render Submissions Log (Who Has Submitted)
function renderSubmissionsLog() {
  const searchInput = document.getElementById("submissions-search");
  const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const tbody = document.getElementById("submissions-tbody");
  if (!tbody) return;

  let filtered = currentSubmissions.filter(ev => {
    if (!query) return true;
    const nameMatch = (ev.name || '').toLowerCase().includes(query);
    const phoneMatch = (ev.phone || '').toLowerCase().includes(query);
    const deptMatch = (ev.department || '').toLowerCase().includes(query);
    const streamMatch = (ev.stream || '').toLowerCase().includes(query);
    return nameMatch || phoneMatch || deptMatch || streamMatch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400">
          <i class="fa-regular fa-user text-2xl mb-1 block"></i>
          No evaluator submissions found.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map((ev, idx) => {
    const formattedDate = ev.created_at 
      ? new Date(ev.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
      : '-';

    let roleBadge = `<span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-slate-100 text-slate-700 border-slate-200">${ev.stream || 'Faculty'}</span>`;
    if (ev.isManagement) {
      roleBadge = `<span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200">👑 Management</span>`;
    } else if (ev.stream === "Degree") {
      roleBadge = `<span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">Degree Faculty</span>`;
    } else if (ev.stream === "Intermediate") {
      roleBadge = `<span class="inline-block px-2 py-0.5 rounded-md border text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">Inter Faculty</span>`;
    }

    const cleanName = (ev.name || 'Unknown').replace(/'/g, "\'");

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 text-center font-mono text-slate-400">#${idx + 1}</td>
        <td class="py-3 px-4">
          <div class="flex items-center space-x-2">
            ${ev.isManagement ? '<span class="text-purple-600 font-bold" title="Management Sister">👑</span>' : '<i class="fa-solid fa-user-check text-emerald-500 text-xs"></i>'}
            <span class="font-bold text-slate-900">${ev.name}</span>
          </div>
        </td>
        <td class="py-3 px-4">${roleBadge}</td>
        <td class="py-3 px-4 font-mono text-slate-600 font-medium">${ev.phone || '-'}</td>
        <td class="py-3 px-4 text-slate-600">${ev.department || '-'}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-2.5 py-1 rounded-full font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
            ${ev.colleaguesCount} rated
          </span>
        </td>
        <td class="py-3 px-4 text-slate-500 whitespace-nowrap">${formattedDate}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center space-x-1.5">
            <button onclick="showEvaluatorDetails('${ev.phone}')"
              class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-[11px] transition flex items-center space-x-1"
              title="View colleagues evaluated">
              <i class="fa-solid fa-eye text-[10px]"></i>
              <span>View</span>
            </button>
            <button onclick="deleteSubmission('${ev.phone}', '${cleanName}')"
              class="px-2 py-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 text-[11px] transition"
              title="Delete submission and allow re-evaluation">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Show Detail Modal of Colleagues evaluated by a specific evaluator
function showEvaluatorDetails(phone) {
  const ev = currentSubmissions.find(s => s.phone === phone);
  if (!ev) return;

  document.getElementById("modal-eval-name").textContent = ev.name;
  document.getElementById("modal-eval-badge").textContent = ev.isManagement ? "👑 Management Sister" : "👥 Teaching Faculty";
  document.getElementById("modal-eval-sub").textContent = `${ev.stream} Wing • Dept: ${ev.department || 'N/A'} • Mobile: ${ev.phone}`;

  const tbody = document.getElementById("modal-eval-ratings-tbody");
  if (!ev.reviews || ev.reviews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center py-6 text-slate-400">
          No individual ratings records found for this evaluator.
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = ev.reviews.map(r => {
      const pct = ((r.total_score / 28) * 100).toFixed(1);
      return `
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3 font-semibold text-slate-800">${r.faculty_name || 'Faculty #' + r.faculty_id}</td>
          <td class="py-2.5 px-3 text-center font-black text-indigo-700">${r.total_score} <span class="text-slate-400 font-normal text-[10px]">/ 28</span></td>
          <td class="py-2.5 px-3 text-center font-bold text-slate-700">${pct}%</td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById("modal-evaluator-details").classList.remove("hidden");
}

function closeEvaluatorModal() {
  document.getElementById("modal-evaluator-details").classList.add("hidden");
}

// Delete submission to allow retrying
async function deleteSubmission(phone, name) {
  if (!confirm(`Are you sure you want to remove the appraisal submission for ${name} (${phone})?\n\nThis will remove their rating records and allow them to submit fresh feedback.`)) {
    return;
  }
  try {
    await DataProvider.deleteEvaluatorRecord(phone);
    alert(`Submission record for ${name} has been cleared.`);
    loadDashboardData();
  } catch (err) {
    alert("Error removing submission: " + (err.message || err));
  }
}

// Helper to format mark pill (Q1 - Q7)
function formatMarkPill(mark) {
  let color = "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (mark <= 2) color = "bg-amber-50 text-amber-700 border-amber-200";
  else if (mark === 3) color = "bg-blue-50 text-blue-700 border-blue-200";
  return `<span class="inline-block w-6 text-center py-0.5 rounded border text-[11px] font-bold ${color}">${mark}</span>`;
}

// View Individual Faculty Report Modal (Including WHO evaluated them and HOW)
async function viewFacultyReport(facultyId) {
  const fac = currentLeaderboard.find(f => (f.faculty_id || f.sl_no) === facultyId);
  if (!fac) return;
  selectedFacultyForReport = fac;

  document.getElementById("modal-fac-name").textContent = fac.name;
  document.getElementById("rep-name").textContent = fac.name;
  document.getElementById("rep-category").textContent = fac.category;
  document.getElementById("rep-count").textContent = `${fac.total_evaluations} Total Reviews`;
  document.getElementById("rep-mgmt-count").textContent = `${fac.mgmt_evaluations || 0} Mgmt Reviews`;
  document.getElementById("rep-rank").textContent = fac.total_evaluations > 0 ? `#${fac.rank} of 55` : "N/A";
  document.getElementById("rep-score").textContent = fac.total_evaluations > 0 ? fac.avg_score.toFixed(2) : "0.0";
  document.getElementById("rep-percent").textContent = fac.total_evaluations > 0 ? `${fac.avg_percentage.toFixed(1)}%` : "0%";
  document.getElementById("rep-grade").textContent = fac.grade;

  // Management vs Peer breakdown
  document.getElementById("rep-mgmt-score").textContent = fac.mgmt_avg_score ? fac.mgmt_avg_score.toFixed(2) : "0.0";
  document.getElementById("rep-peer-score").textContent = fac.peer_avg_score ? fac.peer_avg_score.toFixed(2) : "0.0";
  document.getElementById("rep-mgmt-sub").textContent = `${fac.mgmt_evaluations || 0} Management Sisters`;
  document.getElementById("rep-peer-sub").textContent = `${fac.peer_evaluations || 0} Peer Faculty`;

  // 1. Populate Aggregated 7 Criteria table
  const tbody = document.getElementById("rep-criteria-tbody");
  tbody.innerHTML = EVALUATION_QUESTIONS.map(q => {
    const avgMark = fac[q.id + "_avg"] || 0;
    const pct = ((avgMark / 4.0) * 100).toFixed(0);

    let barColor = "bg-emerald-500";
    if (pct < 60) barColor = "bg-amber-500";
    else if (pct < 75) barColor = "bg-blue-500";

    return `
      <tr>
        <td class="py-2.5 px-3">
          <span class="font-bold text-slate-800 block">${q.title}</span>
          <span class="text-[10px] text-slate-400 block">${q.desc}</span>
        </td>
        <td class="py-2.5 px-3 text-right font-black text-slate-900">${avgMark.toFixed(2)}</td>
        <td class="py-2.5 px-3 text-right font-bold text-slate-700">${pct}%</td>
        <td class="py-2.5 px-3 w-40">
          <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div class="${barColor} h-2 rounded-full" style="width: ${pct}%"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // 2. Fetch and Populate Individual Evaluators & Scores Table (Admin View)
  const evalTbody = document.getElementById("rep-evaluators-tbody");
  const countBadge = document.getElementById("rep-eval-count-badge");
  evalTbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-slate-400"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Loading reviews...</td></tr>`;

  try {
    const evaluations = await DataProvider.getFacultyEvaluations(fac.faculty_id || fac.sl_no);
    if (countBadge) countBadge.textContent = `${evaluations.length} Reviews Received`;

    if (evaluations.length === 0) {
      evalTbody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center py-6 text-slate-400">
            <i class="fa-regular fa-comment-dots text-xl mb-1 block"></i>
            No individual appraisals received yet for this faculty member.
          </td>
        </tr>
      `;
    } else {
      evalTbody.innerHTML = evaluations.map(ev => {
        const dStr = ev.created_at ? new Date(ev.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-';
        const rolePill = ev.isManagement
          ? `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">👑 Mgmt</span>`
          : `<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">${ev.stream || 'Peer'}</span>`;

        return `
          <tr class="hover:bg-slate-50 transition">
            <td class="py-2.5 px-3">
              <span class="font-bold text-slate-900 block">${ev.evaluator_name}</span>
              ${ev.evaluator_phone ? `<span class="text-[10px] text-slate-400 font-mono">${ev.evaluator_phone}</span>` : ''}
            </td>
            <td class="py-2.5 px-3 whitespace-nowrap">${rolePill}</td>
            <td class="py-2.5 px-3 text-slate-600 text-[11px]">${ev.department || '-'}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q1)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q2)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q3)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q4)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q5)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q6)}</td>
            <td class="py-2.5 px-1.5 text-center">${formatMarkPill(ev.q7)}</td>
            <td class="py-2.5 px-3 text-center whitespace-nowrap">
              <span class="font-black text-indigo-700 text-sm">${ev.total_score}</span>
              <span class="text-[10px] text-slate-400 font-normal">/28</span>
              <span class="block text-[10px] text-slate-500 font-semibold">${((ev.total_score / 28) * 100).toFixed(0)}%</span>
            </td>
            <td class="py-2.5 px-3 text-right text-slate-400 whitespace-nowrap">${dStr}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error("Error loading individual faculty evaluations:", err);
    evalTbody.innerHTML = `<tr><td colspan="12" class="text-center py-4 text-red-500">Error loading reviewer list.</td></tr>`;
  }

  document.getElementById("modal-report").classList.remove("hidden");
}

function closeReportModal() {
  document.getElementById("modal-report").classList.add("hidden");
}

function printSingleReport() {
  const printContents = document.getElementById("printable-report-area").innerHTML;
  const originalContents = document.body.innerHTML;

  document.body.innerHTML = `
    <div style="max-width: 800px; margin: 20px auto; padding: 20px; font-family: sans-serif;">
      ${printContents}
    </div>
  `;
  window.print();
  document.body.innerHTML = originalContents;
  window.location.reload();
}

// Export Multi-Sheet Master Workbook to Excel (.xlsx) using SheetJS
async function exportToExcel() {
  if (!currentLeaderboard || currentLeaderboard.length === 0) {
    alert("No data available to export.");
    return;
  }

  // Auto-size column width definitions for leaderboards
  const colWidths = [
    { wch: 14 }, // Rank
    { wch: 12 }, // Overall Rank
    { wch: 8 },  // Staff Sl
    { wch: 32 }, // Name
    { wch: 26 }, // Category
    { wch: 10 }, // Stream
    { wch: 16 }, // Reviews Received
    { wch: 16 }, // Management Reviews
    { wch: 16 }, // Management Avg Score
    { wch: 16 }, // Peer Reviews
    { wch: 16 }, // Peer Avg Score
    { wch: 15 }, // Q1
    { wch: 15 }, // Q2
    { wch: 15 }, // Q3
    { wch: 15 }, // Q4
    { wch: 15 }, // Q5
    { wch: 15 }, // Q6
    { wch: 15 }, // Q7
    { wch: 18 }, // Total Score /28
    { wch: 15 }, // Percentage
    { wch: 22 }  // Grade
  ];

  // Helper function to build formatted rows for a sheet with sorted ranking
  function buildSheetRows(staffList, rankHeader) {
    const sorted = [...staffList].sort((a, b) => {
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
      return b.total_evaluations - a.total_evaluations;
    });

    return sorted.map((fac, idx) => ({
      [rankHeader]: idx + 1,
      "Overall Rank": fac.rank,
      "Staff Sl": fac.sl_no,
      "Faculty / Staff Name": fac.name,
      "Category": fac.category,
      "Stream": fac.stream_code,
      "Total Reviews Received": fac.total_evaluations,
      "Management Reviews": fac.mgmt_evaluations || 0,
      "Management Avg Score (/28)": fac.mgmt_avg_score || 0,
      "Peer Reviews": fac.peer_evaluations || 0,
      "Peer Avg Score (/28)": fac.peer_avg_score || 0,
      "Q1: Inspiring Personality (Avg/4)": fac.q1_avg,
      "Q2: Pedagogical Excellence (Avg/4)": fac.q2_avg,
      "Q3: Innovative Practices (Avg/4)": fac.q3_avg,
      "Q4: Student Development (Avg/4)": fac.q4_avg,
      "Q5: Professional Growth (Avg/4)": fac.q5_avg,
      "Q6: Contribution to College (Avg/4)": fac.q6_avg,
      "Q7: Loyalty & Integrity (Avg/4)": fac.q7_avg,
      "Overall Score (Avg/28)": fac.avg_score,
      "Percentage Score (%)": `${fac.avg_percentage}%`,
      "Performance Grade": fac.grade
    }));
  }

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Master Combined Leaderboard (All 55 Teaching Faculty)
  const masterLeaderboard = await DataProvider.getLeaderboard("ALL");
  const allRows = buildSheetRows(masterLeaderboard, "Master Rank");
  const wsAll = XLSX.utils.json_to_sheet(allRows);
  wsAll["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(workbook, wsAll, "Master Leaderboard (55)");

  // Sheet 2: Management Appraisal Only
  const mgmtLeaderboard = await DataProvider.getLeaderboard("MANAGEMENT");
  const mgmtRows = buildSheetRows(mgmtLeaderboard, "Management Rank");
  const wsMgmt = XLSX.utils.json_to_sheet(mgmtRows);
  wsMgmt["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(workbook, wsMgmt, "Management Appraisal");

  // Sheet 3: Peer Faculty Appraisal Only
  const peerLeaderboard = await DataProvider.getLeaderboard("PEER");
  const peerRows = buildSheetRows(peerLeaderboard, "Peer Rank");
  const wsPeer = XLSX.utils.json_to_sheet(peerRows);
  wsPeer["!cols"] = colWidths;
  XLSX.utils.book_append_sheet(workbook, wsPeer, "Peer Faculty Appraisal");

  // Sheet 4: Evaluator Submissions Log (Who Has Submitted)
  const evalSubmissions = await DataProvider.getEvaluatorSubmissions();
  const evalRows = evalSubmissions.map((ev, idx) => ({
    "Sl": idx + 1,
    "Evaluator Name": ev.name,
    "Role": ev.isManagement ? "Management Sister" : "Teaching Faculty",
    "Stream / Wing": ev.stream || "-",
    "Department / Subject": ev.department || "-",
    "Mobile Number": ev.phone || "-",
    "Colleagues Evaluated": ev.colleaguesCount,
    "Submission Date & Time": ev.created_at ? new Date(ev.created_at).toLocaleString('en-IN') : "-"
  }));
  const wsEvals = XLSX.utils.json_to_sheet(evalRows);
  wsEvals["!cols"] = [
    { wch: 6 },
    { wch: 30 },
    { wch: 20 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 20 },
    { wch: 26 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsEvals, "Evaluator Submissions Log");

  // Sheet 5: Individual Feedback Log (Who rated each faculty and exact marks)
  try {
    const rawDetails = await DataProvider.getAllFeedbackDetails();
    if (rawDetails && rawDetails.length > 0) {
      const detailRows = rawDetails.map((r, idx) => ({
        "Sl": idx + 1,
        "Faculty Evaluated": r.faculty_name,
        "Evaluator Name": r.evaluator_name,
        "Evaluator Role": r.role,
        "Evaluator Department": r.department,
        "Evaluator Mobile": r.evaluator_phone || "-",
        "Q1 (Inspiring Personality)": r.q1,
        "Q2 (Pedagogical Excellence)": r.q2,
        "Q3 (Innovative Practices)": r.q3,
        "Q4 (Student Development)": r.q4,
        "Q5 (Professional Growth)": r.q5,
        "Q6 (Contribution to College)": r.q6,
        "Q7 (Loyalty & Integrity)": r.q7,
        "Total Score (/28)": r.total_score,
        "Percentage (%)": `${r.percentage}%`,
        "Submission Date": r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : "-"
      }));
      const wsDetails = XLSX.utils.json_to_sheet(detailRows);
      wsDetails["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 30 },
        { wch: 20 },
        { wch: 22 },
        { wch: 18 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 16 },
        { wch: 15 },
        { wch: 24 }
      ];
      XLSX.utils.book_append_sheet(workbook, wsDetails, "Individual Appraisals Log");
    }
  } catch (err) {
    console.warn("Could not append individual feedback sheet:", err);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `St_Anns_Faculty_Appraisal_Master_Report_${todayStr}.xlsx`);
}

// Demo Data Generator (Generates sample peer & management evaluations)
async function generateDemoData() {
  if (!confirm("Generate sample peer & management evaluations for testing?")) return;

  const evaluators = JSON.parse(localStorage.getItem('ST_ANNS_EVALUATORS') || '[]');
  const feedback = JSON.parse(localStorage.getItem('ST_ANNS_FEEDBACK') || '[]');

  const facultyList = await DataProvider.getFacultyList();
  const teachingStaff = facultyList.filter(f => f.category !== 'Management' && f.stream_code !== 'MANAGEMENT');
  const managementStaff = facultyList.filter(f => f.category === 'Management' || f.stream_code === 'MANAGEMENT');

  // 1. Management Sisters evaluate 10 teaching faculty each
  managementStaff.forEach(m => {
    evaluators.push({
      faculty_id: m.sl_no,
      name: m.name,
      phone_number: '99999' + String(m.sl_no).padStart(5, '0'),
      stream: 'Management',
      department: 'Management',
      created_at: new Date().toISOString()
    });

    const evaluatedTeaching = [...teachingStaff].sort(() => 0.5 - Math.random()).slice(0, 10);
    evaluatedTeaching.forEach(colleague => {
      const q1 = Math.floor(Math.random() * 2) + 3; // 3 or 4
      const q2 = Math.floor(Math.random() * 2) + 3;
      const q3 = Math.floor(Math.random() * 2) + 3;
      const q4 = Math.floor(Math.random() * 2) + 3;
      const q5 = Math.floor(Math.random() * 2) + 3;
      const q6 = Math.floor(Math.random() * 2) + 3;
      const q7 = Math.floor(Math.random() * 2) + 3;
      const total_score = q1 + q2 + q3 + q4 + q5 + q6 + q7;
      const percentage = parseFloat(((total_score / 28) * 100).toFixed(2));

      feedback.push({
        id: 'demo-mgmt-' + Math.random().toString(36).substr(2, 9),
        evaluator_phone: '99999' + String(m.sl_no).padStart(5, '0'),
        faculty_id: colleague.id || colleague.sl_no,
        faculty_name: colleague.name,
        stream: 'Management',
        q1, q2, q3, q4, q5, q6, q7,
        total_score,
        percentage,
        created_at: new Date().toISOString()
      });
    });
  });

  // 2. 25 Teaching Faculty evaluate 5 colleagues each
  const sampleTeachers = [...teachingStaff].sort(() => 0.5 - Math.random()).slice(0, 25);
  sampleTeachers.forEach(t => {
    const stream = t.stream_code === 'INTER' ? 'Intermediate' : 'Degree';
    const phone = '88888' + String(t.sl_no).padStart(5, '0');

    evaluators.push({
      faculty_id: t.sl_no,
      name: t.name,
      phone_number: phone,
      stream,
      department: t.department || 'Teaching Faculty',
      created_at: new Date().toISOString()
    });

    const eligible = teachingStaff.filter(f => f.sl_no !== t.sl_no);
    const evaluated = [...eligible].sort(() => 0.5 - Math.random()).slice(0, 5);

    evaluated.forEach(colleague => {
      const q1 = Math.floor(Math.random() * 3) + 2; // 2, 3, or 4
      const q2 = Math.floor(Math.random() * 3) + 2;
      const q3 = Math.floor(Math.random() * 3) + 2;
      const q4 = Math.floor(Math.random() * 3) + 2;
      const q5 = Math.floor(Math.random() * 3) + 2;
      const q6 = Math.floor(Math.random() * 3) + 2;
      const q7 = Math.floor(Math.random() * 3) + 2;
      const total_score = q1 + q2 + q3 + q4 + q5 + q6 + q7;
      const percentage = parseFloat(((total_score / 28) * 100).toFixed(2));

      feedback.push({
        id: 'demo-peer-' + Math.random().toString(36).substr(2, 9),
        evaluator_phone: phone,
        faculty_id: colleague.id || colleague.sl_no,
        faculty_name: colleague.name,
        stream,
        q1, q2, q3, q4, q5, q6, q7,
        total_score,
        percentage,
        created_at: new Date().toISOString()
      });
    });
  });

  localStorage.setItem('ST_ANNS_EVALUATORS', JSON.stringify(evaluators));
  localStorage.setItem('ST_ANNS_FEEDBACK', JSON.stringify(feedback));

  alert("Successfully generated sample peer and management appraisals! Updating dashboard...");
  loadDashboardData();
}

// Reset data (Both Cloud & Local)
async function resetAllData() {
  if (!confirm("Are you sure you want to clear all feedback and evaluator submissions? (Cannot be undone)")) return;
  try {
    await DataProvider.resetAllData();
    alert("Feedback data reset to zero.");
    loadDashboardData();
  } catch (err) {
    alert("Error resetting data: " + (err.message || err));
  }
}

// Supabase config modal
function openConfigModal() {
  document.getElementById("cfg-url").value = localStorage.getItem("ST_ANNS_SUPABASE_URL") || APP_CONFIG.supabaseUrl || "";
  document.getElementById("cfg-key").value = localStorage.getItem("ST_ANNS_SUPABASE_KEY") || APP_CONFIG.supabaseAnonKey || "";
  document.getElementById("modal-config").classList.remove("hidden");
}

function closeConfigModal() {
  document.getElementById("modal-config").classList.add("hidden");
}

function saveSupabaseConfig() {
  const url = document.getElementById("cfg-url").value.trim();
  const key = document.getElementById("cfg-key").value.trim();

  localStorage.setItem("ST_ANNS_SUPABASE_URL", url);
  localStorage.setItem("ST_ANNS_SUPABASE_KEY", key);

  alert("Supabase credentials saved! Reloading application...");
  window.location.reload();
}

function clearConfig() {
  localStorage.removeItem("ST_ANNS_SUPABASE_URL");
  localStorage.removeItem("ST_ANNS_SUPABASE_KEY");
  alert("Reverted to Local Storage demo mode. Reloading...");
  window.location.reload();
}
