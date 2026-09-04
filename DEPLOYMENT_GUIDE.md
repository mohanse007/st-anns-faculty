# 🚀 Deployment & User Guide: St. Ann's Faculty Feedback System

This application is built for **1,000+ Intermediate & Degree students** to evaluate teaching faculty across the **7 core criteria** (Max 28 marks), generate an **instant ranked leaderboard (Top Scorer to End)**, and produce **individual printable PDF/Excel report cards**.

---

## 📁 Project Contents

| File | Purpose |
| :--- | :--- |
| **`index.html`** | **Student Feedback Portal** (Mobile-friendly, stream-filtered, duplicate-safe). |
| **`admin.html`** | **Management & Leaderboard Dashboard** (Rank list, filters, Excel export, reports). |
| **`faculty_report.html`** | **Printable Individual Faculty Report Card** (Institutional letterhead, Q1-Q7 breakdown). |
| **`supabase_schema.sql`** | **1-Click SQL Script** (Creates tables + inserts all 55 teaching faculty). |
| **`faculty_data.js` / `.json`** | Preloaded data of all 55 faculty categorized into Degree, Inter, and Both. |
| **`config.js`** | Configuration & Supabase connector (with offline demo fallback). |
| **`run_local.bat` / `server.py`** | 1-Click local launcher to run and test immediately on your PC/WiFi. |
| **`vercel.json`** | Configuration for 1-click cloud deployment on Vercel. |

---

## ⚡ Step 1: Quick Local Preview (Run Right Now!)

You can test everything on your computer immediately:
1. Double-click **`run_local.bat`** in this folder (or run `python server.py`).
2. Your browser will automatically open `http://localhost:8000`.
3. To view the Admin Leaderboard: click **Admin** in the top right (Password: `admin123`).
4. Click **"Demo Data"** on the admin page to instantly generate 50 sample student evaluations and see the rankings, scores, Excel download, and reports in action!

---

## 🌐 Step 2: Set Up Free Supabase Database (2 Minutes)

To store live submissions from 1,000+ students on their mobile phones:

1. Go to **[supabase.com](https://supabase.com)** and sign in (Free).
2. Click **"New Project"**, give it a name (e.g. `st-anns-feedback`), set a database password, and click **Create Project**.
3. In the left menu, click **"SQL Editor"** (icon: `>_`).
4. Click **"New Query"**, open **`supabase_schema.sql`** from this project, copy all the SQL, paste it in the query window, and click **"Run"** (green button).
   * *This will create all tables, configure security, and automatically insert all 55 teaching faculty!*
5. In the left menu, go to **Project Settings** (gear icon) $\rightarrow$ **API**:
   * Copy the **Project URL** (e.g. `https://xyzabcdef.supabase.co`).
   * Copy the **`anon` `public` Key** (long string).
6. Open **`config.js`** in this project folder and paste the URL and Key:
   ```javascript
   supabaseUrl: "https://xyzabcdef.supabase.co",
   supabaseAnonKey: "eyJhbGciOi...",
   ```
   *(Alternatively, you can also paste them directly into the Admin Dashboard by clicking the "Database Status" button).*

---

## 🚀 Step 3: Deploy to Vercel (Get a Live Public Link in 1 Click)

### Method A: Connect with GitHub (Recommended)
1. Initialize git in this folder and push it to a new GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "St Anns Faculty Feedback System"
   git branch -M main
   # add your remote github url
   git push -u origin main
   ```
2. Go to **[vercel.com](https://vercel.com)** and click **"Add New..." $\rightarrow$ "Project"**.
3. Import your GitHub repository.
4. Leave settings as default and click **"Deploy"**.
5. Within 30 seconds, Vercel gives you a public HTTPS link (e.g., `https://st-anns-faculty-feedback.vercel.app`)!

### Method B: Deploy using Vercel CLI
If you have Node/npm:
```bash
npm install -g vercel
vercel deploy --prod
```

---

## 📱 Step 4: Share with Faculty Members

Send the link to faculty members (via WhatsApp, College Email, or QR Code):
* **`https://st-anns-faculty-feedback.vercel.app`**

### Faculty Evaluator Experience:
1. Faculty selects their name from the **Teaching Staff list** (Staff Sl. No and Wing auto-populate).
2. Selects their **Department / Subject** (includes all 12 Degree courses & Inter subjects). *(Note: Year of study has been removed).*
3. Clicks **"Proceed to Colleague / Peer Feedback"**.
4. The system automatically loads peer faculty members in their wing and **automatically hides the evaluating faculty member** so no one can self-evaluate!
5. Faculty evaluates colleagues across the **7 core criteria** (4, 3, 2 marks) and taps **Submit Peer Appraisal**.
6. Instant confirmation receipt and duplicate submission prevention by Staff ID!

---

## 📊 Step 5: Management Dashboard & Report Generation

Open: **`https://st-anns-faculty-feedback.vercel.app/admin.html`** (or click "Admin" on the top navigation):
* **Default Password:** `admin123`

### Features:
1. **Live Leaderboard:** Real-time ranking from #1 (Top Scorer) to #55.
2. **Stream Filtering:** Switch between **All Faculty (55)**, **Degree Staff Only (38)**, and **Intermediate Only (23)**.
3. **Export to Excel (`.xlsx`):** Click **"Export Excel"** to download the complete spreadsheet with ranks, student counts, question-by-question averages, and final grades.
4. **Individual Faculty Report Cards:** Click **"Report Card"** next to any faculty name to view or print their dedicated NAAC appraisal sheet with official institutional letterhead and signature blocks.
