import { useMemo, useState, type FormEvent } from 'react';
import {
  Search, FileText, Check, Ban, Trash2, Eye, Upload,
} from 'lucide-react';
import type { Fatura } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { formatKz, formatDate, todayString } from '@/lib/utils';
import { PageHeading, Badge, EmptyState, FormField, FormActions } from '@/components/ui';
import { Modal } from '@/components/Modal';

type FaturasProps = {
  faturas: Fatura[];
  onAdd: (data: { funcionario_nome: string; especificacao: string; valor: number; data_fatura: string; file_url: string | null; file_path: string | null }) => Promise<void>;
  onApprove: (id: string, decisaoPor: string, approved: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  userName: string;
};

export function Faturas({ faturas, onAdd, onApprove, onDelete, userName }: FaturasProps) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<'add' | 'review' | 'view' | 'delete' | null>(null);
  const [reviewing, setReviewing] = useState<Fatura | null>(null);
  const [viewing, setViewing] = useState<Fatura | null>(null);
  const [deleting, setDeleting] = useState<Fatura | null>(null);

  const filtered = useMemo(() => {
    return faturas.filter((f) => `${f.funcionario_nome} ${f.especificacao} ${f.status}`.toLowerCase().includes(query.toLowerCase()));
  }, [faturas, query]);

  const pending = filtered.filter((f) => f.status === 'Pendente');
  const decided = filtered.filter((f) => f.status !== 'Pendente');

  return (
    <>
      <PageHeading
        eyebrow="GESTÃO DE FATURAS"
        title="Faturas"
        description="Registo de faturas submetidas pelos funcionários de campo."
        action={() => setModal('add')}
        actionLabel="Nova fatura"
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar fatura..." />
          </div>
        </div>

        {pending.length > 0 && (
          <>
            <div className="table-section-label">Aguardando aprovação</div>
            <div className="data-table">
              <div className="table-head fatura-head">
                <span>Funcionário</span>
                <span>Especificação</span>
                <span>Valor</span>
                <span className="col-hide-mobile">Data</span>
                <span className="col-hide-mobile">Documento</span>
                <span>Status</span>
                <span />
              </div>
              {pending.map((f) => (
                <div className="table-row" key={f.id}>
                  <span><b>{f.funcionario_nome}</b></span>
                  <span>{f.especificacao}</span>
                  <span><b>{formatKz(Number(f.valor))}</b></span>
                  <span className="col-hide-mobile">{formatDate(f.data_fatura)}</span>
                  <span className="col-hide-mobile">{f.file_url ? <button className="text-button" onClick={() => { setViewing(f); setModal('view'); }}><Eye size={14} /> Ver</button> : '—'}</span>
                  <span><Badge label={f.status} tone="orange" /></span>
                  <div className="row-actions">
                    <button className="primary-button sm" onClick={() => { setReviewing(f); setModal('review'); }}>Rever</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {decided.length > 0 && (
          <>
            <div className="table-section-label">Decididas</div>
            <div className="data-table">
              <div className="table-head fatura-head">
                <span>Funcionário</span>
                <span>Especificação</span>
                <span>Valor</span>
                <span className="col-hide-mobile">Data</span>
                <span className="col-hide-mobile">Documento</span>
                <span>Status</span>
                <span />
              </div>
              {decided.map((f) => (
                <div className="table-row" key={f.id}>
                  <span><b>{f.funcionario_nome}</b></span>
                  <span>{f.especificacao}</span>
                  <span><b>{formatKz(Number(f.valor))}</b></span>
                  <span className="col-hide-mobile">{formatDate(f.data_fatura)}</span>
                  <span className="col-hide-mobile">{f.file_url ? <button className="text-button" onClick={() => { setViewing(f); setModal('view'); }}><Eye size={14} /> Ver</button> : '—'}</span>
                  <span><Badge label={f.status} tone={f.status === 'Aprovada' ? 'green' : 'red'} /></span>
                  <div className="row-actions">
                    <button className="row-icon danger" title="Eliminar" onClick={() => { setDeleting(f); setModal('delete'); }}><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!filtered.length && <EmptyState text="Nenhuma fatura registada." />}
      </section>

      {modal === 'add' && (
        <Modal title="Nova fatura" subtitle="Registe a fatura submetida pelo funcionário." onClose={() => setModal(null)}>
          <FaturaForm onSubmit={async (data) => { await onAdd(data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'review' && reviewing && (
        <ReviewFatura
          fatura={reviewing}
          onClose={() => setModal(null)}
          onApprove={async (id, _user, approved) => { await onApprove(id, userName, approved); setModal(null); }}
          userName={userName}
        />
      )}
      {modal === 'view' && viewing && (
        <Modal title="Documento da fatura" size="lg" onClose={() => setModal(null)}>
          <div className="fatura-viewer">
            {viewing.file_url && viewing.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <img src={viewing.file_url} alt="Fatura" className="fatura-image" />
            ) : (
              <div className="fatura-file-link">
                <FileText size={48} />
                <a href={viewing.file_url ?? '#'} target="_blank" rel="noopener noreferrer">Abrir documento</a>
              </div>
            )}
            <div className="fatura-info">
              <div><span>Funcionário</span><b>{viewing.funcionario_nome}</b></div>
              <div><span>Especificação</span><b>{viewing.especificacao}</b></div>
              <div><span>Valor</span><b>{formatKz(Number(viewing.valor))}</b></div>
              <div><span>Data</span><b>{formatDate(viewing.data_fatura)}</b></div>
            </div>
          </div>
        </Modal>
      )}
      {modal === 'delete' && deleting && (
        <Modal title="Eliminar fatura" size="sm" subtitle="Esta ação não pode ser desfeita." onClose={() => setModal(null)}>
          <div className="confirm-delete">
            <p>Tem a certeza que pretende eliminar a fatura de <b>{deleting.funcionario_nome}</b>?</p>
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

function ReviewFatura({ fatura, onClose, onApprove, userName }: { fatura: Fatura; onClose: () => void; onApprove: (id: string, user: string, approved: boolean) => Promise<void>; userName: string }) {
  return (
    <Modal title="Rever fatura" subtitle="Confirme a decisão sobre a fatura." onClose={onClose}>
      <div className="review-detail">
        <div className="review-row"><span>Funcionário</span><b>{fatura.funcionario_nome}</b></div>
        <div className="review-row"><span>Especificação</span><b>{fatura.especificacao}</b></div>
        <div className="review-row"><span>Valor</span><b className="value-highlight">{formatKz(Number(fatura.valor))}</b></div>
        <div className="review-row"><span>Data</span><b>{formatDate(fatura.data_fatura)}</b></div>
        {fatura.file_url && (
          <div className="review-row"><span>Documento</span><a href={fatura.file_url} target="_blank" rel="noopener noreferrer" className="text-button"><Eye size={14} /> Ver documento</a></div>
        )}
      </div>
      <div className="review-actions-confirm">
        <p className="confirm-user">A decidir como: <b>{userName}</b></p>
        <div className="form-actions review-actions">
          <button className="danger-button" onClick={() => void onApprove(fatura.id, userName, false)}><Ban size={16} /> Rejeitar</button>
          <button className="primary-button" onClick={() => void onApprove(fatura.id, userName, true)}><Check size={16} /> Aprovar</button>
        </div>
      </div>
    </Modal>
  );
}

type FaturaFormProps = {
  onSubmit: (data: { funcionario_nome: string; especificacao: string; valor: number; data_fatura: string; file_url: string | null; file_path: string | null }) => Promise<void>;
  onCancel: () => void;
};

function FaturaForm({ onSubmit, onCancel }: FaturaFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const funcionarioNome = String(form.get('funcionario_nome'));
    const especificacao = String(form.get('especificacao'));
    const valor = Number(form.get('valor'));
    const dataFatura = String(form.get('data_fatura'));

    void (async () => {
      let fileUrl: string | null = null;
      let filePath: string | null = null;

      if (file) {
        setUploading(true);
        try {
          const ext = file.name.split('.').pop() ?? 'jpg';
          const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error } = await supabase.storage.from('faturas').upload(path, file);
          if (!error) {
            const { data: urlData } = supabase.storage.from('faturas').getPublicUrl(path);
            fileUrl = urlData.publicUrl;
            filePath = path;
          }
        } catch {
          // upload failed, continue without file
        }
        setUploading(false);
      }

      await onSubmit({ funcionario_nome: funcionarioNome, especificacao, valor, data_fatura: dataFatura, file_url: fileUrl, file_path: filePath });
    })();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField label="Funcionário" name="funcionario_nome" placeholder="Nome do funcionário" />
        <FormField label="Data da fatura" name="data_fatura" type="date" defaultValue={todayString()} />
        <FormField label="Especificação da despesa" name="especificacao" placeholder="Descrição da despesa" />
        <FormField label="Valor (KZ)" name="valor" type="number" placeholder="0" />
      </div>
      <label className="form-field upload-field">
        <span>Fotografia / documento da fatura</span>
        <div className="upload-area">
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <div className="upload-placeholder">
            <Upload size={20} />
            {file ? <b>{file.name}</b> : <span>Clique para selecionar ou arraste o ficheiro</span>}
          </div>
        </div>
      </label>
      <FormActions onCancel={onCancel} label={uploading ? 'A enviar...' : 'Submeter fatura'} />
    </form>
  );
}
