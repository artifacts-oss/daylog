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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { redirect } from 'next/navigation';

export default async function Profile({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
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
        {user.role === 'admin' && user.id !== profile.id && (
          <Alert className="mb-6 border-blue-500 text-blue-700 bg-blue-50 [&>svg]:text-blue-700 [&>h5]:text-blue-700">
            <InformationCircleIcon className="h-4 w-4 text-blue-700" />
            <AlertTitle>Admin Notice</AlertTitle>
            <AlertDescription className="text-blue-700">
              You are impersonating this profile as an admin.
            </AlertDescription>
          </Alert>
        )}
        {settings?.mfa && !profile.mfa && (
          <Alert variant="destructive" className="mb-6">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              2FA Authentication is not enabled for this profile. It is
              recommended to enable it for security reasons.
            </AlertDescription>
          </Alert>
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
