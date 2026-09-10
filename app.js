// ================================================================
// ST. ANN'S COLLEGE FOR WOMEN - FACULTY PERFORMANCE FEEDBACK
// MAIN APPLICATION LOGIC (MANDATORY APPRAISAL + AUTO-SAVE & RESUME)
// ================================================================

let allStaff = [];
let eligibleColleagues = [];
let currentEvaluator = null;
let evaluationsState = {}; // { facultyId: { q1: 4, q2: 3, ... } }
let editingFacultyIds = new Set(); // Faculty IDs being edited even if completed
let currentCompletionTab = "ALL"; // "ALL", "PENDING", "COMPLETED"

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  await loadFacultyList();
});

// Load Faculty Master Data
async function loadFacultyList() {
  try {
    allStaff = await DataProvider.getFacultyList();
    populateEvaluatorDropdown();
  } catch (err) {
    console.error("Error loading faculty data:", err);
  }
}

// Populate Evaluator Selection Dropdown
function populateEvaluatorDropdown() {
  const select = document.getElementById("fac-evaluator-select");
  if (!select) return;

  const management = allStaff.filter(s => s.category === 'Management' || s.stream_code === 'MANAGEMENT');
  const degree = allStaff.filter(s => s.stream_code === 'DEGREE');
  const inter = allStaff.filter(s => s.stream_code === 'INTER');
  const both = allStaff.filter(s => s.stream_code === 'BOTH' && s.category !== 'Management');

  let html = `<option value="">-- Click here to select your name --</option>`;

  if (management.length > 0) {
    html += `<optgroup label="👑 Management (${management.length})">`;
    management.forEach(s => {
      html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="Management" data-stream="MANAGEMENT">
        👑 ${s.name} (Management)
      </option>`;
    });
    html += `</optgroup>`;
  }

  html += `<optgroup label="Degree Teaching Faculty (${degree.length})">`;
  degree.forEach(s => {
    html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
      #${s.sl_no} - ${s.name} (Degree)
    </option>`;
  });
  html += `</optgroup>`;

  html += `<optgroup label="Intermediate Teaching Faculty (${inter.length})">`;
  inter.forEach(s => {
    html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
      #${s.sl_no} - ${s.name} (Inter)
    </option>`;
  });
  html += `</optgroup>`;

  if (both.length > 0) {
    html += `<optgroup label="Both Wings Teaching Faculty (${both.length})">`;
    both.forEach(s => {
      html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
        #${s.sl_no} - ${s.name} (Both)
      </option>`;
    });
    html += `</optgroup>`;
  }

  select.innerHTML = html;
}

// When evaluator selects their own name
function onEvaluatorSelected() {
  const select = document.getElementById("fac-evaluator-select");
  const selectedOption = select.options[select.selectedIndex];
  const draftBanner = document.getElementById("step1-draft-banner");
  const draftText = document.getElementById("step1-draft-text");
  const phoneInput = document.getElementById("fac-phone");
  const deptInput = document.getElementById("fac-dept-group");

  if (!selectedOption || !selectedOption.value) {
    if (draftBanner) draftBanner.classList.add("hidden");
    return;
  }

  const evaluatorSl = parseInt(selectedOption.value);
  const streamCode = selectedOption.getAttribute("data-stream");
  const category = selectedOption.getAttribute("data-category");

  // Check if a saved draft exists for this faculty member
  const draftKey = `ST_ANNS_DRAFT_${evaluatorSl}`;
  const savedDraftRaw = localStorage.getItem(draftKey);
  let hasDraft = false;

  if (savedDraftRaw) {
    try {
      const savedDraft = JSON.parse(savedDraftRaw);
      const evalCount = savedDraft.evaluationsState ? Object.keys(savedDraft.evaluationsState).length : 0;
      if (evalCount > 0) {
        hasDraft = true;
        if (draftBanner && draftText) {
          draftText.innerHTML = `<strong>Draft Found:</strong> You have an in-progress evaluation with <strong>${evalCount} colleagues</strong> saved. Proceeding will resume your session.`;
          draftBanner.classList.remove("hidden");
        }
        if (savedDraft.evaluator) {
          if (phoneInput && savedDraft.evaluator.phone) phoneInput.value = savedDraft.evaluator.phone;
          if (deptInput && savedDraft.evaluator.department) deptInput.value = savedDraft.evaluator.department;
          if (savedDraft.evaluator.stream) {
            const r = document.querySelector(`input[name="fac-stream"][value="${savedDraft.evaluator.stream}"]`);
            if (r) r.checked = true;
          }
        }
      }
    } catch (e) {
      console.warn("Draft parse error:", e);
    }
  }

  if (!hasDraft && draftBanner) {
    draftBanner.classList.add("hidden");
  }

  // Auto-handle Management
  if (category === "Management" || streamCode === "MANAGEMENT") {
    const bothRadio = document.querySelector('input[name="fac-stream"][value="Both"]');
    if (bothRadio) bothRadio.checked = true;
    if (deptInput && !deptInput.value) deptInput.value = "Management";
  } else if (!hasDraft) {
    let streamRadioVal = "Degree";
    if (streamCode === 'INTER') streamRadioVal = "Intermediate";
    else if (streamCode === 'BOTH' || streamCode === 'ALL') streamRadioVal = "Degree";

    const radio = document.querySelector(`input[name="fac-stream"][value="${streamRadioVal}"]`);
    if (radio) radio.checked = true;
  }

  if (phoneInput && !phoneInput.value) phoneInput.focus();
}

