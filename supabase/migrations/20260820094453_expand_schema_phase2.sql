/*
# Expand schema for Estrela Dourada De Belas — Phase 2

1. Student profile fields on `alunos`
- data_nascimento (date)
- sexo (text: Masculino/Feminino)
- documento_id (text) — ID/BI number
- morada (text)
- ano_letivo (text)
- Encarregado fields: enc_nome, enc_parentesco, enc_telefone, enc_morada, enc_documento

2. New table: `faturas`
- Field invoices submitted by staff
- Has file_url (Supabase Storage path) for uploaded photo/document
- Status: Pendente/Aprovada/Rejeitada
- Linked to funcionarios table (optional) or free-text funcionario_nome

3. New table: `secretaria`
- Generic secretaria requests: matriculas, confirmacoes, certificados, transferencias, declaracoes
- tipo field distinguishes the kind of request
- aluno_id optional link
- pagamento linked (valor, pago boolean)
- status field

4. New table: `relatorios_salvos`
- Saved report snapshots (daily/monthly/yearly) that can be deleted by admin
- tipo: diario/mensal/anual
- data_referencia (date)
- dados (jsonb) — the report data snapshot
- criado_por (text)

5. Changes to `pagamentos`
- Add `categoria` (text) — broader category for report filtering (Propina, Matricula, Confirmacao, Certificado, Declaracao, Uniforme, Cartao, Folha, Outro)
- Add `descricao` (text) — free-text description for non-propina payments

6. Indexes and RLS for all new tables
*/

-- ===== Student profile fields =====
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS data_nascimento date;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS sexo text DEFAULT 'Masculino';
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS documento_id text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS morada text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS ano_letivo text DEFAULT '2026';
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enc_nome text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enc_parentesco text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enc_telefone text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enc_morada text;
ALTER TABLE alunos ADD COLUMN IF NOT EXISTS enc_documento text;

-- ===== Pagamentos additions =====
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Propina';
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS descricao text;

-- Index for date-based queries (daily/monthly/yearly reports)
CREATE INDEX IF NOT EXISTS pagamentos_data_pagamento_idx ON pagamentos(data_pagamento DESC);
CREATE INDEX IF NOT EXISTS pagamentos_categoria_idx ON pagamentos(categoria);

-- ===== Faturas table =====
CREATE TABLE IF NOT EXISTS faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_nome text NOT NULL,
  especificacao text NOT NULL,
  valor numeric(12,2) NOT NULL,
  data_fatura date NOT NULL DEFAULT CURRENT_DATE,
  file_url text,
  file_path text,
  status text NOT NULL DEFAULT 'Pendente',
  decisao_por text,
  decisao_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faturas_status_idx ON faturas(status);
CREATE INDEX IF NOT EXISTS faturas_created_at_idx ON faturas(created_at DESC);

ALTER TABLE faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_select_faturas" ON faturas;
CREATE POLICY "workspace_select_faturas" ON faturas FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_faturas" ON faturas;
CREATE POLICY "workspace_insert_faturas" ON faturas FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_faturas" ON faturas;
CREATE POLICY "workspace_update_faturas" ON faturas FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_faturas" ON faturas;
CREATE POLICY "workspace_delete_faturas" ON faturas FOR DELETE TO anon, authenticated USING (true);

-- ===== Secretaria table =====
CREATE TABLE IF NOT EXISTS secretaria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  aluno_id uuid REFERENCES alunos(id) ON DELETE SET NULL,
  aluno_nome text,
  descricao text,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  pago boolean NOT NULL DEFAULT false,
  pagamento_id uuid REFERENCES pagamentos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Pendente',
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS secretaria_tipo_idx ON secretaria(tipo);
CREATE INDEX IF NOT EXISTS secretaria_aluno_id_idx ON secretaria(aluno_id);
CREATE INDEX IF NOT EXISTS secretaria_created_at_idx ON secretaria(created_at DESC);

ALTER TABLE secretaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_select_secretaria" ON secretaria;
CREATE POLICY "workspace_select_secretaria" ON secretaria FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_secretaria" ON secretaria;
CREATE POLICY "workspace_insert_secretaria" ON secretaria FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_secretaria" ON secretaria;
CREATE POLICY "workspace_update_secretaria" ON secretaria FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_secretaria" ON secretaria;
CREATE POLICY "workspace_delete_secretaria" ON secretaria FOR DELETE TO anon, authenticated USING (true);

-- ===== Relatorios salvos table =====
CREATE TABLE IF NOT EXISTS relatorios_salvos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  data_referencia date NOT NULL,
  dados jsonb NOT NULL DEFAULT '{}',
  criado_por text NOT NULL DEFAULT 'Operador',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS relatorios_salvos_tipo_idx ON relatorios_salvos(tipo);
CREATE INDEX IF NOT EXISTS relatorios_salvos_data_idx ON relatorios_salvos(data_referencia DESC);

ALTER TABLE relatorios_salvos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace_select_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_select_relatorios_salvos" ON relatorios_salvos FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_insert_relatorios_salvos" ON relatorios_salvos FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_delete_relatorios_salvos" ON relatorios_salvos FOR DELETE TO anon, authenticated USING (true);

-- ===== Storage bucket for faturas =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('faturas', 'faturas', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "faturas_public_read" ON storage.objects;
CREATE POLICY "faturas_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'faturas');
DROP POLICY IF EXISTS "faturas_public_upload" ON storage.objects;
CREATE POLICY "faturas_public_upload" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'faturas');
DROP POLICY IF EXISTS "faturas_public_delete" ON storage.objects;
CREATE POLICY "faturas_public_delete" ON storage.objects FOR DELETE TO anon, authenticated
  USING (bucket_id = 'faturas');