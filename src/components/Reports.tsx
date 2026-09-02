import { useMemo, useState } from 'react';
import {
  Calendar, Download, Trash2, TrendingUp, TableProperties,
} from 'lucide-react';
import type { Payment, FundRequest, SavedReport } from '@/lib/types';
import {
  formatKz, formatDate, todayString,
  filterPaymentsByDate, filterPaymentsByMonth, filterPaymentsByYear,
  exportToExcel, monthLabel,
} from '@/lib/utils';
import { PageHeading, Badge, EmptyState } from '@/components/ui';
import { Modal } from '@/components/Modal';

type ReportsProps = {
  payments: Payment[];
  fundRequests: FundRequest[];
  savedReports: SavedReport[];
  onSaveReport: (tipo: string, dataReferencia: string, dados: Record<string, unknown>) => Promise<void>;
  onDeleteReport: (id: string) => Promise<void>;
};

type TabType = 'daily' | 'monthly' | 'yearly';

export function Reports({ payments, fundRequests, savedReports, onSaveReport, onDeleteReport }: ReportsProps) {
  const [tab, setTab] = useState<TabType>('daily');
  const [dailyDate, setDailyDate] = useState(todayString());
  const [monthSel, setMonthSel] = useState(new Date().getMonth());
  const [yearSel, setYearSel] = useState(new Date().getFullYear());
  const [yearOnly, setYearOnly] = useState(new Date().getFullYear());
  const [deleteGate, setDeleteGate] = useState<SavedReport | null>(null);

  const dailyPayments = useMemo(() => filterPaymentsByDate(payments, dailyDate), [payments, dailyDate]);
  const monthlyPayments = useMemo(() => filterPaymentsByMonth(payments, yearSel, monthSel), [payments, yearSel, monthSel]);
  const yearlyPayments = useMemo(() => filterPaymentsByYear(payments, yearOnly), [payments, yearOnly]);

  const dailyTotal = dailyPayments.reduce((s, p) => s + Number(p.valor), 0);
  const monthlyTotal = monthlyPayments.reduce((s, p) => s + Number(p.valor), 0);
  const yearlyTotal = yearlyPayments.reduce((s, p) => s + Number(p.valor), 0);

  const monthlyByCategory = useMemo(() => groupByCategory(monthlyPayments), [monthlyPayments]);
  const yearlyByMonth = useMemo(() => groupByMonth(yearlyPayments), [yearlyPayments]);

  const approvedFundRequests = fundRequests.filter((r) => r.status === 'Aprovado');
  const monthlySaidas = approvedFundRequests
    .filter((r) => (r.decisao_em ?? r.created_at).slice(0, 7) === `${yearSel}-${String(monthSel + 1).padStart(2, '0')}`)
    .reduce((s, r) => s + Number(r.valor), 0);

  const tabLabels: Record<TabType, string> = { daily: 'Relatório Diário', monthly: 'Relatório Mensal', yearly: 'Relatório Anual' };

  function handleExportDaily() {
    exportToExcel(`relatorio-diario-${dailyDate}.xlsx`, [
      {
        name: 'Resumo',
        headers: ['Data', 'Total Arrecadado (Kz)'],
        rows: [[formatDate(dailyDate), dailyTotal]],
        totalsRow: ['TOTAL', dailyTotal],
      },
      {
        name: 'Detalhes',
        headers: ['Aluno', 'Tipo', 'Competência', 'Método', 'Valor (Kz)', 'Recibo', 'Data Pagamento'],
        rows: dailyPayments.map((p) => [
          p.aluno?.nome ?? '—', p.tipo, p.competencia, p.metodo,
          Number(p.valor), p.recibo, formatDate(p.data_pagamento),
        ]),
        totalsRow: ['TOTAL', '', '', '', dailyTotal, '', ''],
      },
    ]);
    void onSaveReport('diario', dailyDate, { total: dailyTotal, count: dailyPayments.length });
  }

  function handleExportMonthly() {
    exportToExcel(`relatorio-mensal-${yearSel}-${String(monthSel + 1).padStart(2, '0')}.xlsx`, [
      {
        name: 'Resumo',
        headers: ['Mês', 'Total Arrecadado (Kz)', 'Saídas de Fundos (Kz)', 'Total Líquido (Kz)'],
        rows: [[monthLabel(yearSel, monthSel), monthlyTotal, monthlySaidas, monthlyTotal - monthlySaidas]],
        totalsRow: ['TOTAL', monthlyTotal, monthlySaidas, monthlyTotal - monthlySaidas],
      },
      {
        name: 'Por Categoria',
        headers: ['Categoria', 'Total (Kz)'],
        rows: Object.entries(monthlyByCategory).map(([cat, val]) => [cat, val]),
        totalsRow: ['TOTAL', Object.values(monthlyByCategory).reduce((s, v) => s + v, 0)],
      },
      {
        name: 'Detalhes',
        headers: ['Aluno', 'Tipo', 'Competência', 'Método', 'Valor (Kz)', 'Recibo', 'Data'],
        rows: monthlyPayments.map((p) => [
          p.aluno?.nome ?? '—', p.tipo, p.competencia, p.metodo,
          Number(p.valor), p.recibo, formatDate(p.data_pagamento),
        ]),
        totalsRow: ['TOTAL', '', '', '', monthlyTotal, '', ''],
      },
    ]);
    void onSaveReport('mensal', `${yearSel}-${String(monthSel + 1).padStart(2, '0')}-01`, { total: monthlyTotal, saidas: monthlySaidas });
  }

  function handleExportYearly() {
    exportToExcel(`relatorio-anual-${yearOnly}.xlsx`, [
      {
        name: 'Resumo Anual',
        headers: ['Ano', 'Total Arrecadado (Kz)'],
        rows: [[String(yearOnly), yearlyTotal]],
        totalsRow: ['TOTAL', yearlyTotal],
      },
      {
        name: 'Resumo Mensal',
        headers: ['Mês', 'Total Arrecadado (Kz)'],
        rows: yearlyByMonth.map((m) => [m.label, m.total]),
        totalsRow: ['TOTAL', yearlyByMonth.reduce((s, m) => s + m.total, 0)],
      },
      {
        name: 'Detalhes',
        headers: ['Aluno', 'Tipo', 'Competência', 'Método', 'Valor (Kz)', 'Recibo', 'Data'],
        rows: yearlyPayments.map((p) => [
          p.aluno?.nome ?? '—', p.tipo, p.competencia, p.metodo,
          Number(p.valor), p.recibo, formatDate(p.data_pagamento),
        ]),
        totalsRow: ['TOTAL', '', '', '', yearlyTotal, '', ''],
      },
    ]);
    void onSaveReport('anual', `${yearOnly}-01-01`, { total: yearlyTotal });
  }

  return (
    <>
      <PageHeading
        eyebrow="ANÁLISES FINANCEIRAS"
        title="Relatórios Financeiros"
        description="Consulte a arrecadação por dia, mês ou ano e exporte para Excel."
      />

      {/* Tab selector - separated from content */}
      <div className="report-tab-bar">
        <button className={`report-tab ${tab === 'daily' ? 'active' : ''}`} onClick={() => setTab('daily')}>
          <Calendar size={16} /> Diário
        </button>
        <button className={`report-tab ${tab === 'monthly' ? 'active' : ''}`} onClick={() => setTab('monthly')}>
          <TableProperties size={16} /> Mensal
        </button>
        <button className={`report-tab ${tab === 'yearly' ? 'active' : ''}`} onClick={() => setTab('yearly')}>
          <TrendingUp size={16} /> Anual
        </button>
      </div>

      {tab === 'daily' && (
        <section className="panel report-panel">
          <div className="report-panel-header">
            <div>
              <h2>{tabLabels.daily}</h2>
              <p>Selecione uma data para consultar a arrecadação do dia.</p>
            </div>
            <button className="primary-button export-btn" onClick={handleExportDaily}>
              <Download size={16} /> Exportar Excel
            </button>
          </div>

          <div className="report-filters">
            <label className="form-field">
              <span>Data</span>
              <input type="date" value={dailyDate} onChange={(e) => setDailyDate(e.target.value)} />
            </label>
          </div>

          <div className="report-total-bar">
            <span>Total arrecadado em {formatDate(dailyDate)}</span>
            <b>{formatKz(dailyTotal)}</b>
          </div>

          <div className="data-table">
            <div className="table-head">
              <span>Aluno</span><span>Tipo</span><span>Competência</span><span>Método</span><span>Valor</span><span>Recibo</span>
            </div>
            {dailyPayments.map((p) => (
              <div className="table-row" key={p.id}>
                <span><b>{p.aluno?.nome ?? '—'}</b></span>
                <span>{p.tipo}</span>
                <span>{p.competencia}</span>
                <span>{p.metodo}</span>
                <span>{formatKz(Number(p.valor))}</span>
                <span className="recibo-cell">{p.recibo}</span>
              </div>
            ))}
          </div>
          {!dailyPayments.length && <EmptyState text="Nenhum pagamento neste dia." />}
        </section>
      )}

      {tab === 'monthly' && (
        <section className="panel report-panel">
          <div className="report-panel-header">
            <div>
              <h2>{tabLabels.monthly}</h2>
              <p>Selecione o mês e ano para consultar.</p>
            </div>
            <button className="primary-button export-btn" onClick={handleExportMonthly}>
              <Download size={16} /> Exportar Excel
            </button>
          </div>

          <div className="report-filters">
            <label className="form-field">
              <span>Mês</span>
              <select value={monthSel} onChange={(e) => setMonthSel(Number(e.target.value))}>
                {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>Ano</span>
              <input type="number" value={yearSel} onChange={(e) => setYearSel(Number(e.target.value))} min="2020" max="2030" />
            </label>
          </div>

          <div className="report-total-bar">
            <span>Total arrecadado em {monthLabel(yearSel, monthSel)}</span>
            <b>{formatKz(monthlyTotal)}</b>
          </div>

          <div className="report-net-bar">
            <div><span>Saídas de fundos aprovadas</span><b className="red">{formatKz(monthlySaidas)}</b></div>
            <div><span>Total líquido</span><b className="green">{formatKz(monthlyTotal - monthlySaidas)}</b></div>
          </div>

          <div className="category-breakdown">
            <h3>Valores por categoria</h3>
            {Object.keys(monthlyByCategory).length === 0 ? <EmptyState text="Sem dados para este mês." /> : (
              <div className="data-table">
                <div className="table-head"><span>Categoria</span><span>Total</span></div>
                {Object.entries(monthlyByCategory).map(([cat, val]) => (
                  <div className="table-row" key={cat}>
                    <span><b>{cat}</b></span>
                    <span>{formatKz(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'yearly' && (
        <section className="panel report-panel">
          <div className="report-panel-header">
            <div>
              <h2>{tabLabels.yearly}</h2>
              <p>Selecione o ano para consultar o resumo mês a mês.</p>
            </div>
            <button className="primary-button export-btn" onClick={handleExportYearly}>
              <Download size={16} /> Exportar Excel
            </button>
          </div>

          <div className="report-filters">
            <label className="form-field">
              <span>Ano</span>
              <input type="number" value={yearOnly} onChange={(e) => setYearOnly(Number(e.target.value))} min="2020" max="2030" />
            </label>
          </div>

          <div className="report-total-bar">
            <span>Total arrecadado em {yearOnly}</span>
            <b>{formatKz(yearlyTotal)}</b>
          </div>

          <div className="data-table">
            <div className="table-head"><span>Mês</span><span>Total arrecadado</span></div>
            {yearlyByMonth.map((m) => (
              <div className="table-row" key={m.label}>
                <span><b>{m.label}</b></span>
                <span>{formatKz(m.total)}</span>
              </div>
            ))}
          </div>
          {!yearlyByMonth.length && <EmptyState text="Nenhum pagamento neste ano." />}
        </section>
      )}

      <section className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header">
          <div><h2>Relatórios guardados</h2><p>Relatórios exportados anteriormente. Apenas administrador pode eliminar.</p></div>
        </div>
        {savedReports.length === 0 ? <EmptyState text="Nenhum relatório guardado." /> : (
          <div className="data-table">
            <div className="table-head"><span>Tipo</span><span>Data de referência</span><span>Criado por</span><span>Data de criação</span><span /></div>
            {savedReports.map((r) => (
              <div className="table-row" key={r.id}>
                <span><Badge label={r.tipo} tone={r.tipo === 'diario' ? 'green' : r.tipo === 'mensal' ? 'blue' : 'gold'} /></span>
                <span>{formatDate(r.data_referencia)}</span>
                <span>{r.criado_por}</span>
                <span>{formatDate(r.created_at)}</span>
                <div className="row-actions">
                  <button className="row-icon danger" title="Eliminar" onClick={() => setDeleteGate(r)}><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {deleteGate && (
        <Modal title="Eliminar relatório" size="sm" subtitle="Esta ação não pode ser desfeita." onClose={() => setDeleteGate(null)}>
          <div className="confirm-delete">
            <p>Tem a certeza que pretende eliminar o relatório <b>{deleteGate.tipo}</b> de {formatDate(deleteGate.data_referencia)}?</p>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setDeleteGate(null)}>Cancelar</button>
              <button className="danger-button" onClick={async () => { await onDeleteReport(deleteGate.id); setDeleteGate(null); }}>Eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function groupByCategory(payments: Payment[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of payments) {
    const key = p.tipo;
    map[key] = (map[key] ?? 0) + Number(p.valor);
  }
  return map;
}

function groupByMonth(payments: Payment[]): { label: string; total: number }[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    const dateStr = (p.data_pagamento ?? p.created_at).slice(0, 10);
    const d = new Date(dateStr + 'T12:00:00');
    const label = monthLabel(d.getFullYear(), d.getMonth());
    map.set(label, (map.get(label) ?? 0) + Number(p.valor));
  }
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return Array.from(map.entries())
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => monthNames.indexOf(a.label.split(' ')[0]) - monthNames.indexOf(b.label.split(' ')[0]));
}