// Clear draft if faculty wants to start over
function clearCurrentDraft() {
  const select = document.getElementById("fac-evaluator-select");
  if (!select || !select.value) return;
  const evaluatorSl = parseInt(select.value);
  if (confirm("Are you sure you want to discard your saved draft and start fresh?")) {
    localStorage.removeItem(`ST_ANNS_DRAFT_${evaluatorSl}`);
    evaluationsState = {};
    const draftBanner = document.getElementById("step1-draft-banner");
    if (draftBanner) draftBanner.classList.add("hidden");
    alert("Draft cleared. You can start a fresh appraisal.");
  }
}

// Switch stream in form
function onStreamChange() {
  const selectedStream = document.querySelector('input[name="fac-stream"]:checked')?.value || "Degree";
  if (currentEvaluator) currentEvaluator.stream = selectedStream;
}

// Proceed from Step 1 to Step 2
async function goToStep2() {
  const select = document.getElementById("fac-evaluator-select");
  const selectedOption = select.options[select.selectedIndex];
  const phoneInput = document.getElementById("fac-phone").value.trim();
  const streamInput = document.querySelector('input[name="fac-stream"]:checked')?.value || "Degree";
  const deptInput = document.getElementById("fac-dept-group").value.trim();
  const errDiv = document.getElementById("step1-error");
  const errText = document.getElementById("step1-error-text");
  const nextBtn = document.getElementById("btn-next-step");

  if (!selectedOption || !selectedOption.value) {
    errText.textContent = "Please select your name from the staff list.";
    errDiv.classList.remove("hidden");
    return;
  }

  const cleanPhone = phoneInput.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    errText.textContent = "Please enter a valid 10-digit mobile phone number.";
    errDiv.classList.remove("hidden");
    return;
  }

  if (!deptInput) {
    errText.textContent = "Please manually enter your Department / Subject.";
    errDiv.classList.remove("hidden");
    return;
  }

  const evaluatorSl = parseInt(selectedOption.value);
  const evaluatorName = selectedOption.getAttribute("data-name");
  const evaluatorCategory = selectedOption.getAttribute("data-category");
  const isManagement = evaluatorCategory === "Management";

  // Check duplicate submission for BOTH Faculty Name AND Mobile Phone
  nextBtn.disabled = true;
  nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying Submission Status...`;
  errDiv.classList.add("hidden");

  try {
    const dupCheck = await DataProvider.isEvaluatorAlreadySubmitted({
      name: evaluatorName,
      phone: cleanPhone,
      faculty_id: evaluatorSl
    });

    if (dupCheck.submitted) {
      errText.textContent = dupCheck.reason;
      errDiv.classList.remove("hidden");
      nextBtn.disabled = false;
      nextBtn.innerHTML = `<span>Proceed to Colleague / Peer Feedback</span> <i class="fa-solid fa-arrow-right text-xs"></i>`;
      return;
    }
  } catch (err) {
    console.warn("Check skipped due to network/mode:", err);
  }

  nextBtn.disabled = false;
  nextBtn.innerHTML = `<span>Proceed to Colleague / Peer Feedback</span> <i class="fa-solid fa-arrow-right text-xs"></i>`;

  // Save current evaluator state
  currentEvaluator = {
    faculty_id: evaluatorSl,
    name: evaluatorName,
    phone: cleanPhone,
    stream: isManagement ? (streamInput || "Both") : streamInput,
    department: deptInput,
    category: evaluatorCategory,
    isManagement: isManagement
  };

  // Update Display Banner
  document.getElementById("display-fac-name").textContent = currentEvaluator.name;
  document.getElementById("display-fac-id").textContent = `📱 ${currentEvaluator.phone}`;
  if (isManagement) {
    document.getElementById("display-fac-dept").innerHTML = `<span class="text-purple-600 font-bold">👑 Management</span> • ${currentEvaluator.stream === 'Both' ? 'All Teaching Faculty' : currentEvaluator.stream + ' Wing'} Evaluation`;
  } else {
    document.getElementById("display-fac-dept").textContent = `${currentEvaluator.stream} Wing • ${currentEvaluator.department}`;
  }

  // Filter Colleagues according to strict wing rules:
  // 1. Never evaluate management sisters
  // 2. Never evaluate self
  // 3. Degree Evaluator -> sees all Degree & Both teaching faculty (37 colleagues)
  // 4. Inter Evaluator -> sees all Inter & Both teaching faculty (22 colleagues)
  // 5. Management Evaluator -> sees all 55 teaching faculty
  eligibleColleagues = allStaff.filter(s => {
    if (s.category === 'Management' || s.stream_code === 'MANAGEMENT') return false;
    if (s.sl_no === evaluatorSl) return false;

    if (currentEvaluator.stream === "Degree") {
      return s.stream_code === 'DEGREE' || s.stream_code === 'BOTH';
    } else if (currentEvaluator.stream === "Intermediate") {
      return s.stream_code === 'INTER' || s.stream_code === 'BOTH';
    }
    return true; // Both sees all teaching colleagues (all 55)
  });

  // Load saved draft if present
  evaluationsState = {};
  editingFacultyIds = new Set();
  const draftKey = `ST_ANNS_DRAFT_${currentEvaluator.faculty_id}`;
  const savedDraftRaw = localStorage.getItem(draftKey);
  if (savedDraftRaw) {
    try {
      const savedDraft = JSON.parse(savedDraftRaw);
      if (savedDraft.evaluationsState) {
        evaluationsState = savedDraft.evaluationsState;
      }
    } catch (e) {
      console.warn("Draft restore error:", e);
    }
  }

  currentCompletionTab = "ALL";
  const mandBadge = document.getElementById("mandatory-stream-badge");
  if (mandBadge) mandBadge.textContent = `Mandatory: Complete All ${eligibleColleagues.length}`;

  renderFacultyCards();

  // Transition views
  document.getElementById("step-faculty-info").classList.add("hidden");
  document.getElementById("step-faculty-eval").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to Step 1
function backToStep1() {
  saveDraftState();
  document.getElementById("step-faculty-eval").classList.add("hidden");
  document.getElementById("step-faculty-info").classList.remove("hidden");
}

// Set completion filter tab ('ALL', 'PENDING', 'COMPLETED')
function setCompletionTab(tab) {
  currentCompletionTab = tab;
  ["ALL", "PENDING", "COMPLETED"].forEach(t => {
    const el = document.getElementById(`tab-comp-${t}`);
    if (!el) return;
    if (t === tab) {
      el.className = "px-2.5 py-1 rounded-lg bg-white text-indigo-700 shadow-xs font-bold";
    } else {
      el.className = "px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900";
    }
  });
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Save draft locally to localStorage
function saveDraftState() {
  if (!currentEvaluator || !currentEvaluator.faculty_id) return;
  const draft = {
    evaluator: currentEvaluator,
    evaluationsState: evaluationsState,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(`ST_ANNS_DRAFT_${currentEvaluator.faculty_id}`, JSON.stringify(draft));
}

// Render colleague cards
function renderFacultyCards(searchFilter = "") {
  const container = document.getElementById("faculty-cards-container");
  const searchQuery = (searchFilter || "").toLowerCase().trim();

  let filtered = eligibleColleagues.filter(f => {
    const nameMatch = f.name.toLowerCase().includes(searchQuery);
    if (!nameMatch) return false;

    const ratings = evaluationsState[f.sl_no] || {};
    const isComplete = Object.keys(ratings).length === 7;

    if (currentCompletionTab === "PENDING" && isComplete) return false;
    if (currentCompletionTab === "COMPLETED" && !isComplete) return false;

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-400 space-y-2">
        <i class="fa-regular fa-folder-open text-3xl text-slate-300 block"></i>
        <p class="text-sm font-semibold text-slate-600">No colleague records found matching filter.</p>
        <p class="text-xs text-slate-400">Try clearing your search or switching filter tabs.</p>
      </div>
    `;
    updateStatusSummary();
    return;
  }

  const cardsHtml = filtered.map(colleague => {
    const facultyId = colleague.sl_no;
    const currentRatings = evaluationsState[facultyId] || {};
    const answeredCount = Object.keys(currentRatings).length;
    const isComplete = answeredCount === 7;
    const isEditing = editingFacultyIds.has(facultyId);

    // Calculate current total
    let currentScore = 0;
    Object.values(currentRatings).forEach(m => currentScore += m);

    // Category styling
    let catBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (colleague.stream_code === "DEGREE") catBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    else if (colleague.stream_code === "INTER") catBadgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    else if (colleague.stream_code === "BOTH") catBadgeClass = "bg-blue-50 text-blue-700 border-blue-200";

    // Card border and background
    let cardBorder = "border-slate-200 bg-white";
    if (isComplete && !isEditing) {
      cardBorder = "border-emerald-300 bg-emerald-50/20";
    }

    return `
      <div id="card-colleague-${facultyId}" class="rounded-2xl border ${cardBorder} p-4 sm:p-5 shadow-xs transition space-y-3">

        <!-- Card Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div class="flex items-center space-x-2.5">
            <div class="w-8 h-8 rounded-full ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-bold text-xs">
              ${isComplete ? '<i class="fa-solid fa-check"></i>' : `#${colleague.sl_no}`}
            </div>
            <div>
              <h4 class="font-bold text-slate-900 text-sm leading-snug">${colleague.name}</h4>
              <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadgeClass}">
                ${colleague.category}
              </span>
            </div>
          </div>

          <!-- Status & Action Buttons -->
          <div class="flex items-center space-x-2">
            ${isComplete && !isEditing ? `
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                <i class="fa-solid fa-lock text-[10px]"></i>
                <span>✓ Completed (${currentScore}/28)</span>
              </span>
              <button type="button" onclick="toggleEditCard(${facultyId})"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition">
                <i class="fa-solid fa-pen text-[10px] mr-1"></i>Edit
              </button>
            ` : `
              <span class="text-xs font-bold px-2.5 py-1 rounded-lg ${isComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'}">
                ${isComplete ? `Score: ${currentScore} / 28` : `${answeredCount} / 7 Criteria Rated`}
              </span>
              <button type="button" onclick="quickRateAll(${facultyId}, 4)" title="Rate all criteria Excellent"
                class="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-emerald-50 hover:text-emerald-700 text-indigo-700 border border-indigo-200 transition font-medium">
                🌟 All Excellent
              </button>
              ${isComplete && isEditing ? `
                <button type="button" onclick="toggleEditCard(${facultyId})"
                  class="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold transition">
                  Done
                </button>
              ` : ''}
            `}
          </div>
        </div>

        <!-- 7 Questions Evaluation Grid (Collapsed if complete and not editing) -->
        <div id="questions-grid-${facultyId}" class="${isComplete && !isEditing ? 'hidden' : ''} space-y-2.5 pt-1">
          ${EVALUATION_QUESTIONS.map(q => {
            const selectedVal = currentRatings[q.id];
            return `
              <div class="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div class="text-xs">
                  <span class="font-bold text-slate-800">${q.title}</span>
                  <span class="text-[11px] text-slate-500 block sm:inline sm:ml-1 sm:text-slate-400">(${q.desc})</span>
                </div>

                <!-- 3 Options (4, 3, 2) -->
                <div class="flex items-center space-x-1.5 flex-shrink-0">
                  ${RATING_SCALE.map(rate => {
                    const isChecked = selectedVal === rate.marks;
                    let btnColor = "bg-white border-slate-200 text-slate-600 hover:border-slate-300";
                    if (isChecked) {
                      if (rate.marks === 4) btnColor = "bg-emerald-600 border-emerald-600 text-white shadow-xs font-bold";
                      else if (rate.marks === 3) btnColor = "bg-blue-600 border-blue-600 text-white shadow-xs font-bold";
                      else if (rate.marks === 2) btnColor = "bg-amber-500 border-amber-500 text-white shadow-xs font-bold";
                    }
                    return `
                      <button type="button" onclick="setRating(${facultyId}, '${q.id}', ${rate.marks})"
                        class="px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition cursor-pointer ${btnColor}">
                        <span>${rate.icon}</span>
                        <span>${rate.label}</span>
                        <span class="text-[10px] opacity-80">(${rate.marks}m)</span>
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

      </div>
    `;
  }).join('');

  container.innerHTML = cardsHtml;
  updateStatusSummary();
}

// Toggle edit mode for a completed card
function toggleEditCard(facultyId) {
  if (editingFacultyIds.has(facultyId)) {
    editingFacultyIds.delete(facultyId);
  } else {
    editingFacultyIds.add(facultyId);
  }
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Quick rate all questions for a colleague (Sets all to 4 marks)
function quickRateAll(facultyId, marks) {
  evaluationsState[facultyId] = {
    q1: marks,
    q2: marks,
    q3: marks,
    q4: marks,
    q5: marks,
    q6: marks,
    q7: marks
  };
  editingFacultyIds.delete(facultyId); // Automatically collapse once complete
  saveDraftState();
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Set rating for a specific question
function setRating(facultyId, qId, marks) {
  if (!evaluationsState[facultyId]) evaluationsState[facultyId] = {};
  evaluationsState[facultyId][qId] = marks;

  // If all 7 criteria just got completed, auto-collapse
  if (Object.keys(evaluationsState[facultyId]).length === 7) {
    editingFacultyIds.delete(facultyId);
  }

  saveDraftState();
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Search filter
function filterFacultyCards() {
  const query = document.getElementById("faculty-search").value;
  renderFacultyCards(query);
}

// Update bottom sticky bar status & progress
function updateStatusSummary() {
  const requiredTotal = eligibleColleagues.length;
  let completeCount = 0;

  eligibleColleagues.forEach(c => {
    const ratings = evaluationsState[c.sl_no] || {};
    if (Object.keys(ratings).length === 7) completeCount++;
  });

  const remainingCount = requiredTotal - completeCount;
  const pct = requiredTotal > 0 ? Math.round((completeCount / requiredTotal) * 100) : 0;

  // Update numbers
  document.getElementById("eval-progress-count").textContent = completeCount;
  document.getElementById("eval-total-count").textContent = `/ ${requiredTotal} Required`;
  document.getElementById("eval-progress-percent").textContent = `${pct}% Completed (${completeCount}/${requiredTotal})`;
  document.getElementById("eval-progress-bar").style.width = `${pct}%`;

  // Update tabs counters
  const tabAll = document.getElementById("count-tab-all");
  const tabPend = document.getElementById("count-tab-pending");
  const tabComp = document.getElementById("count-tab-completed");
  if (tabAll) tabAll.textContent = requiredTotal;
  if (tabPend) tabPend.textContent = remainingCount;
  if (tabComp) tabComp.textContent = completeCount;

  // Update Submit button & Status message
  const statusMsg = document.getElementById("eval-status-msg");
  const statusText = document.getElementById("eval-status-text");
  const submitBtn = document.getElementById("btn-submit-feedback");
  const btnIcon = document.getElementById("btn-submit-icon");
  const btnLabel = document.getElementById("btn-submit-label");

  if (completeCount < requiredTotal) {
    statusMsg.className = "text-amber-300 text-[11px] font-medium flex items-center space-x-1.5";
    statusText.textContent = `Mandatory: Complete all ${requiredTotal} colleagues (${remainingCount} remaining)`;
    submitBtn.disabled = true;
    submitBtn.className = "w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-700 text-slate-400 font-bold text-xs shadow-md transition flex items-center justify-center space-x-2 opacity-50 cursor-not-allowed";
    btnIcon.className = "fa-solid fa-lock text-[11px]";
    btnLabel.textContent = `Submit Locked (${remainingCount} Remaining)`;
  } else {
    statusMsg.className = "text-emerald-400 text-[11px] font-bold flex items-center space-x-1.5";
    statusText.textContent = `✓ All ${requiredTotal} colleagues completed! Ready to submit.`;
    submitBtn.disabled = false;
    submitBtn.className = "w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/30 transition flex items-center justify-center space-x-2 cursor-pointer animate-pulse";
    btnIcon.className = "fa-solid fa-paper-plane text-[11px]";
    btnLabel.textContent = "Submit Final Appraisal";
  }
}

// Submit final peer feedback (Mandatory 100% check)
async function submitFinalFeedback() {
  const submitBtn = document.getElementById("btn-submit-feedback");

  // Validate 100% completion
  const requiredTotal = eligibleColleagues.length;
  let incompleteColleagues = [];

  eligibleColleagues.forEach(c => {
    const ratings = evaluationsState[c.sl_no] || {};
    if (Object.keys(ratings).length < 7) {
      incompleteColleagues.push(c.name);
    }
  });

  if (incompleteColleagues.length > 0) {
    alert(`Submission Incomplete!\n\nYou must complete ratings for all ${requiredTotal} colleagues in your wing.\n\nRemaining (${incompleteColleagues.length}):\n- ` + incompleteColleagues.slice(0, 5).join("\n- ") + (incompleteColleagues.length > 5 ? `\n...and ${incompleteColleagues.length - 5} more.` : ""));
    setCompletionTab("PENDING");
    return;
  }

  // Format evaluations payload
  const evaluations = eligibleColleagues.map(c => {
    const ratings = evaluationsState[c.sl_no];
    const total_score = ratings.q1 + ratings.q2 + ratings.q3 + ratings.q4 + ratings.q5 + ratings.q6 + ratings.q7;
    const percentage = ((total_score / 28) * 100).toFixed(2);
    return {
      faculty_id: c.sl_no,
      faculty_name: c.name,
      ratings: ratings,
      total_score: total_score,
      percentage: percentage
    };
  });

  if (!confirm(`Confirm Final Submission?\n\nYou are submitting complete performance appraisals for all ${evaluations.length} colleagues.\n\nOnce submitted, your ratings cannot be modified.`)) {
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Appraisals...`;

  try {
    const result = await DataProvider.submitFeedback({
      evaluator: currentEvaluator,
      evaluations: evaluations
    });

    if (result.success) {
      // Clear local draft upon successful submission
      localStorage.removeItem(`ST_ANNS_DRAFT_${currentEvaluator.faculty_id}`);

      // Show success modal
      document.getElementById("conf-name").textContent = currentEvaluator.name;
      document.getElementById("conf-roll").textContent = `SL#${currentEvaluator.faculty_id} (${currentEvaluator.phone})`;
      document.getElementById("conf-count").textContent = `${evaluations.length} Colleagues Rated (100% Complete)`;
      document.getElementById("conf-time").textContent = new Date().toLocaleString('en-IN');
      document.getElementById("modal-success").classList.remove("hidden");
    }
  } catch (err) {
    console.error("Submission failed:", err);
    alert("Submission Error: " + (err.message || "Failed to save appraisals. Please try again."));
    submitBtn.disabled = false;
    updateStatusSummary();
  }
}
