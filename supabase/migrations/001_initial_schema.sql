-- ============================================================
-- ALEX ENGLISH TUTOR — Schema Completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. USER PROFILES (progreso general del usuario)
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  ghio_lesson int not null default 1,          -- Lección Ghio actual (1-11)
  ghio_lesson_completed boolean not null default false, -- ¿Pasó el examen de la lección actual?
  module int not null default 1,               -- Módulo actual (1-3)
  xp int not null default 0,                   -- Experiencia total
  streak int not null default 0,               -- Días consecutivos
  last_session_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. LESSONS (curriculum Ghio, 11 lecciones + módulos profesionales)
create table if not exists public.lessons (
  id serial primary key,
  module int not null,                         -- 1=Ghio, 2=Professional, 3=Fluency
  lesson_number int not null,                  -- L1-L11 para módulo 1
  type text not null,                          -- 'vocabulary' | 'grammar' | 'conversation' | 'exam'
  title text not null,
  content_json jsonb not null default '{}',    -- Contenido estructurado de la lección
  exam_json jsonb,                             -- Preguntas del examen (si aplica)
  difficulty text not null default 'A2',       -- A2, B1, B1+, B2
  unlock_requires int,                         -- lesson.id que debe completarse antes
  created_at timestamptz not null default now()
);

-- 3. USER LESSON PROGRESS
create table if not exists public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id int not null references public.lessons(id),
  completed boolean not null default false,
  exam_passed boolean not null default false,
  exam_score int,                              -- 0-100
  attempts int not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, lesson_id)
);

-- 4. VOCABULARY (850 palabras Ghio + profesional)
create table if not exists public.vocabulary (
  id serial primary key,
  word text not null,
  phonetic text not null,                      -- Pronunciación figurada Ghio: (gúd)
  translation text not null,                  -- Traducción al español
  example_en text,                             -- Ejemplo en inglés
  example_es text,                             -- Traducción del ejemplo
  category text not null default 'ghio',      -- 'ghio' | 'professional' | 'phrasal_verb'
  lesson_id int references public.lessons(id), -- Aparece en esta lección
  opposite_id int references public.vocabulary(id), -- Palabra opuesta (Good ↔ Bad)
  difficulty text not null default 'A2'
);

-- 5. USER VOCABULARY (SRS - Spaced Repetition)
create table if not exists public.user_vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id int not null references public.vocabulary(id),
  -- Algoritmo SM-2
  srs_interval int not null default 1,         -- Días hasta próximo repaso
  srs_repetitions int not null default 0,      -- Número de repasos exitosos
  srs_ease_factor float not null default 2.5,  -- Factor de facilidad SM-2
  next_review_at timestamptz not null default now(),
  mastered boolean not null default false,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, word_id)
);

-- 6. CONVERSATIONS (sesiones de conversación guardadas)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,                          -- 'conversation' | 'lesson' | 'verb_drill' | 'writing'
  transcript_json jsonb not null default '[]', -- Array de mensajes {role, content}
  corrections_json jsonb default '[]',         -- Correcciones hechas durante la sesión
  duration_minutes int,
  score int,                                   -- 0-100 calidad de la sesión
  created_at timestamptz not null default now()
);

-- 7. WRITING SUBMISSIONS (emails, propuestas, textos)
create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,                        -- Instrucción dada (ej: "Write a follow-up email")
  user_text text not null,                     -- Texto escrito por el usuario
  ai_feedback text,                            -- Feedback de Alex
  corrected_text text,                         -- Versión corregida
  score int,                                   -- 0-100
  created_at timestamptz not null default now()
);

-- 8. LEARNER PROFILE (inteligencia adaptativa — el core diferenciador)
create table if not exists public.learner_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  profile_json jsonb not null default '{
    "strengths": [],
    "weaknesses": [],
    "error_patterns": [],
    "learning_pace": "medium",
    "preferred_explanation_style": "examples",
    "vocabulary_mastered": 0,
    "vocabulary_struggling": [],
    "pronunciation_issues": [],
    "session_count": 0,
    "total_minutes": 0,
    "last_week_summary": null,
    "focus_areas": []
  }',
  updated_at timestamptz not null default now()
);

-- 9. ERROR LOG (registro detallado de errores para análisis)
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.conversations(id),
  error_type text not null,                    -- 'grammar' | 'vocabulary' | 'pronunciation' | 'syntax'
  pattern text not null,                       -- Descripción del error: "he/she/it -s omission"
  context text,                                -- Frase donde ocurrió el error
  user_attempt text,                           -- Lo que dijo el usuario
  correct_form text,                           -- Forma correcta
  created_at timestamptz not null default now()
);

