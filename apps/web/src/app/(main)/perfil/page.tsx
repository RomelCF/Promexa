import ProfileEditor from '@/components/profile/ProfileEditor';
export default function ProfilePage() {
  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
    <div><h1 className="text-2xl font-bold text-on-surface">Mi perfil</h1><p className="mt-1 text-gray-600">Administra tus datos personales y tu clave de acceso.</p></div>
    <ProfileEditor />
  </div>;
}
