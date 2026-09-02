/*
# Sistema de Autenticação — Perfis de Utilizadores

## Objetivo
Adicionar autenticação completa ao sistema Estrela Dourada, permitindo que funcionários e administradores façam login com as suas credenciais. O sistema deve identificar automaticamente quem realiza cada ação (auditoria, pedidos, aprovações).

## Novas Tabelas
- `perfis` — perfil estendido de cada utilizador (funcionário ou administrador), ligado ao `auth.users` do Supabase.
  - `id` (uuid, PK, FK → auth.users) — identificador do utilizador de autenticação
  - `nome_completo` (text, not null) — nome completo do utilizador
  - `sexo` (text, nullable) — sexo do funcionário
  - `numero_funcionario` (text, unique, not null) — número/ID do funcionário (usado para login)
  - `sector` (text, nullable) — sector de trabalho do funcionário
  - `cargo` (text, nullable) — cargo/função do funcionário
  - `contacto` (text, nullable) — telefone de contacto
  - `email` (text, nullable) — email, se aplicável
  - `tipo` (text, not null, default 'funcionario') — 'funcionario' ou 'administrador'
  - `funcao_admin` (text, nullable) — função administrativa (apenas para administradores)
  - `permissoes` (jsonb, default '{}') — permissões específicas do administrador
  - `created_at` (timestamptz, default now())

## Alterações de Segurança
- RLS ativada na tabela `perfis`.
- Políticas: utilizadores autenticados podem ler todos os perfis (necessário para auditoria), mas só podem atualizar o próprio perfil.
- INSERT na tabela `perfis` é feito através de uma função SECURITY DEFINER chamada durante o registo, para que o utilizador possa inserir o seu próprio perfil imediatamente após signUp.
- Todas as tabelas existentes (alunos, pagamentos, pedidos_saida, auditoria, notificacoes, faturas, secretaria, relatorios_salvos) têm as suas políticas alteradas de `TO anon, authenticated` para `TO authenticated` com `USING(true)` / `WITH CHECK(true)`, garantindo que apenas utilizadores autenticados podem aceder aos dados.

## Função SECURITY DEFINER
- `inserir_perfil(p_user_id uuid, p_nome text, p_numero text, p_tipo text, p_sector text, p_cargo text, p_contacto text, p_email text, p_sexo text, p_funcao_admin text)` — insere um novo perfil. Apenas executável por utilizadores autenticados. Verifica que o `p_user_id` corresponde ao `auth.uid()` do chamador.

## Notas Importantes
1. O código de autorização para administrador (Castelo304) NÃO é guardado na base de dados. É validado por uma edge function no servidor, que não expõe o código no cliente.
2. O login é feito com email + password através do Supabase Auth. O número de funcionário é usado como identificador alternativo — o utilizador introduz o número OU o email, e o sistema procura o perfil correspondente para obter o email de autenticação.
3. A confirmação de email permanece DESATIVADA (padrão do Supabase).
*/

-- ===== Tabela perfis =====
CREATE TABLE IF NOT EXISTS perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo text NOT NULL,
  sexo text,
  numero_funcionario text UNIQUE NOT NULL,
  sector text,
  cargo text,
  contacto text,
  email text,
  tipo text NOT NULL DEFAULT 'funcionario' CHECK (tipo IN ('funcionario', 'administrador')),
  funcao_admin text,
  permissoes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- Utilizadores autenticados podem ler todos os perfis (necessário para auditoria e identificação)
DROP POLICY IF EXISTS "perfis_select_authenticated" ON perfis;
CREATE POLICY "perfis_select_authenticated"
ON perfis FOR SELECT
TO authenticated USING (true);

-- Utilizadores só podem atualizar o próprio perfil
DROP POLICY IF EXISTS "perfis_update_own" ON perfis;
CREATE POLICY "perfis_update_own"
ON perfis FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- INSERT é feito via SECURITY DEFINER function, mas adicionamos política para permitir insert próprio
DROP POLICY IF EXISTS "perfis_insert_own" ON perfis;
CREATE POLICY "perfis_insert_own"
ON perfis FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

