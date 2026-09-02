import { useEffect, useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

type Props = {
  userProfile: UserProfile;
  onUnlock: () => void;
};

export function HibernationScreen({ userProfile, onUnlock }: Props) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const timeLabel = `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;

  const initials = userProfile.nome_completo.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="hibernation-screen">
      <div className="hibernation-overlay" />
      <div className="hibernation-card">
        <div className="hibernation-lock-icon"><LockKeyhole size={28} /></div>
        <p className="hibernation-label">Sessão bloqueada por inatividade</p>
        <div className="hibernation-avatar">
          {userProfile.foto_url ? (
            <img src={userProfile.foto_url} alt={userProfile.nome_completo} />
          ) : (
            <div className="hibernation-avatar-placeholder">{initials}</div>
          )}
        </div>
        <h2>{userProfile.nome_completo}</h2>
        <span className="hibernation-role">
          {userProfile.tipo === 'administrador' ? (userProfile.funcao_admin ?? 'Administrador') : (userProfile.cargo ?? 'Funcionário')}
        </span>
        <p className="hibernation-timer">Inativo há {timeLabel}</p>
        <button className="hibernation-unlock-btn" onClick={onUnlock}>
          ENTRAR
        </button>
        <p className="hibernation-hint">Clique em ENTRAR para retomar a sua sessão</p>
      </div>
    </div>
  );
}
