-- Fix: allow deleting a student to cascade-delete their payments
-- Previously ON DELETE RESTRICT blocked any student with payments from being deleted.

ALTER TABLE pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_aluno_id_fkey,
  ADD CONSTRAINT pagamentos_aluno_id_fkey
    FOREIGN KEY (aluno_id) REFERENCES alunos(id) ON DELETE CASCADE;