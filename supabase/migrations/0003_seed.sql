-- =============================================================================
-- 0003_seed.sql — demo catalogue + institution profile
-- Safe to re-run: every statement is idempotent.
-- =============================================================================

insert into public.institution_settings (id, name, tagline, address, exam_session, footer_note)
values (
  true,
  'Al-Noor Public School & College',
  'Excellence in knowledge and character',
  '12-A Model Town, Lahore',
  '2026-27',
  'Paper generated with PaperForge — verify before printing.'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Subjects
-- ---------------------------------------------------------------------------
insert into public.subjects (class_name, subject_name)
values
  ('Class 9',  'Physics'),
  ('Class 9',  'Mathematics'),
  ('Class 9',  'Biology'),
  ('Class 10', 'Physics'),
  ('Class 10', 'Chemistry'),
  ('Class 10', 'English')
on conflict (class_name, subject_name) do nothing;

-- ---------------------------------------------------------------------------
-- Topics
-- ---------------------------------------------------------------------------
insert into public.topics (subject_id, chapter_title, topic_title, subtopic_title, chapter_order)
select
  s.id,
  v.chapter_title,
  v.topic_title,
  v.subtopic_title,
  v.chapter_order
from public.subjects s
join (
  values
    -- Class 9 Physics
    ('Class 9', 'Physics', 'Physical Quantities & Measurement', 'International System of Units', null, 1),
    ('Class 9', 'Physics', 'Physical Quantities & Measurement', 'Significant Figures', null, 1),
    ('Class 9', 'Physics', 'Kinematics', 'Equations of Motion', 'Derivation', 2),
    ('Class 9', 'Physics', 'Kinematics', 'Distance–Time Graphs', null, 2),
    ('Class 9', 'Physics', 'Dynamics', 'Newton''s Laws of Motion', 'Second Law', 3),
    ('Class 9', 'Physics', 'Dynamics', 'Momentum & Collisions', null, 3),
    -- Class 9 Mathematics
    ('Class 9', 'Mathematics', 'Matrices & Determinants', 'Matrix Operations', null, 1),
    ('Class 9', 'Mathematics', 'Matrices & Determinants', 'Determinants', 'Cramer''s Rule', 1),
    ('Class 9', 'Mathematics', 'Real & Complex Numbers', 'Real Numbers', null, 2),
    ('Class 9', 'Mathematics', 'Real & Complex Numbers', 'Complex Numbers', 'Conjugate', 2),
    ('Class 9', 'Mathematics', 'Algebraic Expressions', 'Factorization', null, 3),
    -- Class 9 Biology
    ('Class 9', 'Biology', 'Introduction to Biology', 'Branches of Biology', null, 1),
    ('Class 9', 'Biology', 'Cell Biology', 'Cell Structure & Function', 'Organelles', 2),
    ('Class 9', 'Biology', 'Cell Biology', 'Cell Division', 'Mitosis', 2),
    -- Class 10 Physics
    ('Class 10', 'Physics', 'Simple Harmonic Motion', 'Hooke''s Law', null, 1),
    ('Class 10', 'Physics', 'Simple Harmonic Motion', 'Simple Pendulum', 'Time Period', 1),
    ('Class 10', 'Physics', 'Sound', 'Characteristics of Sound', null, 2),
    ('Class 10', 'Physics', 'Sound', 'Speed of Sound', null, 2),
    -- Class 10 Chemistry
    ('Class 10', 'Chemistry', 'Chemical Equilibrium', 'Reversible Reactions', null, 1),
    ('Class 10', 'Chemistry', 'Chemical Equilibrium', 'Le Chatelier''s Principle', null, 1),
    ('Class 10', 'Chemistry', 'Acids, Bases & Salts', 'pH Scale', null, 2),
    ('Class 10', 'Chemistry', 'Acids, Bases & Salts', 'Neutralisation', null, 2),
    -- Class 10 English
    ('Class 10', 'English', 'Prose', 'The Last Lesson', 'Theme', 1),
    ('Class 10', 'English', 'Prose', 'The Last Lesson', 'Character Sketch', 1),
    ('Class 10', 'English', 'Grammar', 'Tenses', 'Present Perfect', 2),
    ('Class 10', 'English', 'Grammar', 'Active & Passive Voice', null, 2)
) as v (
  class_name,
  subject_name,
  chapter_title,
  topic_title,
  subtopic_title,
  chapter_order
)
  on s.class_name = v.class_name
 and s.subject_name = v.subject_name
where not exists (
  select 1
  from public.topics t
  where t.subject_id = s.id
    and t.chapter_title = v.chapter_title
    and coalesce(t.topic_title, '') = coalesce(v.topic_title, '')
    and coalesce(t.subtopic_title, '') = coalesce(v.subtopic_title, '')
);

-- ---------------------------------------------------------------------------
-- Demo questions (only when the bank is empty)
-- ---------------------------------------------------------------------------
insert into public.questions (
  topic_id,
  question_type,
  question_text,
  options,
  correct_answer,
  medium,
  difficulty,
  marks,
  text_direction
)
select
  t.id,
  v.question_type::public.question_type,
  v.question_text,
  v.options::jsonb,
  v.correct_answer,
  v.medium::public.medium_type,
  v.difficulty::public.difficulty_level,
  v.marks,
  v.text_direction::public.text_direction
from public.topics t
join public.subjects s on s.id = t.subject_id
join (
  values
    ('Class 9', 'Physics', 'Kinematics', 'Equations of Motion', 'mcq',
     'A body starts from rest and accelerates at $2\,\text{m/s}^2$. What distance does it cover in $5\,\text{s}$?',
     '[{"key":"A","text":"10 m"},{"key":"B","text":"20 m"},{"key":"C","text":"25 m"},{"key":"D","text":"50 m"}]',
     'C', 'english', 'medium', 1, 'ltr'),

    ('Class 9', 'Physics', 'Kinematics', 'Equations of Motion', 'short',
     'Derive the second equation of motion, $s = v_i t + \tfrac{1}{2} a t^2$.',
     null, '$s = v_i t + \frac{1}{2} a t^2$ (derivation from a velocity–time graph)', 'english', 'hard', 4, 'ltr'),

    ('Class 9', 'Physics', 'Dynamics', 'Newton''s Laws of Motion', 'mcq',
     'Which quantity is conserved when no external force acts on a system?',
     '[{"key":"A","text":"Velocity"},{"key":"B","text":"Momentum"},{"key":"C","text":"Acceleration"},{"key":"D","text":"Displacement"}]',
     'B', 'english', 'easy', 1, 'ltr'),

    ('Class 9', 'Physics', 'Dynamics', 'Momentum & Collisions', 'long',
     'State Newton''s second law of motion and use it to define the newton. Support your answer with a worked example.',
     null, 'Force is the rate of change of momentum. One newton accelerates one kilogram at one metre per second squared.', 'english', 'medium', 8, 'ltr'),

    ('Class 9', 'Physics', 'Dynamics', 'Momentum & Collisions', 'short',
     'ایک جسم کی رفتار دوگنی کرنے سے اس کی حرکی توانائی پر کیا اثر پڑے گا؟',
     null, 'حرکی توانائی چار گنا ہو جائے گی۔', 'urdu', 'medium', 3, 'rtl'),

    ('Class 9', 'Mathematics', 'Matrices & Determinants', 'Determinants', 'mcq',
     'If $A$ is a $2 \times 2$ matrix with $\det(A) = 5$, what is $\det(2A)$?',
     '[{"key":"A","text":"5"},{"key":"B","text":"10"},{"key":"C","text":"20"},{"key":"D","text":"25"}]',
     'C', 'english', 'medium', 1, 'ltr'),

    ('Class 9', 'Mathematics', 'Matrices & Determinants', 'Determinants', 'short',
     'Solve the system $2x + y = 7$, $x - y = 2$ using Cramer''s rule.',
     null, '$x = 3,\; y = 1$', 'english', 'hard', 5, 'ltr'),

    ('Class 9', 'Mathematics', 'Real & Complex Numbers', 'Complex Numbers', 'short',
     'Find the conjugate and modulus of $z = 3 + 4i$.',
     null, 'Conjugate $= 3 - 4i$, modulus $= 5$', 'bilingual', 'easy', 3, 'ltr'),

    ('Class 9', 'Mathematics', 'Algebraic Expressions', 'Factorization', 'long',
     'Factorise $x^3 - 6x^2 + 11x - 6$ completely and verify your result by expansion.',
     null, '$(x-1)(x-2)(x-3)$', 'english', 'hard', 8, 'ltr'),

    ('Class 9', 'Biology', 'Cell Biology', 'Cell Structure & Function', 'mcq',
     'Which organelle is responsible for ATP synthesis in a eukaryotic cell?',
     '[{"key":"A","text":"Ribosome"},{"key":"B","text":"Mitochondrion"},{"key":"C","text":"Golgi apparatus"},{"key":"D","text":"Lysosome"}]',
     'B', 'english', 'easy', 1, 'ltr'),

    ('Class 9', 'Biology', 'Cell Biology', 'Cell Division', 'short',
     'Differentiate between mitosis and meiosis with respect to chromosome number.',
     null, 'Mitosis preserves the diploid number; meiosis halves it to produce haploid gametes.', 'english', 'medium', 4, 'ltr'),

    ('Class 10', 'Physics', 'Simple Harmonic Motion', 'Simple Pendulum', 'mcq',
     'The time period of a simple pendulum depends on:',
     '[{"key":"A","text":"Mass of the bob"},{"key":"B","text":"Amplitude"},{"key":"C","text":"Length and gravity"},{"key":"D","text":"Material of the string"}]',
     'C', 'english', 'easy', 1, 'ltr'),

    ('Class 10', 'Physics', 'Sound', 'Speed of Sound', 'short',
     'Explain why sound travels faster in solids than in gases.',
     null, 'Solids have higher elasticity and closer particle spacing, so energy transfers faster.', 'english', 'medium', 3, 'ltr'),

    ('Class 10', 'Chemistry', 'Chemical Equilibrium', 'Le Chatelier''s Principle', 'long',
     'State Le Chatelier''s principle and predict the effect of increasing pressure on the equilibrium $N_2 + 3H_2 \rightleftharpoons 2NH_3$.',
     null, 'The equilibrium shifts towards the side with fewer gas moles — towards ammonia.', 'english', 'medium', 8, 'ltr'),

    ('Class 10', 'Chemistry', 'Acids, Bases & Salts', 'pH Scale', 'mcq',
     'A solution with pH 3 is:',
     '[{"key":"A","text":"Strongly basic"},{"key":"B","text":"Weakly basic"},{"key":"C","text":"Neutral"},{"key":"D","text":"Acidic"}]',
     'D', 'english', 'easy', 1, 'ltr'),

    ('Class 10', 'English', 'Grammar', 'Active & Passive Voice', 'short',
     'Change to passive voice: "The teacher explains the lesson."',
     null, 'The lesson is explained by the teacher.', 'english', 'easy', 2, 'ltr')
) as v (
  class_name,
  subject_name,
  chapter_title,
  topic_title,
  question_type,
  question_text,
  options,
  correct_answer,
  medium,
  difficulty,
  marks,
  text_direction
)
  on s.class_name = v.class_name
 and s.subject_name = v.subject_name
 and t.chapter_title = v.chapter_title
 and t.topic_title = v.topic_title
where not exists (
  select 1 from public.questions q where q.question_text = v.question_text
);

-- =============================================================================
-- Bootstrap the first super admin
-- =============================================================================
-- 1. Create the auth user (Supabase Dashboard → Authentication → Add user,
--    or `supabase.auth.admin.createUser`), then run:
--
--      update public.users set role = 'super_admin' where email = 'you@example.com';
--
-- 2. Every user created afterwards defaults to 'teacher' and is assigned a role
--    from Dashboard → Users (super admin only).
