import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import { getCurrentSession } from '@/app/login/lib/actions';
import { getProfile } from './lib/actions';
import Backup from './partials/Backup';
import DangerZone from './partials/DangerZone';
import MultiFAAuth from './partials/MultiFAAuth';
import ProfileInfo from './partials/ProfileInfo';
import UpdatePass from './partials/UpdatePass';

export default async function Profile({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return null;
  }
  const { userId } = await params;
  const profile = await getProfile(parseInt(userId));

  if (profile === null) {
    return (
      <PageContainer>
        <div className="container-xl py-24 text-center">
          <div className="text-xl font-bold">No profile page found</div>
        </div>
        <PageFooter />
      </PageContainer>
    );
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    {
      name: profile?.name ?? '',
      href: `/profile/${userId}`,
    },
  ];

  const settings = await getSettings();

  return (
    <PageContainer>
      <PageHeader
        title="User data"
        description="Manage your profile and backup your data"
        breadcrumbs={breadcrumbs}
      />
      <PageBody>
        {settings?.mfa && !profile.mfa && (
          <div className="alert alert-important alert-danger" role="alert">
            2FA Authentication is not enabled for this profile. Is recommended
            to enable it for security reasons.
          </div>
        )}
        {user.role === 'admin' && user.id !== profile.id && (
          <div className="alert alert-important alert-primary" role="alert">
            You are impersonating this profile as an admin.
          </div>
        )}
        <ProfileInfo profile={profile} />
        <UpdatePass userId={user.id} profile={profile} />
        {settings?.mfa && <MultiFAAuth profile={profile}></MultiFAAuth>}
        {user.id === profile.id && <Backup profile={profile} />}
        <DangerZone profile={profile}></DangerZone>
      </PageBody>
      <PageFooter />
    </PageContainer>
  );
}
