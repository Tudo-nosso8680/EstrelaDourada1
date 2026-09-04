import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logAudit, createNotification } from '@/lib/audit';
import { generateReceiptCode, formatKz, computeDailyHistory } from '@/lib/utils';
import type { Student, Payment, FundRequest, AuditEntry, Notification, Fatura, SecretariaRequest, SavedReport, UserProfile, View } from '@/lib/types';
import { Sidebar, TopBar } from '@/components/Sidebar';
import { Dashboard } from '@/components/Dashboard';
import { Students } from '@/components/Students';
import { Treasury } from '@/components/Treasury';
import { FundRequests } from '@/components/FundRequests';
import { Faturas } from '@/components/Faturas';
import { Secretaria } from '@/components/Secretaria';
import { StudentProfile } from '@/components/StudentProfile';
import { Reports } from '@/components/Reports';
import { AuditView } from '@/components/AuditView';
import { Login } from '@/components/Login';
import { UserProfilePage } from '@/components/UserProfilePage';
import { HibernationScreen } from '@/components/HibernationScreen';
import { useInactivity } from '@/lib/useInactivity';
import { AdminPasswordGate } from '@/components/AdminPasswordGate';
import { usePresence } from '@/lib/usePresence';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [secretariaReqs, setSecretariaReqs] = useState<SecretariaRequest[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [hibernating, setHibernating] = useState(false);
  const [adminGate, setAdminGate] = useState<null | 'reports' | 'audit'>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const onlineUsers = usePresence(userProfile);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 3500);
  }, []);

  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile(session: Session | null) {
      if (!session?.user) {
        if (currentUserId.current !== null) {
          currentUserId.current = null;
        }
        if (active) {
          setUserProfile(null);
          setAuthReady(true);
          setLoading(false);
        }
        return;
      }
      if (currentUserId.current === session.user.id) return;
      currentUserId.current = session.user.id;
      const { data } = await supabase.from('perfis').select('*').eq('id', session.user.id).maybeSingle();
      if (active) {
        setUserProfile(data as UserProfile | null);
        setAuthReady(true);
      }
    }
    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadProfile(session);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!authReady || !userProfile) return;
      const [studentsRes, paymentsRes, fundRes, auditRes, notifRes, faturasRes, secretariaRes, reportsRes] = await Promise.all([
        supabase.from('alunos').select('*').order('created_at', { ascending: false }),
        supabase.from('pagamentos').select('*, aluno:alunos(nome, matricula, turma, classe, turno)').order('created_at', { ascending: false }),
        supabase.from('pedidos_saida').select('*').order('created_at', { ascending: false }),
        supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(20),
        supabase.from('faturas').select('*').order('created_at', { ascending: false }),
        supabase.from('secretaria').select('*').order('created_at', { ascending: false }),
        supabase.from('relatorios_salvos').select('*').order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (!studentsRes.error && studentsRes.data) setStudents(studentsRes.data as Student[]);
      if (!paymentsRes.error && paymentsRes.data) setPayments(paymentsRes.data as Payment[]);
      if (!fundRes.error && fundRes.data) setFundRequests(fundRes.data as FundRequest[]);
      if (!auditRes.error && auditRes.data) setAudit(auditRes.data as AuditEntry[]);
      if (!notifRes.error && notifRes.data) setNotifications(notifRes.data as Notification[]);
      if (!faturasRes.error && faturasRes.data) setFaturas(faturasRes.data as Fatura[]);
      if (!secretariaRes.error && secretariaRes.data) setSecretariaReqs(secretariaRes.data as SecretariaRequest[]);
      if (!reportsRes.error && reportsRes.data) setSavedReports(reportsRes.data as SavedReport[]);
      setLoading(false);
    }
    void loadData();
    return () => { active = false; };
  }, [authReady, userProfile]);

  const refreshAudit = useCallback(async () => {
    const { data } = await supabase.from('auditoria').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setAudit(data as AuditEntry[]);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const { data } = await supabase.from('notificacoes').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setNotifications(data as Notification[]);
  }, []);

  const refreshFaturas = useCallback(async () => {
    const { data } = await supabase.from('faturas').select('*').order('created_at', { ascending: false });
    if (data) setFaturas(data as Fatura[]);
  }, []);

  const refreshSecretaria = useCallback(async () => {
    const { data } = await supabase.from('secretaria').select('*').order('created_at', { ascending: false });
    if (data) setSecretariaReqs(data as SecretariaRequest[]);
  }, []);

  const refreshSavedReports = useCallback(async () => {
    const { data } = await supabase.from('relatorios_salvos').select('*').order('created_at', { ascending: false });
    if (data) setSavedReports(data as SavedReport[]);
  }, []);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.lida).length, [notifications]);
  const dailyHistory = useMemo(() => computeDailyHistory(payments, fundRequests), [payments, fundRequests]);

  const navigate = useCallback((nextView: View) => {
    if ((nextView === 'reports' || nextView === 'audit') && userProfile?.tipo !== 'administrador') {
      showNotice('Esta área está disponível apenas para administradores.');
      return;
    }
    if ((nextView === 'reports' || nextView === 'audit') && !adminUnlocked) {
      setAdminGate(nextView);
      return;
    }
    setView(nextView);
    setMobileNav(false);
  }, [showNotice, userProfile, adminUnlocked]);

  const handleAdminGateSuccess = useCallback(() => {
    setAdminUnlocked(true);
    const target = adminGate;
    setAdminGate(null);
    if (target) {
      setView(target);
      setMobileNav(false);
    }
  }, [adminGate]);

  const actorName = userProfile?.nome_completo ?? 'Utilizador';

  const handleAuthenticated = useCallback((profile: UserProfile) => {
    currentUserId.current = profile.id;
    setUserProfile(profile);
    setAuthReady(true);
    setLoading(true);
  }, []);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    currentUserId.current = null;
    setUserProfile(null);
    setView('dashboard');
    setHibernating(false);
    setAdminUnlocked(false);
  }, []);

  useInactivity(useCallback(() => {
    if (userProfile) setHibernating(true);
  }, [userProfile]));

  const handleProfileUpdated = useCallback((profile: UserProfile) => {
    setUserProfile(profile);
  }, []);

  // ===== Student CRUD =====
  const addStudent = useCallback(async (data: Omit<Student, 'id' | 'created_at' | 'saldo' | 'status'>) => {
    const payload = { ...data, saldo: 0, status: 'Ativo' };
    const { data: created, error } = await supabase.from('alunos').insert(payload).select().maybeSingle();
    if (error) { showNotice('Erro ao cadastrar aluno. Verifique a matrícula.'); return; }
    if (created) setStudents((cur) => [created as Student, ...cur]);
    await logAudit('Aluno cadastrado', 'Aluno', `Novo aluno: ${data.nome} (${data.matricula})`, actorName, null, payload as unknown as Record<string, unknown>, (created as { id?: string })?.id ?? null);
    await refreshAudit();
    showNotice('Aluno cadastrado com sucesso.');
  }, [showNotice, refreshAudit, actorName]);

  const editStudent = useCallback(async (id: string, data: Partial<Student>) => {
    const { data: updated, error } = await supabase.from('alunos').update(data).eq('id', id).select().maybeSingle();
    if (error) { showNotice('Erro ao editar aluno.'); return; }
    if (updated) setStudents((cur) => cur.map((s) => s.id === id ? { ...s, ...(updated as Student) } : s));
    const oldStudent = students.find((s) => s.id === id);
    await logAudit('Aluno editado', 'Aluno', `Aluno editado: ${oldStudent?.nome ?? id}`, actorName, oldStudent as unknown as Record<string, unknown> ?? null, data as unknown as Record<string, unknown>, id);
    await refreshAudit();
    showNotice('Dados do aluno atualizados.');
  }, [showNotice, students, refreshAudit, actorName]);

  const deleteStudent = useCallback(async (id: string) => {
    const student = students.find((s) => s.id === id);
    const { error } = await supabase.from('alunos').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar aluno.'); return; }
    setStudents((cur) => cur.filter((s) => s.id !== id));
    setPayments((cur) => cur.filter((p) => p.aluno_id !== id));
    await logAudit('Aluno eliminado', 'Aluno', `Aluno eliminado: ${student?.nome ?? id} (${student?.matricula ?? ''})`, actorName, student as unknown as Record<string, unknown> ?? null, null, id);
    await refreshAudit();
    showNotice('Aluno eliminado.');
  }, [showNotice, students, refreshAudit, actorName, setPayments]);

  // ===== Payment CRUD =====
  const addPayment = useCallback(async (data: { aluno_id: string; valor: number; competencia: string; metodo: string; tipo: string; data_pagamento: string; utilizador: string; disciplina?: string | null; periodicidade?: string | null; periodo_cobertura?: string | null; antecipado?: boolean }) => {
    const payload = { ...data, status: 'Confirmado', recibo: generateReceiptCode(), categoria: data.tipo };
    const { data: created, error } = await supabase.from('pagamentos').insert(payload).select('*, aluno:alunos(nome, matricula, turma, classe, turno)').maybeSingle();
    if (error) { showNotice('Erro ao registrar pagamento.'); return; }
    if (created) setPayments((cur) => [created as Payment, ...cur]);
    const student = students.find((s) => s.id === data.aluno_id);
    await logAudit('Pagamento registrado', 'Pagamento', `Pagamento de ${data.tipo} (${formatKz(data.valor)}) para ${student?.nome ?? 'aluno'}`, data.utilizador, null, payload as unknown as Record<string, unknown>, (created as { id?: string })?.id ?? null);
    await refreshAudit();
    showNotice('Pagamento confirmado e recibo emitido.');
  }, [showNotice, students, refreshAudit]);

  const editPayment = useCallback(async (id: string, data: Partial<Payment>) => {
    const { data: updated, error } = await supabase.from('pagamentos').update(data).eq('id', id).select('*, aluno:alunos(nome, matricula, turma, classe, turno)').maybeSingle();
    if (error) { showNotice('Erro ao editar pagamento.'); return; }
    if (updated) setPayments((cur) => cur.map((p) => p.id === id ? { ...p, ...(updated as Payment) } : p));
    const oldPayment = payments.find((p) => p.id === id);
    await logAudit('Pagamento corrigido', 'Pagamento', `Pagamento corrigido: ${oldPayment?.recibo ?? id}`, actorName, oldPayment as unknown as Record<string, unknown> ?? null, data as unknown as Record<string, unknown>, id);
    await refreshAudit();
    showNotice('Pagamento corrigido.');
  }, [showNotice, payments, refreshAudit, actorName]);

  const deletePayment = useCallback(async (id: string) => {
    const payment = payments.find((p) => p.id === id);
    const { error } = await supabase.from('pagamentos').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar pagamento.'); return; }
    setPayments((cur) => cur.filter((p) => p.id !== id));
    await logAudit('Pagamento eliminado', 'Pagamento', `Pagamento eliminado: ${payment?.recibo ?? id} (${payment?.aluno?.nome ?? ''})`, actorName, payment as unknown as Record<string, unknown> ?? null, null, id);
    await refreshAudit();
    showNotice('Pagamento eliminado.');
  }, [showNotice, payments, refreshAudit, actorName]);

  // ===== Fund Request =====
  const addFundRequest = useCallback(async (data: { descricao: string; categoria: string; fornecedor: string | null; valor: number; vencimento: string | null; tipo: string }) => {
    const payload = { ...data, status: 'Pendente', solicitado_por: actorName };
    const { data: created, error } = await supabase.from('pedidos_saida').insert(payload).select().maybeSingle();
    if (error) { showNotice('Erro ao criar pedido.'); return; }
    if (created) setFundRequests((cur) => [created as FundRequest, ...cur]);
    const createdId = (created as { id?: string })?.id;
    if (createdId) {
      await createNotification(createdId, `Novo pedido de ${data.tipo.toLowerCase()}`, data.descricao);
      await refreshNotifications();
    }
    await logAudit('Pedido criado', 'Saída de fundos', `Pedido: ${data.descricao} (${formatKz(data.valor)})`, actorName, null, payload as unknown as Record<string, unknown>, createdId ?? null);
    await refreshAudit();
    showNotice('Pedido enviado. Notificação gerada para o administrador.');
  }, [showNotice, refreshAudit, refreshNotifications, actorName]);

  const approveFundRequest = useCallback(async (id: string, decisaoPor: string, approved: boolean) => {
    const newStatus = approved ? 'Aprovado' : 'Recusado';
    const { data: updated, error } = await supabase.from('pedidos_saida').update({ status: newStatus, decisao_por: decisaoPor, decisao_em: new Date().toISOString() }).eq('id', id).select().maybeSingle();
    if (error) { showNotice('Erro ao processar decisão.'); return; }
    if (updated) setFundRequests((cur) => cur.map((r) => r.id === id ? { ...r, ...(updated as FundRequest) } : r));
    const req = fundRequests.find((r) => r.id === id);
    await logAudit(approved ? 'Pedido aprovado' : 'Pedido recusado', 'Saída de fundos', `${approved ? 'Aprovado' : 'Recusado'}: ${req?.descricao ?? id} por ${decisaoPor}`, decisaoPor, req as unknown as Record<string, unknown> ?? null, { status: newStatus, decisao_por: decisaoPor } as unknown as Record<string, unknown>, id);
    await refreshAudit();
    showNotice(approved ? 'Pedido aprovado com sucesso.' : 'Pedido recusado.');
  }, [showNotice, fundRequests, refreshAudit]);

  const deleteFundRequest = useCallback(async (id: string) => {
    const req = fundRequests.find((r) => r.id === id);
    const { error } = await supabase.from('pedidos_saida').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar pedido.'); return; }
    setFundRequests((cur) => cur.filter((r) => r.id !== id));
    await logAudit('Pedido eliminado', 'Saída de fundos', `Pedido eliminado: ${req?.descricao ?? id}`, actorName, req as unknown as Record<string, unknown> ?? null, null, id);
    await refreshAudit();
    showNotice('Pedido eliminado.');
  }, [showNotice, fundRequests, refreshAudit, actorName]);

  // ===== Faturas =====
  const addFatura = useCallback(async (data: { funcionario_nome: string; especificacao: string; valor: number; data_fatura: string; file_url: string | null; file_path: string | null }) => {
    const { error } = await supabase.from('faturas').insert(data);
    if (error) { showNotice('Erro ao submeter fatura.'); return; }
    await refreshFaturas();
    await logAudit('Fatura submetida', 'Fatura', `Fatura de ${data.funcionario_nome}: ${data.especificacao} (${formatKz(data.valor)})`, actorName, null, data as unknown as Record<string, unknown>, null);
    await refreshAudit();
    showNotice('Fatura submetida com sucesso.');
  }, [showNotice, refreshFaturas, refreshAudit, actorName]);

  const approveFatura = useCallback(async (id: string, decisaoPor: string, approved: boolean) => {
    const newStatus = approved ? 'Aprovada' : 'Rejeitada';
    const { error } = await supabase.from('faturas').update({ status: newStatus, decisao_por: decisaoPor, decisao_em: new Date().toISOString() }).eq('id', id);
    if (error) { showNotice('Erro ao processar decisão.'); return; }
    await refreshFaturas();
    const fatura = faturas.find((f) => f.id === id);
    await logAudit(approved ? 'Fatura aprovada' : 'Fatura rejeitada', 'Fatura', `${approved ? 'Aprovada' : 'Rejeitada'}: ${fatura?.especificacao ?? id} por ${decisaoPor}`, decisaoPor, null, { status: newStatus } as unknown as Record<string, unknown>, id);
    await refreshAudit();
    showNotice(approved ? 'Fatura aprovada.' : 'Fatura rejeitada.');
  }, [showNotice, faturas, refreshFaturas, refreshAudit]);

  const deleteFatura = useCallback(async (id: string) => {
    const fatura = faturas.find((f) => f.id === id);
    if (fatura?.file_path) {
      await supabase.storage.from('faturas').remove([fatura.file_path]);
    }
    const { error } = await supabase.from('faturas').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar fatura.'); return; }
    await refreshFaturas();
    await logAudit('Fatura eliminada', 'Fatura', `Fatura eliminada: ${fatura?.especificacao ?? id}`, actorName, fatura as unknown as Record<string, unknown> ?? null, null, id);
    await refreshAudit();
    showNotice('Fatura eliminada.');
  }, [showNotice, faturas, refreshFaturas, refreshAudit, actorName]);

  // ===== Secretaria =====
  const addSecretariaReq = useCallback(async (data: { tipo: string; aluno_id: string | null; aluno_nome: string | null; descricao: string | null; valor: number; pago: boolean; status: string }) => {
    const { error } = await supabase.from('secretaria').insert(data);
    if (error) { showNotice('Erro ao registar pedido.'); return; }
    await refreshSecretaria();
    await logAudit('Pedido de secretaria', 'Secretaria', `${data.tipo}: ${data.aluno_nome ?? 'Sem aluno'} - ${data.descricao ?? ''}`, actorName, null, data as unknown as Record<string, unknown>, null);
    await refreshAudit();
    showNotice('Pedido registado.');
  }, [showNotice, refreshSecretaria, refreshAudit, actorName]);

  const updateSecretariaReq = useCallback(async (id: string, data: Partial<SecretariaRequest>) => {
    const { error } = await supabase.from('secretaria').update(data).eq('id', id);
    if (error) { showNotice('Erro ao atualizar pedido.'); return; }
    await refreshSecretaria();
    await logAudit('Pedido de secretaria atualizado', 'Secretaria', `Pedido ${id} atualizado`, actorName, null, data as unknown as Record<string, unknown>, id);
    await refreshAudit();
    showNotice('Pedido atualizado.');
  }, [showNotice, refreshSecretaria, refreshAudit, actorName]);

  const deleteSecretariaReq = useCallback(async (id: string) => {
    const { error } = await supabase.from('secretaria').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar pedido.'); return; }
    await refreshSecretaria();
    await logAudit('Pedido de secretaria eliminado', 'Secretaria', `Pedido ${id} eliminado`, actorName, null, null, id);
    await refreshAudit();
    showNotice('Pedido eliminado.');
  }, [showNotice, refreshSecretaria, refreshAudit, actorName]);

  // ===== Saved Reports =====
  const saveReport = useCallback(async (tipo: string, dataReferencia: string, dados: Record<string, unknown>) => {
    const { error } = await supabase.from('relatorios_salvos').insert({ tipo, data_referencia: dataReferencia, dados, criado_por: actorName });
    if (error) return;
    await refreshSavedReports();
  }, [refreshSavedReports, actorName]);

  const deleteReport = useCallback(async (id: string) => {
    const { error } = await supabase.from('relatorios_salvos').delete().eq('id', id);
    if (error) { showNotice('Erro ao eliminar relatório.'); return; }
    await refreshSavedReports();
    await logAudit('Relatório eliminado', 'Relatório', `Relatório ${id} eliminado`, actorName, null, null, id);
    await refreshAudit();
    showNotice('Relatório eliminado.');
  }, [showNotice, refreshSavedReports, refreshAudit, actorName]);

  // ===== Notification =====
  const readNotification = useCallback(async (id: string) => {
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id);
    setNotifications((cur) => cur.map((n) => n.id === id ? { ...n, lida: true } : n));
  }, []);

  return (
    <div className="app-shell">
      {!userProfile && authReady && <Login onAuthenticated={handleAuthenticated} />}
      {userProfile && <Sidebar
        view={view}
        onNavigate={navigate}
        mobileNav={mobileNav}
        setMobileNav={setMobileNav}
        notifications={notifications}
        onReadNotification={readNotification}
        onNavigateFromNotification={navigate}
        unreadCount={unreadCount}
        userProfile={userProfile}
        onLogout={handleLogout}
        onlineUsers={onlineUsers}
      />}
      {userProfile && mobileNav && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setMobileNav(false)} />}
      {userProfile && <main className="main-content">
        <TopBar
          view={view}
          onMobileNav={() => setMobileNav(true)}
          notifications={notifications}
          unreadCount={unreadCount}
          onReadNotification={readNotification}
          onNavigateFromNotification={navigate}
          userProfile={userProfile}
          onNavigate={navigate}
        />
        <div className="page-content">
          {view === 'dashboard' && (
            <Dashboard
              payments={payments}
              fundRequests={fundRequests}
              audit={audit}
              activeStudents={students.filter((s) => s.status === 'Ativo').length}
              students={students}
              dailyHistory={dailyHistory}
              onNavigate={navigate}
              onAddPayment={() => navigate('treasury')}
            />
          )}
          {view === 'students' && !profileStudent && (
            <Students
              students={students}
              onAdd={addStudent}
              onEdit={editStudent}
              onDelete={deleteStudent}
              onViewProfile={(s) => setProfileStudent(s)}
            />
          )}
          {view === 'students' && profileStudent && (
            <StudentProfile
              student={profileStudent}
              payments={payments}
              onBack={() => setProfileStudent(null)}
            />
          )}
          {view === 'treasury' && (
            <Treasury
              payments={payments}
              students={students}
              actorName={actorName}
              onAddPayment={addPayment}
              onEditPayment={editPayment}
              onDeletePayment={deletePayment}
            />
          )}
          {view === 'fundrequests' && (
            <FundRequests
              fundRequests={fundRequests}
              onAdd={addFundRequest}
              onApprove={approveFundRequest}
              onDelete={deleteFundRequest}
              userName={actorName}
            />
          )}
          {view === 'faturas' && (
            <Faturas
              faturas={faturas}
              onAdd={addFatura}
              onApprove={approveFatura}
              onDelete={deleteFatura}
              userName={actorName}
            />
          )}
          {view === 'secretaria' && (
            <Secretaria
              requests={secretariaReqs}
              students={students}
              onAdd={addSecretariaReq}
              onUpdate={updateSecretariaReq}
              onDelete={deleteSecretariaReq}
            />
          )}
          {view === 'profile' && (
            <UserProfilePage userProfile={userProfile} onUpdated={handleProfileUpdated} onNotice={showNotice} />
          )}
          {view === 'reports' && userProfile.tipo === 'administrador' && (
            <Reports
              payments={payments}
              fundRequests={fundRequests}
              savedReports={savedReports}
              onSaveReport={saveReport}
              onDeleteReport={deleteReport}
            />
          )}
          {view === 'audit' && userProfile.tipo === 'administrador' && (
            <AuditView audit={audit} />
          )}
        </div>
      </main>}
      {hibernating && userProfile && (
        <HibernationScreen userProfile={userProfile} onUnlock={() => setHibernating(false)} />
      )}
      {adminGate && (
        <AdminPasswordGate
          onSuccess={handleAdminGateSuccess}
          onCancel={() => setAdminGate(null)}
        />
      )}
      {notice && (
        <div className="toast">
          <div><Check size={16} /></div>
          {notice}
        </div>
      )}
      {loading && (
        <div className="sync-note">A carregar dados da escola…</div>
      )}
    </div>
  );
}

export default App;
