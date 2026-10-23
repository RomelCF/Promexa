'use client';
import React, { useState } from 'react';
import PasswordEditor from './PasswordEditor';
import UserAvatar from './UserAvatar';
import AvatarCropper from './AvatarCropper';
import CoverCropper from './CoverCropper';
import ImagePicker from './ImagePicker';
import { uploadImage } from '@/lib/upload-image';
import { useAuth } from '@/lib/auth-context';

export default function ProfileEditor({ onSaved }: { onSaved?: () => void }) {
  const { user, token, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [coverImage, setCoverImage] = useState(user?.coverImage || '');
  const [bio, setBio] = useState(user?.bio || '');

  const [photo, setPhoto] = useState<File | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverCropFile, setCoverCropFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const reset = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setAvatar(user?.avatar || '');
    setCoverImage(user?.coverImage || '');
    setBio(user?.bio || '');
    setPhoto(null);
    setCropFile(null);
    setCoverFile(null);
    setCoverCropFile(null);
    setError('');
    setSuccess('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || cropFile || coverCropFile) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const uploadedAvatar = photo ? await uploadImage(photo, 'avatar', token) : avatar;
      const uploadedCover = coverFile ? await uploadImage(coverFile, 'cover', token) : coverImage;

      setAvatar(uploadedAvatar);
      setCoverImage(uploadedCover);
      setPhoto(null);
      setCoverFile(null);

      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        avatar: uploadedAvatar || null,
        coverImage: uploadedCover || null,
        bio: bio.trim() || null,
      });

      setSuccess('Tu perfil se actualizó correctamente.');
      if (onSaved) onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Foto de perfil */}
        <section
          aria-labelledby="profile-photo"
          className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-container text-2xl">account_circle</span>
            <div>
              <h2 id="profile-photo" className="text-base font-bold text-on-surface">Foto de perfil</h2>
              <p className="text-xs text-on-surface-variant">Tu imagen representativa en Promexa.</p>
            </div>
          </div>

          {cropFile ? (
            <AvatarCropper
              file={cropFile}
              onCancel={() => setCropFile(null)}
              onApply={(cropped) => {
                setPhoto(cropped);
                setCropFile(null);
                setSuccess('');
              }}
            />
          ) : (
            <>
              {!photo && !avatar && (
                <UserAvatar
                  alt="Sin foto de perfil"
                  className="w-full max-w-[180px] aspect-square rounded-full mx-auto ring-4 ring-primary/10 shadow-sm"
                />
              )}
              <ImagePicker
                label="Seleccionar foto de perfil"
                file={photo}
                src={avatar}
                maxMB={5}
                disabled={saving}
                onChange={setCropFile}
                onRemove={() => {
                  setPhoto(null);
                  setAvatar('');
                  setSuccess('');
                }}
              />
            </>
          )}
        </section>

        {/* Foto de portada / fondo estilo Facebook */}
        <section
          aria-labelledby="cover-photo"
          className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-4"
        >
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-primary-container text-2xl">wallpaper</span>
            <div>
              <h2 id="cover-photo" className="text-base font-bold text-on-surface">Foto de portada (Fondo)</h2>
              <p className="text-xs text-on-surface-variant">Banner panorámico superior estilo Facebook.</p>
            </div>
          </div>

          {coverCropFile ? <CoverCropper
            file={coverCropFile}
            onCancel={() => setCoverCropFile(null)}
            onApply={file => { setCoverFile(file); setCoverCropFile(null); setSuccess(''); }}
          /> : <ImagePicker
            label="Seleccionar portada"
            file={coverFile}
            src={coverImage}
            maxMB={10}
            aspect="cover"
            disabled={saving}
            onChange={(file) => {
              setCoverCropFile(file);
              setSuccess('');
            }}
            onRemove={() => {
              setCoverFile(null);
              setCoverImage('');
              setSuccess('');
            }}
          />}
        </section>
      </div>

      {/* Datos personales y descripción / biografía */}
      <section
        aria-labelledby="profile-details"
        className="bg-white border border-outline-variant/50 rounded-2xl p-6 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-primary-container text-2xl">badge</span>
          <div>
            <h2 id="profile-details" className="text-base font-bold text-on-surface">Información personal</h2>
            <p className="text-xs text-on-surface-variant">Edita tus datos básicos y tu biografía.</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={saving} className="space-y-4 disabled:opacity-60">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-sm font-medium text-on-surface">
                Nombre completo
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setSuccess('');
                  }}
                  autoComplete="name"
                  placeholder="Tu nombre"
                  className="mt-1.5 w-full rounded-xl border border-outline-variant/60 px-3.5 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </label>

              <label className="block text-sm font-medium text-on-surface">
                Correo electrónico
                <input
                  required
                  type="email"
                  maxLength={255}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSuccess('');
                  }}
                  autoComplete="email"
                  placeholder="ejemplo@promexa.com"
                  className="mt-1.5 w-full rounded-xl border border-outline-variant/60 px-3.5 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none"
                />
              </label>
            </div>

            {/* Pequeña descripción / Biografía */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="bio-input" className="block text-sm font-medium text-on-surface">
                  Descripción / Biografía corta
                </label>
                <span className={`text-xs ${bio.length > 280 ? 'text-amber-600 font-semibold' : 'text-outline'}`}>
                  {bio.length}/300
                </span>
              </div>
              <textarea
                id="bio-input"
                maxLength={300}
                rows={3}
                value={bio}
                onChange={(event) => {
                  setBio(event.target.value);
                  setSuccess('');
                }}
                placeholder="Escribe una pequeña descripción sobre ti, tus intereses o tu negocio..."
                className="mt-1.5 w-full rounded-xl border border-outline-variant/60 px-3.5 py-2.5 text-sm focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 transition-all outline-none resize-none"
              />
              <p className="text-xs text-outline mt-1">
                Esta descripción aparecerá debajo de tu nombre en tu perfil público de Promexa.
              </p>
            </div>
          </fieldset>

          {error && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 text-red-700 text-sm flex items-center gap-2 border border-red-200">
              <span className="material-symbols-outlined text-lg">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div role="status" className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={reset}
              className="px-4 py-2.5 border border-outline-variant/60 rounded-xl text-sm font-medium hover:bg-surface-container transition-all"
            >
              Descartar cambios
            </button>
            <button
              type="submit"
              disabled={saving || !!cropFile || !!coverCropFile || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-primary-container text-white text-sm font-semibold hover:bg-primary disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Seguridad y clave */}
      <PasswordEditor />
    </div>
  );
}
