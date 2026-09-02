import { useState } from 'react';
import { LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Props = {
  onSuccess: () => void;
  onCancel: () => void;
};

export function AdminPasswordGate({ onSuccess, onCancel }: Props) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Introduza a palavra-passe de administrador.');
      return;
    }
    setBusy(true);
    setError('');

    const { data, error: rpcError } = await supabase.rpc('verificar_palavra_passe_admin', { p_palavra_passe: password.trim() });

    if (rpcError || !data) {
      setError('Erro ao validar. Tente novamente.');
      setBusy(false);
      return;
    }

    const rows = data as Array<{ valid: boolean }>;
    const isValid = Array.isArray(rows) ? rows[0]?.valid === true : (rows as { valid: boolean })?.valid === true;
    if (isValid) {
      setBusy(false);
      onSuccess();
    } else {
      setError('Palavra-passe de administrador incorreta.');
      setBusy(false);
    }
  }

  return (
    <div className="admin-gate-overlay" onClick={onCancel}>
      <div className="admin-gate-card" onClick={(e) => e.stopPropagation()}>
        <button className="admin-gate-close" onClick={onCancel} aria-label="Fechar"><X size={18} /></button>
        <div className="admin-gate-glow" />
        <div className="admin-gate-shield"><ShieldCheck size={36} /></div>
        <h3>Acesso Restrito</h3>
        <p>Esta área é exclusiva do administrador. Introduza a palavra-passe para continuar.</p>
        <form onSubmit={handleSubmit}>
          <label className="admin-gate-field">
            <span>Palavra-passe de administrador</span>
            <div className="admin-gate-input-wrap">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="Introduza a palavra-passe"
                autoFocus
                required
              />
            </div>
          </label>
          {error && <div className="admin-gate-error">{error}</div>}
          <div className="admin-gate-actions">
            <button type="button" className="admin-gate-cancel" onClick={onCancel} disabled={busy}>Cancelar</button>
            <button type="submit" className="admin-gate-submit" disabled={busy}>{busy ? 'A validar…' : 'Confirmar acesso'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
