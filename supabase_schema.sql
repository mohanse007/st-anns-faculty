-- ================================================================
-- ST. ANN'S COLLEGE FOR WOMEN - FACULTY & STAFF PEER APPRAISAL SYSTEM
-- SUPABASE POSTGRESQL SCHEMA & SEED DATA (2026-2027)
-- ================================================================

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Drop existing tables if re-running
drop view if exists view_faculty_leaderboard;
drop table if exists feedback cascade;
drop table if exists evaluators cascade;
drop table if exists students cascade;
drop table if exists faculty cascade;

-- 3. Create Staff / Faculty Table (All 91 Staff Members)
create table faculty (
    id serial primary key,
    sl_no integer not null,
    name text not null,
    designation text not null,
    category text not null, -- 'Degree Teaching', 'Intermediate Teaching', 'Both', 'Office Staff', 'Non-Teaching', 'Add Course', 'Administration'
    stream_code text not null, -- 'DEGREE', 'INTER', 'BOTH', 'ALL'
    color text not null,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 4. Create Evaluators Table (Participating Faculty Evaluators)
create table evaluators (
    id uuid default uuid_generate_v4() primary key,
    phone_number text not null unique, -- Evaluator mobile phone number (prevents duplicate submissions)
    staff_id text,
    name text not null,
    stream text not null, -- 'Degree', 'Intermediate', 'Both'
    department text not null, -- Manually entered department
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Backwards compatibility alias table
create table students (
    id uuid default uuid_generate_v4() primary key,
    roll_number text not null unique,
    name text not null,
    stream text not null,
    year_of_study text,
    group_name text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 5. Create Feedback Table (Peer Evaluations across 7 Criteria)
create table feedback (
    id uuid default uuid_generate_v4() primary key,
    evaluator_id uuid references evaluators(id) on delete cascade,
    evaluator_phone text not null,
    faculty_id integer references faculty(id) on delete cascade,
    faculty_name text not null,
    stream text not null,
    q1 integer not null check (q1 between 2 and 4), -- Inspiring Personality
    q2 integer not null check (q2 between 2 and 4), -- Pedagogical Excellence
    q3 integer not null check (q3 between 2 and 4), -- Innovative Practices
    q4 integer not null check (q4 between 2 and 4), -- Student Development
    q5 integer not null check (q5 between 2 and 4), -- Professional Growth
    q6 integer not null check (q6 between 2 and 4), -- Contribution to School
    q7 integer not null check (q7 between 2 and 4), -- Loyalty & Integrity
    total_score integer not null, -- sum (14 to 28)
    percentage numeric(5,2) not null, -- (total_score / 28.0) * 100
    created_at timestamp with time zone default timezone('utc'::text, now()),
    constraint unique_evaluator_faculty unique (evaluator_phone, faculty_id)
);

-- 6. Insert All 71 Teaching, Administration, Office, and Add Course Staff Members
insert into faculty (sl_no, name, designation, category, stream_code, color) values
  (1, 'SR GIRSELA', 'CORRESPONDENT', 'Administration', 'ALL', 'ADMIN'),
  (2, 'SR JANICE', 'ANIMATOR, CONT.OF EXAMS', 'Administration', 'ALL', 'ADMIN'),
  (3, 'DR SR PREMA KUMARI', 'DEGREE PRINCIPAL', 'Administration', 'ALL', 'ADMIN'),
  (4, 'SR KASLIN', 'INTER PRINCIPAL', 'Administration', 'ALL', 'ADMIN'),
  (5, 'SR SHYMOL SEBASTIAN', 'SERIOR ASST.', 'Administration', 'ALL', 'ADMIN'),
  (6, 'SR MARY ANTONY', 'ASST. WARDEN', 'Administration', 'ALL', 'ADMIN'),
  (7, 'MRS G LALITHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (8, 'MISS M V SURYA KALYANI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (9, 'MRS DR ADISESHU', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (10, 'MISS N ANKITHA', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (11, 'MISS E P S BHAGYA LAKSHMI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (12, 'MRS TULASI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (13, 'MISS ANASUYA DEVI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (14, 'MRS PREMALATHA', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (15, 'MRS A ADILAKSHMI', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (16, 'MISS REBEKA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (17, 'SR SUGANTHI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (18, 'MRS SUNEETHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (19, 'MRS P LAVANYA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (20, 'M RENUKA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (21, 'MR P JAGANNADHAM', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (22, 'MRS PADMAVATHI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (23, 'MRS B SHANTHI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (24, 'MRS RAJAKUMARI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (25, 'MR K PARAMESWARA RAO', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (26, 'MRS VENKATA LAKSHMI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (27, 'MISS SHARINA TOOR', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (28, 'MRS GAYATHRI', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (29, 'MRS CH SALOMI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (30, 'MRS NAVITA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (31, 'MRS P JAYASRI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (32, 'MRS NASHEER BHANU', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (33, 'MISS N NADIYA', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (34, 'MRS KAVITHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (35, 'MRS G SIRISHA', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (36, 'MRS LIKHITHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (37, 'MRS ABIDA BEGUM', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (38, 'MRS ANUGATA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (39, 'MISS P SIVARANJINI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (40, 'MRS SASIKALA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (41, 'MISS SK VALISHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (42, 'MRS NAIZ', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (43, 'MRS A SANDHYA RANI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (44, 'MRS M RUPAVATHI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (45, 'MRS V LAKSHMI DEVI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (46, 'MRS SWETHA MARGARET CH', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (47, 'MISS A DIVYA JYOTHI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (48, 'MISS K HEMA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (49, 'MRS K TRIVENI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (50, 'MISS K SUNITHA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (51, 'MRS A ROJA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (52, 'MRS S HYMAVATHI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (53, 'MRS B SUDHA RANI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (54, 'MISS AHALYA', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (55, 'MRS V ANJALI DEVI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (56, 'MISS SK MD SHAHENAZ SULTANA', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (57, 'MRS CH PRASHANTHI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (58, 'MISS UMA RAMAKRISHNA', 'Teaching Faculty', 'Both (Inter & Degree Teaching)', 'BOTH', 'BLUE'),
  (59, 'MRS D MANU', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (60, 'MRS T KARUNA SRI', 'Teaching Faculty', 'Degree Teaching', 'DEGREE', 'YELLOW'),
  (61, 'MRS Y DHANA LAKSHMI', 'Teaching Faculty', 'Intermediate Teaching', 'INTER', 'WHITE'),
  (62, 'MRS D CHANDRAKALA', 'Office Staff', 'Office Staff', 'ALL', 'OFFICE'),
  (63, 'MRS B TRIVENI', 'Office Staff', 'Office Staff', 'ALL', 'OFFICE'),
  (64, 'MRS D RAJESWARI', 'Office Staff', 'Office Staff', 'ALL', 'OFFICE'),
  (65, 'MR SRINU', 'Office Staff', 'Office Staff', 'ALL', 'OFFICE'),
  (66, 'MR MURALI', 'Office Staff', 'Office Staff', 'ALL', 'OFFICE'),
  (67, 'MRS SANGEETHA', 'Add Course Staff', 'Add Course', 'ALL', 'ADD_COURSE'),
  (68, 'MRS VENKATA LAXMI', 'Add Course Staff', 'Add Course', 'ALL', 'ADD_COURSE'),
  (69, 'MRS RASHMI', 'Add Course Staff', 'Add Course', 'ALL', 'ADD_COURSE'),
  (70, 'MR S MILIND', 'Add Course Staff', 'Add Course', 'ALL', 'ADD_COURSE'),
  (71, 'MD KHAIRUNNISHA BEGUM', 'Add Course Staff', 'Add Course', 'ALL', 'ADD_COURSE');

-- 7. Configure Row Level Security (RLS)
alter table faculty enable row level security;
alter table evaluators enable row level security;
alter table students enable row level security;
alter table feedback enable row level security;

-- Policies to allow public read and write
create policy "Allow public read on faculty" on faculty for select using (true);
create policy "Allow public insert on evaluators" on evaluators for insert with check (true);
create policy "Allow public select on evaluators" on evaluators for select using (true);
create policy "Allow public insert on students" on students for insert with check (true);
create policy "Allow public select on students" on students for select using (true);
create policy "Allow public insert on feedback" on feedback for insert with check (true);
create policy "Allow public select on feedback" on feedback for select using (true);

-- 8. Create Leaderboard Aggregation View
create or replace view view_faculty_leaderboard as
select 
    f.id as faculty_id,
    f.sl_no,
    f.name,
    f.designation,
    f.category,
    f.stream_code,
    count(fb.id) as total_evaluations,
    coalesce(round(avg(fb.q1), 2), 0) as q1_avg,
    coalesce(round(avg(fb.q2), 2), 0) as q2_avg,
    coalesce(round(avg(fb.q3), 2), 0) as q3_avg,
    coalesce(round(avg(fb.q4), 2), 0) as q4_avg,
    coalesce(round(avg(fb.q5), 2), 0) as q5_avg,
    coalesce(round(avg(fb.q6), 2), 0) as q6_avg,
    coalesce(round(avg(fb.q7), 2), 0) as q7_avg,
    coalesce(round(avg(fb.total_score), 2), 0) as avg_score,
    coalesce(round(avg(fb.percentage), 2), 0) as avg_percentage,
    rank() over (order by coalesce(avg(fb.total_score), 0) desc) as overall_rank
from faculty f
left join feedback fb on f.id = fb.faculty_id
group by f.id, f.sl_no, f.name, f.designation, f.category, f.stream_code;
