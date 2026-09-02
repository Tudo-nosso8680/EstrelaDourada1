/*
# Tabela de Presença — Utilizadores Online por Sector

## Objetivo
Permitir visualizar quantos utilizadores estão online e os seus respectivos nomes, agrupados por sector, na barra lateral do sistema.

## Nova Tabela
- `presenca` — regista a última atividade (heartbeat) de cada utilizador autenticado.
  - `user_id` (uuid, PK, FK → perfis.id) — identificador do utilizador
  - `sector` (text, nullable) — sector de trabalho do utilizador (copiado de perfis para consulta rápida)
  - `nome_completo` (text, not null) — nome do utilizador (copiado de perfis para consulta rápida)
  - `last_heartbeat` (timestamptz, default now()) — última atualização de presença

## Segurança
- RLS ativada.
- Utilizadores autenticados podem LER todos os registos (para ver quem está online).
- Cada utilizador só pode INSERIR/ATUALIZAR o seu próprio registo.

## Notas
1. O frontend faz upsert do heartbeat a cada 30 segundos.
2. Um utilizador é considerado online se `last_heartbeat` for nos últimos 2 minutos.
3. O nome e sector são copiados de perfis no momento do upsert para evitar joins complexos em tempo real.
*/

CREATE TABLE IF NOT EXISTS presenca (
  user_id uuid PRIMARY KEY REFERENCES perfis(id) ON DELETE CASCADE,
  sector text,
  nome_completo text NOT NULL,
  last_heartbeat timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE presenca ENABLE ROW LEVEL SECURITY;

-- Todos os utilizadores autenticados podem ver quem está online
DROP POLICY IF EXISTS "presenca_select_authenticated" ON presenca;
CREATE POLICY "presenca_select_authenticated"
ON presenca FOR SELECT
TO authenticated USING (true);

-- Cada utilizador só pode inserir o seu próprio registo
DROP POLICY IF EXISTS "presenca_insert_own" ON presenca;
CREATE POLICY "presenca_insert_own"
ON presenca FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

-- Cada utilizador só pode atualizar o seu próprio registo
DROP POLICY IF EXISTS "presenca_update_own" ON presenca;
CREATE POLICY "presenca_update_own"
ON presenca FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cada utilizador pode eliminar o seu próprio registo (ao fazer logout)
DROP POLICY IF EXISTS "presenca_delete_own" ON presenca;
CREATE POLICY "presenca_delete_own"
ON presenca FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Índice para consulta rápida de utilizadores online
CREATE INDEX IF NOT EXISTS idx_presenca_last_heartbeat ON presenca(last_heartbeat);
