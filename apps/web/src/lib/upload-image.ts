export async function uploadImage(file: File, purpose: 'avatar' | 'post', token: string | null): Promise<string> {
  if (!token) throw new Error('Inicia sesion para subir imagenes');
  const body = new FormData();
  body.append('file', file);
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const response = await fetch(`${base}/storage/images/${purpose}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('. ') : data.message || 'No se pudo subir la imagen');
  return data.url;
}
