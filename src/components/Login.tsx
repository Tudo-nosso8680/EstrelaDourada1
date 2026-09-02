import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';

type AccessType = 'funcionario' | 'administrador';
type Mode = 'login' | 'register';

type LoginProps = {
  onAuthenticated: (profile: UserProfile) => void;
};

type FormState = {
  nome: string;
  sexo: string;
  numero: string;
  sector: string;
  cargo: string;
  contacto: string;
  email: string;
  senha: string;
  confirmar: string;
  funcaoAdmin: string;
  codigo: string;
};

const initialForm: FormState = {
  nome: '', sexo: '', numero: '', sector: '', cargo: '', contacto: '', email: '', senha: '', confirmar: '', funcaoAdmin: '', codigo: '',
};

function friendlyAuthError(message: string): string {
  if (message.includes('already registered')) return 'Este e-mail já está registado.';
  if (message.includes('Invalid login credentials')) return 'Número/e-mail ou palavra-passe incorretos.';
  if (message.includes('Password should be')) return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  if (message.includes('duplicate key')) return 'Este número de funcionário já está registado.';
  return 'Não foi possível concluir. Verifique os dados e tente novamente.';
}

export function Login({ onAuthenticated }: LoginProps) {
  const [accessType, setAccessType] = useState<AccessType>('funcionario');
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  function changeForm(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  function selectAccess(type: AccessType) {
    setAccessType(type);
    setError('');
    setNotice('');
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError('');
    setNotice('');
    setForm(initialForm);
  }

  async function resolveEmail(value: string): Promise<string | null> {
    if (value.includes('@')) return value.trim().toLowerCase();
    const { data, error: lookupError } = await supabase.rpc('procurar_perfil_por_identificador', { p_identificador: value.trim() });
    if (lookupError || !data?.[0]?.email) return null;
    return data[0].email;
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const email = await resolveEmail(identifier);
    if (!email) {
      setError('Nome de utilizador ou número não encontrado.');
      setBusy(false);
      return;
    }
    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError || !data.user) {
      setError(friendlyAuthError(loginError?.message ?? ''));
      setBusy(false);
      return;
    }
    const { data: profile } = await supabase.from('perfis').select('*').eq('id', data.user.id).maybeSingle();
    if (!profile) {
      setError('O perfil desta conta ainda não foi configurado.');
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    onAuthenticated(profile as UserProfile);
    setBusy(false);
  }

  async function validateAdminCode(): Promise<boolean> {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validar-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ code: form.codigo }),
    });
    if (!response.ok) return false;
    const body = await response.json() as { valid?: boolean };
    return body.valid === true;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (form.senha.length < 6) { setError('A palavra-passe deve ter pelo menos 6 caracteres.'); return; }
    if (form.senha !== form.confirmar) { setError('As palavras-passe não coincidem.'); return; }
    if (accessType === 'administrador' && !form.funcaoAdmin.trim()) { setError('Informe a função administrativa.'); return; }
    if (accessType === 'administrador' && !(await validateAdminCode())) { setError('Código de autorização inválido.'); return; }

    setBusy(true);
    const email = form.email.trim().toLowerCase() || `${form.numero.trim().toLowerCase()}@conta.estreladourada.local`;
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password: form.senha });
    if (signUpError || !data.user) {
      setError(friendlyAuthError(signUpError?.message ?? ''));
      setBusy(false);
      return;
    }
    const { error: profileError } = await supabase.rpc('inserir_perfil', {
      p_user_id: data.user.id,
      p_nome: form.nome.trim(),
      p_numero: form.numero.trim(),
      p_tipo: accessType,
      p_sector: form.sector.trim() || null,
      p_cargo: form.cargo.trim() || null,
      p_contacto: form.contacto.trim() || null,
      p_email: email,
      p_sexo: form.sexo || null,
      p_funcao_admin: accessType === 'administrador' ? form.funcaoAdmin.trim() : null,
    });
    if (profileError) {
      setError(friendlyAuthError(profileError.message));
      await supabase.auth.signOut();
      setBusy(false);
      return;
    }
    const { data: profile } = await supabase.from('perfis').select('*').eq('id', data.user.id).maybeSingle();
    if (profile) {
      onAuthenticated(profile as UserProfile);
    } else {
      setNotice('Conta criada. Pode entrar com o seu número e palavra-passe.');
      switchMode('login');
    }
    setBusy(false);
  }

  const isAdmin = accessType === 'administrador';

  return (
    <div className="login-shell">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <main className="login-card">
        <div className="login-brand">
          <div className="login-brand-mark"><GraduationCap size={30} /></div>
          <div><strong>ESTRELA <span>DOURADA</span></strong><small>Sistema de Gestão Escolar</small></div>
        </div>
        <div className="login-heading">
          <p className="login-kicker">Acesso seguro</p>
          <h1>{mode === 'login' ? 'Bem-vindo/a ao Estrela Dourada!' : 'Crie a sua conta'}</h1>
          <p>{mode === 'login' ? 'Aceda ao sistema utilizando as suas credenciais.' : 'Preencha os seus dados para começar.'}</p>
        </div>

        <div className="access-choice">
          <span>Escolha o tipo de acesso</span>
          <div className="access-tabs">
            <button type="button" className={!isAdmin ? 'active' : ''} onClick={() => selectAccess('funcionario')}><UserRound size={16} /> Funcionário</button>
            <button type="button" className={isAdmin ? 'active admin' : ''} onClick={() => selectAccess('administrador')}><ShieldCheck size={16} /> Administrador (ADM)</button>
          </div>
        </div>

        {mode === 'login' ? (
          <form className="login-form" onSubmit={handleLogin}>
            <label className="login-field"><span>Nome de utilizador ou número de utilizador</span><div className="login-input"><UserRound size={17} /><input value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(''); }} placeholder="Ex.: martins123 ou 000125" required /></div></label>
            <label className="login-field"><span>Palavra-passe</span><div className="login-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Introduza a sua palavra-passe" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar palavra-passe">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {error && <div className="login-error">{error}</div>}
            {notice && <div className="login-notice">{notice}</div>}
            <button className="login-submit" type="submit" disabled={busy}>{busy ? 'A entrar…' : 'ENTRAR'}</button>
            <div className="login-footer"><span>Ainda não possui uma conta?</span><button type="button" onClick={() => switchMode('register')}>Criar conta</button></div>
          </form>
        ) : (
          <form className="register-form" onSubmit={handleRegister}>
            <div className="register-section-title">{isAdmin ? 'Cadastro de Administrador' : 'Cadastro de Funcionário'}</div>
            <div className="register-grid">
              <label className="login-field full"><span>Nome completo</span><div className="login-input"><UserRound size={16} /><input value={form.nome} onChange={(event) => changeForm('nome', event.target.value)} placeholder="Nome e apelido" required /></div></label>
              {!isAdmin && <label className="login-field"><span>Sexo</span><select value={form.sexo} onChange={(event) => changeForm('sexo', event.target.value)} required><option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option></select></label>}
              <label className="login-field"><span>{isAdmin ? 'Número / ID' : 'Número de utilizador'}</span><input value={form.numero} onChange={(event) => changeForm('numero', event.target.value)} placeholder="Ex.: 000125" required /></label>
              {!isAdmin && <><label className="login-field"><span>Sector de trabalho</span><input value={form.sector} onChange={(event) => changeForm('sector', event.target.value)} placeholder="Ex.: Administração" required /></label><label className="login-field"><span>Cargo / função</span><input value={form.cargo} onChange={(event) => changeForm('cargo', event.target.value)} placeholder="Ex.: Assistente" required /></label></>}
              {isAdmin && <label className="login-field"><span>Função administrativa</span><input value={form.funcaoAdmin} onChange={(event) => changeForm('funcaoAdmin', event.target.value)} placeholder="Ex.: Director financeiro" required /></label>}
              <label className="login-field"><span>Contacto</span><input value={form.contacto} onChange={(event) => changeForm('contacto', event.target.value)} placeholder="Telefone" required /></label>
              <label className="login-field full"><span>E-mail <small>(se aplicável)</small></span><div className="login-input"><Mail size={16} /><input type="email" value={form.email} onChange={(event) => changeForm('email', event.target.value)} placeholder="nome@exemplo.com" /></div></label>
              {isAdmin && <label className="login-field full authorization-field"><span>Código de autorização</span><input type="password" value={form.codigo} onChange={(event) => changeForm('codigo', event.target.value)} placeholder="Introduza o código recebido" required /></label>}
              <label className="login-field"><span>Palavra-passe</span><div className="login-input"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} value={form.senha} onChange={(event) => changeForm('senha', event.target.value)} placeholder="Mínimo 6 caracteres" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Mostrar palavra-passe">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
              <label className="login-field"><span>Confirmar palavra-passe</span><div className="login-input"><LockKeyhole size={16} /><input type={showConfirm ? 'text' : 'password'} value={form.confirmar} onChange={(event) => changeForm('confirmar', event.target.value)} placeholder="Repita a palavra-passe" required /><button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label="Mostrar confirmação">{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            </div>
            {error && <div className="login-error">{error}</div>}
            <div className="register-actions"><button type="button" className="login-secondary" onClick={() => switchMode('login')}>Voltar ao login</button><button className="login-submit" type="submit" disabled={busy}>{busy ? 'A criar conta…' : 'CRIAR CONTA'}</button></div>
          </form>
        )}
        <p className="login-security"><ShieldCheck size={14} /> Os seus dados são protegidos e as ações ficam registadas.</p>
      </main>
    </div>
  );
}
