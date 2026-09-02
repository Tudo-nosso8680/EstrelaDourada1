import { useState } from 'react';
import {
  ArrowDownLeft, Bell, ChevronRight, FileBarChart, FileText, GraduationCap,
  LayoutDashboard, Menu, ShieldCheck, Sparkles, Users, WalletCards, X,
} from 'lucide-react';
import type { Notification, UserProfile, View } from '@/lib/types';
import type { OnlineUser } from '@/lib/usePresence';
import { getInitials, timeAgo } from '@/lib/utils';

type SidebarProps = {
  view: View;
  onNavigate: (view: View) => void;
  mobileNav: boolean;
  setMobileNav: (open: boolean) => void;
  notifications: Notification[];
  onReadNotification: (id: string) => void;
  onNavigateFromNotification: (view: View) => void;
  unreadCount: number;
  userProfile: UserProfile;
  onLogout: () => void;
  onlineUsers: OnlineUser[];
};

export function Sidebar({ view, onNavigate, mobileNav, setMobileNav, userProfile, onLogout, onlineUsers }: SidebarProps) {
  const navItems: { view: View; icon: typeof LayoutDashboard; label: string }[] = [
    { view: 'dashboard', icon: LayoutDashboard, label: 'Visão geral' },
    { view: 'students', icon: Users, label: 'Alunos e matrículas' },
    { view: 'treasury', icon: WalletCards, label: 'Tesouraria' },
    { view: 'fundrequests', icon: ArrowDownLeft, label: 'Saídas de fundos' },
    { view: 'secretaria', icon: FileText, label: 'Secretaria' },
    { view: 'faturas', icon: FileText, label: 'Faturas' },
  ];

  const initials = getInitials(userProfile.nome_completo);

  return (
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand">
        <div className="brand-mark"><GraduationCap size={21} /></div>
        <div>
          <strong>Estrela<span>Dourada</span></strong>
          <small>De Belas · Gestão escolar</small>
        </div>
      </div>

      <div className="school-switch">
        <div className="school-avatar">ED</div>
        <div>
          <b>Estrela Dourada De Belas</b>
          <span>Luanda, Angola</span>
        </div>
        <ChevronRight size={16} />
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`nav-item ${view === item.view ? 'active' : ''}`}
            onClick={() => { onNavigate(item.view); setMobileNav(false); }}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="nav-label">GESTÃO PROTEGIDA</div>
        <button className={`nav-item ${view === 'reports' ? 'active' : ''}`} onClick={() => { onNavigate('reports'); setMobileNav(false); }}>
          <FileBarChart size={18} /><span>Relatórios</span>
        </button>
        <button className={`nav-item ${view === 'audit' ? 'active' : ''}`} onClick={() => { onNavigate('audit'); setMobileNav(false); }}>
          <ShieldCheck size={18} /><span>Auditoria</span>
        </button>
      </nav>

      <div className="online-section">
        <div className="online-header">
          <span className="online-pulse" />
          <b>Online agora</b>
          <i>{onlineUsers.length}</i>
        </div>
        {onlineUsers.length === 0 && <div className="online-empty">Ninguém online</div>}
        {onlineUsers.length > 0 && (
          <div className="online-list">
            {onlineUsers.map((u) => (
              <div className="online-user" key={u.user_id}>
                <div className="online-avatar">{getInitials(u.nome_completo)}</div>
                <div className="online-info">
                  <b>{u.nome_completo}</b>
                  <span>{u.sector ?? 'Sem sector'}</span>
                </div>
                <span className="online-dot" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="help-card">
          <Sparkles size={18} />
          <b>Sistema financeiro</b>
          <span>Estrela Dourada De Belas</span>
        </div>
        <div className="profile" onClick={() => { onNavigate('profile'); setMobileNav(false); }} style={{ cursor: 'pointer' }}>
          <div className="profile-avatar">{userProfile.foto_url ? <img src={userProfile.foto_url} alt={userProfile.nome_completo} className="avatar-img" /> : initials}</div>
          <div className="profile-copy">
            <b>{userProfile.nome_completo}</b>
            <span>{userProfile.tipo === 'administrador' ? (userProfile.funcao_admin ?? 'Administrador') : (userProfile.cargo ?? 'Funcionário')}</span>
          </div>
          <button className="logout-button" onClick={(e) => { e.stopPropagation(); onLogout(); }} title="Terminar sessão">Sair</button>
        </div>
      </div>
    </aside>
  );
}

export function TopBar({
  view,
  onMobileNav,
  notifications,
  unreadCount,
  onReadNotification,
  onNavigateFromNotification,
  userProfile,
  onNavigate,
}: {
  view: View;
  onMobileNav: () => void;
  notifications: Notification[];
  unreadCount: number;
  onReadNotification: (id: string) => void;
  onNavigateFromNotification: (view: View) => void;
  userProfile: UserProfile;
  onNavigate: (view: View) => void;
}) {
  const [notifOpen, setNotifOpen] = useState(false);
  const labels: Record<View, string> = {
    dashboard: 'Visão geral',
    students: 'Alunos e matrículas',
    treasury: 'Tesouraria',
    fundrequests: 'Saídas de fundos',
    secretaria: 'Secretaria',
    faturas: 'Faturas',
    reports: 'Relatórios',
    audit: 'Auditoria',
    profile: 'O meu perfil',
  };
  const initials = getInitials(userProfile.nome_completo);

  return (
    <header className="topbar">
      <button className="icon-button mobile-menu" onClick={onMobileNav} aria-label="Abrir menu"><Menu size={21} /></button>
      <div className="breadcrumbs">
        <span>Estrela Dourada</span>
        <ChevronRight size={14} />
        <b>{labels[view]}</b>
      </div>
      <div className="topbar-actions">
        <button className="topbar-profile" onClick={() => onNavigate('profile')} title="Ver perfil">
          {userProfile.foto_url ? (
            <img src={userProfile.foto_url} alt={userProfile.nome_completo} className="avatar-img" />
          ) : (
            <div className="topbar-profile-initials">{initials}</div>
          )}
        </button>
        <div className="notif-wrapper">
          <button className="icon-button notification" onClick={() => setNotifOpen((v) => !v)} aria-label="Notificações">
            <Bell size={19} />
            {unreadCount > 0 && <i>{unreadCount}</i>}
          </button>
          {notifOpen && (
            <>
              <div className="notif-overlay" onClick={() => setNotifOpen(false)} />
              <div className="notif-dropdown">
                <div className="notif-header">
                  <b>Notificações</b>
                  <button onClick={() => setNotifOpen(false)}><X size={16} /></button>
                </div>
                <div className="notif-list">
                  {notifications.length === 0 && <div className="notif-empty">Sem notificações</div>}
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      className={`notif-item ${n.lida ? 'read' : 'unread'}`}
                      onClick={() => { onReadNotification(n.id); onNavigateFromNotification('fundrequests'); setNotifOpen(false); }}
                    >
                      <div className="notif-dot" />
                      <div>
                        <b>{n.titulo}</b>
                        <span>{n.descricao}</span>
                        <small>{timeAgo(n.created_at)}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
