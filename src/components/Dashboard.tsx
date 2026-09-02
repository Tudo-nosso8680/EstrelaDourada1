import { type ReactNode, useMemo } from 'react';
import {
  ArrowUpRight, ClipboardList, CreditCard, FileText, Shirt,
  ChevronRight, CircleDollarSign, Users, ArrowDownLeft, Calendar,
  AlertTriangle,
} from 'lucide-react';
import type { Payment, FundRequest, AuditEntry, View, DailyHistoryEntry, Student } from '@/lib/types';
import { formatKz, timeAgo, getInitials, formatDate, todayString, computeDebtStats } from '@/lib/utils';
import { PageHeading } from '@/components/ui';

type DashboardProps = {
  payments: Payment[];
  fundRequests: FundRequest[];
  audit: AuditEntry[];
  activeStudents: number;
  students: Student[];
  dailyHistory: DailyHistoryEntry[];
  onNavigate: (view: View) => void;
  onAddPayment: () => void;
};

export function Dashboard({ payments, fundRequests, audit, activeStudents, students, dailyHistory, onNavigate, onAddPayment }: DashboardProps) {
  const today = todayString();
  const todayPayments = payments.filter((p) => (p.data_pagamento ?? p.created_at.slice(0, 10)).slice(0, 10) === today);
  const todayTotal = todayPayments.reduce((s, p) => s + Number(p.valor), 0);

  const propinaTotal = todayPayments.filter((p) => p.tipo === 'Propina').reduce((s, p) => s + Number(p.valor), 0);
  const uniformeTotal = todayPayments.filter((p) => p.tipo === 'Uniforme').reduce((s, p) => s + Number(p.valor), 0);
  const cartaoTotal = todayPayments.filter((p) => p.tipo === 'Cartão').reduce((s, p) => s + Number(p.valor), 0);
  const folhaTotal = todayPayments.filter((p) => p.tipo === 'Folha de Provas').reduce((s, p) => s + Number(p.valor), 0);

  const pendingRequests = fundRequests.filter((r) => r.status === 'Pendente');

  const { debtors, monthsInDebt } = useMemo(() => computeDebtStats(students, payments), [students, payments]);

  const todayLabel = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <>
      <PageHeading
        eyebrow={todayLabel.toUpperCase()}
        title={`${greeting}, bem-vindo`}
        description="Visão geral diária da Estrela Dourada De Belas. Os valores reiniciam-se a cada novo dia."
        action={onAddPayment}
        actionLabel="Registrar pagamento"
      />

      <div className="daily-banner">
        <div className="daily-banner-icon"><Calendar size={20} /></div>
        <div>
          <b>Arrecadação de hoje — {formatDate(today)}</b>
          <span>Cada novo dia começa com os valores diários zerados. Os dados anteriores ficam no histórico.</span>
        </div>
        <div className="daily-banner-total">{formatKz(todayTotal)}</div>
      </div>

      <div className="metric-grid">
        <MetricCard label="Arrecadado hoje" value={formatKz(todayTotal)} detail={`${todayPayments.length} pagamentos hoje`} icon={<CircleDollarSign size={18} />} tone="gold" />
        <MetricCard label="Propinas hoje" value={formatKz(propinaTotal)} detail="mensalidades do dia" icon={<ArrowUpRight size={18} />} tone="green" />
        <MetricCard label="Alunos ativos" value={String(activeStudents)} detail="matriculados" icon={<Users size={18} />} tone="blue" />
        <MetricCard label="Pedidos pendentes" value={String(pendingRequests.length)} detail="aguardando aprovação" icon={<ClipboardList size={18} />} tone="orange" />
      </div>

      {/* Debtors section */}
      <div className="debtors-section">
        <div className="debtors-section-header">
          <h2><AlertTriangle size={18} /> Situação financeira dos alunos</h2>
        </div>
        <div className="debtors-grid">
          <div className="debtors-card">
            <div className="debtors-icon blue"><Users size={20} /></div>
            <div>
              <span>Alunos matriculados</span>
              <b>{activeStudents}</b>
            </div>
          </div>
          <div className="debtors-card">
            <div className="debtors-icon green"><ArrowUpRight size={20} /></div>
            <div>
              <span>Alunos em dia</span>
              <b className="green">{activeStudents - debtors}</b>
            </div>
          </div>
          <div className="debtors-card">
            <div className="debtors-icon red"><AlertTriangle size={20} /></div>
            <div>
              <span>Alunos em dívida</span>
              <b className="red">{debtors}</b>
            </div>
          </div>
          <div className="debtors-card">
            <div className="debtors-icon orange"><FileText size={20} /></div>
            <div>
              <span>Mensalidades em dívida</span>
              <b className="orange">{monthsInDebt}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="revenue-breakdown">
        <h2>Arrecadação de hoje por tipo</h2>
        <div className="revenue-types">
          <RevenueCard icon={<ArrowUpRight size={18} />} label="Propinas" value={formatKz(propinaTotal)} tone="green" />
          <RevenueCard icon={<Shirt size={18} />} label="Uniformes" value={formatKz(uniformeTotal)} tone="blue" />
          <RevenueCard icon={<CreditCard size={18} />} label="Cartões" value={formatKz(cartaoTotal)} tone="gold" />
          <RevenueCard icon={<FileText size={18} />} label="Folhas de Provas" value={formatKz(folhaTotal)} tone="orange" />
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div><h2>Histórico diário</h2><p>Arrecadação, saídas e total líquido por dia</p></div>
          <button className="text-button" onClick={() => onNavigate('reports')}>Relatórios <ChevronRight size={14} /></button>
        </div>
        <div className="data-table">
          <div className="table-head">
            <span>Data</span><span>Total arrecadado</span><span>Saídas de fundos</span><span>Total líquido</span>
          </div>
          {dailyHistory.length === 0 && <div className="empty-state">Sem histórico disponível.</div>}
          {dailyHistory.slice(0, 15).map((entry) => (
            <div className="table-row" key={entry.data}>
              <span><b>{formatDate(entry.data)}</b></span>
              <span className="green">{formatKz(entry.total_arrecadado)}</span>
              <span className="red">{formatKz(entry.saidas_fundos)}</span>
              <span><b>{formatKz(entry.total_liquido)}</b></span>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div><h2>Pagamentos recentes</h2><p>Últimas movimentações</p></div>
            <button className="text-button" onClick={() => onNavigate('treasury')}>Ver todos <ChevronRight size={14} /></button>
          </div>
          <div className="activity-list">
            {payments.length === 0 && <div className="empty-state">Nenhum pagamento registado.</div>}
            {payments.slice(0, 5).map((payment) => (
              <div className="payment-row" key={payment.id}>
                <div className="person-avatar">{getInitials(payment.aluno?.nome ?? 'A')}</div>
                <div className="row-main">
                  <b>{payment.aluno?.nome ?? 'Aluno'}</b>
                  <span>{payment.tipo} · {payment.competencia}</span>
                </div>
                <div className="row-value">
                  <b>{formatKz(Number(payment.valor))}</b>
                  <span className="status-confirmed">{payment.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div><h2>Pedidos pendentes</h2><p>Saídas aguardando aprovação</p></div>
            <button className="text-button" onClick={() => onNavigate('fundrequests')}>Ver todos <ChevronRight size={14} /></button>
          </div>
          <div className="activity-list">
            {pendingRequests.length === 0 && <div className="empty-state">Nenhum pedido pendente.</div>}
            {pendingRequests.slice(0, 4).map((req) => (
              <div className="payment-row" key={req.id}>
                <div className="expense-icon"><ArrowDownLeft size={17} /></div>
                <div className="row-main">
                  <b>{req.descricao}</b>
                  <span>{req.tipo} · {req.categoria}</span>
                </div>
                <div className="row-value">
                  <b>{formatKz(Number(req.valor))}</b>
                  <span className="status-pending">Pendente</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div><h2>Atividade recente</h2><p>Registro de ações do sistema</p></div>
          <button className="text-button" onClick={() => onNavigate('audit')}>Auditoria <ChevronRight size={14} /></button>
        </div>
        <div className="timeline">
          {audit.length === 0 && <div className="empty-state">Sem atividade registada.</div>}
          {audit.slice(0, 5).map((item) => (
            <div className="timeline-item" key={item.id}>
              <div className="timeline-dot" />
              <div>
                <b>{item.acao}</b>
                <span>{item.descricao}</span>
                <small>{item.responsavel} · {timeAgo(item.created_at)}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function MetricCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function RevenueCard({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`revenue-card ${tone}`}>
      <div className="revenue-icon">{icon}</div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
