import { useMemo, useState } from 'react';
import {
  User, Calendar, Users, GraduationCap,
  CheckCircle2, AlertTriangle, Clock, CreditCard, FileText,
  ArrowLeft, Phone, Mail, MapPin, IdCard,
} from 'lucide-react';
import type { Student, Payment } from '@/lib/types';
import { formatKz, formatDate, getInitials, computeMonthStatuses, type MonthStatus } from '@/lib/utils';

type StudentProfileProps = {
  student: Student;
  payments: Payment[];
  onBack: () => void;
};

export function StudentProfile({ student, payments, onBack }: StudentProfileProps) {
  const studentPayments = payments.filter((p) => p.aluno_id === student.id);
  const propinaPayments = studentPayments.filter((p) => p.tipo === 'Propina');
  const monthStatuses = useMemo(
    () => computeMonthStatuses(student.data_entrada, propinaPayments, Number(student.mensalidade)),
    [student, propinaPayments],
  );

  const uniformePayments = studentPayments.filter((p) => p.tipo === 'Uniforme');
  const cartaoPayments = studentPayments.filter((p) => p.tipo === 'Cartão');
  const folhaPayments = studentPayments.filter((p) => p.tipo === 'Folha de Provas');
  const multaPayments = studentPayments.filter((p) => p.tipo === 'Multa do mês');
  const recursoPayments = studentPayments.filter((p) => p.tipo === 'Recurso');
  const seguroPayments = studentPayments.filter((p) => p.tipo === 'Taxa de Seguro');
  const otherPayments = studentPayments.filter((p) => !['Propina', 'Uniforme', 'Cartão', 'Folha de Provas', 'Multa do mês', 'Recurso', 'Taxa de Seguro'].includes(p.tipo));

  const totalPago = studentPayments.reduce((s, p) => s + Number(p.valor), 0);
  const dividaCount = monthStatuses.filter((m) => m.status === 'divida').length;
  const pagoCount = monthStatuses.filter((m) => m.status === 'pago').length;

  return (
    <div className="student-profile-page">
      {/* Back button */}
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={16} /> Voltar aos alunos
      </button>

      {/* Profile header card */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-hero-avatar">{getInitials(student.nome)}</div>
          <div className="profile-hero-info">
            <h1>{student.nome}</h1>
            <div className="profile-hero-tags">
              <span className="profile-tag">{student.classe}</span>
              <span className="profile-tag">Turma {student.turma}</span>
              <span className="profile-tag">{student.turno}</span>
              <span className="profile-tag">Nº {student.matricula}</span>
            </div>
            <div className="profile-hero-meta">
              <span><Calendar size={13} /> Entrada: {formatDate(student.data_entrada)}</span>
              <span><GraduationCap size={13} /> Ano letivo: {student.ano_letivo ?? '—'}</span>
              <span className={`status-badge ${student.status === 'Ativo' ? 'active' : 'inactive'}`}>{student.status}</span>
            </div>
          </div>
        </div>
        <div className="profile-hero-stats">
          <div className="hero-stat">
            <span>Total pago</span>
            <b className="green">{formatKz(totalPago)}</b>
          </div>
          <div className="hero-stat">
            <span>Meses pagos</span>
            <b className="green">{pagoCount}</b>
          </div>
          <div className="hero-stat">
            <span>Meses em dívida</span>
            <b className={dividaCount > 0 ? 'red' : 'green'}>{dividaCount}</b>
          </div>
        </div>
      </div>

      {/* Info cards */}
      <div className="profile-info-grid">
        <div className="profile-card">
          <div className="profile-card-header">
            <User size={16} /> <h3>Dados do aluno</h3>
          </div>
          <div className="info-list">
            <InfoRow icon={<User size={12} />} label="Nome completo" value={student.nome} />
            <InfoRow icon={<Calendar size={12} />} label="Data de nascimento" value={formatDate(student.data_nascimento)} />
            <InfoRow icon={<User size={12} />} label="Sexo" value={student.sexo ?? '—'} />
            <InfoRow icon={<IdCard size={12} />} label="Documento de identificação" value={student.documento_id ?? '—'} />
            <InfoRow icon={<Phone size={12} />} label="Telefone" value={student.telefone ?? '—'} />
            <InfoRow icon={<Mail size={12} />} label="E-mail" value={student.email ?? '—'} />
            <InfoRow icon={<MapPin size={12} />} label="Morada" value={student.morada ?? '—'} />
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-card-header">
            <GraduationCap size={16} /> <h3>Dados escolares</h3>
          </div>
          <div className="info-list">
            <InfoRow icon={<GraduationCap size={12} />} label="Classe" value={student.classe} />
            <InfoRow icon={<Users size={12} />} label="Turma" value={student.turma} />
            <InfoRow icon={<Clock size={12} />} label="Turno" value={student.turno} />
            <InfoRow icon={<Calendar size={12} />} label="Ano letivo" value={student.ano_letivo ?? '—'} />
            <InfoRow icon={<CreditCard size={12} />} label="Mensalidade" value={formatKz(Number(student.mensalidade))} />
            <InfoRow icon={<Calendar size={12} />} label="Data de entrada" value={formatDate(student.data_entrada)} />
            <InfoRow icon={<CheckCircle2 size={12} />} label="Estado da matrícula" value={student.status} />
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-card-header">
            <Users size={16} /> <h3>Informações do encarregado</h3>
          </div>
          <div className="info-list">
            <InfoRow icon={<User size={12} />} label="Nome" value={student.enc_nome ?? student.responsavel ?? '—'} />
            <InfoRow icon={<Users size={12} />} label="Grau de parentesco" value={student.enc_parentesco ?? '—'} />
            <InfoRow icon={<Phone size={12} />} label="Contacto" value={student.enc_telefone ?? student.telefone ?? '—'} />
            <InfoRow icon={<MapPin size={12} />} label="Morada" value={student.enc_morada ?? '—'} />
            <InfoRow icon={<IdCard size={12} />} label="Documento" value={student.enc_documento ?? '—'} />
          </div>
        </div>
      </div>

      {/* Monthly payment grid */}
      <div className="profile-card full-width">
        <div className="profile-card-header">
          <Calendar size={16} /> <h3>Quadro de mensalidades</h3>
          <div className="month-legend">
            <span className="legend-item"><i className="legend-dot green" /> Pago</span>
            <span className="legend-item"><i className="legend-dot blue" /> Antecipado</span>
            <span className="legend-item"><i className="legend-dot yellow" /> Pendente</span>
            <span className="legend-item"><i className="legend-dot red" /> Dívida</span>
          </div>
        </div>
        <div className="month-grid">
          {monthStatuses.map((m) => (
            <MonthCard key={m.label} month={m} mensalidade={Number(student.mensalidade)} />
          ))}
        </div>
      </div>

      {/* Other payments */}
      <div className="profile-payments-grid">
        <div className="profile-card">
          <div className="profile-card-header">
            <AlertTriangle size={16} /> <h3>Multas do mês</h3>
          </div>
          <PaymentMiniList payments={multaPayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <FileText size={16} /> <h3>Recursos</h3>
          </div>
          <PaymentMiniList payments={recursoPayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <CreditCard size={16} /> <h3>Taxa de Seguro</h3>
          </div>
          <PaymentMiniList payments={seguroPayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <CreditCard size={16} /> <h3>Uniformes</h3>
          </div>
          <PaymentMiniList payments={uniformePayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <CreditCard size={16} /> <h3>Cartões escolares</h3>
          </div>
          <PaymentMiniList payments={cartaoPayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <FileText size={16} /> <h3>Folhas de provas</h3>
          </div>
          <PaymentMiniList payments={folhaPayments} />
        </div>
        <div className="profile-card">
          <div className="profile-card-header">
            <FileText size={16} /> <h3>Outros pagamentos</h3>
          </div>
          <PaymentMiniList payments={otherPayments} />
        </div>
      </div>
    </div>
  );
}

function MonthCard({ month, mensalidade }: { month: MonthStatus; mensalidade: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`month-card ${month.status}`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="month-card-month">{month.label.split(' ')[0]}</div>
      <div className="month-card-year">{month.label.split(' ')[1]}</div>
      <div className="month-card-status">
        {month.status === 'pago' && <><CheckCircle2 size={14} /> Pago</>}
        {month.status === 'antecipado' && <><CheckCircle2 size={14} /> Antecipado</>}
        {month.status === 'aberto' && <><Clock size={14} /> Pendente</>}
        {month.status === 'divida' && <><AlertTriangle size={14} /> Dívida</>}
      </div>
      {expanded && (
        <div className="month-card-details">
          <div><span>Valor</span><b>{formatKz(mensalidade)}</b></div>
          <div><span>Pago em</span><b>{month.dataPagamento ? formatDate(month.dataPagamento) : '—'}</b></div>
          <div><span>Estado</span><b className={month.status}>{month.status === 'pago' ? 'Pago' : month.status === 'antecipado' ? 'Pago antecipadamente' : month.status === 'aberto' ? 'Pendente' : 'Em dívida'}</b></div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="info-row">
      <span className="info-label">{icon} {label}</span>
      <b className="info-value">{value}</b>
    </div>
  );
}

function PaymentMiniList({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) return <p className="detail-empty">Nenhum registo.</p>;
  return (
    <div className="mini-payment-list">
      {payments.map((p) => (
        <div key={p.id}>
          <span>{formatDate(p.data_pagamento)}</span>
          <b>{formatKz(Number(p.valor))}</b>
        </div>
      ))}
    </div>
  );
}
