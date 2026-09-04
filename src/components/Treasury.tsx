import { useMemo, useState, type FormEvent } from 'react';
import {
  Pencil, Search, Trash2, Wallet,
  FileText, Shirt, CreditCard, AlertTriangle, CheckCircle2,
  Shield, Gavel, BookOpen,
} from 'lucide-react';
import type { Payment, Student } from '@/lib/types';
import {
  PAYMENT_TYPES, PAYMENT_METHODS,
  SEGURO_PERIODICIDADES, SEGURO_VALORES,
  DISCIPLINAS_BY_CURSO, MESES_ANO,
} from '@/lib/types';
import { formatKz, formatDate, getInitials, currentMonthLabel, computeDebtMonths, currentOpenMonth, todayString, ANO_LETIVO_MESES } from '@/lib/utils';
import { PageHeading, Badge, EmptyState, FormField, FormActions } from '@/components/ui';
import { Modal } from '@/components/Modal';

type TreasuryProps = {
  payments: Payment[];
  students: Student[];
  actorName: string;
  onAddPayment: (data: { aluno_id: string; valor: number; competencia: string; metodo: string; tipo: string; data_pagamento: string; utilizador: string; disciplina?: string | null; periodicidade?: string | null; periodo_cobertura?: string | null; antecipado?: boolean }) => Promise<void>;
  onEditPayment: (id: string, data: Partial<Payment>) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
};

