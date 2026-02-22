import Image from 'next/image';
import Link from 'next/link';
import { getUserMFA } from '../../lib/actions';
import OTPLoginForm from './partials/OTPLoginForm';

export default async function OTPLogin({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  // Get the profile of the user
  const userId = parseInt((await params).userId);
  const mfa = await getUserMFA(userId);

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <Link href="/" className="navbar-brand navbar-brand-autodark">
            <Image
              src="/daylog.svg"
              width="0"
              height="0"
              alt={'daylog'}
              priority={true}
              className="navbar-brand-image logo-invert"
              style={{ width: 'auto', height: '48px' }}
            />
          </Link>
        </div>
        {mfa ? (
          <OTPLoginForm userId={userId} />
        ) : (
          <div className="text-center">Not allowed.</div>
        )}
      </div>
    </div>
  );
}
