// ================================================================
// ST. ANN'S COLLEGE FOR WOMEN - FACULTY & STAFF PEER APPRAISAL LOGIC
// ================================================================

// State
let currentEvaluator = {
  faculty_id: null,
  name: "",
  phone: "",
  stream: "Degree",
  department: ""
};

let allStaff = [];
let eligibleColleagues = [];
let evaluationsState = {}; // { faculty_id: { q1: 4, q2: 3, ... } }
let activeFacultyIds = new Set(); // IDs of colleagues chosen to evaluate
let currentCategoryFilter = "ALL"; // Quick filter for colleagues list

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    allStaff = await DataProvider.getFacultyList();
    console.log(`Loaded ${allStaff.length} staff members.`);
    populateEvaluatorDropdown();
  } catch (err) {
    console.error("Failed to load staff list:", err);
  }
});

// Populate evaluating faculty dropdown
function populateEvaluatorDropdown() {
  const select = document.getElementById("fac-evaluator-select");
  if (!select) return;

  // Group by category for clarity
  const teaching = allStaff.filter(s => s.category.includes('Teaching'));
  const office = allStaff.filter(s => s.category === 'Office Staff');
  const other = allStaff.filter(s => s.category === 'Administration' || s.category === 'Add Course');

  let html = `<option value="">-- Choose Your Name from Staff List --</option>`;

  html += `<optgroup label="Teaching Faculty (${teaching.length})">`;
  teaching.forEach(s => {
    html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
      #${s.sl_no} - ${s.name} (${s.category})
    </option>`;
  });
  html += `</optgroup>`;

  html += `<optgroup label="Office Staff (${office.length})">`;
  office.forEach(s => {
    html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
      #${s.sl_no} - ${s.name} (Office)
    </option>`;
  });
  html += `</optgroup>`;

  if (other.length > 0) {
    html += `<optgroup label="Administration & Add Course (${other.length})">`;
    other.forEach(s => {
      html += `<option value="${s.sl_no}" data-name="${s.name}" data-category="${s.category}" data-stream="${s.stream_code}">
        #${s.sl_no} - ${s.name} (${s.category})
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
  if (!selectedOption || !selectedOption.value) return;

  const streamCode = selectedOption.getAttribute("data-stream");

  // Auto-select stream
  let streamRadioVal = "Degree";
  if (streamCode === 'INTER') streamRadioVal = "Intermediate";
  else if (streamCode === 'BOTH' || streamCode === 'ALL') streamRadioVal = "Degree"; // default to Degree for common staff

  const radio = document.querySelector(`input[name="fac-stream"][value="${streamRadioVal}"]`);
  if (radio) radio.checked = true;

  // Focus phone input
  const phoneInput = document.getElementById("fac-phone");
  if (phoneInput && !phoneInput.value) phoneInput.focus();
}

// Switch stream in form
function onStreamChange() {
  const selectedStream = document.querySelector('input[name="fac-stream"]:checked')?.value || "Degree";
  currentEvaluator.stream = selectedStream;
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

  // Validate phone number
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

  // Check duplicate submission for this phone number
  nextBtn.disabled = true;
  nextBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Verifying Phone...`;
  errDiv.classList.add("hidden");

  try {
    const isSubmitted = await DataProvider.isRollNumberSubmitted(cleanPhone);
    if (isSubmitted) {
      errText.textContent = `Phone number "${cleanPhone}" has already submitted appraisal! Each faculty member can only submit once.`;
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
    stream: streamInput,
    department: deptInput
  };

  // Update Display Banner
  document.getElementById("display-fac-name").textContent = currentEvaluator.name;
  document.getElementById("display-fac-id").textContent = `📱 ${currentEvaluator.phone}`;
  document.getElementById("display-fac-dept").textContent = `${currentEvaluator.stream} Wing • ${currentEvaluator.department}`;

  // Filter Colleagues:
  // 1. MUST EXCLUDE SELF (evaluator cannot rate herself/himself)
  // 2. If evaluator is Degree: shows Degree Teaching + Both Teaching + All Non-Teaching + All Office Staff + Admin/Add Course
  // 3. If evaluator is Inter: shows Inter Teaching + Both Teaching + All Non-Teaching + All Office Staff + Admin/Add Course
  // 4. If evaluator is Both: shows all staff
  eligibleColleagues = allStaff.filter(s => {
    // Exclude self
    if (s.sl_no === evaluatorSl) return false;

    if (currentEvaluator.stream === "Degree") {
      return s.stream_code === 'DEGREE' || s.stream_code === 'BOTH' || s.stream_code === 'ALL';
    } else if (currentEvaluator.stream === "Intermediate") {
      return s.stream_code === 'INTER' || s.stream_code === 'BOTH' || s.stream_code === 'ALL';
    }
    return true; // Both sees everyone
  });

  // Reset evaluations & active selections
  evaluationsState = {};
  activeFacultyIds = new Set();
  currentCategoryFilter = "ALL";

  renderFacultyCards();

  // Transition views
  document.getElementById("step-faculty-info").classList.add("hidden");
  document.getElementById("step-faculty-eval").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Back to Step 1
function backToStep1() {
  document.getElementById("step-faculty-eval").classList.add("hidden");
  document.getElementById("step-faculty-info").classList.remove("hidden");
}

// Set category sub-filter for colleague cards
function setColleagueCategory(cat) {
  currentCategoryFilter = cat;
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Render colleague cards
function renderFacultyCards(searchFilter = "") {
  const container = document.getElementById("faculty-cards-container");

  let filtered = eligibleColleagues.filter(f => 
    f.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Category sub-filtering
  if (currentCategoryFilter === "TEACHING") {
    filtered = filtered.filter(f => f.category.includes('Teaching'));
  } else if (currentCategoryFilter === "OFFICE") {
    filtered = filtered.filter(f => f.category === 'Office Staff');
  } else if (currentCategoryFilter === "NON_TEACHING") {
    filtered = filtered.filter(f => f.category === 'Non-Teaching');
  } else if (currentCategoryFilter === "ADMIN") {
    filtered = filtered.filter(f => f.category === 'Administration' || f.category === 'Add Course');
  }

  // Build filter pills at top
  const teachingCount = eligibleColleagues.filter(f => f.category.includes('Teaching')).length;
  const officeCount = eligibleColleagues.filter(f => f.category === 'Office Staff').length;
  const nonTeachingCount = eligibleColleagues.filter(f => f.category === 'Non-Teaching').length;
  const otherCount = eligibleColleagues.filter(f => f.category === 'Administration' || f.category === 'Add Course').length;

  let filterBarHtml = `
    <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs font-semibold no-scrollbar">
      <button onclick="setColleagueCategory('ALL')"
        class="px-3 py-1.5 rounded-xl border transition ${currentCategoryFilter === 'ALL' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        All Applicable (${eligibleColleagues.length})
      </button>
      <button onclick="setColleagueCategory('TEACHING')"
        class="px-3 py-1.5 rounded-xl border transition ${currentCategoryFilter === 'TEACHING' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        Teaching (${teachingCount})
      </button>
      <button onclick="setColleagueCategory('OFFICE')"
        class="px-3 py-1.5 rounded-xl border transition ${currentCategoryFilter === 'OFFICE' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        Office (${officeCount})
      </button>
      <button onclick="setColleagueCategory('NON_TEACHING')"
        class="px-3 py-1.5 rounded-xl border transition ${currentCategoryFilter === 'NON_TEACHING' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        Non-Teaching (${nonTeachingCount})
      </button>
      <button onclick="setColleagueCategory('ADMIN')"
        class="px-3 py-1.5 rounded-xl border transition ${currentCategoryFilter === 'ADMIN' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}">
        Admin & Add Course (${otherCount})
      </button>
    </div>
  `;

  if (filtered.length === 0) {
    container.innerHTML = filterBarHtml + `
      <div class="bg-white p-8 rounded-2xl text-center border border-slate-200 text-slate-400 mt-3">
        <i class="fa-regular fa-folder-open text-3xl mb-2"></i>
        <p class="text-sm font-semibold">No staff members found matching criteria.</p>
      </div>
    `;
    return;
  }

  const cardsHtml = filtered.map(fac => {
    const isSelected = activeFacultyIds.has(fac.id || fac.sl_no);
    const facultyId = fac.id || fac.sl_no;
    const currentRatings = evaluationsState[facultyId] || {};
    const answeredCount = Object.keys(currentRatings).length;
    const isComplete = answeredCount === 7;
    const currentScore = Object.values(currentRatings).reduce((a, b) => a + b, 0);

    // Badge styling
    let badgeClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (fac.category.includes("Degree Teaching")) {
      badgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200";
    } else if (fac.category.includes("Intermediate Teaching")) {
      badgeClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (fac.category.includes("Both")) {
      badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
    } else if (fac.category === "Office Staff") {
      badgeClass = "bg-teal-50 text-teal-700 border-teal-200";
    } else if (fac.category === "Non-Teaching") {
      badgeClass = "bg-slate-100 text-slate-700 border-slate-300";
    } else if (fac.category === "Administration") {
      badgeClass = "bg-purple-50 text-purple-700 border-purple-200";
    } else if (fac.category === "Add Course") {
      badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    return `
      <div id="faculty-card-${facultyId}" class="bg-white rounded-2xl p-4 sm:p-5 border ${isSelected ? (isComplete ? 'border-emerald-300 ring-1 ring-emerald-300' : 'border-indigo-300 ring-1 ring-indigo-200') : 'border-slate-200/80'} shadow-xs transition space-y-4">
        
        <!-- Header row -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div class="flex items-center space-x-3">
            <input type="checkbox" id="fac-toggle-${facultyId}" ${isSelected ? 'checked' : ''} 
              onchange="toggleFacultyActive(${facultyId})"
              class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer">
            <div>
              <div class="flex items-center space-x-2">
                <span class="text-xs font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">#${fac.sl_no}</span>
                <label for="fac-toggle-${facultyId}" class="text-sm sm:text-base font-bold text-slate-900 cursor-pointer hover:text-indigo-600">${fac.name}</label>
              </div>
              <div class="flex items-center space-x-1.5 mt-0.5">
                <span class="inline-block text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${badgeClass}">
                  ${fac.category}
                </span>
                ${fac.designation && fac.designation !== 'Teaching Faculty' ? `<span class="text-[10px] text-slate-400 font-medium">• ${fac.designation}</span>` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <span id="badge-score-${facultyId}" class="text-xs font-bold px-2.5 py-1 rounded-lg ${isComplete ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}">
              ${isComplete ? `Score: ${currentScore} / 28` : (isSelected ? `${answeredCount}/7 Rated` : 'Click to Rate')}
            </span>
            ${isSelected ? `
              <button onclick="quickRateAll(${facultyId}, 4)" title="Rate all criteria Excellent"
                class="text-[11px] px-2 py-1 rounded bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-500 border border-slate-200 transition">
                🌟 All Excellent
              </button>
            ` : ''}
          </div>
        </div>

        <!-- 7 Questions Evaluation Grid (Shown if selected) -->
        <div id="questions-grid-${facultyId}" class="${isSelected ? '' : 'hidden'} space-y-3 pt-1">
          ${EVALUATION_QUESTIONS.map(q => {
            const selectedVal = currentRatings[q.id];
            return `
              <div class="p-2.5 rounded-xl bg-slate-50/60 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
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
                      if (rate.marks === 4) btnColor = "bg-emerald-600 border-emerald-600 text-white shadow-xs";
                      else if (rate.marks === 3) btnColor = "bg-blue-600 border-blue-600 text-white shadow-xs";
                      else if (rate.marks === 2) btnColor = "bg-amber-500 border-amber-500 text-white shadow-xs";
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

  container.innerHTML = filterBarHtml + `<div class="space-y-4 mt-3">${cardsHtml}</div>`;
  updateStatusSummary();
}

// Toggle whether evaluating this colleague
function toggleFacultyActive(facultyId) {
  if (activeFacultyIds.has(facultyId)) {
    activeFacultyIds.delete(facultyId);
    delete evaluationsState[facultyId];
  } else {
    activeFacultyIds.add(facultyId);
    if (!evaluationsState[facultyId]) evaluationsState[facultyId] = {};
  }
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Quick rate all questions for a colleague
function quickRateAll(facultyId, marks) {
  if (!activeFacultyIds.has(facultyId)) activeFacultyIds.add(facultyId);
  evaluationsState[facultyId] = {
    q1: marks,
    q2: marks,
    q3: marks,
    q4: marks,
    q5: marks,
    q6: marks,
    q7: marks
  };
  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Set rating for a specific question
function setRating(facultyId, qId, marks) {
  if (!activeFacultyIds.has(facultyId)) activeFacultyIds.add(facultyId);
  if (!evaluationsState[facultyId]) evaluationsState[facultyId] = {};
  evaluationsState[facultyId][qId] = marks;

  renderFacultyCards(document.getElementById("faculty-search").value);
}

// Search filter
function filterFacultyCards() {
  const query = document.getElementById("faculty-search").value;
  renderFacultyCards(query);
}

// Update bottom sticky bar status
function updateStatusSummary() {
  const totalActive = activeFacultyIds.size;
  let completeCount = 0;

  activeFacultyIds.forEach(id => {
    const ratings = evaluationsState[id] || {};
    if (Object.keys(ratings).length === 7) completeCount++;
  });

  document.getElementById("eval-progress-count").textContent = completeCount;
  document.getElementById("eval-total-count").textContent = `/ ${totalActive} Selected`;

  const msg = document.getElementById("eval-status-msg");
  const submitBtn = document.getElementById("btn-submit-feedback");

  if (totalActive === 0) {
    msg.textContent = "Please select at least 1 colleague to rate";
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else if (completeCount < totalActive) {
    msg.textContent = `Incomplete: ${totalActive - completeCount} colleague(s) need all 7 criteria rated`;
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-50", "cursor-not-allowed");
  } else {
    msg.innerHTML = `<span class="text-emerald-400 font-semibold">✓ All selected colleagues fully evaluated!</span>`;
    submitBtn.disabled = false;
    submitBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

// Submit final peer feedback
async function submitFinalFeedback() {
  const submitBtn = document.getElementById("btn-submit-feedback");
  const activeIds = Array.from(activeFacultyIds);

  if (activeIds.length === 0) {
    alert("Please select and evaluate at least one colleague.");
    return;
  }

  // Check completeness
  for (const id of activeIds) {
    const ratings = evaluationsState[id] || {};
    if (Object.keys(ratings).length < 7) {
      const fac = allStaff.find(f => (f.id || f.sl_no) === id);
      alert(`Please answer all 7 criteria for ${fac?.name || 'selected colleague'}.`);
      return;
    }
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Submitting Feedback...`;

  // Build payload
  const evaluations = activeIds.map(id => {
    const fac = allStaff.find(f => (f.id || f.sl_no) === id);
    const ratings = evaluationsState[id];
    const total_score = Object.values(ratings).reduce((a, b) => a + b, 0);
    const percentage = ((total_score / 28) * 100).toFixed(2);

    return {
      faculty_id: id,
      faculty_name: fac.name,
      ratings,
      total_score,
      percentage
    };
  });

  try {
    await DataProvider.submitFeedback({
      evaluator: {
        staff_id: currentEvaluator.phone,
        phone_number: currentEvaluator.phone,
        name: currentEvaluator.name,
        stream: currentEvaluator.stream,
        department_group: currentEvaluator.department
      },
      evaluations
    });

    // Show confirmation modal
    document.getElementById("conf-name").textContent = currentEvaluator.name;
    document.getElementById("conf-roll").textContent = `Phone: ${currentEvaluator.phone}`;
    document.getElementById("conf-count").textContent = `${evaluations.length} Colleagues Evaluated`;
    document.getElementById("conf-time").textContent = new Date().toLocaleString('en-IN');

    document.getElementById("modal-success").classList.remove("hidden");
  } catch (err) {
    alert("Submission Error: " + err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane text-[11px]"></i> <span>Submit Feedback</span>`;
  }
}