export function Treasury({ payments, students, actorName, onAddPayment, onEditPayment, onDeletePayment }: TreasuryProps) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | 'detail' | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    return payments.filter((p) => `${p.aluno?.nome ?? ''} ${p.recibo} ${p.competencia} ${p.tipo}`.toLowerCase().includes(query.toLowerCase()));
  }, [payments, query]);

  const totals = useMemo(() => ({
    propina: payments.filter((p) => p.tipo === 'Propina').reduce((s, p) => s + Number(p.valor), 0),
    multa: payments.filter((p) => p.tipo === 'Multa do mês').reduce((s, p) => s + Number(p.valor), 0),
    recurso: payments.filter((p) => p.tipo === 'Recurso').reduce((s, p) => s + Number(p.valor), 0),
    seguro: payments.filter((p) => p.tipo === 'Taxa de Seguro').reduce((s, p) => s + Number(p.valor), 0),
    cota: payments.filter((p) => p.tipo === 'Cota').reduce((s, p) => s + Number(p.valor), 0),
    uniforme: payments.filter((p) => p.tipo === 'Uniforme').reduce((s, p) => s + Number(p.valor), 0),
    cartao: payments.filter((p) => p.tipo === 'Cartão').reduce((s, p) => s + Number(p.valor), 0),
    folha: payments.filter((p) => p.tipo === 'Folha de Provas').reduce((s, p) => s + Number(p.valor), 0),
  }), [payments]);
  const totalGeral = totals.propina + totals.multa + totals.recurso + totals.seguro + totals.cota + totals.uniforme + totals.cartao + totals.folha;

  return (
    <>
      <PageHeading
        eyebrow="TESOURARIA"
        title="Pagamentos"
        description="Registre e acompanhe todos os recebimentos da escola."
        action={() => { setEditing(null); setModal('add'); }}
        actionLabel="Registrar pagamento"
      />

      <div className="revenue-breakdown">
        <div className="revenue-types">
          <RevenueCard icon={<Wallet size={18} />} label="Propinas" value={formatKz(totals.propina)} tone="green" />
          <RevenueCard icon={<Gavel size={18} />} label="Multas" value={formatKz(totals.multa)} tone="red" />
          <RevenueCard icon={<BookOpen size={18} />} label="Recursos" value={formatKz(totals.recurso)} tone="orange" />
          <RevenueCard icon={<Shield size={18} />} label="Seguros" value={formatKz(totals.seguro)} tone="blue" />
          <RevenueCard icon={<Wallet size={18} />} label="Cotas" value={formatKz(totals.cota)} tone="green" />
          <RevenueCard icon={<Shirt size={18} />} label="Uniformes" value={formatKz(totals.uniforme)} tone="blue" />
          <RevenueCard icon={<CreditCard size={18} />} label="Cartões" value={formatKz(totals.cartao)} tone="gold" />
          <RevenueCard icon={<FileText size={18} />} label="Folhas de Provas" value={formatKz(totals.folha)} tone="orange" />
        </div>
        <div className="total-bar">
          <span>Total geral arrecadado</span>
          <b>{formatKz(totalGeral)}</b>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar aluno, recibo, tipo..." />
          </div>
        </div>
        <div className="data-table">
          <div className="table-head">
            <span>Aluno</span>
            <span>Tipo</span>
            <span className="col-hide-mobile">Competência</span>
            <span className="col-hide-mobile">Método</span>
            <span className="col-hide-mobile">Data</span>
            <span>Valor</span>
            <span className="col-hide-mobile">Recibo</span>
            <span />
          </div>
          {filtered.map((payment) => (
            <div className="table-row" key={payment.id}>
              <div className="student-cell clickable" onClick={() => { const s = students.find((st) => st.id === payment.aluno_id); if (s) { setDetailStudent(s); setModal('detail'); } }}>
                <div className="person-avatar">{getInitials(payment.aluno?.nome ?? 'A')}</div>
                <div>
                  <b>{payment.aluno?.nome ?? 'Aluno'}</b>
                  <span>{payment.aluno?.classe ?? ''} · {payment.aluno?.turma ?? ''}</span>
                </div>
              </div>
              <span><Badge label={payment.tipo} tone={payment.tipo === 'Propina' ? 'green' : payment.tipo === 'Uniforme' ? 'blue' : payment.tipo === 'Cartão' ? 'gold' : payment.tipo === 'Multa do mês' ? 'red' : payment.tipo === 'Recurso' ? 'orange' : payment.tipo === 'Taxa de Seguro' ? 'blue' : payment.tipo === 'Cota' ? 'green' : 'orange'} /></span>
              <span className="col-hide-mobile">{payment.competencia}</span>
              <span className="col-hide-mobile">{payment.metodo}</span>
              <span className="col-hide-mobile">{formatDate(payment.data_pagamento)}</span>
              <span><b>{formatKz(Number(payment.valor))}</b></span>
              <span className="col-hide-mobile recibo-cell">{payment.recibo}</span>
              <div className="row-actions">
                <button className="row-icon" title="Editar" onClick={() => { setEditing(payment); setModal('edit'); }}><Pencil size={15} /></button>
                <button className="row-icon danger" title="Eliminar" onClick={() => { setEditing(payment); setModal('delete'); }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        {!filtered.length && <EmptyState text="Nenhum pagamento registado." />}
      </section>

      {modal === 'add' && (
        <Modal title="Registrar pagamento" subtitle="Pesquise o aluno e escolha o tipo de pagamento." size="lg" onClose={() => setModal(null)}>
          <PaymentForm students={students} actorName={actorName} onSubmit={async (data) => { await onAddPayment(data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editing && (
        <Modal title="Editar pagamento" subtitle="Corrija os dados do pagamento." size="lg" onClose={() => setModal(null)}>
          <PaymentForm students={students} actorName={actorName} initial={editing} onSubmit={async (data) => { await onEditPayment(editing.id, data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'delete' && editing && (
        <Modal title="Eliminar pagamento" size="sm" subtitle="Esta ação não pode ser desfeita." onClose={() => setModal(null)}>
          <div className="confirm-delete">
            <p>Tem a certeza que pretende eliminar o pagamento <b>{editing.recibo}</b> de <b>{editing.aluno?.nome ?? 'aluno'}</b>?</p>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="danger-button" onClick={async () => { await onDeletePayment(editing.id); setModal(null); }}>Eliminar</button>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'detail' && detailStudent && (
        <Modal title="Consulta financeira do aluno" subtitle={detailStudent.nome} size="lg" onClose={() => setModal(null)}>
          <StudentFinancialDetail student={detailStudent} payments={payments.filter((p) => p.aluno_id === detailStudent.id)} />
        </Modal>
      )}
    </>
  );
}

function StudentFinancialDetail({ student, payments }: { student: Student; payments: Payment[] }) {
  const propinaPayments = payments.filter((p) => p.tipo === 'Propina');
  const paidMonths = new Set(propinaPayments.map((p) => p.competencia));
  const debtMonths = computeDebtMonths(student.data_entrada, paidMonths);
  const openMonth = currentOpenMonth();

  const multaPayments = payments.filter((p) => p.tipo === 'Multa do mês');
  const recursoPayments = payments.filter((p) => p.tipo === 'Recurso');
  const seguroPayments = payments.filter((p) => p.tipo === 'Taxa de Seguro');
  const uniformePayments = payments.filter((p) => p.tipo === 'Uniforme');
  const cartaoPayments = payments.filter((p) => p.tipo === 'Cartão');
  const folhaPayments = payments.filter((p) => p.tipo === 'Folha de Provas');
  const otherPayments = payments.filter((p) => !['Propina', 'Uniforme', 'Cartão', 'Folha de Provas', 'Multa do mês', 'Recurso', 'Taxa de Seguro', 'Cota'].includes(p.tipo));

  return (
    <div className="student-detail">
      <div className="detail-header">
        <div className="person-avatar lg">{getInitials(student.nome)}</div>
        <div className="detail-info">
          <b>{student.nome}</b>
          <span>Matrícula: {student.matricula}</span>
          <span>Classe: {student.classe} · Turma: {student.turma} · Turno: {student.turno}</span>
          <span>Entrada: {formatDate(student.data_entrada)}</span>
        </div>
        <div className="detail-status">
          <Badge label={student.status} tone="green" />
        </div>
      </div>

      <div className="detail-section">
        <h3>Meses pagos</h3>
        {propinaPayments.length === 0 ? <p className="detail-empty">Nenhum mês pago registado.</p> : (
          <div className="month-chips">
            {propinaPayments.map((p) => (
              <span key={p.id} className={`month-chip ${p.antecipado ? 'antecipado' : 'paid'}`}>
                <CheckCircle2 size={14} /> {p.competencia} · {formatKz(Number(p.valor))}
                {p.antecipado && <small> (antecipado)</small>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Mês atual em aberto</h3>
        <span className="month-chip open">{openMonth}</span>
      </div>

      <div className="detail-section">
        <h3>Meses em dívida</h3>
        {debtMonths.length === 0 ? <p className="detail-empty">Nenhum mês em dívida.</p> : (
          <div className="month-chips">
            {debtMonths.map((m) => <span key={m} className="month-chip debt"><AlertTriangle size={14} /> {m}</span>)}
          </div>
        )}
      </div>

      {multaPayments.length > 0 && (
        <div className="detail-section">
          <h3>Multas do mês</h3>
          <div className="detail-payments">
            {multaPayments.map((p) => <div key={p.id}><span>{p.competencia} · {formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        </div>
      )}

      {recursoPayments.length > 0 && (
        <div className="detail-section">
          <h3>Recursos</h3>
          <div className="detail-payments">
            {recursoPayments.map((p) => <div key={p.id}><span>{p.disciplina ?? '—'} · {formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        </div>
      )}

      {seguroPayments.length > 0 && (
        <div className="detail-section">
          <h3>Taxa de Seguro</h3>
          <div className="detail-payments">
            {seguroPayments.map((p) => <div key={p.id}><span>{p.periodicidade ?? '—'} · {p.periodo_cobertura ?? '—'} · {formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Uniformes</h3>
        {uniformePayments.length === 0 ? <p className="detail-empty">Nenhum pagamento de uniforme.</p> : (
          <div className="detail-payments">
            {uniformePayments.map((p) => <div key={p.id}><span>{formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Cartões escolares</h3>
        {cartaoPayments.length === 0 ? <p className="detail-empty">Nenhum pagamento de cartão.</p> : (
          <div className="detail-payments">
            {cartaoPayments.map((p) => <div key={p.id}><span>{formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Folhas de provas</h3>
        {folhaPayments.length === 0 ? <p className="detail-empty">Nenhum pagamento de folha de provas.</p> : (
          <div className="detail-payments">
            {folhaPayments.map((p) => <div key={p.id}><span>{formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        )}
      </div>

      {otherPayments.length > 0 && (
        <div className="detail-section">
          <h3>Outros pagamentos</h3>
          <div className="detail-payments">
            {otherPayments.map((p) => <div key={p.id}><span>{p.tipo} · {formatDate(p.data_pagamento)}</span><b>{formatKz(Number(p.valor))}</b><small>{p.recibo}</small></div>)}
          </div>
        </div>
      )}

      <div className="detail-section">
        <h3>Histórico completo de pagamentos</h3>
        {payments.length === 0 ? <p className="detail-empty">Sem registos.</p> : (
          <div className="detail-history">
            {payments.map((p) => (
              <div key={p.id}>
                <span><b>{p.tipo}</b> · {p.competencia}</span>
                <span>{formatDate(p.data_pagamento)}</span>
                <b>{formatKz(Number(p.valor))}</b>
                <small>{p.recibo}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RevenueCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`revenue-card ${tone}`}>
      <div className="revenue-icon">{icon}</div>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

type PaymentFormProps = {
  students: Student[];
  actorName: string;
  initial?: Payment;
  onSubmit: (data: { aluno_id: string; valor: number; competencia: string; metodo: string; tipo: string; data_pagamento: string; utilizador: string; disciplina?: string | null; periodicidade?: string | null; periodo_cobertura?: string | null; antecipado?: boolean }) => Promise<void>;
  onCancel: () => void;
};

function PaymentForm({ students, actorName, initial, onSubmit, onCancel }: PaymentFormProps) {
  const [alunoId, setAlunoId] = useState(initial?.aluno_id ?? '');
  const [alunoQuery, setAlunoQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [tipo, setTipo] = useState(initial?.tipo ?? PAYMENT_TYPES[0]);
  const [periodicidade, setPeriodicidade] = useState(initial?.periodicidade ?? SEGURO_PERIODICIDADES[0]);
  const [antecipado, setAntecipado] = useState(initial?.antecipado ?? false);
  const [selectedMonth, setSelectedMonth] = useState(initial?.competencia ?? ANO_LETIVO_MESES[0].label);

  const selectedStudent = students.find((s) => s.id === alunoId) ?? null;
  const studentCurso = selectedStudent?.curso ?? '';
  const disciplinas = studentCurso ? (DISCIPLINAS_BY_CURSO[studentCurso] ?? []) : [];

  const searchResults = useMemo(() => {
    if (!alunoQuery.trim()) return [];
    const q = alunoQuery.toLowerCase();
    return students
      .filter((s) => `${s.nome} ${s.matricula} ${s.documento_id ?? ''} ${s.turma} ${s.classe}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [alunoQuery, students]);

  function handleSelectStudent(s: Student) {
    setAlunoId(s.id);
    setAlunoQuery('');
    setShowResults(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formTipo = String(form.get('tipo'));
    const data: { aluno_id: string; valor: number; competencia: string; metodo: string; tipo: string; data_pagamento: string; utilizador: string; disciplina?: string | null; periodicidade?: string | null; periodo_cobertura?: string | null; antecipado?: boolean } = {
      aluno_id: alunoId,
      valor: Number(form.get('valor')),
      competencia: String(form.get('competencia')),
      metodo: String(form.get('metodo')),
      tipo: formTipo,
      data_pagamento: String(form.get('data_pagamento')),
      utilizador: actorName,
    };

    if (formTipo === 'Recurso') {
      data.disciplina = String(form.get('disciplina') || '');
    }
    if (formTipo === 'Taxa de Seguro') {
      data.periodicidade = String(form.get('periodicidade'));
      data.periodo_cobertura = String(form.get('periodo_cobertura') || '');
    }
    if (formTipo === 'Propina') {
      data.antecipado = antecipado;
    }

    void onSubmit(data);
  }

  const seguroValor = SEGURO_VALORES[periodicidade] ?? 0;

  return (
    <form onSubmit={handleSubmit}>
      {/* Step 1: Pesquisar aluno */}
      <div className="form-section-label">Passo 1 — Pesquisar aluno</div>
      <div className="student-search-field">
        {selectedStudent ? (
          <div className="selected-student-card">
            <div className="person-avatar">{getInitials(selectedStudent.nome)}</div>
            <div className="selected-student-info">
              <b>{selectedStudent.nome}</b>
              <span>{selectedStudent.matricula} · {selectedStudent.classe} · Turma {selectedStudent.turma} · {selectedStudent.turno}</span>
              {selectedStudent.curso && <span>Curso: {selectedStudent.curso}</span>}
            </div>
            <button type="button" className="secondary-button small" onClick={() => { setAlunoId(''); setAlunoQuery(''); }}>Trocar</button>
          </div>
        ) : (
          <div className="search-input-wrapper">
            <Search size={17} />
            <input
              type="text"
              value={alunoQuery}
              onChange={(e) => { setAlunoQuery(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              placeholder="Pesquisar por nome, matrícula, BI, turma ou classe..."
              autoComplete="off"
            />
            {showResults && alunoQuery.trim() && (
              <div className="search-results-dropdown">
                {searchResults.length === 0 ? (
                  <div className="search-no-results">Nenhum aluno encontrado.</div>
                ) : (
                  searchResults.map((s) => (
                    <div key={s.id} className="search-result-item" onClick={() => handleSelectStudent(s)}>
                      <div className="person-avatar sm">{getInitials(s.nome)}</div>
                      <div>
                        <b>{s.nome}</b>
                        <span>{s.matricula} · {s.classe} · Turma {s.turma}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Tipo de pagamento */}
      <div className="form-section-label">Passo 2 — Escolher tipo de pagamento</div>
      <div className="form-grid">
        <FormField label="Tipo de pagamento" name="tipo">
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
      </div>

      {/* Step 3: Campos específicos */}
      <div className="form-section-label">Passo 3 — Dados do pagamento</div>
      <div className="form-grid">
        {tipo === 'Propina' && (
          <>
            <FormField label="Competência (mês)" name="competencia">
              <select name="competencia" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {ANO_LETIVO_MESES.map((am) => {
                  return <option key={am.label} value={am.label}>{am.label}</option>;
                })}
              </select>
            </FormField>
            <FormField label="Valor (KZ)" name="valor" type="number" placeholder={selectedStudent ? String(selectedStudent.mensalidade) : '50000'} required defaultValue={initial?.valor ? String(initial.valor) : (selectedStudent ? String(selectedStudent.mensalidade) : '')} />
            <div className="form-field">
              <label className="checkbox-label">
                <input type="checkbox" name="antecipado" checked={antecipado} onChange={(e) => setAntecipado(e.target.checked)} />
                <span>Pago antecipadamente</span>
              </label>
            </div>
          </>
        )}

        {tipo === 'Multa do mês' && (
          <>
            <FormField label="Competência (mês)" name="competencia">
              <select name="competencia" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {ANO_LETIVO_MESES.map((am) => {
                  return <option key={am.label} value={am.label}>{am.label}</option>;
                })}
              </select>
            </FormField>
            <FormField label="Valor da multa (KZ)" name="valor" type="number" placeholder="2000" required defaultValue={initial?.valor ? String(initial.valor) : ''} />
          </>
        )}

        {tipo === 'Recurso' && (
          <>
            <FormField label="Disciplina" name="disciplina">
              <select name="disciplina" required defaultValue={initial?.disciplina ?? ''} disabled={disciplinas.length === 0}>
                <option value="">{disciplinas.length === 0 ? 'Curso sem disciplinas definidas' : 'Selecionar disciplina...'}</option>
                {disciplinas.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>
            <FormField label="Competência (mês)" name="competencia">
              <select name="competencia" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {ANO_LETIVO_MESES.map((am) => {
                  return <option key={am.label} value={am.label}>{am.label}</option>;
                })}
              </select>
            </FormField>
            <FormField label="Valor do recurso (KZ)" name="valor" type="number" placeholder="3000" required defaultValue={initial?.valor ? String(initial.valor) : ''} />
          </>
        )}

        {tipo === 'Taxa de Seguro' && (
          <>
            <FormField label="Periodicidade" name="periodicidade">
              <select name="periodicidade" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
                {SEGURO_PERIODICIDADES.map((p) => <option key={p} value={p}>{p} — {SEGURO_VALORES[p]} KZ</option>)}
              </select>
            </FormField>
            <FormField label="Período coberto" name="periodo_cobertura" placeholder="Ex.: Setembro 2026" required defaultValue={initial?.periodo_cobertura ?? ''} />
            <FormField label="Valor (KZ)" name="valor" type="number" required defaultValue={initial?.valor ? String(initial.valor) : String(seguroValor)} />
          </>
        )}

        {!['Propina', 'Multa do mês', 'Recurso', 'Taxa de Seguro'].includes(tipo) && (
          <>
            <FormField label="Competência (mês)" name="competencia">
              <select name="competencia" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {ANO_LETIVO_MESES.map((am) => {
                  return <option key={am.label} value={am.label}>{am.label}</option>;
                })}
              </select>
            </FormField>
            <FormField label="Valor (KZ)" name="valor" type="number" placeholder="50000" required defaultValue={initial?.valor ? String(initial.valor) : ''} />
          </>
        )}

        <FormField label="Método de pagamento" name="metodo">
          <select name="metodo" defaultValue={initial?.metodo ?? PAYMENT_METHODS[0]}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormField>
        <FormField label="Data do pagamento" name="data_pagamento" type="date" required defaultValue={initial?.data_pagamento ?? todayString()} />
      </div>

      <FormActions onCancel={onCancel} label={initial ? "Guardar alterações" : "Confirmar pagamento"} />
    </form>
  );
}
