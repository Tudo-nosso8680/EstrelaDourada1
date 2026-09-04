import type { Payment, FundRequest, DailyHistoryEntry, Student } from './types';

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export function formatKz(value: number): string {
  return `${new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)} KZ`;
}

export function formatKzShort(value: number): string {
  return `${new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value) || 0)} KZ`;
}

export function formatDate(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date.length > 10 ? date : `${date}T12:00:00`);
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateLong(date: string | null): string {
  if (!date) return '—';
  const d = new Date(date.length > 10 ? date : `${date}T12:00:00`);
  return d.toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'agora mesmo';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  return `há ${days} d`;
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function currentMonthLabel(): string {
  const now = new Date();
  return monthLabel(now.getFullYear(), now.getMonth());
}

export function currentOpenMonth(): string {
  const now = new Date();
  return monthLabel(now.getFullYear(), now.getMonth());
}

/**
 * Debt rule: a month is considered "in debt" only after the 10th of the
 * following month has passed without payment.
 *
 * Returns the list of month-year labels that are currently in debt.
 */
export function computeDebtMonths(dataEntrada: string | null, paidMonths: Set<string>): string[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let debtCutoffYear = currentYear;
  let debtCutoffMonth = currentMonth - 1;

  if (now.getDate() <= 10) {
    debtCutoffMonth -= 1;
  }

  while (debtCutoffMonth < 0) {
    debtCutoffMonth += 12;
    debtCutoffYear -= 1;
  }

  const debts: string[] = [];
  const entryDate = dataEntrada ? new Date(dataEntrada.length > 10 ? dataEntrada : `${dataEntrada}T12:00:00`) : null;

  for (let i = 0; i < 24; i++) {
    let y = debtCutoffYear;
    let m = debtCutoffMonth - i;
    while (m < 0) { m += 12; y -= 1; }
    while (m > 11) { m -= 12; y += 1; }

    const label = monthLabel(y, m);
    if (!paidMonths.has(label)) {
      if (entryDate) {
        const entryYear = entryDate.getFullYear();
        const entryMonth = entryDate.getMonth();
        if (y < entryYear || (y === entryYear && m < entryMonth)) continue;
      }
      debts.push(label);
    }
  }

  return debts.reverse();
}

/**
 * Academic year 2026/2027: September 2026 through June 2027.
 * These are the 10 propina months every student must pay.
 */
export const ANO_LETIVO_MESES: { label: string; year: number; month: number }[] = [
  { label: 'Setembro 2026', year: 2026, month: 8 },
  { label: 'Outubro 2026', year: 2026, month: 9 },
  { label: 'Novembro 2026', year: 2026, month: 10 },
  { label: 'Dezembro 2026', year: 2026, month: 11 },
  { label: 'Janeiro 2027', year: 2027, month: 0 },
  { label: 'Fevereiro 2027', year: 2027, month: 1 },
  { label: 'Março 2027', year: 2027, month: 2 },
  { label: 'Abril 2027', year: 2027, month: 3 },
  { label: 'Maio 2027', year: 2027, month: 4 },
  { label: 'Junho 2027', year: 2027, month: 5 },
];

export type MonthStatus = { label: string; status: 'pago' | 'aberto' | 'divida' | 'antecipado'; dataPagamento?: string | null };

export function computeMonthStatuses(
  dataEntrada: string | null,
  propinaPayments: Payment[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mensalidade: number,
): MonthStatus[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const today = now.getDate();

  const paidMap = new Map<string, { dataPagamento: string | null; antecipado: boolean }>();
  for (const p of propinaPayments) {
    paidMap.set(p.competencia, { dataPagamento: p.data_pagamento, antecipado: p.antecipado ?? false });
  }

  const paidLabels = new Set(paidMap.keys());
  const debtMonths = new Set(computeDebtMonths(dataEntrada, paidLabels));
  const openMonthLabel = currentOpenMonth();

  const result: MonthStatus[] = [];

  for (const am of ANO_LETIVO_MESES) {
    const label = am.label;
    const paid = paidMap.get(label);
    if (paid) {
      result.push({ label, status: paid.antecipado ? 'antecipado' : 'pago', dataPagamento: paid.dataPagamento });
    } else if (debtMonths.has(label)) {
      result.push({ label, status: 'divida' });
    } else if (label === openMonthLabel) {
      result.push({ label, status: 'aberto' });
    } else if (am.year > currentYear || (am.year === currentYear && am.month > currentMonth)) {
      result.push({ label, status: 'aberto' });
    } else if (today <= 10 && isPreviousMonth(am.year, am.month, currentYear, currentMonth)) {
      result.push({ label, status: 'aberto' });
    } else {
      result.push({ label, status: 'aberto' });
    }
  }

  return result;
}

function isPreviousMonth(y: number, m: number, currentYear: number, currentMonth: number): boolean {
  let py = currentYear;
  let pm = currentMonth - 1;
  while (pm < 0) { pm += 12; py -= 1; }
  return y === py && m === pm;
}

export function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

export function generateReceiptCode(): string {
  const year = new Date().getFullYear();
  const random = String(Date.now()).slice(-5);
  return `REC-${year}-${random}`;
}

/**
 * Compute daily history entries from payments and fund requests.
 * Each day shows total arrecadado, saidas de fundos (approved), and total liquido.
 */
export function computeDailyHistory(payments: Payment[], fundRequests: FundRequest[]): DailyHistoryEntry[] {
  const map = new Map<string, { arrecadado: number; saidas: number }>();

  for (const p of payments) {
    if (p.status !== 'Confirmado') continue;
    const date = (p.data_pagamento ?? p.created_at.slice(0, 10)).slice(0, 10);
    const entry = map.get(date) ?? { arrecadado: 0, saidas: 0 };
    entry.arrecadado += Number(p.valor);
    map.set(date, entry);
  }

  for (const r of fundRequests) {
    if (r.status !== 'Aprovado') continue;
    const date = (r.decisao_em ?? r.created_at).slice(0, 10);
    const entry = map.get(date) ?? { arrecadado: 0, saidas: 0 };
    entry.saidas += Number(r.valor);
    map.set(date, entry);
  }

  return Array.from(map.entries())
    .map(([data, v]) => ({
      data,
      total_arrecadado: v.arrecadado,
      saidas_fundos: v.saidas,
      total_liquido: v.arrecadado - v.saidas,
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Filter payments by a specific date (YYYY-MM-DD).
 */
export function filterPaymentsByDate(payments: Payment[], date: string): Payment[] {
  return payments.filter((p) => {
    const pDate = (p.data_pagamento ?? p.created_at.slice(0, 10)).slice(0, 10);
    return pDate === date;
  });
}

/**
 * Filter payments by month (YYYY-MM).
 */
export function filterPaymentsByMonth(payments: Payment[], year: number, month: number): Payment[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return payments.filter((p) => {
    const pDate = (p.data_pagamento ?? p.created_at.slice(0, 10)).slice(0, 10);
    return pDate.startsWith(prefix);
  });
}

/**
 * Filter payments by year (YYYY).
 */
export function filterPaymentsByYear(payments: Payment[], year: number): Payment[] {
  const prefix = `${year}`;
  return payments.filter((p) => {
    const pDate = (p.data_pagamento ?? p.created_at.slice(0, 10)).slice(0, 10);
    return pDate.startsWith(prefix);
  });
}

/**
 * Export data to a proper .xlsx file using the SheetJS library.
 * Produces valid Excel files with styled headers, auto-width columns,
 * and a totals row.
 */
export function exportToExcel(filename: string, sheets: ExcelSheet[]): void {
  import('xlsx').then((XLSX) => {
    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const data: (string | number)[][] = [sheet.headers, ...sheet.rows];

      if (sheet.totalsRow) {
        data.push(sheet.totalsRow);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);

      // Auto-width columns based on content
      const colWidths = sheet.headers.map((header, colIdx) => {
        let maxWidth = String(header).length;
        for (const row of sheet.rows) {
          const cellVal = row[colIdx] !== undefined ? String(row[colIdx]).length : 0;
          if (cellVal > maxWidth) maxWidth = cellVal;
        }
        return { wch: Math.min(Math.max(maxWidth + 2, 10), 40) };
      });
      ws['!cols'] = colWidths;

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = ws[cellRef];
        if (cell) {
          cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            fill: { fgColor: { rgb: '1A8F5F' } },
            alignment: { horizontal: 'center', vertical: 'center' },
          };
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    }

    XLSX.writeFile(wb, filename);
  }).catch(() => {
    // Fallback: if dynamic import fails, show alert
    console.error('Erro ao gerar ficheiro Excel');
  });
}

export type ExcelSheet = {
  name: string;
  headers: string[];
  rows: (string | number)[][];
  totalsRow?: (string | number)[];
};

/**
 * Count unique students in debt and total months in debt.
 */
export function computeDebtStats(students: Student[], payments: Payment[]): { debtors: number; monthsInDebt: number } {
  let debtors = 0;
  let monthsInDebt = 0;

  for (const student of students) {
    const propinaPayments = payments.filter((p) => p.aluno_id === student.id && p.tipo === 'Propina');
    const paidMonths = new Set(propinaPayments.map((p) => p.competencia));
    const debtMonths = computeDebtMonths(student.data_entrada, paidMonths);
    if (debtMonths.length > 0) {
      debtors++;
      monthsInDebt += debtMonths.length;
    }
  }

  return { debtors, monthsInDebt };
}

export type DebtEntry = {
  id: string;
  nome: string;
  matricula: string;
  classe: string;
  curso: string;
  telefone: string | null;
  mesesDivida: string[];
  valorDivida: number;
};

/**
 * Returns a detailed list of students who currently have unpaid months in debt,
 * including which months are owed and the total monetary value of that debt.
 */
export function computeDebtList(students: Student[], payments: Payment[]): DebtEntry[] {
  const result: DebtEntry[] = [];

  for (const student of students) {
    const propinaPayments = payments.filter((p) => p.aluno_id === student.id && p.tipo === 'Propina');
    const paidMonths = new Set(propinaPayments.map((p) => p.competencia));
    const debtMonths = computeDebtMonths(student.data_entrada, paidMonths);
    if (debtMonths.length > 0) {
      result.push({
        id: student.id,
        nome: student.nome,
        matricula: student.matricula,
        classe: student.classe,
        curso: student.curso ?? '—',
        telefone: student.telefone ?? student.enc_telefone ?? null,
        mesesDivida: debtMonths,
        valorDivida: debtMonths.length * Number(student.mensalidade),
      });
    }
  }

  return result.sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
}

/**
 * Export an attendance list ("Lista de Presença") to Excel.
 * Includes school header, date, shift, discipline field, and
 * signature columns for teacher and each student.
 */
export function exportAttendanceList(
  students: Student[],
  filters: { turma?: string; turno?: string; classe?: string; area?: string; status?: string },
): void {
  import('xlsx').then((XLSX) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    const turmaLabel = filters.turma || 'Todas';
    const turnoLabel = filters.turno || 'Todos';
    const classeLabel = filters.classe || 'Todas';
    const areaLabel = filters.area || 'Todas';
    const statusLabel = filters.status || 'Todos';

    const sorted = [...students].sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));

    // A4 portrait: total usable width ~ 96 character-units across 4 columns
    // Nº=6, Nome=40, Matrícula=16, Assinatura=34 → 96
    const COL_N = 0;
    const COL_NAME = 1;
    const COL_MAT = 2;
    const COL_SIG = 3;
    const NUM_COLS = 4;

    const rows: (string | number)[][] = [];

    // Row 0: School name (merged across all columns)
    rows.push(['ESTRELA DOURADA']);
    // Row 1: Subtitle — "Lista de Presença da Classe X" (merged)
    rows.push([classeLabel !== 'Todas' ? `LISTA DE PRESENÇA — ${classeLabel}` : 'LISTA DE PRESENÇA']);
    // Row 2: empty spacer
    rows.push([]);
    // Row 3: Info line 1 — Data | Turno
    rows.push(['Data:', dateStr, 'Turno:', turnoLabel]);
    // Row 4: Info line 2 — Classe | Turma
    rows.push(['Classe:', classeLabel, 'Turma:', turmaLabel]);
    // Row 5: Info line 3 — Área de Ensino (merged across cols 1-3)
    rows.push(['Área de Ensino:', areaLabel, '', '']);
    // Row 6: Info line 4 — Estado (merged across cols 1-3)
    rows.push(['Estado:', statusLabel, '', '']);
    // Row 7: Disciplina (merged across cols 1-3)
    rows.push(['Disciplina:', '', '', '']);
    // Row 8: Docente (merged across cols 1-3)
    rows.push(['Docente:', '', '', '']);
    // Row 9: empty spacer
    rows.push([]);
    // Row 10: Table header
    const headerRowIdx = 10;
    rows.push(['Nº', 'Nome do Aluno', 'Matrícula', 'Assinatura']);
    // Rows 11+: Student data
    sorted.forEach((s, i) => {
      rows.push([i + 1, s.nome, s.matricula, '']);
    });
    // After students: spacer + observations
    const obsStartRow = headerRowIdx + 1 + sorted.length;
    rows.push([]); // spacer
    rows.push(['Observações:', '', '', '']);
    rows.push(['', '', '', '']);
    rows.push(['', '', '', '']);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Column widths — tuned to fit A4 portrait
    ws['!cols'] = [
      { wch: 6 },   // Nº
      { wch: 40 },  // Nome
      { wch: 16 },  // Matrícula
      { wch: 34 },  // Assinatura
    ];

    // Row heights (in points)
    const rowHeights: Record<number, number> = {};
    rowHeights[0] = 22;  // School name
    rowHeights[1] = 20;  // Subtitle
    rowHeights[2] = 6;   // spacer
    rowHeights[3] = 16;  // Data/Turno
    rowHeights[4] = 16;  // Classe/Turma
    rowHeights[5] = 16;  // Área
    rowHeights[6] = 16;  // Estado
    rowHeights[7] = 18;  // Disciplina
    rowHeights[8] = 18;  // Docente
    rowHeights[9] = 6;   // spacer
    rowHeights[headerRowIdx] = 20; // table header
    for (let i = 0; i < sorted.length; i++) {
      rowHeights[headerRowIdx + 1 + i] = 22; // each student row
    }
    rowHeights[obsStartRow] = 6;      // spacer
    rowHeights[obsStartRow + 1] = 16; // "Observações:"
    rowHeights[obsStartRow + 2] = 22; // obs line 1
    rowHeights[obsStartRow + 3] = 22; // obs line 2

    ws['!rows'] = Object.entries(rowHeights)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([_, h]) => ({ hpt: h }));

    // Merges
    const merges = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: NUM_COLS - 1 } }, // School name
      { s: { r: 1, c: 0 }, e: { r: 1, c: NUM_COLS - 1 } }, // Subtitle
      { s: { r: 5, c: 1 }, e: { r: 5, c: NUM_COLS - 1 } }, // Área value
      { s: { r: 6, c: 1 }, e: { r: 6, c: NUM_COLS - 1 } }, // Estado value
      { s: { r: 7, c: 1 }, e: { r: 7, c: NUM_COLS - 1 } }, // Disciplina value
      { s: { r: 8, c: 1 }, e: { r: 8, c: NUM_COLS - 1 } }, // Docente value
      { s: { r: obsStartRow + 1, c: 1 }, e: { r: obsStartRow + 1, c: NUM_COLS - 1 } }, // Observações label
      { s: { r: obsStartRow + 2, c: 0 }, e: { r: obsStartRow + 2, c: NUM_COLS - 1 } }, // obs line 1
      { s: { r: obsStartRow + 3, c: 0 }, e: { r: obsStartRow + 3, c: NUM_COLS - 1 } }, // obs line 2
    ];
    ws['!merges'] = merges;

    // ---- Styling ----
    const GREEN = '1A8F5F';
    const GREEN_DARK = '1A2E2A';
    const LIGHT_BORDER = 'CCCCCC';
    const thinBorder = {
      top: { style: 'thin' as const, color: { rgb: LIGHT_BORDER } },
      bottom: { style: 'thin' as const, color: { rgb: LIGHT_BORDER } },
      left: { style: 'thin' as const, color: { rgb: LIGHT_BORDER } },
      right: { style: 'thin' as const, color: { rgb: LIGHT_BORDER } },
    };
    const greenBorder = {
      top: { style: 'thin' as const, color: { rgb: GREEN } },
      bottom: { style: 'thin' as const, color: { rgb: GREEN } },
      left: { style: 'thin' as const, color: { rgb: GREEN } },
      right: { style: 'thin' as const, color: { rgb: GREEN } },
    };

    // School name (row 0)
    const c00 = ws[XLSX.utils.encode_cell({ r: 0, c: 0 })];
    if (c00) c00.s = { font: { bold: true, sz: 16, color: { rgb: GREEN } }, alignment: { horizontal: 'center', vertical: 'center' } };

    // Subtitle (row 1)
    const c10 = ws[XLSX.utils.encode_cell({ r: 1, c: 0 })];
    if (c10) c10.s = { font: { bold: true, sz: 14, color: { rgb: GREEN_DARK } }, alignment: { horizontal: 'center', vertical: 'center' } };

    // Info rows (3-8) — labels bold, values normal
    for (let r = 3; r <= 8; r++) {
      const labelCell = ws[XLSX.utils.encode_cell({ r, c: 0 })];
      if (labelCell) labelCell.s = { font: { bold: true, sz: 10, color: { rgb: GREEN_DARK } }, alignment: { horizontal: 'left', vertical: 'center' } };
      for (let c = 1; c < NUM_COLS; c++) {
        const valCell = ws[XLSX.utils.encode_cell({ r, c })];
        if (valCell) valCell.s = { font: { sz: 10, color: { rgb: '333333' } }, alignment: { horizontal: 'left', vertical: 'center' } };
      }
    }
    // Turno label (row 3, col 2)
    const turnoLabelCell = ws[XLSX.utils.encode_cell({ r: 3, c: 2 })];
    if (turnoLabelCell) turnoLabelCell.s = { font: { bold: true, sz: 10, color: { rgb: GREEN_DARK } }, alignment: { horizontal: 'left', vertical: 'center' } };
    // Turma label (row 4, col 2)
    const turmaLabelCell = ws[XLSX.utils.encode_cell({ r: 4, c: 2 })];
    if (turmaLabelCell) turmaLabelCell.s = { font: { bold: true, sz: 10, color: { rgb: GREEN_DARK } }, alignment: { horizontal: 'left', vertical: 'center' } };

    // Table header (row 10)
    for (let c = 0; c < NUM_COLS; c++) {
      const ref = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      const cell = ws[ref];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
          fill: { fgColor: { rgb: GREEN } },
          alignment: { horizontal: 'center', vertical: 'center' },
          border: greenBorder,
        };
      }
    }

    // Student rows
    for (let i = 0; i < sorted.length; i++) {
      const r = headerRowIdx + 1 + i;
      for (let c = 0; c < NUM_COLS; c++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = ws[ref];
        if (cell) {
          cell.s = {
            font: { sz: 10, color: { rgb: '333333' } },
            alignment: { horizontal: c === COL_NAME ? 'left' : 'center', vertical: 'center' },
            border: thinBorder,
          };
        }
      }
    }

    // Observações label
    const obsLabelCell = ws[XLSX.utils.encode_cell({ r: obsStartRow + 1, c: 0 })];
    if (obsLabelCell) obsLabelCell.s = { font: { bold: true, sz: 10, color: { rgb: GREEN_DARK } }, alignment: { horizontal: 'left', vertical: 'center' } };

    // Obs lines — bottom border for writing
    for (let i = 2; i <= 3; i++) {
      const ref = XLSX.utils.encode_cell({ r: obsStartRow + i, c: 0 });
      const cell = ws[ref];
      if (cell) {
        cell.s = {
          font: { sz: 10 },
          alignment: { horizontal: 'left', vertical: 'center' },
          border: { bottom: { style: 'thin' as const, color: { rgb: '999999' } } },
        };
      }
    }

    // ---- A4 Page Setup ----
    const lastRow = rows.length - 1;
    ws['!margins'] = {
      left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3,
    };

    ws['!pageSetup'] = {
      orientation: 'portrait',
      paperSize: 9, // A4
      fitToWidth: 1,
      fitToHeight: 0,
      scale: 100,
    };

    ws['!printArea'] = `A1:D${lastRow + 1}`;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lista de Presença');
    XLSX.writeFile(wb, `Lista_Presenca_${classeLabel}.xlsx`);
  }).catch(() => {
    console.error('Erro ao gerar lista de presença');
  });
}
