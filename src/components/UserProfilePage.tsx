import { useRef, useState } from 'react';
import { Camera, Check, Mail, Phone, Save, Trash2, User, UserCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/types';
import { formatDateLong } from '@/lib/utils';

type Props = {
  userProfile: UserProfile;
  onUpdated: (profile: UserProfile) => void;
  onNotice: (message: string) => void;
};

export function UserProfilePage({ userProfile, onUpdated, onNotice }: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome_completo: userProfile.nome_completo,
    nome_utilizador: userProfile.nome_utilizador ?? '',
    contacto: userProfile.contacto ?? '',
    email: userProfile.email ?? '',
    sector: userProfile.sector ?? '',
    cargo: userProfile.cargo ?? '',
  });

  function startEditing() {
    setForm({
      nome_completo: userProfile.nome_completo,
      nome_utilizador: userProfile.nome_utilizador ?? '',
      contacto: userProfile.contacto ?? '',
      email: userProfile.email ?? '',
      sector: userProfile.sector ?? '',
      cargo: userProfile.cargo ?? '',
    });
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function handleSave() {
    if (!form.nome_completo.trim()) {
      onNotice('O nome completo é obrigatório.');
      return;
    }
    setBusy(true);
    const updates = {
      nome_completo: form.nome_completo.trim(),
      nome_utilizador: form.nome_utilizador.trim() || null,
      contacto: form.contacto.trim() || null,
      email: form.email.trim() || null,
      sector: form.sector.trim() || null,
      cargo: form.cargo.trim() || null,
    };
    const { data, error } = await supabase.from('perfis').update(updates).eq('id', userProfile.id).select('*').maybeSingle();
    setBusy(false);
    if (error || !data) {
      onNotice('Erro ao guardar alterações. Verifique se o nome de utilizador já existe.');
      return;
    }
    onUpdated(data as UserProfile);
    setEditing(false);
    onNotice('Perfil atualizado com sucesso.');
  }

  async function handlePhotoChange(file: File) {
    if (!file.type.startsWith('image/')) {
      onNotice('Por favor, selecione um ficheiro de imagem.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      onNotice('A imagem não pode ter mais de 3 MB.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${userProfile.id}/foto.${ext}`;

    if (userProfile.foto_url) {
      const oldPath = userProfile.foto_url.split('/fotos-perfil/')[1];
      if (oldPath) await supabase.storage.from('fotos-perfil').remove([oldPath]);
    }

    const { error: uploadError } = await supabase.storage.from('fotos-perfil').upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(false);
      onNotice('Erro ao carregar a foto.');
      return;
    }

    const { data: urlData } = supabase.storage.from('fotos-perfil').getPublicUrl(path);
    const fotoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { data, error } = await supabase.from('perfis').update({ foto_url: fotoUrl }).eq('id', userProfile.id).select('*').maybeSingle();
    setUploading(false);
    if (error || !data) {
      onNotice('Erro ao guardar a foto.');
      return;
    }
    onUpdated(data as UserProfile);
    onNotice('Foto de perfil atualizada.');
  }

  async function handleRemovePhoto() {
    if (!userProfile.foto_url) return;
    const oldPath = userProfile.foto_url.split('/fotos-perfil/')[1]?.split('?')[0];
    if (oldPath) await supabase.storage.from('fotos-perfil').remove([oldPath]);

    const { data, error } = await supabase.from('perfis').update({ foto_url: null }).eq('id', userProfile.id).select('*').maybeSingle();
    if (error || !data) {
      onNotice('Erro ao remover a foto.');
      return;
    }
    onUpdated(data as UserProfile);
    onNotice('Foto removida.');
  }

  const initials = userProfile.nome_completo.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
      <div className="profile-info-row">
        <div className="profile-info-icon">{icon}</div>
        <div className="profile-info-text">
          <span>{label}</span>
          <b>{value || '—'}</b>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-photo-section">
          <div className="profile-photo-large">
            {userProfile.foto_url ? (
              <img src={userProfile.foto_url} alt={userProfile.nome_completo} />
            ) : (
              <div className="profile-photo-placeholder">{initials}</div>
            )}
            {uploading && <div className="profile-photo-overlay">A carregar…</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoChange(f); e.target.value = ''; }} />
          <div className="profile-photo-actions">
            <button className="profile-photo-btn" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Camera size={15} /> {userProfile.foto_url ? 'Alterar foto' : 'Carregar foto'}
            </button>
            {userProfile.foto_url && (
              <button className="profile-photo-btn remove" onClick={handleRemovePhoto} disabled={uploading}>
                <Trash2 size={15} /> Remover
              </button>
            )}
          </div>
        </div>

        <div className="profile-identity">
          <h2>{userProfile.nome_completo}</h2>
          <span className="profile-role-badge">
            {userProfile.tipo === 'administrador' ? (userProfile.funcao_admin ?? 'Administrador') : (userProfile.cargo ?? 'Funcionário')}
          </span>
          <div className="profile-estado-badge estado-{userProfile.estado.toLowerCase()}">{userProfile.estado}</div>
        </div>

        {!editing ? (
          <button className="profile-edit-btn" onClick={startEditing}>
            <User size={16} /> Editar perfil
          </button>
        ) : (
          <div className="profile-edit-actions">
            <button className="profile-save-btn" onClick={handleSave} disabled={busy}>
              <Save size={16} /> {busy ? 'A guardar…' : 'Guardar alterações'}
            </button>
            <button className="profile-cancel-btn" onClick={cancelEditing} disabled={busy}>
              <X size={16} /> Cancelar
            </button>
          </div>
        )}
      </div>

      <div className="profile-info-grid">
        {!editing ? (
          <>
            <InfoRow icon={<User size={18} />} label="Nome completo" value={userProfile.nome_completo} />
            <InfoRow icon={<UserCircle size={18} />} label="Nome de utilizador" value={userProfile.nome_utilizador ?? ''} />
            <InfoRow icon={<User size={18} />} label="Número de utilizador / ID" value={userProfile.numero_funcionario} />
            <InfoRow icon={<Phone size={18} />} label="Contacto telefónico" value={userProfile.contacto ?? ''} />
            <InfoRow icon={<Mail size={18} />} label="E-mail" value={userProfile.email ?? ''} />
            <InfoRow icon={<User size={18} />} label="Cargo / função" value={userProfile.cargo ?? ''} />
            <InfoRow icon={<User size={18} />} label="Departamento" value={userProfile.sector ?? ''} />
            <InfoRow icon={<Check size={18} />} label="Estado da conta" value={userProfile.estado} />
            <InfoRow icon={<User size={18} />} label="Data de criação" value={formatDateLong(userProfile.created_at)} />
          </>
        ) : (
          <div className="profile-edit-grid">
            <label className="profile-edit-field">
              <span>Nome completo</span>
              <input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
            </label>
            <label className="profile-edit-field">
              <span>Nome de utilizador</span>
              <input value={form.nome_utilizador} onChange={(e) => setForm({ ...form, nome_utilizador: e.target.value })} placeholder="Ex.: martins123" />
            </label>
            <label className="profile-edit-field">
              <span>Número de utilizador / ID</span>
              <input value={userProfile.numero_funcionario} disabled />
            </label>
            <label className="profile-edit-field">
              <span>Contacto telefónico</span>
              <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Telefone" />
            </label>
            <label className="profile-edit-field">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@exemplo.com" />
            </label>
            <label className="profile-edit-field">
              <span>Cargo / função</span>
              <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
            </label>
            <label className="profile-edit-field">
              <span>Departamento</span>
              <input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} />
            </label>
            <label className="profile-edit-field">
              <span>Estado da conta</span>
              <input value={userProfile.estado} disabled />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
