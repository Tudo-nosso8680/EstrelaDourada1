/*
# Add new payment type columns

1. New Columns on `pagamentos`
- `disciplina` (text, nullable) — stores the discipline name for "Recurso" payments
- `periodicidade` (text, nullable) — stores the periodicity for "Taxa de Seguro" payments (Mensal/Trimestral/Anual)
- `periodo_cobertura` (text, nullable) — stores the coverage period label for insurance
- `antecipado` (boolean, default false) — marks whether a Propina payment was paid in advance (anticipadamente)

2. Notes
- All new columns are nullable so existing payment rows are unaffected.
- No enums or CHECK constraints — validation is client-side, consistent with existing schema.
- No RLS changes needed — existing wide-open policies already cover all CRUD.
*/

ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS disciplina text;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS periodicidade text;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS periodo_cobertura text;
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS antecipado boolean NOT NULL DEFAULT false;
