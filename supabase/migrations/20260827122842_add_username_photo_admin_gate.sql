/*
# Perfil: nome de utilizador, foto e validação de palavra-passe de administrador

## Objetivo
1. Permitir login através do nome de utilizador (além do número de funcionário).
2. Adicionar foto de perfil ao utilizador.
3. Proteger o acesso a Relatórios e Auditoria com palavra-passe de administrador, validada no servidor.

## Alterações à tabela `perfis`
- `nome_utilizador` (text, UNIQUE, nullable) — nome de utilizador para login (alternativa ao número). Ex.: martins123
- `foto_url` (text, nullable) — URL pública da foto de perfil (armazenada no Supabase Storage)
- `estado` (text, not null, default 'Ativo') — estado da conta: 'Ativo' | 'Suspenso' | 'Inativo'

## Nova função SECURITY DEFINER
- `verificar_palavra_passe_admin(p_palavra_passe text)` — verifica se a palavra-passe fornecida corresponde à palavra-passe de administrador definida. Retorna `valid` (boolean) e `user_id` (uuid) do utilizador autenticado que fez o pedido. A palavra-passe "Castelo304" é validada no servidor e NÃO aparece no cliente. Só pode ser chamada por utilizadores autenticados (verifica `auth.uid()`).

## Função de procura atualizada
- `procurar_perfil_por_numero` renomeada/estendida para `procurar_perfil_por_identificador` — procura por número de funcionário OU nome de utilizador OU email. Retorna email, tipo, nome_completo. Mantém a função antiga por compatibilidade.

## Segurança
- RLS mantida na tabela `perfis`.
- Política de UPDATE existente já permite que cada utilizador atualize o seu próprio perfil (incluindo foto_url e nome_utilizador).
- A função `verificar_palavra_passe_admin` é SECURITY DEFINER e só executável por `authenticated`.

## Notas
1. A palavra-passe de administrador NÃO é guardada na base de dados — é validada na função plpgsql com comparação direta, uma vez que é um segredo de configuração fixo do sistema.
2. O `nome_utilizador` é opcional — utilizadores existentes continuam a poder entrar com o número de funcionário.
3. A foto de perfil é armazenada no bucket `fotos-perfil` do Supabase Storage.
*/

-- ===== Adicionar colunas à tabela perfis =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'nome_utilizador') THEN
    ALTER TABLE perfis ADD COLUMN nome_utilizador text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'foto_url') THEN
    ALTER TABLE perfis ADD COLUMN foto_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'perfis' AND column_name = 'estado') THEN
    ALTER TABLE perfis ADD COLUMN estado text NOT NULL DEFAULT 'Ativo';
  END IF;
END $$;

-- Garantir unicidade do nome_utilizador (apenas se não for NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfis_nome_utilizador_unique ON perfis(nome_utilizador) WHERE nome_utilizador IS NOT NULL;

-- ===== Função para verificar palavra-passe de administrador =====
CREATE OR REPLACE FUNCTION verificar_palavra_passe_admin(p_palavra_passe text)
RETURNS TABLE (valid boolean, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Palavra-passe de administrador validada no servidor (não exposta no cliente)
  IF p_palavra_passe = 'Castelo304' THEN
    RETURN QUERY SELECT true, v_uid;
  ELSE
    RETURN QUERY SELECT false, v_uid;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION verificar_palavra_passe_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verificar_palavra_passe_admin TO authenticated;

-- ===== Função de procura por identificador (número, username ou email) =====
CREATE OR REPLACE FUNCTION procurar_perfil_por_identificador(p_identificador text)
RETURNS TABLE (email text, tipo text, nome_completo text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email, p.tipo, p.nome_completo
  FROM perfis p
  JOIN auth.users u ON u.id = p.id
  WHERE p.numero_funcionario = p_identificador
     OR p.nome_utilizador = p_identificador
     OR p.email = lower(p_identificador);
$$;

REVOKE ALL ON FUNCTION procurar_perfil_por_identificador FROM PUBLIC;
GRANT EXECUTE ON FUNCTION procurar_perfil_por_identificador TO anon, authenticated;

-- ===== Storage bucket para fotos de perfil =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('fotos-perfil', 'fotos-perfil', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket fotos-perfil
DROP POLICY IF EXISTS "fotos_perfil_select_all" ON storage.objects;
CREATE POLICY "fotos_perfil_select_all"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "fotos_perfil_insert_own" ON storage.objects;
CREATE POLICY "fotos_perfil_insert_own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "fotos_perfil_update_own" ON storage.objects;
CREATE POLICY "fotos_perfil_update_own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'fotos-perfil' AND owner = auth.uid())
WITH CHECK (bucket_id = 'fotos-perfil');

DROP POLICY IF EXISTS "fotos_perfil_delete_own" ON storage.objects;
CREATE POLICY "fotos_perfil_delete_own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos-perfil' AND owner = auth.uid());