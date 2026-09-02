import { useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, Package, Search, Check, Ban, Trash2 } from 'lucide-react';
import type { FundRequest } from '@/lib/types';
import { formatKz, formatDate, formatDateTime } from '@/lib/utils';
import { PageHeading, Badge, EmptyState, FormField, FormActions } from '@/components/ui';
import { Modal } from '@/components/Modal';

type FundRequestsProps = {
  fundRequests: FundRequest[];
  onAdd: (data: { descricao: string; categoria: string; fornecedor: string | null; valor: number; vencimento: string | null; tipo: string }) => Promise<void>;
  onApprove: (id: string, decisaoPor: string, approved: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  userName: string;
};

export function FundRequests({ fundRequests, onAdd, onApprove, onDelete, userName }: FundRequestsProps) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'add' | 'review' | 'delete' | null>(null);
  const [reviewing, setReviewing] = useState<FundRequest | null>(null);
  const [deleting, setDeleting] = useState<FundRequest | null>(null);

  const approvedTotal = fundRequests.filter((r) => r.status === 'Aprovado').reduce((s, r) => s + Number(r.valor), 0);
  const monthlyApproved = fundRequests
    .filter((r) => r.status === 'Aprovado' && (r.decisao_em ?? r.created_at).slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, r) => s + Number(r.valor), 0);

  const filtered = useMemo(() => {
    return fundRequests.filter((r) => `${r.descricao} ${r.fornecedor ?? ''} ${r.categoria} ${r.tipo}`.toLowerCase().includes(query.toLowerCase()));
  }, [fundRequests, query]);

  const pending = filtered.filter((r) => r.status === 'Pendente');
  const decided = filtered.filter((r) => r.status !== 'Pendente');

  return (
    <>
      <PageHeading
        eyebrow="CONTROLE DE SAÍDAS"
        title="Pedidos de saída de fundos e materiais"
        description="Crie pedidos e acompanhe a aprovação do administrador."
        action={() => setModal('add')}
        actionLabel="Novo pedido"
      />

      <div className="fund-summary">
        <div className="fund-summary-card"><span>Saídas aprovadas (total)</span><b className="red">{formatKz(approvedTotal)}</b></div>
        <div className="fund-summary-card"><span>Saídas aprovadas (este mês)</span><b className="red">{formatKz(monthlyApproved)}</b></div>
      </div>

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar pedido..." />
          </div>
        </div>

        {pending.length > 0 && (
          <>
            <div className="table-section-label">Aguardando aprovação</div>
            <div className="data-table">
              <div className="table-head">
                <span>Descrição</span>
                <span>Tipo</span>
                <span>Categoria</span>
                <span>Fornecedor</span>
                <span>Vencimento</span>
                <span>Valor</span>
                <span>Status</span>
                <span />
              </div>
              {pending.map((req) => (
                <div className="table-row" key={req.id}>
                  <div className="expense-cell">
                    <div className="expense-icon">{req.tipo === 'Materiais' ? <Package size={16} /> : <ArrowDownLeft size={16} />}</div>
                    <div><b>{req.descricao}</b><span>{req.solicitado_por}</span></div>
                  </div>
                  <span>{req.tipo}</span>
                  <span>{req.categoria}</span>
                  <span>{req.fornecedor ?? '—'}</span>
                  <span>{formatDate(req.vencimento)}</span>
                  <span><b>{formatKz(Number(req.valor))}</b></span>
                  <span><Badge label={req.status} tone="orange" /></span>
                  <div className="row-actions">
                    <button className="primary-button sm" onClick={() => { setReviewing(req); setModal('review'); }}>Rever</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {decided.length > 0 && (
          <>
            <div className="table-section-label">Decididos</div>
            <div className="data-table">
              <div className="table-head">
                <span>Descrição</span>
                <span>Tipo</span>
                <span>Categoria</span>
                <span>Fornecedor</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Decisão</span>
                <span />
              </div>
              {decided.map((req) => (
                <div className="table-row" key={req.id}>
                  <div className="expense-cell">
                    <div className="expense-icon">{req.tipo === 'Materiais' ? <Package size={16} /> : <ArrowDownLeft size={16} />}</div>
                    <div><b>{req.descricao}</b><span>{req.solicitado_por}</span></div>
                  </div>
                  <span>{req.tipo}</span>
                  <span>{req.categoria}</span>
                  <span>{req.fornecedor ?? '—'}</span>
                  <span><b>{formatKz(Number(req.valor))}</b></span>
                  <span><Badge label={req.status} tone={req.status === 'Aprovado' ? 'green' : 'red'} /></span>
                  <span className="decision-cell">{req.decisao_por ?? '—'}{req.decisao_em && <small>{formatDateTime(req.decisao_em)}</small>}</span>
                  <div className="row-actions">
                    <button className="row-icon danger" title="Eliminar" onClick={() => { setDeleting(req); setModal('delete'); }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!filtered.length && <EmptyState text="Nenhum pedido registado." />}
      </section>

      {modal === 'add' && (
        <Modal title="Novo pedido de saída" subtitle="Descreva o pedido de fundos ou materiais." onClose={() => setModal(null)}>
          <FundRequestForm onSubmit={async (data) => { await onAdd(data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'review' && reviewing && (
        <ReviewModal
          request={reviewing}
          onClose={() => setModal(null)}
          onApprove={async (id, _user, approved) => { await onApprove(id, userName, approved); setModal(null); }}
          userName={userName}
        />
      )}
      {modal === 'delete' && deleting && (
        <Modal title="Eliminar pedido" size="sm" subtitle="Esta ação não pode ser desfeita." onClose={() => setModal(null)}>
          <div className="confirm-delete">
            <p>Tem a certeza que pretende eliminar o pedido <b>{deleting.descricao}</b>?</p>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="danger-button" onClick={async () => { await onDelete(deleting.id); setModal(null); }}>Eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function ReviewModal({ request, onClose, onApprove, userName }: { request: FundRequest; onClose: () => void; onApprove: (id: string, user: string, approved: boolean) => Promise<void>; userName: string }) {
  return (
    <Modal title="Rever pedido" subtitle="Confirme a decisão sobre o pedido." size="md" onClose={onClose}>
      <div className="review-detail">
        <div className="review-row"><span>Descrição</span><b>{request.descricao}</b></div>
        <div className="review-row"><span>Tipo</span><b>{request.tipo}</b></div>
        <div className="review-row"><span>Categoria</span><b>{request.categoria}</b></div>
        <div className="review-row"><span>Fornecedor</span><b>{request.fornecedor ?? '—'}</b></div>
        <div className="review-row"><span>Valor</span><b className="value-highlight">{formatKz(Number(request.valor))}</b></div>
        <div className="review-row"><span>Vencimento</span><b>{formatDate(request.vencimento)}</b></div>
        <div className="review-row"><span>Solicitado por</span><b>{request.solicitado_por}</b></div>
      </div>
      <div className="review-actions-confirm">
        <p className="confirm-user">A decidir como: <b>{userName}</b></p>
        <div className="form-actions review-actions">
          <button className="danger-button" onClick={() => void onApprove(request.id, userName, false)}>
            <Ban size={16} /> Recusar
          </button>
          <button className="primary-button" onClick={() => void onApprove(request.id, userName, true)}>
            <Check size={16} /> Aceitar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function FundRequestForm({ onSubmit, onCancel }: { onSubmit: (data: { descricao: string; categoria: string; fornecedor: string | null; valor: number; vencimento: string | null; tipo: string }) => Promise<void>; onCancel: () => void }) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void onSubmit({
      descricao: String(form.get('descricao')),
      tipo: String(form.get('tipo')),
      categoria: String(form.get('categoria')),
      fornecedor: String(form.get('fornecedor') || '') || null,
      valor: Number(form.get('valor')),
      vencimento: String(form.get('vencimento')) || null,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField label="Descrição" name="descricao" placeholder="Ex.: Compra de giz" />
        <FormField label="Tipo de pedido" name="tipo">
          <select name="tipo" defaultValue="Fundos">
            <option value="Fundos">Saída de fundos</option>
            <option value="Materiais">Saída de materiais</option>
          </select>
        </FormField>
        <FormField label="Categoria" name="categoria" placeholder="Ex.: Materiais didáticos" />
        <FormField label="Fornecedor" name="fornecedor" placeholder="Nome do fornecedor" required={false} />
        <FormField label="Valor (KZ)" name="valor" type="number" placeholder="0" />
        <FormField label="Vencimento" name="vencimento" type="date" required={false} />
      </div>
      <FormActions onCancel={onCancel} label="Enviar pedido" />
    </form>
  );
}
