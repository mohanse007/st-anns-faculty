import json

with open('faculty_data.json', 'r', encoding='utf-8') as f:
    staff_list = json.load(f)

lines = []
lines.append("""-- ================================================================
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

-- 6. Insert All 91 Teaching, Office, and Non-Teaching Staff Members
insert into faculty (sl_no, name, designation, category, stream_code, color) values""")

values = []
for st in staff_list:
    name_esc = st['name'].replace("'", "''")
    desig_esc = st.get('designation', 'Teaching Faculty').replace("'", "''")
    cat_esc = st['category'].replace("'", "''")
    stream = st['stream_code']
    col = st['color']
    sl = st['sl_no']
    values.append(f"  ({sl}, '{name_esc}', '{desig_esc}', '{cat_esc}', '{stream}', '{col}')")

lines.append(",\n".join(values) + ";\n")

lines.append("""-- 7. Configure Row Level Security (RLS)
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
""")

with open('supabase_schema.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(lines))

print("Created updated supabase_schema.sql with all 91 staff members successfully!")
