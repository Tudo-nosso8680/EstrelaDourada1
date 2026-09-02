export type UserProfile = {
  id: string;
  nome_completo: string;
  sexo: string | null;
  numero_funcionario: string;
  nome_utilizador: string | null;
  sector: string | null;
  cargo: string | null;
  contacto: string | null;
  email: string | null;
  tipo: 'funcionario' | 'administrador';
  funcao_admin: string | null;
  permissoes: Record<string, boolean>;
  foto_url: string | null;
  estado: string;
  created_at: string;
};

export type Student = {
  id: string;
  nome: string;
  matricula: string;
  turma: string;
  classe: string;
  turno: string;
  responsavel: string | null;
  telefone: string | null;
  email: string | null;
  mensalidade: number;
  saldo: number;
  status: string;
  data_entrada: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  documento_id: string | null;
  morada: string | null;
  ano_letivo: string | null;
  enc_nome: string | null;
  enc_parentesco: string | null;
  enc_telefone: string | null;
  enc_morada: string | null;
  enc_documento: string | null;
  area_ensino: string | null;
  curso: string | null;
  cursos_complementares: string[] | null;
  created_at: string;
};

export type Payment = {
  id: string;
  aluno_id: string;
  valor: number;
  competencia: string;
  metodo: string;
  tipo: string;
  categoria: string;
  descricao: string | null;
  status: string;
  recibo: string;
  data_pagamento: string | null;
  utilizador: string | null;
  disciplina: string | null;
  periodicidade: string | null;
  periodo_cobertura: string | null;
  antecipado: boolean;
  created_at: string;
  aluno?: { nome: string; matricula: string; turma: string; classe: string; turno: string } | null;
};

export type FundRequest = {
  id: string;
  descricao: string;
  categoria: string;
  fornecedor: string | null;
  valor: number;
  vencimento: string | null;
  status: string;
  solicitado_por: string;
  tipo: string;
  decisao_por: string | null;
  decisao_em: string | null;
  created_at: string;
};

export type AuditEntry = {
  id: string;
  acao: string;
  entidade: string;
  descricao: string;
  responsavel: string;
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  entidade_id: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  pedido_id: string | null;
  titulo: string;
  descricao: string;
  lida: boolean;
  created_at: string;
};

export type Fatura = {
  id: string;
  funcionario_nome: string;
  especificacao: string;
  valor: number;
  data_fatura: string;
  file_url: string | null;
  file_path: string | null;
  status: string;
  decisao_por: string | null;
  decisao_em: string | null;
  created_at: string;
};

export type SecretariaRequest = {
  id: string;
  tipo: string;
  aluno_id: string | null;
  aluno_nome: string | null;
  descricao: string | null;
  valor: number;
  pago: boolean;
  pagamento_id: string | null;
  status: string;
  observacao: string | null;
  created_at: string;
};

export type SavedReport = {
  id: string;
  tipo: string;
  data_referencia: string;
  dados: Record<string, unknown>;
  criado_por: string;
  created_at: string;
};

export type DailyHistoryEntry = {
  data: string;
  total_arrecadado: number;
  saidas_fundos: number;
  total_liquido: number;
};

export type View = 'dashboard' | 'students' | 'treasury' | 'fundrequests' | 'faturas' | 'secretaria' | 'reports' | 'audit' | 'profile';

export const PAYMENT_TYPES = ['Propina', 'Multa do mês', 'Recurso', 'Taxa de Seguro', 'Uniforme', 'Cartão', 'Folha de Provas', 'Matrícula', 'Confirmação', 'Certificado', 'Declaração', 'Curso Complementar'] as const;
export const PAYMENT_METHODS = ['Numerário', 'Transferência Bancária', 'Multicaixa', 'TPA', 'Depósito Bancário', 'Referência de Pagamento', 'Outro'] as const;
export const PAYMENT_CATEGORIES = ['Propina', 'Multa', 'Recurso', 'Seguro', 'Matricula', 'Confirmacao', 'Certificado', 'Declaracao', 'Uniforme', 'Cartao', 'Folha', 'Curso', 'Outro'] as const;

export const SEGURO_PERIODICIDADES = ['Mensal', 'Trimestral', 'Anual'] as const;
export const SEGURO_VALORES: Record<string, number> = {
  'Mensal': 500,
  'Trimestral': 1500,
  'Anual': 4500,
};

