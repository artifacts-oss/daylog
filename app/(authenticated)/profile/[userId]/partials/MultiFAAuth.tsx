'use client';

import OTPInputWrapper from '@/components/OTPInputWrapper';
import { User } from '@/prisma/generated/client';
import { generateTOTPSecret, generateTOTPUrl } from '@/utils/totp';
import { EyeIcon, EyeSlashIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { useActionState, useEffect, useState } from 'react';
import { deleteMFA, sendOTP, updateMFA } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '@/components/ui/skeleton';

type ProfileInfoType = {
  profile: User;
};

export default function MultiFAAuth({ profile }: ProfileInfoType) {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>2FA Authentication</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your Account 2FA Authentication
        </p>
      </CardHeader>
      <CardContent>
        {!profile.mfa ? (
          <ModalUpdate profile={profile} />
        ) : (
          <ModalDelete profile={profile} />
        )}
      </CardContent>
    </Card>
  );
}

const ModalDelete = ({ profile }: ProfileInfoType) => {
  const [otpSent, setOtpSent] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteMFA, undefined);

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
        Delete Device
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <DevicePhoneMobileIcon className="h-5 w-5" />
              Delete your OTP Device
            </DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="id" value={profile.id} />
            <input name="password" type="hidden" value={password} />
            {!state?.success ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Type the password of your current authenticator app or send
                  one to your e-mail.
                </p>
                <div className="flex justify-center">
                  <OTPInputWrapper onChange={(value) => setPassword(value)} />
                </div>
                {state?.errors?.password && (
                  <p className="text-sm text-destructive">{state?.errors?.password}</p>
                )}
                {otpSent === 'sent' && (
                  <p className="text-sm text-green-500">Code sent to your e-mail.</p>
                )}
                {otpSent === 'failed' && (
                  <p className="text-sm text-destructive">
                    Failed to send code to your e-mail.
                  </p>
                )}
                <Button
                  type="button"
                  variant="link"
                  disabled={sending}
                  onClick={async () => {
                    setSending(true);
                    const result = await sendOTP();
                    setSending(false);
                    setOtpSent(result.success ? 'sent' : 'failed');
                  }}
                >
                  Send {otpSent === 'sent' ? 'another' : 'a'} code to my e-mail.
                </Button>
                <p className="text-sm text-destructive">
                  If you change the TOTP device, you will lose access to the
                  other configured devices.
                </p>
                {!state?.success && state?.message && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              state?.message && (
                <Alert className="border-green-500 text-green-500">
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {state?.success ? 'Close' : 'Cancel'}
              </Button>
              {!state?.success && (
                <Button variant="destructive" type="submit" disabled={pending}>
                  {pending ? 'Deleting...' : 'Delete'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ModalUpdate = ({ profile }: ProfileInfoType) => {
  const [url, setUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isShowPassword, setIsShowPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateMFA, undefined);

  useEffect(() => {
    if (url === '') {
      const secret = generateTOTPSecret();
      const url = generateTOTPUrl(secret, profile.email, 'daylog');
      setUrl(url);
      setSecret(secret);
    }
  }, [url, profile.email]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
        Configure a TOTP
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DevicePhoneMobileIcon className="h-5 w-5" />
              Configure TOTP
            </DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="id" value={profile.id} />
            <input name="secret" type="hidden" value={secret} />
            <input name="password" type="hidden" value={password} />
            {!state?.success ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Here you can configure your Time-based one-time passwords
                  (TOTP).
                </p>
                <div className="flex justify-center">
                  {url !== '' ? (
                    <QRCodeSVG value={url} />
                  ) : (
                    <Skeleton className="h-32 w-32" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Scan the QR code using your authenticator app or copy your
                  secret code.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      readOnly
                      type={isShowPassword ? 'text' : 'password'}
                      value={secret}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setIsShowPassword(!isShowPassword)}
                    >
                      {isShowPassword ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(secret)}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Next, enter the one-time code generated by your authenticator
                  app to verify setup.
                </p>
                <div className="flex justify-center">
                  <OTPInputWrapper onChange={(value) => setPassword(value)} />
                </div>
                {state?.errors?.password && (
                  <p className="text-sm text-destructive">{state?.errors?.password}</p>
                )}
                {!state?.success && state?.message && (
                  <Alert variant="destructive">
                    <AlertDescription>{state.message}</AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              state?.message && (
                <Alert className="border-green-500 text-green-500">
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              )
            )}
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                {state?.success ? 'Close' : 'Cancel'}
              </Button>
              {!state?.success && (
                <Button type="submit" disabled={pending}>
                  {pending ? 'Saving...' : 'Save device'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
