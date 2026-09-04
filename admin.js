// ================================================================
// ST. ANN'S COLLEGE FOR WOMEN - ADMIN DASHBOARD LOGIC
// ================================================================

let currentLeaderboard = [];
let currentFilterTab = "ALL"; // "ALL", "DEGREE", "INTER"
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

// Load Leaderboard & Stats
async function loadDashboardData() {
  try {
    // 1. Student Stats
    const stats = await DataProvider.getStudentStats();
    document.getElementById("stat-total-students").textContent = stats.total;
    document.getElementById("stat-degree-students").textContent = stats.degree;
    document.getElementById("stat-inter-students").textContent = stats.intermediate;

    // 2. Leaderboard
    currentLeaderboard = await DataProvider.getLeaderboard();

    // 3. College Overall Average
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
  } catch (err) {
    console.error("Error loading dashboard data:", err);
  }
}

// Filter Tabs
function setTabFilter(tab) {
  currentFilterTab = tab;
  ["ALL", "DEGREE", "INTER", "TEACHING", "SUPPORT"].forEach(t => {
    const el = document.getElementById("tab-" + t);
    if (!el) return;
    if (t === tab) {
      el.className = "px-2.5 py-1.5 rounded-lg transition bg-white text-indigo-700 shadow-xs font-bold whitespace-nowrap";
    } else {
      el.className = "px-2.5 py-1.5 rounded-lg transition text-slate-600 hover:text-slate-900 whitespace-nowrap";
    }
  });
  applyFiltersAndRender();
}

