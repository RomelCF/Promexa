'use client';

import UserProfileView from '@/components/profile/UserProfileView';

export default function UserDynamicProfilePage({
  params,
}: {
  params: { id: string };
}) {
  return <UserProfileView userId={params.id} />;
}