-- ===== Função SECURITY DEFINER para inserir perfil =====
CREATE OR REPLACE FUNCTION inserir_perfil(
  p_user_id uuid,
  p_nome text,
  p_numero text,
  p_tipo text DEFAULT 'funcionario',
  p_sector text DEFAULT NULL,
  p_cargo text DEFAULT NULL,
  p_contacto text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_sexo text DEFAULT NULL,
  p_funcao_admin text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar que o chamador é o próprio utilizador
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Não autorizado: só pode criar o seu próprio perfil';
  END IF;

  INSERT INTO perfis (id, nome_completo, sexo, numero_funcionario, sector, cargo, contacto, email, tipo, funcao_admin)
  VALUES (p_user_id, p_nome, p_sexo, p_numero, p_sector, p_cargo, p_contacto, p_email, p_tipo, p_funcao_admin)
  ON CONFLICT (id) DO UPDATE SET
    nome_completo = EXCLUDED.nome_completo,
    sexo = EXCLUDED.sexo,
    numero_funcionario = EXCLUDED.numero_funcionario,
    sector = EXCLUDED.sector,
    cargo = EXCLUDED.cargo,
    contacto = EXCLUDED.contacto,
    email = EXCLUDED.email,
    tipo = EXCLUDED.tipo,
    funcao_admin = EXCLUDED.funcao_admin;
END;
$$;

-- Dar permissão de execução a authenticated
REVOKE ALL ON FUNCTION inserir_perfil FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inserir_perfil TO authenticated;

-- ===== Função para procurar email por número de funcionário =====
CREATE OR REPLACE FUNCTION procurar_perfil_por_numero(p_numero text)
RETURNS TABLE (email text, tipo text, nome_completo text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, p.tipo, p.nome_completo
  FROM perfis p
  JOIN auth.users u ON u.id = p.id
  WHERE p.numero_funcionario = p_numero;
$$;

REVOKE ALL ON FUNCTION procurar_perfil_por_numero FROM PUBLIC;
GRANT EXECUTE ON FUNCTION procurar_perfil_por_numero TO anon, authenticated;

-- ===== Atualizar políticas existentes para authenticated-only =====
-- alunos
DROP POLICY IF EXISTS "workspace_select_alunos" ON alunos;
CREATE POLICY "workspace_select_alunos" ON alunos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_alunos" ON alunos;
CREATE POLICY "workspace_insert_alunos" ON alunos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_alunos" ON alunos;
CREATE POLICY "workspace_update_alunos" ON alunos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_alunos" ON alunos;
CREATE POLICY "workspace_delete_alunos" ON alunos FOR DELETE TO authenticated USING (true);

-- pagamentos
DROP POLICY IF EXISTS "workspace_select_pagamentos" ON pagamentos;
CREATE POLICY "workspace_select_pagamentos" ON pagamentos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_pagamentos" ON pagamentos;
CREATE POLICY "workspace_insert_pagamentos" ON pagamentos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_pagamentos" ON pagamentos;
CREATE POLICY "workspace_update_pagamentos" ON pagamentos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_pagamentos" ON pagamentos;
CREATE POLICY "workspace_delete_pagamentos" ON pagamentos FOR DELETE TO authenticated USING (true);

-- pedidos_saida
DROP POLICY IF EXISTS "workspace_select_pedidos_saida" ON pedidos_saida;
CREATE POLICY "workspace_select_pedidos_saida" ON pedidos_saida FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_pedidos_saida" ON pedidos_saida;
CREATE POLICY "workspace_insert_pedidos_saida" ON pedidos_saida FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_pedidos_saida" ON pedidos_saida;
CREATE POLICY "workspace_update_pedidos_saida" ON pedidos_saida FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_pedidos_saida" ON pedidos_saida;
CREATE POLICY "workspace_delete_pedidos_saida" ON pedidos_saida FOR DELETE TO authenticated USING (true);

-- auditoria
DROP POLICY IF EXISTS "workspace_select_auditoria" ON auditoria;
CREATE POLICY "workspace_select_auditoria" ON auditoria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_auditoria" ON auditoria;
CREATE POLICY "workspace_insert_auditoria" ON auditoria FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_auditoria" ON auditoria;
CREATE POLICY "workspace_update_auditoria" ON auditoria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_auditoria" ON auditoria;
CREATE POLICY "workspace_delete_auditoria" ON auditoria FOR DELETE TO authenticated USING (true);

-- notificacoes
DROP POLICY IF EXISTS "workspace_select_notificacoes" ON notificacoes;
CREATE POLICY "workspace_select_notificacoes" ON notificacoes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_notificacoes" ON notificacoes;
CREATE POLICY "workspace_insert_notificacoes" ON notificacoes FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_notificacoes" ON notificacoes;
CREATE POLICY "workspace_update_notificacoes" ON notificacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_notificacoes" ON notificacoes;
CREATE POLICY "workspace_delete_notificacoes" ON notificacoes FOR DELETE TO authenticated USING (true);

-- faturas
DROP POLICY IF EXISTS "workspace_select_faturas" ON faturas;
CREATE POLICY "workspace_select_faturas" ON faturas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_faturas" ON faturas;
CREATE POLICY "workspace_insert_faturas" ON faturas FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_faturas" ON faturas;
CREATE POLICY "workspace_update_faturas" ON faturas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_faturas" ON faturas;
CREATE POLICY "workspace_delete_faturas" ON faturas FOR DELETE TO authenticated USING (true);

-- secretaria
DROP POLICY IF EXISTS "workspace_select_secretaria" ON secretaria;
CREATE POLICY "workspace_select_secretaria" ON secretaria FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_secretaria" ON secretaria;
CREATE POLICY "workspace_insert_secretaria" ON secretaria FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_secretaria" ON secretaria;
CREATE POLICY "workspace_update_secretaria" ON secretaria FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_secretaria" ON secretaria;
CREATE POLICY "workspace_delete_secretaria" ON secretaria FOR DELETE TO authenticated USING (true);

-- relatorios_salvos
DROP POLICY IF EXISTS "workspace_select_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_select_relatorios_salvos" ON relatorios_salvos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "workspace_insert_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_insert_relatorios_salvos" ON relatorios_salvos FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_update_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_update_relatorios_salvos" ON relatorios_salvos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "workspace_delete_relatorios_salvos" ON relatorios_salvos;
CREATE POLICY "workspace_delete_relatorios_salvos" ON relatorios_salvos FOR DELETE TO authenticated USING (true);