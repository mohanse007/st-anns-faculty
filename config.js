// ================================================================
// ST. ANN'S COLLEGE FOR WOMEN - FACULTY PERFORMANCE FEEDBACK
// CONFIGURATION & SUPABASE / STORAGE CLIENT
// ================================================================

const APP_CONFIG = {
  collegeName: "ST. ANN'S COLLEGE FOR WOMEN (A)",
  collegeAddress: "Malkapuram, Visakhapatnam - 530011",
  academicYear: "2026-2027",
  systemTitle: "Faculty Performance Evaluation System",
  adminPassword: "admin123", // Default admin password, change as desired

  // SUPABASE CREDENTIALS
  supabaseUrl: "https://mxysrybxyoxlfdnvnspo.supabase.co",
  supabaseAnonKey: "sb_publishable_At_lpGpyYCZaN7-Z72bm9Q_qHixUXY2",
};

// Check if credentials are set in localStorage as well (allows setting via UI)
const savedUrl = localStorage.getItem("ST_ANNS_SUPABASE_URL");
const savedKey = localStorage.getItem("ST_ANNS_SUPABASE_KEY");
if (savedUrl) APP_CONFIG.supabaseUrl = savedUrl;
if (savedKey) APP_CONFIG.supabaseAnonKey = savedKey;

// Questions definition (Exact 7 Criteria)
const EVALUATION_QUESTIONS = [
  { id: "q1", title: "1. Inspiring Personality", desc: "Inspires and motivates students with positive attitude, enthusiasm, and ethical role modeling." },
  { id: "q2", title: "2. Pedagogical Excellence", desc: "Mastery of subject, clear explanations, structured delivery, and effective teaching methodology." },
  { id: "q3", title: "3. Innovative Practices", desc: "Use of creative teaching aids, real-world examples, modern tools, and engaging activities." },
  { id: "q4", title: "4. Student Development", desc: "Encourages student participation, clarifies doubts patiently, and supports academic & personal growth." },
  { id: "q5", title: "5. Professional Growth", desc: "Demonstrates up-to-date knowledge, continuous learning, and scholarly commitment to the subject." },
  { id: "q6", title: "6. Contribution to School / College", desc: "Actively supports institutional activities, events, mentoring, discipline, and college ethos." },
  { id: "q7", title: "7. Loyalty & Integrity", desc: "High professional ethics, fairness in evaluation, punctuality, regularity, and institutional loyalty." },
];

const RATING_SCALE = [
  { label: "Excellent", marks: 4, icon: "🌟", color: "emerald" },
  { label: "Good", marks: 3, icon: "👍", color: "blue" },
  { label: "Satisfactory", marks: 2, icon: "🆗", color: "amber" },
];

// Supabase client instance
let supabaseClient = null;
const isSupabaseConfigured = () => {
  return APP_CONFIG.supabaseUrl && APP_CONFIG.supabaseUrl.trim().length > 10 &&
         APP_CONFIG.supabaseAnonKey && APP_CONFIG.supabaseAnonKey.trim().length > 15;
};

if (isSupabaseConfigured() && window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);
    console.log("Connected to live Supabase instance:", APP_CONFIG.supabaseUrl);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
}

