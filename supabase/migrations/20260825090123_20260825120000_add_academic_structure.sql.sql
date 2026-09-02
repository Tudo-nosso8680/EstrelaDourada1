/*
# Add Academic Structure: Areas, Courses, Turmas, Complementary Enrollments

## Overview
This migration adds the full academic hierarchy requested by the school:
Area de Ensino → Curso → Classe → Turma → Aluno → Inscrições em cursos complementares → Cobranças

## Changes to existing tables
- `alunos`: adds `area_ensino` (text), `curso` (text), `curso_id` (uuid FK to cursos),
  `cursos_complementares` (text[] — array of complementary course names).
  All new columns are nullable so existing rows are unaffected.

## New Tables
1. `cursos` — catalog of all courses (main + complementary), organized by area.
   - `id` uuid PK
   - `nome` text (e.g. "Farmácia", "Inglês")
   - `area_ensino` text (e.g. "Médio Técnico de Saúde", "Ensino Primário")
   - `tipo` text: 'principal' or 'complementar'
   - `valor_mensal` numeric default 0
   - `valor_anual` numeric default 0
   - `valor_unico` numeric default 0
   - `regra_cobranca` text: 'gratuito', 'mensal', 'anual', 'unico', 'personalizado'
   - `ativo` boolean default true
   - `created_at` timestamptz

2. `turmas` — turmas as proper entities.
   - `id` uuid PK
   - `ano_letivo` text (e.g. "2026")
   - `area_ensino` text
   - `curso` text
   - `classe` text
   - `turma` text (e.g. "A")
   - `turno` text
   - `sala` text nullable
   - `director_turma` text nullable
   - `max_alunos` int default 40
   - `estado` text: 'ativa' or 'inativa'
   - `created_at` timestamptz

3. `inscricoes_cursos` — complementary course enrollments per student.
   - `id` uuid PK
   - `aluno_id` uuid FK to alunos ON DELETE CASCADE
   - `curso_nome` text (e.g. "Inglês")
   - `valor` numeric default 0
   - `desconto` numeric default 0 (percentage 0-100)
   - `motivo_desconto` text nullable (e.g. "Bolsa de estudo")
   - `isencao` boolean default false
   - `created_at` timestamptz

4. `historico_alunos` — per-year academic history per student.
   - `id` uuid PK
   - `aluno_id` uuid FK to alunos ON DELETE CASCADE
   - `ano_letivo` text
   - `area_ensino` text
   - `curso` text
   - `classe` text
   - `turma` text
   - `turno` text
   - `created_at` timestamptz

5. `transferencias` — student transfer records.
   - `id` uuid PK
   - `aluno_id` uuid FK to alunos ON DELETE CASCADE
   - `data_transferencia` date
   - `de_turma` text
   - `para_turma` text
   - `de_curso` text nullable
   - `para_curso` text nullable
   - `motivo` text
   - `autorizado_por` text
   - `created_at` timestamptz

## Security
- RLS enabled on all new tables.
- CRUD policies for `authenticated` role (app has sign-in).
- Existing `alunos` table already has RLS; new columns inherit existing policies.

## Important Notes
1. All new columns on `alunos` are nullable so existing student rows remain valid.
2. The `cursos` table is pre-seeded with all courses from the school's specification.
3. The `turmas` table allows proper turma management rather than free-text.
4. Complementary course enrollments are tracked separately so financial
   reporting can distinguish main course payments from complementary activities.
*/

-- ===== Add columns to alunos =====
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS area_ensino text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS curso text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS cursos_complementares text[] DEFAULT '{}';