-- 10. SESSION ANALYSIS (análisis post-sesión de Groq)
create table if not exists public.session_analysis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.conversations(id),
  errors_json jsonb default '[]',              -- Errores detectados
  wins_json jsonb default '[]',                -- Logros / cosas bien hechas
  ai_notes text,                               -- Notas de Alex para la próxima sesión
  vocabulary_used jsonb default '[]',          -- Vocabulario que usó el usuario
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.user_profiles enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.user_vocabulary enable row level security;
alter table public.conversations enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.learner_profile enable row level security;
alter table public.error_log enable row level security;
alter table public.session_analysis enable row level security;

-- Políticas: usuario solo ve sus propios datos
create policy "user_profiles_self" on public.user_profiles
  for all using (auth.uid() = id);

create policy "user_lesson_progress_self" on public.user_lesson_progress
  for all using (auth.uid() = user_id);

create policy "user_vocabulary_self" on public.user_vocabulary
  for all using (auth.uid() = user_id);

create policy "conversations_self" on public.conversations
  for all using (auth.uid() = user_id);

create policy "writing_submissions_self" on public.writing_submissions
  for all using (auth.uid() = user_id);

create policy "learner_profile_self" on public.learner_profile
  for all using (auth.uid() = user_id);

create policy "error_log_self" on public.error_log
  for all using (auth.uid() = user_id);

create policy "session_analysis_self" on public.session_analysis
  for all using (auth.uid() = user_id);

-- Lessons y vocabulary son públicos (solo lectura)
alter table public.lessons enable row level security;
alter table public.vocabulary enable row level security;

create policy "lessons_public_read" on public.lessons
  for select using (true);

create policy "vocabulary_public_read" on public.vocabulary
  for select using (true);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.user_profiles (id)
  values (new.id);

  insert into public.learner_profile (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- SEED: Los 16 Verbos Básicos de Ghio (vocabulario fundacional)
-- ============================================================

insert into public.vocabulary (word, phonetic, translation, example_en, example_es, category, difficulty) values
('to come', '(tu cám)', 'venir', 'He comes every day.', 'Él viene todos los días.', 'ghio_verb', 'A2'),
('to let', '(tu let)', 'dejar', 'Let me help you.', 'Déjame ayudarte.', 'ghio_verb', 'A2'),
('to go', '(tu góU)', 'ir', 'We go to work.', 'Nosotros vamos al trabajo.', 'ghio_verb', 'A2'),
('to put', '(tu put)', 'poner', 'She puts the book on the table.', 'Ella pone el libro en la mesa.', 'ghio_verb', 'A2'),
('to take', '(tu téik)', 'tomar', 'I take the bus every morning.', 'Tomo el autobús cada mañana.', 'ghio_verb', 'A2'),
('to give', '(tu guív)', 'dar', 'They give feedback after meetings.', 'Ellos dan feedback después de las reuniones.', 'ghio_verb', 'A2'),
('to get', '(tu guét)', 'conseguir/obtener', 'I get the information you need.', 'Consigo la información que necesitas.', 'ghio_verb', 'A2'),
('to keep', '(tu kíip)', 'mantener', 'Keep the document updated.', 'Mantén el documento actualizado.', 'ghio_verb', 'A2'),
('to make', '(tu méik)', 'hacer/crear', 'We make a decision today.', 'Tomamos una decisión hoy.', 'ghio_verb', 'A2'),
('to do', '(tu dúu)', 'hacer/realizar', 'What do you do for work?', '¿Qué haces para trabajar?', 'ghio_verb', 'A2'),
('to seem', '(tu síim)', 'parecer', 'It seems like a good idea.', 'Parece una buena idea.', 'ghio_verb', 'A2'),
('to say', '(tu séi)', 'decir', 'He says the project is ready.', 'Él dice que el proyecto está listo.', 'ghio_verb', 'A2'),
('to see', '(tu síi)', 'ver', 'I see what you mean.', 'Veo lo que quieres decir.', 'ghio_verb', 'A2'),
('to send', '(tu sénd)', 'enviar', 'Please send me the report.', 'Por favor envíame el reporte.', 'ghio_verb', 'A2'),
('to be', '(tu bíi)', 'ser/estar', 'I am ready for the meeting.', 'Estoy listo para la reunión.', 'ghio_verb', 'A2'),
('to have', '(tu jáv)', 'tener/haber', 'We have a meeting at 3 PM.', 'Tenemos una reunión a las 3 PM.', 'ghio_verb', 'A2');