export const DISCIPLINAS_BY_CURSO: Record<string, string[]> = {
  'Electricidade de Baixa Tensão': ['Matemática', 'Física', 'Tecnologia Eléctrica', 'Desenho Técnico', 'Português', 'Inglês Técnico'],
  'Mecânica': ['Matemática', 'Física', 'Mecânica Aplicada', 'Desenho Técnico', 'Tecnologia Mecânica', 'Português'],
  'Informática': ['Matemática', 'Lógica de Programação', 'Sistemas Operativos', 'Redes de Computadores', 'Português', 'Inglês Técnico'],
  'Farmácia': ['Biologia', 'Química', 'Farmacologia', 'Anatomia', 'Fisiologia', 'Português'],
  'Radiologia Médica': ['Biologia', 'Física', 'Anatomia', 'Tecnologia Radiológica', 'Fisiologia', 'Português'],
  'Nutrição e Dietética': ['Biologia', 'Química', 'Bioquímica', 'Nutrição Humana', 'Fisiologia', 'Português'],
  'Fisioterapia': ['Biologia', 'Anatomia', 'Fisiologia', 'Cinesiologia', 'Técnicas de Fisioterapia', 'Português'],
  'Estomatologia': ['Biologia', 'Anatomia', 'Fisiologia', 'Microbiologia', 'Técnicas Dentárias', 'Português'],
  'Electricidade, Eléctrica e Telecomunicações': ['Matemática', 'Física', 'Electrotécnia', 'Telecomunicações', 'Desenho Técnico', 'Português'],
  'Energia e Instalações Eléctricas': ['Matemática', 'Física', 'Electrotécnia', 'Instalações Eléctricas', 'Desenho Técnico', 'Português'],
  'Electrónica Industrial e Automação': ['Matemática', 'Física', 'Electrónica', 'Automação Industrial', 'Desenho Técnico', 'Português'],
  'Electrónica e Telecomunicações': ['Matemática', 'Física', 'Electrónica', 'Telecomunicações', 'Desenho Técnico', 'Português'],
  'Energias Renováveis': ['Matemática', 'Física', 'Energias Renováveis', 'Electrotécnia', 'Desenho Técnico', 'Português'],
  'Mecânica e Mecatrónica': ['Matemática', 'Física', 'Mecânica Aplicada', 'Mecatrónica', 'Desenho Técnico', 'Português'],
  'Mecatrónica Automóvel': ['Matemática', 'Física', 'Mecânica Automóvel', 'Mecatrónica', 'Desenho Técnico', 'Português'],
  'Frio e Climatização': ['Matemática', 'Física', 'Termodinâmica', 'Tecnologia de Frio', 'Desenho Técnico', 'Português'],
  'Electromecânica': ['Matemática', 'Física', 'Electrotécnia', 'Mecânica Aplicada', 'Desenho Técnico', 'Português'],
  'Máquinas e Motores': ['Matemática', 'Física', 'Mecânica Aplicada', 'Motores Térmicos', 'Desenho Técnico', 'Português'],
  'Técnico de Informática': ['Matemática', 'Lógica de Programação', 'Hardware', 'Redes de Computadores', 'Português', 'Inglês Técnico'],
  'Gestão de Sistemas Informáticos': ['Matemática', 'Gestão de Projectos', 'Sistemas de Informação', 'Redes de Computadores', 'Português', 'Inglês Técnico'],
  'Desenhador Projectista': ['Matemática', 'Desenho Técnico', 'Desenho Arquitectónico', 'CAD', 'Português', 'Física'],
  'Técnico de Obras': ['Matemática', 'Física', 'Construção Civil', 'Topografia', 'Desenho Técnico', 'Português'],
};

export const MESES_ANO = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'] as const;
export const CLASSES = ['1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe', '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe', '10ª Classe', '11ª Classe', '12ª Classe', '13ª Classe'] as const;
export const TURNOS = ['Manhã', 'Tarde', 'Noite'] as const;
export const SECRETARIA_TYPES = ['Matrícula', 'Confirmação', 'Certificado', 'Transferência', 'Declaração'] as const;

// ===== Academic Structure =====
export const AREAS_ENSINO = [
  'Ensino Primário',
  '1.º Ciclo Técnico Profissional',
  'Médio Técnico de Saúde',
  'Médio Técnico Industrial',
] as const;

export const CLASSES_BY_AREA: Record<string, string[]> = {
  'Ensino Primário': ['Iniciação', '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe', '5ª Classe', '6ª Classe'],
  '1.º Ciclo Técnico Profissional': ['7ª Classe', '8ª Classe', '9ª Classe'],
  'Médio Técnico de Saúde': ['10ª Classe', '11ª Classe', '12ª Classe', '13ª Classe'],
  'Médio Técnico Industrial': ['10ª Classe', '11ª Classe', '12ª Classe', '13ª Classe'],
};

export const CURSOS_BY_AREA: Record<string, string[]> = {
  'Ensino Primário': [],
  '1.º Ciclo Técnico Profissional': ['Electricidade de Baixa Tensão', 'Mecânica', 'Informática'],
  'Médio Técnico de Saúde': ['Farmácia', 'Radiologia Médica', 'Nutrição e Dietética', 'Fisioterapia', 'Estomatologia'],
  'Médio Técnico Industrial': [
    'Electricidade, Eléctrica e Telecomunicações',
    'Energia e Instalações Eléctricas',
    'Electrónica Industrial e Automação',
    'Electrónica e Telecomunicações',
    'Energias Renováveis',
    'Mecânica e Mecatrónica',
    'Mecatrónica Automóvel',
    'Frio e Climatização',
    'Electromecânica',
    'Máquinas e Motores',
    'Técnico de Informática',
    'Gestão de Sistemas Informáticos',
    'Desenhador Projectista',
    'Técnico de Obras',
  ],
};

export const CURSOS_COMPLEMENTARES = ['Inglês', 'Natação', 'Caligrafia', 'Teatro', 'Dança', 'Religião'] as const;

export const STUDENT_STATUSES = ['Ativo', 'Inativo', 'Transferido', 'Concluído', 'Desistente', 'Suspenso'] as const;
