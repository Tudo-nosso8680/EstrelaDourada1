import { useMemo, useState, type FormEvent } from 'react';
import {
  Search, FileText, GraduationCap, Award, Send, FileCheck, ChevronRight,
  Check, X,
} from 'lucide-react';
import type { SecretariaRequest, Student } from '@/lib/types';
import { SECRETARIA_TYPES } from '@/lib/types';
import { formatKz, formatDate } from '@/lib/utils';
import { PageHeading, Badge, EmptyState, FormField, FormActions } from '@/components/ui';
import { Modal } from '@/components/Modal';

type SecretariaProps = {
  requests: SecretariaRequest[];
  students: Student[];
  onAdd: (data: { tipo: string; aluno_id: string | null; aluno_nome: string | null; descricao: string | null; valor: number; pago: boolean; status: string }) => Promise<void>;
  onUpdate: (id: string, data: Partial<SecretariaRequest>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function Secretaria({ requests, students, onAdd, onUpdate, onDelete }: SecretariaProps) {
  const [query, setQuery] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [modal, setModal] = useState<'add' | 'view' | 'delete' | null>(null);
  const [viewing, setViewing] = useState<SecretariaRequest | null>(null);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filterTipo && r.tipo !== filterTipo) return false;
      return `${r.aluno_nome ?? ''} ${r.descricao ?? ''} ${r.tipo} ${r.status}`.toLowerCase().includes(query.toLowerCase());
    });
  }, [requests, query, filterTipo]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of requests) {
      map[r.tipo] = (map[r.tipo] ?? 0) + 1;
    }
    return map;
  }, [requests]);

  return (
    <>
      <PageHeading
        eyebrow="MÓDULO SECRETARIA"
        title="Secretaria"
        description="Matrículas, confirmações, certificados, transferências e declarações."
        action={() => setModal('add')}
        actionLabel="Novo pedido"
      />

      <div className="secretaria-cards">
        {SECRETARIA_TYPES.map((tipo) => (
          <button
            key={tipo}
            className={`secretaria-card ${filterTipo === tipo ? 'active' : ''}`}
            onClick={() => setFilterTipo(filterTipo === tipo ? '' : tipo)}
          >
            <div className="secretaria-card-icon">{getTipoIcon(tipo)}</div>
            <div>
              <b>{tipo}</b>
              <span>{counts[tipo] ?? 0} pedidos</span>
            </div>
          </button>
        ))}
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido..." />
          </div>
          {filterTipo && <button className="text-button" onClick={() => setFilterTipo('')}>Limpar filtro <X size={14} /></button>}
        </div>
        <div className="data-table">
          <div className="table-head secretaria-head">
            <span>Tipo</span>
            <span>Aluno</span>
            <span className="col-hide-mobile">Descrição</span>
            <span>Valor</span>
            <span className="col-hide-mobile">Pago</span>
            <span>Estado</span>
            <span />
          </div>
          {filtered.map((r) => (
            <div className="table-row" key={r.id}>
              <span><Badge label={r.tipo} tone={getTipoTone(r.tipo)} /></span>
              <span><b>{r.aluno_nome ?? '—'}</b></span>
              <span className="col-hide-mobile">{r.descricao ?? '—'}</span>
              <span>{r.valor > 0 ? formatKz(Number(r.valor)) : '—'}</span>
              <span className="col-hide-mobile">{r.pago ? <Badge label="Pago" tone="green" /> : <Badge label="Não pago" tone="orange" />}</span>
              <span><Badge label={r.status} tone={r.status === 'Concluído' ? 'green' : r.status === 'Pendente' ? 'orange' : 'blue'} /></span>
              <div className="row-actions">
                <button className="row-icon" title="Ver detalhes" onClick={() => { setViewing(r); setModal('view'); }}><ChevronRight size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        {!filtered.length && <EmptyState text="Nenhum pedido de secretaria encontrado." />}
      </section>

      {modal === 'add' && (
        <Modal title="Novo pedido de secretaria" subtitle="Registre o pedido na secretaria." onClose={() => setModal(null)}>
          <SecretariaForm students={students} onSubmit={async (data) => { await onAdd(data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'view' && viewing && (
        <Modal title={`Pedido: ${viewing.tipo}`} subtitle={viewing.aluno_nome ?? 'Sem aluno associado'} onClose={() => setModal(null)}>
          <div className="review-detail">
            <div className="review-row"><span>Tipo</span><b>{viewing.tipo}</b></div>
            <div className="review-row"><span>Aluno</span><b>{viewing.aluno_nome ?? '—'}</b></div>
            <div className="review-row"><span>Descrição</span><b>{viewing.descricao ?? '—'}</b></div>
            <div className="review-row"><span>Valor</span><b>{viewing.valor > 0 ? formatKz(Number(viewing.valor)) : '—'}</b></div>
            <div className="review-row"><span>Pago</span><b>{viewing.pago ? 'Sim' : 'Não'}</b></div>
            <div className="review-row"><span>Estado</span><b>{viewing.status}</b></div>
            <div className="review-row"><span>Data</span><b>{formatDate(viewing.created_at)}</b></div>
            {viewing.observacao && <div className="review-row"><span>Observação</span><b>{viewing.observacao}</b></div>}
          </div>
          <div className="form-actions">
            <button className="danger-button" onClick={async () => { await onDelete(viewing.id); setModal(null); }}>Eliminar</button>
            {!viewing.pago && viewing.valor > 0 && (
              <button className="primary-button" onClick={async () => { await onUpdate(viewing.id, { pago: true, status: 'Concluído' }); setModal(null); }}><Check size={16} /> Marcar como pago</button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function getTipoIcon(tipo: string) {
  switch (tipo) {
    case 'Matrícula': return <GraduationCap size={18} />;
    case 'Confirmação': return <FileCheck size={18} />;
    case 'Certificado': return <Award size={18} />;
    case 'Transferência': return <Send size={18} />;
    case 'Declaração': return <FileText size={18} />;
    default: return <FileText size={18} />;
  }
}

function getTipoTone(tipo: string): string {
  switch (tipo) {
    case 'Matrícula': return 'green';
    case 'Confirmação': return 'blue';
    case 'Certificado': return 'gold';
    case 'Transferência': return 'orange';
    case 'Declaração': return 'blue';
    default: return 'green';
  }
}

function SecretariaForm({ students, onSubmit, onCancel }: { students: Student[]; onSubmit: (data: { tipo: string; aluno_id: string | null; aluno_nome: string | null; descricao: string | null; valor: number; pago: boolean; status: string }) => Promise<void>; onCancel: () => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tipo = String(form.get('tipo'));
    const alunoId = String(form.get('aluno_id') || '') || null;
    const aluno = students.find((s) => s.id === alunoId);
    void onSubmit({
      tipo,
      aluno_id: alunoId,
      aluno_nome: aluno?.nome ?? null,
      descricao: String(form.get('descricao') || '') || null,
      valor: Number(form.get('valor') || 0),
      pago: form.get('pago') === 'on',
      status: String(form.get('status') ?? 'Pendente'),
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField label="Tipo de pedido" name="tipo">
          <select name="tipo" defaultValue={SECRETARIA_TYPES[0]}>
            {SECRETARIA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Aluno" name="aluno_id">
          <select name="aluno_id" defaultValue="">
            <option value="">Sem aluno associado</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.nome} · {s.matricula}</option>)}
          </select>
        </FormField>
        <FormField label="Valor (KZ)" name="valor" type="number" placeholder="0" required={false} />
        <FormField label="Estado" name="status">
          <select name="status" defaultValue="Pendente">
            <option>Pendente</option>
            <option>Em processamento</option>
            <option>Concluído</option>
          </select>
        </FormField>
      </div>
      <label className="form-field full">
        <span>Descrição</span>
        <textarea name="descricao" rows={3} placeholder="Detalhes do pedido..." />
      </label>
      <label className="form-field checkbox-field">
        <input type="checkbox" name="pago" />
        <span>Pagamento já realizado</span>
      </label>
      <FormActions onCancel={onCancel} label="Registar pedido" />
    </form>
  );
}