// Apply Search + Tab Filter & Render Table
function applyFiltersAndRender() {
  const searchQuery = document.getElementById("admin-search").value.toLowerCase().trim();
  const tbody = document.getElementById("leaderboard-tbody");

  let filtered = currentLeaderboard.filter(fac => {
    // Stream / category filter
    if (currentFilterTab === "DEGREE") {
      if (fac.stream_code !== 'DEGREE' && fac.stream_code !== 'BOTH' && fac.stream_code !== 'ALL') return false;
    } else if (currentFilterTab === "INTER") {
      if (fac.stream_code !== 'INTER' && fac.stream_code !== 'BOTH' && fac.stream_code !== 'ALL') return false;
    } else if (currentFilterTab === "TEACHING") {
      if (!fac.category.includes('Teaching')) return false;
    } else if (currentFilterTab === "SUPPORT") {
      if (fac.category !== 'Office Staff' && fac.category !== 'Non-Teaching') return false;
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
    // Rank medal styling
    let rankBadge = `<span class="font-bold text-slate-700">#${fac.rank}</span>`;
    if (fac.rank === 1 && fac.total_evaluations > 0) rankBadge = `<span class="text-lg" title="Top Scorer">🥇</span>`;
    else if (fac.rank === 2 && fac.total_evaluations > 0) rankBadge = `<span class="text-lg">🥈</span>`;
    else if (fac.rank === 3 && fac.total_evaluations > 0) rankBadge = `<span class="text-lg">🥉</span>`;

    // Category styling
    let catClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (fac.category.includes("Degree Teaching")) {
      catClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (fac.category.includes("Intermediate Teaching")) {
      catClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (fac.category.includes("Both")) {
      catClass = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (fac.category === "Office Staff") {
      catClass = "bg-teal-50 text-teal-700 border-teal-200";
    } else if (fac.category === "Non-Teaching") {
      catClass = "bg-slate-100 text-slate-700 border-slate-300";
    } else if (fac.category === "Administration") {
      catClass = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (fac.category === "Add Course") {
      catClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    // Grade styling
    let gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">${fac.grade}</span>`;
    if (fac.grade.includes("A+")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">A+ Outstanding</span>`;
    else if (fac.grade.includes("A")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">A Very Good</span>`;
    else if (fac.grade.includes("B+")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">B+ Good</span>`;
    else if (fac.grade.includes("B")) gradeBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">B Satisfactory</span>`;

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 text-center">${rankBadge}</td>
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

// View Individual Faculty Report Modal
function viewFacultyReport(facultyId) {
  const fac = currentLeaderboard.find(f => (f.faculty_id || f.sl_no) === facultyId);
  if (!fac) return;
  selectedFacultyForReport = fac;

  document.getElementById("modal-fac-name").textContent = fac.name;
  document.getElementById("rep-name").textContent = fac.name;
  document.getElementById("rep-category").textContent = fac.category;
  document.getElementById("rep-count").textContent = `${fac.total_evaluations} Peer Reviews`;
  document.getElementById("rep-rank").textContent = fac.total_evaluations > 0 ? `#${fac.rank} of 55` : "N/A";
  document.getElementById("rep-score").textContent = fac.total_evaluations > 0 ? fac.avg_score.toFixed(2) : "0.0";
  document.getElementById("rep-percent").textContent = fac.total_evaluations > 0 ? `${fac.avg_percentage.toFixed(1)}%` : "0%";
  document.getElementById("rep-grade").textContent = fac.grade;

  // Populate 7 Questions table
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

// Export Leaderboard to Excel (.xlsx) using SheetJS
function exportToExcel() {
  if (!currentLeaderboard || currentLeaderboard.length === 0) {
    alert("No data available to export.");
    return;
  }

  const excelRows = currentLeaderboard.map(fac => ({
    "Rank": fac.rank,
    "Sl. No": fac.sl_no,
    "Faculty Name": fac.name,
    "Category": fac.category,
    "Stream": fac.stream_code,
    "Total Peer Reviews Received": fac.total_evaluations,
    "Q1: Inspiring Personality (Avg/4)": fac.q1_avg,
    "Q2: Pedagogical Excellence (Avg/4)": fac.q2_avg,
    "Q3: Innovative Practices (Avg/4)": fac.q3_avg,
    "Q4: Student Development (Avg/4)": fac.q4_avg,
    "Q5: Professional Growth (Avg/4)": fac.q5_avg,
    "Q6: Contribution to School (Avg/4)": fac.q6_avg,
    "Q7: Loyalty & Integrity (Avg/4)": fac.q7_avg,
    "Total Score Obtained (Avg/28)": fac.avg_score,
    "Percentage Score (%)": fac.avg_percentage,
    "Performance Grade": fac.grade
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard_2026_2027");

  // Auto-size columns
  const colWidths = [
    { wch: 6 }, { wch: 8 }, { wch: 32 }, { wch: 22 }, { wch: 10 },
    { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 18 }
  ];
  worksheet["!cols"] = colWidths;

  XLSX.writeFile(workbook, `St_Anns_Faculty_Peer_Appraisal_Leaderboard_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// Demo Data Generator (Generates sample peer reviews by faculty)
async function generateDemoData() {
  if (!confirm("Generate sample peer evaluations submitted by faculty members for testing?")) return;

  const evaluators = JSON.parse(localStorage.getItem('ST_ANNS_EVALUATORS') || '[]');
  const feedback = JSON.parse(localStorage.getItem('ST_ANNS_FEEDBACK') || '[]');

  const facultyList = await DataProvider.getFacultyList();

  // Simulate 35 faculty members giving feedback for other colleagues
  const participatingFaculty = [...facultyList].sort(() => 0.5 - Math.random()).slice(0, 35);

  participatingFaculty.forEach(evaluator => {
    const stream = evaluator.category.includes("Degree") ? "Degree" : (evaluator.category.includes("Both") ? "Both" : "Intermediate");
    const staffId = `SL#${evaluator.sl_no}`;

    evaluators.push({
      faculty_id: evaluator.sl_no,
      name: evaluator.name,
      staff_id: staffId,
      stream,
      department_group: "Academic Department",
      created_at: new Date().toISOString()
    });

    // Select 4-6 colleagues in same stream, EXCLUDING self
    const eligibleColleagues = facultyList.filter(f => {
      if (f.sl_no === evaluator.sl_no) return false;
      if (stream === "Intermediate") return f.stream_code === 'INTER' || f.stream_code === 'BOTH' || f.stream_code === 'ALL';
      if (stream === "Degree") return f.stream_code === 'DEGREE' || f.stream_code === 'BOTH' || f.stream_code === 'ALL';
      return true;
    });

    const evaluatedColleagues = [...eligibleColleagues].sort(() => 0.5 - Math.random()).slice(0, 5);

    evaluatedColleagues.forEach(colleague => {
      const q1 = Math.random() > 0.3 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q2 = Math.random() > 0.25 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q3 = Math.random() > 0.35 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q4 = Math.random() > 0.2 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q5 = Math.random() > 0.3 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q6 = Math.random() > 0.2 ? 4 : (Math.random() > 0.4 ? 3 : 2);
      const q7 = Math.random() > 0.15 ? 4 : (Math.random() > 0.3 ? 3 : 2);
      const total_score = q1 + q2 + q3 + q4 + q5 + q6 + q7;
      const percentage = parseFloat(((total_score / 28) * 100).toFixed(2));

      feedback.push({
        id: 'demo-fb-' + Math.random().toString(36).substr(2, 9),
        evaluator_staff_id: staffId,
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
  localStorage.setItem('ST_ANNS_STUDENTS', JSON.stringify(evaluators));
  localStorage.setItem('ST_ANNS_FEEDBACK', JSON.stringify(feedback));

  alert("Successfully generated sample faculty peer appraisals! Updating dashboard...");
  loadDashboardData();
}

// Reset data
function resetAllData() {
  if (!confirm("Are you sure you want to clear all feedback data? (Cannot be undone)")) return;
  localStorage.removeItem('ST_ANNS_EVALUATORS');
  localStorage.removeItem('ST_ANNS_STUDENTS');
  localStorage.removeItem('ST_ANNS_FEEDBACK');
  alert("Data cleared.");
  loadDashboardData();
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
