import { useMemo, useState, type FormEvent } from 'react';
import { Pencil, Search, Trash2, User } from 'lucide-react';
import type { Student } from '@/lib/types';
import { TURNOS, AREAS_ENSINO, CLASSES_BY_AREA, CURSOS_BY_AREA, CURSOS_COMPLEMENTARES, STUDENT_STATUSES } from '@/lib/types';
import { formatKz, getInitials, exportAttendanceList } from '@/lib/utils';
import { PageHeading, EmptyState, FormField, FormActions } from '@/components/ui';
import { Modal } from '@/components/Modal';

type StudentsProps = {
  students: Student[];
  onAdd: (data: Omit<Student, 'id' | 'created_at' | 'saldo' | 'status'>) => Promise<void>;
  onEdit: (id: string, data: Partial<Student>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onViewProfile: (student: Student) => void;
};

export function Students({ students, onAdd, onEdit, onDelete, onViewProfile }: StudentsProps) {
  const [query, setQuery] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterTurno, setFilterTurno] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modal, setModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [editing, setEditing] = useState<Student | null>(null);

  const availableTurmas = useMemo(() => {
    let filtered = students;
    if (filterArea) filtered = filtered.filter((s) => s.area_ensino === filterArea);
    if (filterClasse) filtered = filtered.filter((s) => s.classe === filterClasse);
    if (filterTurno) filtered = filtered.filter((s) => s.turno === filterTurno);
    return [...new Set(filtered.map((s) => s.turma))].sort();
  }, [students, filterArea, filterClasse, filterTurno]);

  const availableClasses = useMemo(() => {
    if (!filterArea) return [...new Set(students.map((s) => s.classe))].sort();
    return CLASSES_BY_AREA[filterArea] ?? [];
  }, [students, filterArea]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (query) {
        const q = query.toLowerCase();
        if (!`${s.nome} ${s.matricula} ${s.documento_id ?? ''}`.toLowerCase().includes(q)) return false;
      }
      if (filterArea && s.area_ensino !== filterArea) return false;
      if (filterClasse && s.classe !== filterClasse) return false;
      if (filterTurno && s.turno !== filterTurno) return false;
      if (filterTurma && s.turma !== filterTurma) return false;
      if (filterStatus && s.status !== filterStatus) return false;
      return true;
    });
  }, [students, query, filterArea, filterClasse, filterTurno, filterTurma, filterStatus]);

  return (
    <>
      <PageHeading
        eyebrow="CADASTRO ACADÊMICO"
        title="Alunos e matrículas"
        description="Gerencie os alunos e acompanhe a situação de cada matrícula."
        action={() => { setEditing(null); setModal('add'); }}
        actionLabel="Cadastrar aluno"
        secondaryAction={() => exportAttendanceList(filtered, { turma: filterTurma, turno: filterTurno, classe: filterClasse, area: filterArea, status: filterStatus })}
        secondaryActionLabel="Baixar Lista de Presença"
        secondaryActionDisabled={filtered.length === 0}
      />

      <section className="panel table-panel">
        <div className="table-toolbar">
          <div className="search-bar">
            <Search size={17} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, matrícula ou BI..." />
          </div>
          <div className="filter-group">
            <select value={filterArea} onChange={(e) => { setFilterArea(e.target.value); setFilterClasse(''); setFilterTurma(''); }}>
              <option value="">Todas as áreas</option>
              {AREAS_ENSINO.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filterClasse} onChange={(e) => { setFilterClasse(e.target.value); setFilterTurma(''); }} disabled={availableClasses.length === 0}>
              <option value="">Todas as classes</option>
              {availableClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterTurno} onChange={(e) => { setFilterTurno(e.target.value); setFilterTurma(''); }}>
              <option value="">Todos os turnos</option>
              {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterTurma} onChange={(e) => setFilterTurma(e.target.value)} disabled={availableTurmas.length === 0}>
              <option value="">Todas as turmas</option>
              {availableTurmas.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Todos os estados</option>
              {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="data-table">
          <div className="table-head">
            <span>Aluno</span>
            <span className="col-hide-mobile">Área</span>
            <span className="col-hide-mobile">Curso</span>
            <span>Classe</span>
            <span className="col-hide-mobile">Turma</span>
            <span className="col-hide-mobile">Turno</span>
            <span>Matrícula</span>
            <span className="col-hide-mobile">Mensalidade</span>
            <span />
          </div>
          {filtered.map((student) => (
            <div className="table-row" key={student.id}>
              <div className="student-cell clickable" onClick={() => onViewProfile(student)}>
                <div className="person-avatar">{getInitials(student.nome)}</div>
                <div>
                  <b>{student.nome}</b>
                  <span>{student.responsavel ?? 'Sem responsável'}</span>
                </div>
              </div>
              <span className="col-hide-mobile">{student.area_ensino ?? '—'}</span>
              <span className="col-hide-mobile">{student.curso ?? 'Sem curso'}</span>
              <span>{student.classe}</span>
              <span className="col-hide-mobile">{student.turma}</span>
              <span className="col-hide-mobile">{student.turno}</span>
              <span>{student.matricula}</span>
              <span className="col-hide-mobile">{formatKz(Number(student.mensalidade))}</span>
              <div className="row-actions">
                <button className="row-icon" title="Ver perfil" onClick={() => onViewProfile(student)}><User size={15} /></button>
                <button className="row-icon" title="Editar" onClick={() => { setEditing(student); setModal('edit'); }}><Pencil size={15} /></button>
                <button className="row-icon danger" title="Eliminar" onClick={() => { setEditing(student); setModal('delete'); }}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
        {!filtered.length && <EmptyState text="Nenhum aluno encontrado com os filtros aplicados." />}
      </section>

      {modal === 'add' && (
        <Modal title="Cadastrar novo aluno" subtitle="Preencha os dados do aluno e do encarregado." size="lg" onClose={() => setModal(null)}>
          <StudentForm onSubmit={async (data) => { await onAdd(data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'edit' && editing && (
        <Modal title="Editar aluno" subtitle="Corrija as informações necessárias." size="lg" onClose={() => setModal(null)}>
          <StudentForm initial={editing} onSubmit={async (data) => { await onEdit(editing.id, data); setModal(null); }} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'delete' && editing && (
        <Modal title="Eliminar aluno" subtitle="Esta ação não pode ser desfeita." size="sm" onClose={() => setModal(null)}>
          <div className="confirm-delete">
            <p>Tem a certeza que pretende eliminar o aluno <b>{editing.nome}</b> (matrícula {editing.matricula})?</p>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setModal(null)}>Cancelar</button>
              <button className="danger-button" onClick={async () => { await onDelete(editing.id); setModal(null); }}>Eliminar</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

type StudentFormProps = {
  initial?: Student;
  onSubmit: (data: Omit<Student, 'id' | 'created_at' | 'saldo' | 'status'>) => Promise<void>;
  onCancel: () => void;
};

function StudentForm({ initial, onSubmit, onCancel }: StudentFormProps) {
  const [area, setArea] = useState(initial?.area_ensino ?? '');
  const [complementares, setComplementares] = useState<string[]>(initial?.cursos_complementares ?? []);

  const classesForArea = area ? CLASSES_BY_AREA[area] ?? [] : [];
  const cursosForArea = area ? CURSOS_BY_AREA[area] ?? [] : [];

  function toggleComplementar(nome: string) {
    setComplementares((cur) => cur.includes(nome) ? cur.filter((c) => c !== nome) : [...cur, nome]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void onSubmit({
      nome: String(form.get('nome')),
      matricula: String(form.get('matricula')),
      turma: String(form.get('turma')),
      classe: String(form.get('classe')),
      turno: String(form.get('turno')),
      responsavel: String(form.get('responsavel') || '') || null,
      telefone: String(form.get('telefone') || '') || null,
      email: String(form.get('email') || '') || null,
      mensalidade: Number(form.get('mensalidade')),
      data_entrada: String(form.get('data_entrada')) || null,
      data_nascimento: String(form.get('data_nascimento')) || null,
      sexo: String(form.get('sexo') || '') || null,
      documento_id: String(form.get('documento_id') || '') || null,
      morada: String(form.get('morada') || '') || null,
      ano_letivo: String(form.get('ano_letivo') || '') || null,
      enc_nome: String(form.get('enc_nome') || '') || null,
      enc_parentesco: String(form.get('enc_parentesco') || '') || null,
      enc_telefone: String(form.get('enc_telefone') || '') || null,
      enc_morada: String(form.get('enc_morada') || '') || null,
      enc_documento: String(form.get('enc_documento') || '') || null,
      area_ensino: area || null,
      curso: String(form.get('curso') || '') || null,
      cursos_complementares: complementares,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-section-label">Dados pessoais</div>
      <div className="form-grid">
        <FormField label="Nome completo" name="nome" placeholder="Ex.: João Silva" defaultValue={initial?.nome} />
        <FormField label="Matrícula" name="matricula" placeholder="Ex.: 2026-001" defaultValue={initial?.matricula} />
        <FormField label="Data de nascimento" name="data_nascimento" type="date" required={false} defaultValue={initial?.data_nascimento ?? ''} />
        <FormField label="Sexo" name="sexo">
          <select name="sexo" defaultValue={initial?.sexo ?? 'Masculino'}>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
        </FormField>
        <FormField label="Nº do BI / Documento" name="documento_id" placeholder="Nº do BI" required={false} defaultValue={initial?.documento_id ?? ''} />
        <FormField label="Telefone" name="telefone" placeholder="9XX XXX XXX" required={false} defaultValue={initial?.telefone ?? ''} />
        <FormField label="E-mail" name="email" type="email" placeholder="email@exemplo.ao" required={false} defaultValue={initial?.email ?? ''} />
        <FormField label="Morada" name="morada" placeholder="Endereço" required={false} defaultValue={initial?.morada ?? ''} />
      </div>

      <div className="form-section-label">Dados académicos</div>
      <div className="form-grid">
        <FormField label="Área de Ensino" name="area_ensino">
          <select name="area_ensino" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="">Selecionar área...</option>
            {AREAS_ENSINO.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </FormField>
        <FormField label="Classe" name="classe">
          <select name="classe" defaultValue={initial?.classe ?? ''} disabled={!area}>
            <option value="">{area ? 'Selecionar classe...' : 'Escolha a área primeiro'}</option>
            {classesForArea.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Curso" name="curso">
          <select name="curso" defaultValue={initial?.curso ?? ''} disabled={!area}>
            <option value="">{area ? 'Sem curso' : 'Escolha a área primeiro'}</option>
            {cursosForArea.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        <FormField label="Turno" name="turno">
          <select name="turno" defaultValue={initial?.turno ?? TURNOS[0]}>
            {TURNOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </FormField>
        <FormField label="Turma" name="turma" placeholder="Ex.: A" defaultValue={initial?.turma} />
        <FormField label="Ano letivo" name="ano_letivo" placeholder="2026" required={false} defaultValue={initial?.ano_letivo ?? '2026'} />
        <FormField label="Mensalidade (KZ)" name="mensalidade" type="number" placeholder="50000" defaultValue={initial?.mensalidade ? String(initial.mensalidade) : ''} />
        <FormField label="Data de entrada" name="data_entrada" type="date" required={false} defaultValue={initial?.data_entrada ?? ''} />
      </div>

      {area === 'Ensino Primário' && (
        <>
          <div className="form-section-label">Cursos complementares</div>
          <div className="complementar-grid">
            {CURSOS_COMPLEMENTARES.map((c) => (
              <label key={c} className={`complementar-chip ${complementares.includes(c) ? 'selected' : ''}`}>
                <input type="checkbox" checked={complementares.includes(c)} onChange={() => toggleComplementar(c)} />
                {c}
              </label>
            ))}
          </div>
        </>
      )}

      <div className="form-section-label">Dados do encarregado</div>
      <div className="form-grid">
        <FormField label="Nome do encarregado" name="enc_nome" placeholder="Nome completo" required={false} defaultValue={initial?.enc_nome ?? initial?.responsavel ?? ''} />
        <FormField label="Grau de parentesco" name="enc_parentesco" placeholder="Ex.: Pai, Mãe, Tio..." required={false} defaultValue={initial?.enc_parentesco ?? ''} />
        <FormField label="Telefone do encarregado" name="enc_telefone" placeholder="9XX XXX XXX" required={false} defaultValue={initial?.enc_telefone ?? ''} />
        <FormField label="Morada do encarregado" name="enc_morada" placeholder="Endereço" required={false} defaultValue={initial?.enc_morada ?? ''} />
        <FormField label="Documento do encarregado" name="enc_documento" placeholder="Nº do BI" required={false} defaultValue={initial?.enc_documento ?? ''} />
        <FormField label="Responsável (antigo)" name="responsavel" placeholder="Nome do responsável" required={false} defaultValue={initial?.responsavel ?? ''} />
      </div>

      <FormActions onCancel={onCancel} label={initial ? "Guardar alterações" : "Cadastrar aluno"} />
    </form>
  );
}
