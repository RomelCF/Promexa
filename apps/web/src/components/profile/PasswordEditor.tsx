'use client';
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
export default function PasswordEditor() {
  const { token } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving) return;
    setError(''); setSuccess('');
    if (newPassword !== confirmPassword) { setError('Las claves no coinciden'); return; }
    setSaving(true);
    try {
      const response = await fetch('/api/users/me/password', {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('. ') : data.message);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      setSuccess('Tu clave se actualizo correctamente. Usa la nueva clave en tu proximo inicio de sesion.');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cambiar la clave'); }
    finally { setSaving(false); }
  };
  return <section aria-labelledby="password-details" className="bg-white border rounded-xl p-6 space-y-5">
    <div><h2 id="password-details" className="text-lg font-semibold">Cambiar clave</h2>
      <p className="text-sm text-gray-500">En esta primera version, confirma tu clave actual. No enviaremos correos de verificacion.</p></div>
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={saving} className="space-y-4">
        <label className="block text-sm font-medium">Clave actual<input type="password" required autoComplete="current-password" maxLength={200} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2.5" /></label>
        <label className="block text-sm font-medium">Nueva clave<input type="password" required autoComplete="new-password" minLength={8} maxLength={72} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2.5" /><span className="text-xs text-gray-500">Minimo 8 caracteres.</span></label>
        <label className="block text-sm font-medium">Confirmar nueva clave<input type="password" required autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full border rounded-lg px-3 py-2.5" /></label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="text-sm text-green-700">{success}</p>}
      <div className="flex justify-end"><button disabled={saving} type="submit" className="bg-primary-container text-white px-4 py-2.5 rounded-lg disabled:opacity-50">{saving ? 'Actualizando...' : 'Actualizar clave'}</button></div>
    </form>
  </section>;
}