// Unified Database Provider (Supabase with seamless LocalStorage Fallback)
const DataProvider = {
  isCloud: () => isSupabaseConfigured() && supabaseClient !== null,

  // Get Faculty List
  async getFacultyList() {
    let list = [];
    if (this.isCloud()) {
      const { data, error } = await supabaseClient
        .from('faculty')
        .select('*')
        .order('sl_no', { ascending: true });
      if (!error && data && data.length > 0) {
        list = data;
      } else {
        console.warn("Supabase fetch returned empty/error, falling back to bundled data:", error);
      }
    }
    if (!list || list.length === 0) {
      if (window.FACULTY_MASTER_DATA) {
        list = [...window.FACULTY_MASTER_DATA];
      } else {
        const resp = await fetch('faculty_data.json');
        list = await resp.json();
      }
    }

    // Ensure Management members from bundled data are present even if not yet inserted into DB
    const bundledMgmt = (window.FACULTY_MASTER_DATA || []).filter(s => s.category === 'Management');
    if (bundledMgmt.length > 0) {
      const existingSlNos = new Set(list.map(s => s.sl_no));
      bundledMgmt.forEach(m => {
        if (!existingSlNos.has(m.sl_no)) {
          list.push(m);
        }
      });
    }

    return list;
  },

  // Check if staff phone or roll number already submitted
  async isRollNumberSubmitted(phoneOrRoll) {
    const cleanKey = (phoneOrRoll || '').trim().toUpperCase();
    if (this.isCloud()) {
      // Check evaluators table by phone
      const { data: evalData } = await supabaseClient
        .from('evaluators')
        .select('phone_number')
        .eq('phone_number', cleanKey)
        .limit(1);
      if (evalData && evalData.length > 0) return true;

      // Fallback check students table
      const { data: stdData } = await supabaseClient
        .from('students')
        .select('roll_number')
        .eq('roll_number', cleanKey)
        .limit(1);
      if (stdData && stdData.length > 0) return true;

      return false;
    }
    // Local storage check
    const localEvaluators = JSON.parse(localStorage.getItem('ST_ANNS_EVALUATORS') || '[]');
    const isEval = localEvaluators.some(e => 
      (e.phone || e.phone_number || e.staff_id || '').trim().toUpperCase() === cleanKey
    );
    if (isEval) return true;

    const localStudents = JSON.parse(localStorage.getItem('ST_ANNS_STUDENTS') || '[]');
    return localStudents.some(s => (s.roll_number || s.phone || '').trim().toUpperCase() === cleanKey);
  },

  // Submit complete faculty peer appraisal
  async submitFeedback({ evaluator, student, evaluations }) {
    const actor = evaluator || student;
    const phone = (actor.phone || actor.phone_number || actor.staff_id || actor.roll_number || '').trim();
    const cleanId = (actor.staff_id || phone || '').trim().toUpperCase();

    if (this.isCloud()) {
      // 1. Fetch or create evaluator record
      let evaluatorId = null;
      let isNewEvaluator = false;

      const { data: existingEval } = await supabaseClient
        .from('evaluators')
        .select('id')
        .eq('phone_number', phone)
        .maybeSingle();

      if (existingEval && existingEval.id) {
        evaluatorId = existingEval.id;
      } else {
        const { data: evaluatorData, error: sErr } = await supabaseClient
          .from('evaluators')
          .insert([{
            phone_number: phone,
            staff_id: cleanId,
            name: actor.name.trim(),
            stream: actor.stream,
            department: actor.department || actor.department_group || actor.group_name || ''
          }])
          .select()
          .single();

        if (sErr) {
          // If already inserted concurrently, re-fetch id
          const { data: retryEval } = await supabaseClient
            .from('evaluators')
            .select('id')
            .eq('phone_number', phone)
            .maybeSingle();
          if (retryEval && retryEval.id) {
            evaluatorId = retryEval.id;
          } else {
            throw new Error("Could not register evaluating faculty: " + (sErr.message || sErr.details));
          }
        } else {
          evaluatorId = evaluatorData.id;
          isNewEvaluator = true;
        }
      }

      // 2. Fetch faculty id mapping to ensure valid foreign keys
      const { data: dbFaculty } = await supabaseClient.from('faculty').select('id, sl_no');
      const facultyIdMap = {};
      if (dbFaculty) {
        dbFaculty.forEach(f => {
          facultyIdMap[f.id] = f.id;
          facultyIdMap[f.sl_no] = f.id;
        });
      }

      // 3. Prepare Feedback rows (matching exact Supabase feedback table schema)
      const feedbackRows = evaluations.map(ev => ({
        evaluator_id: evaluatorId,
        evaluator_phone: phone,
        faculty_id: facultyIdMap[ev.faculty_id] || ev.faculty_id,
        faculty_name: ev.faculty_name,
        stream: actor.stream,
        q1: ev.ratings.q1,
        q2: ev.ratings.q2,
        q3: ev.ratings.q3,
        q4: ev.ratings.q4,
        q5: ev.ratings.q5,
        q6: ev.ratings.q6,
        q7: ev.ratings.q7,
        total_score: ev.total_score,
        percentage: parseFloat(ev.percentage)
      }));

      const { error: fbErr } = await supabaseClient
        .from('feedback')
        .insert(feedbackRows);

      if (fbErr) {
        // Rollback new evaluator record so user can retry cleanly
        if (isNewEvaluator && evaluatorId) {
          try {
            await supabaseClient.from('evaluators').delete().eq('id', evaluatorId);
          } catch (e) {
            console.warn("Rollback failed:", e);
          }
        }
        throw new Error("Could not save ratings: " + (fbErr.message || fbErr.details));
      }
      return { success: true, count: feedbackRows.length, mode: 'cloud' };
    }

    // Local Storage Provider
    const evaluators = JSON.parse(localStorage.getItem('ST_ANNS_EVALUATORS') || localStorage.getItem('ST_ANNS_STUDENTS') || '[]');
    evaluators.push({
      ...actor,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString()
    });
    localStorage.setItem('ST_ANNS_EVALUATORS', JSON.stringify(evaluators));
    localStorage.setItem('ST_ANNS_STUDENTS', JSON.stringify(evaluators));

    const feedback = JSON.parse(localStorage.getItem('ST_ANNS_FEEDBACK') || '[]');
    evaluations.forEach(ev => {
      feedback.push({
        id: 'local-fb-' + Math.random().toString(36).substr(2, 9),
        evaluator_staff_id: cleanId,
        faculty_id: ev.faculty_id,
        faculty_name: ev.faculty_name,
        stream: actor.stream,
        q1: ev.ratings.q1,
        q2: ev.ratings.q2,
        q3: ev.ratings.q3,
        q4: ev.ratings.q4,
        q5: ev.ratings.q5,
        q6: ev.ratings.q6,
        q7: ev.ratings.q7,
        total_score: ev.total_score,
        percentage: parseFloat(ev.percentage),
        created_at: new Date().toISOString()
      });
    });
    localStorage.setItem('ST_ANNS_FEEDBACK', JSON.stringify(feedback));

    return { success: true, count: evaluations.length, mode: 'local' };
  },

  // Get aggregated Leaderboard for Admin
  async getLeaderboard() {
    const rawList = await this.getFacultyList();
    const facultyList = rawList.filter(f => f.category !== 'Management' && f.stream_code !== 'MANAGEMENT');

    let allFeedback = [];
    if (this.isCloud()) {
      const { data, error } = await supabaseClient
        .from('feedback')
        .select('*');
      if (!error && data) allFeedback = data;
    } else {
      allFeedback = JSON.parse(localStorage.getItem('ST_ANNS_FEEDBACK') || '[]');
    }

    // Aggregate by faculty
    const facultyMap = {};
    facultyList.forEach(fac => {
      facultyMap[fac.id || fac.sl_no] = {
        faculty_id: fac.id || fac.sl_no,
        sl_no: fac.sl_no,
        name: fac.name,
        category: fac.category,
        stream_code: fac.stream_code,
        color: fac.color,
        total_evaluations: 0,
        q1_total: 0,
        q2_total: 0,
        q3_total: 0,
        q4_total: 0,
        q5_total: 0,
        q6_total: 0,
        q7_total: 0,
        total_score_sum: 0
      };
    });

    allFeedback.forEach(fb => {
      const target = facultyMap[fb.faculty_id];
      if (target) {
        target.total_evaluations += 1;
        target.q1_total += fb.q1;
        target.q2_total += fb.q2;
        target.q3_total += fb.q3;
        target.q4_total += fb.q4;
        target.q5_total += fb.q5;
        target.q6_total += fb.q6;
        target.q7_total += fb.q7;
        target.total_score_sum += fb.total_score;
      }
    });

    const leaderboard = Object.values(facultyMap).map(fac => {
      const count = fac.total_evaluations;
      const avg_score = count > 0 ? parseFloat((fac.total_score_sum / count).toFixed(2)) : 0;
      const avg_percentage = count > 0 ? parseFloat(((avg_score / 28) * 100).toFixed(2)) : 0;

      let grade = "N/A";
      if (count > 0) {
        if (avg_percentage >= 90) grade = "Outstanding (A+)";
        else if (avg_percentage >= 75) grade = "Very Good (A)";
        else if (avg_percentage >= 60) grade = "Good (B+)";
        else if (avg_percentage >= 50) grade = "Satisfactory (B)";
        else grade = "Needs Improvement (C)";
      }

      return {
        ...fac,
        q1_avg: count > 0 ? parseFloat((fac.q1_total / count).toFixed(2)) : 0,
        q2_avg: count > 0 ? parseFloat((fac.q2_total / count).toFixed(2)) : 0,
        q3_avg: count > 0 ? parseFloat((fac.q3_total / count).toFixed(2)) : 0,
        q4_avg: count > 0 ? parseFloat((fac.q4_total / count).toFixed(2)) : 0,
        q5_avg: count > 0 ? parseFloat((fac.q5_total / count).toFixed(2)) : 0,
        q6_avg: count > 0 ? parseFloat((fac.q6_total / count).toFixed(2)) : 0,
        q7_avg: count > 0 ? parseFloat((fac.q7_total / count).toFixed(2)) : 0,
        avg_score,
        avg_percentage,
        grade
      };
    });

    // Sort descending by avg_score
    leaderboard.sort((a, b) => {
      if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score;
      return b.total_evaluations - a.total_evaluations;
    });

    // Assign overall rank
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    return leaderboard;
  },

  // Get raw evaluator count and details
  async getStudentStats() {
    let evaluators = [];
    if (this.isCloud()) {
      const { data } = await supabaseClient.from('evaluators').select('*');
      if (data && data.length > 0) evaluators = data;
      else {
        const { data: stdData } = await supabaseClient.from('students').select('*');
        if (stdData) evaluators = stdData;
      }
    } else {
      evaluators = JSON.parse(localStorage.getItem('ST_ANNS_EVALUATORS') || localStorage.getItem('ST_ANNS_STUDENTS') || '[]');
    }

    const interCount = evaluators.filter(s => s.stream === 'Intermediate').length;
    const degreeCount = evaluators.filter(s => s.stream === 'Degree').length;
    const bothCount = evaluators.filter(s => s.stream === 'Both').length;
    const managementCount = evaluators.filter(s => s.stream === 'Management' || s.department === 'Management').length;

    return {
      total: evaluators.length,
      intermediate: interCount,
      degree: degreeCount,
      both: bothCount,
      management: managementCount,
      evaluators,
      students: evaluators
    };
  }
};
