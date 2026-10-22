'use client';
import React, { useState } from 'react';
import PasswordEditor from './PasswordEditor';
import UserAvatar from './UserAvatar';
import AvatarCropper from './AvatarCropper';
import ImagePicker from './ImagePicker';
import { uploadImage } from '@/lib/upload-image';
import { useAuth } from '@/lib/auth-context';

export default function ProfileEditor() {
  const { user, token, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const reset = () => {
    setName(user?.name || ''); setEmail(user?.email || ''); setAvatar(user?.avatar || '');
    setPhoto(null); setCropFile(null); setError(''); setSuccess('');
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || cropFile) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const uploaded = photo ? await uploadImage(photo, 'avatar', token) : avatar;
      setAvatar(uploaded); setPhoto(null);
      await updateProfile({ name: name.trim(), email: email.trim(), avatar: uploaded || null });
      setSuccess('Tu perfil se actualizo correctamente.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil'); }
    finally { setSaving(false); }
  };
  return <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-start">
    <section aria-labelledby="profile-photo" className="min-w-0 bg-white border rounded-xl p-6 space-y-5 md:sticky md:top-24">
      <div><h2 id="profile-photo" className="text-lg font-semibold">Foto de perfil</h2><p className="text-sm text-gray-500">Elige una imagen y ajusta su encuadre.</p></div>
      {cropFile ? <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)}
        onApply={cropped => { setPhoto(cropped); setCropFile(null); setSuccess(''); }} /> : <>
        {!photo && !avatar && <UserAvatar alt="Sin foto de perfil" className="w-full max-w-sm aspect-square rounded-full mx-auto" />}
        <ImagePicker label="Seleccionar foto" file={photo} src={avatar} maxMB={5} disabled={saving}
          onChange={setCropFile} onRemove={() => { setPhoto(null); setAvatar(''); setSuccess(''); }} />
        <p className="text-xs text-gray-500">Pulsa Guardar cambios para aplicar la foto y los datos personales.</p>
      </>}
    </section>
    <div className="min-w-0 space-y-6">
      <section aria-labelledby="profile-details" className="bg-white border rounded-xl p-6 space-y-5">
        <div><h2 id="profile-details" className="text-lg font-semibold">Datos personales</h2><p className="text-sm text-gray-500">Actualiza tu nombre y correo.</p></div>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
            <label className="block text-sm font-medium">Nombre
              <input required maxLength={100} value={name} onChange={event => { setName(event.target.value); setSuccess(''); }} autoComplete="name" className="mt-1 w-full rounded-lg border px-3 py-2.5" />
            </label>
            <label className="block text-sm font-medium">Correo electronico
              <input required type="email" maxLength={255} value={email} onChange={event => { setEmail(event.target.value); setSuccess(''); }} autoComplete="email" className="mt-1 w-full rounded-lg border px-3 py-2.5" />
            </label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="text-sm text-green-700">{success}</p>}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={saving} onClick={reset} className="px-4 py-2.5 border rounded-lg">Descartar cambios</button>
            <button type="submit" disabled={saving || !!cropFile || !name.trim()} className="px-4 py-2.5 rounded-lg bg-primary-container text-white disabled:opacity-50">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
          </div>
        </form>
      </section>
      <PasswordEditor />
    </div>
  </div>;
}