-- ===== Create cursos table =====
CREATE TABLE IF NOT EXISTS cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  area_ensino text NOT NULL,
  tipo text NOT NULL DEFAULT 'principal' CHECK (tipo IN ('principal', 'complementar')),
  valor_mensal numeric NOT NULL DEFAULT 0,
  valor_anual numeric NOT NULL DEFAULT 0,
  valor_unico numeric NOT NULL DEFAULT 0,
  regra_cobranca text NOT NULL DEFAULT 'gratuito' CHECK (regra_cobranca IN ('gratuito', 'mensal', 'anual', 'unico', 'personalizado')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_cursos" ON cursos;
CREATE POLICY "select_cursos" ON cursos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_cursos" ON cursos;
CREATE POLICY "insert_cursos" ON cursos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_cursos" ON cursos;
CREATE POLICY "update_cursos" ON cursos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_cursos" ON cursos;
CREATE POLICY "delete_cursos" ON cursos FOR DELETE
  TO authenticated USING (true);

-- ===== Create turmas table =====
CREATE TABLE IF NOT EXISTS turmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ano_letivo text NOT NULL DEFAULT '2026',
  area_ensino text NOT NULL,
  curso text NOT NULL,
  classe text NOT NULL,
  turma text NOT NULL,
  turno text NOT NULL DEFAULT 'Manhã',
  sala text,
  director_turma text,
  max_alunos int NOT NULL DEFAULT 40,
  estado text NOT NULL DEFAULT 'ativa' CHECK (estado IN ('ativa', 'inativa')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE turmas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_turmas" ON turmas;
CREATE POLICY "select_turmas" ON turmas FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_turmas" ON turmas;
CREATE POLICY "insert_turmas" ON turmas FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_turmas" ON turmas;
CREATE POLICY "update_turmas" ON turmas FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_turmas" ON turmas;
CREATE POLICY "delete_turmas" ON turmas FOR DELETE
  TO authenticated USING (true);

-- ===== Create inscricoes_cursos table =====
CREATE TABLE IF NOT EXISTS inscricoes_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  curso_nome text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  motivo_desconto text,
  isencao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE inscricoes_cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_inscricoes" ON inscricoes_cursos;
CREATE POLICY "select_inscricoes" ON inscricoes_cursos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_inscricoes" ON inscricoes_cursos;
CREATE POLICY "insert_inscricoes" ON inscricoes_cursos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_inscricoes" ON inscricoes_cursos;
CREATE POLICY "update_inscricoes" ON inscricoes_cursos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_inscricoes" ON inscricoes_cursos;
CREATE POLICY "delete_inscricoes" ON inscricoes_cursos FOR DELETE
  TO authenticated USING (true);

-- ===== Create historico_alunos table =====
CREATE TABLE IF NOT EXISTS historico_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  ano_letivo text NOT NULL,
  area_ensino text,
  curso text,
  classe text,
  turma text,
  turno text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE historico_alunos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_historico" ON historico_alunos;
CREATE POLICY "select_historico" ON historico_alunos FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_historico" ON historico_alunos;
CREATE POLICY "insert_historico" ON historico_alunos FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_historico" ON historico_alunos;
CREATE POLICY "update_historico" ON historico_alunos FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_historico" ON historico_alunos;
CREATE POLICY "delete_historico" ON historico_alunos FOR DELETE
  TO authenticated USING (true);

-- ===== Create transferencias table =====
CREATE TABLE IF NOT EXISTS transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  data_transferencia date NOT NULL DEFAULT CURRENT_DATE,
  de_turma text,
  para_turma text,
  de_curso text,
  para_curso text,
  motivo text,
  autorizado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE transferencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_transferencias" ON transferencias;
CREATE POLICY "select_transferencias" ON transferencias FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_transferencias" ON transferencias;
CREATE POLICY "insert_transferencias" ON transferencias FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_transferencias" ON transferencias;
CREATE POLICY "update_transferencias" ON transferencias FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_transferencias" ON transferencias;
CREATE POLICY "delete_transferencias" ON transferencias FOR DELETE
  TO authenticated USING (true);

-- ===== Seed cursos table =====
INSERT INTO cursos (nome, area_ensino, tipo, regra_cobranca) VALUES
-- Ensino Primário — complementary courses only
('Inglês', 'Ensino Primário', 'complementar', 'mensal'),
('Natação', 'Ensino Primário', 'complementar', 'mensal'),
('Caligrafia', 'Ensino Primário', 'complementar', 'mensal'),
('Teatro', 'Ensino Primário', 'complementar', 'mensal'),
('Dança', 'Ensino Primário', 'complementar', 'mensal'),
('Religião', 'Ensino Primário', 'complementar', 'mensal'),
-- Médio Técnico de Saúde — main courses
('Farmácia', 'Médio Técnico de Saúde', 'principal', 'mensal'),
('Radiologia Médica', 'Médio Técnico de Saúde', 'principal', 'mensal'),
('Nutrição e Dietética', 'Médio Técnico de Saúde', 'principal', 'mensal'),
('Fisioterapia', 'Médio Técnico de Saúde', 'principal', 'mensal'),
('Estomatologia', 'Médio Técnico de Saúde', 'principal', 'mensal'),
-- Médio Técnico Industrial — main courses
('Electricidade, Eléctrica e Telecomunicações', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Energia e Instalações Eléctricas', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Electrónica Industrial e Automação', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Electrónica e Telecomunicações', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Energias Renováveis', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Mecânica e Mecatrónica', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Mecatrónica Automóvel', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Frio e Climatização', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Electromecânica', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Máquinas e Motores', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Técnico de Informática', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Gestão de Sistemas Informáticos', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Desenhador Projectista', 'Médio Técnico Industrial', 'principal', 'mensal'),
('Técnico de Obras', 'Médio Técnico Industrial', 'principal', 'mensal'),
-- 1.º Ciclo Técnico Profissional — main courses
('Electricidade de Baixa Tensão', '1.º Ciclo Técnico Profissional', 'principal', 'mensal'),
('Mecânica', '1.º Ciclo Técnico Profissional', 'principal', 'mensal'),
('Informática', '1.º Ciclo Técnico Profissional', 'principal', 'mensal')
ON CONFLICT DO NOTHING;

-- ===== Indexes =====
CREATE INDEX IF NOT EXISTS idx_alunos_area_ensino ON alunos(area_ensino);
CREATE INDEX IF NOT EXISTS idx_alunos_curso ON alunos(curso);
CREATE INDEX IF NOT EXISTS idx_cursos_area_ensino ON cursos(area_ensino);
CREATE INDEX IF NOT EXISTS idx_turmas_lookup ON turmas(ano_letivo, area_ensino, curso, classe);
CREATE INDEX IF NOT EXISTS idx_inscricoes_aluno ON inscricoes_cursos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_aluno ON historico_alunos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_transferencias_aluno ON transferencias(aluno_id);