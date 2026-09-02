import { useMemo, useState } from 'react';
import { Search, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react';
import type { AuditEntry } from '@/lib/types';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { PageHeading, EmptyState } from '@/components/ui';

type AuditViewProps = {
  audit: AuditEntry[];
};

export function AuditView({ audit }: AuditViewProps) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return audit.filter((a) => `${a.acao} ${a.descricao} ${a.entidade} ${a.responsavel}`.toLowerCase().includes(query.toLowerCase()));
  }, [audit, query]);

  return (
    <>
      <PageHeading
        eyebrow="SEGURANÇA E CONTROLE"
        title="Auditoria"
        description="Todas as alterações importantes ficam registadas para garantir transparência."
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ação, entidade ou responsável..." />
          </div>
          <div className="audit-secure"><ShieldCheck size={15} /> Registro protegido</div>
        </div>
        <div className="audit-list">
          {filtered.map((entry) => (
            <div className="audit-row" key={entry.id}>
              <div className="audit-symbol"><ShieldCheck size={17} /></div>
              <div className="audit-main" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                <b>{entry.acao}</b>
                <span>{entry.descricao}</span>
                <div className="audit-tags">
                  <span className="audit-tag">{entry.entidade}</span>
                  {entry.entidade_id && <span className="audit-tag">ID: {entry.entidade_id.slice(0, 8)}</span>}
                </div>
              </div>
              <div className="audit-meta">
                <b>{entry.responsavel}</b>
                <span>{formatDateTime(entry.created_at)}</span>
                <small>{timeAgo(entry.created_at)}</small>
              </div>
              {(entry.valor_anterior || entry.valor_novo) && (
                <button className="audit-expand" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
                  {expanded === entry.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              {expanded === entry.id && (entry.valor_anterior || entry.valor_novo) && (
                <div className="audit-detail">
                  {entry.valor_anterior && (
                    <div className="audit-diff">
                      <h4>Valor anterior</h4>
                      <pre>{JSON.stringify(entry.valor_anterior, null, 2)}</pre>
                    </div>
                  )}
                  {entry.valor_novo && (
                    <div className="audit-diff">
                      <h4>Valor novo</h4>
                      <pre>{JSON.stringify(entry.valor_novo, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {!filtered.length && <EmptyState text="Nenhum registo de auditoria encontrado." />}
      </section>
    </>
  );
}
