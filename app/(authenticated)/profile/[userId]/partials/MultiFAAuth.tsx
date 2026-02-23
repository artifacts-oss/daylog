'use client';

import OTPInputWrapper from '@/components/OTPInputWrapper';
import { User } from '@/prisma/generated/client';
import { generateTOTPSecret, generateTOTPUrl } from '@/utils/totp';
import {
  EyeIcon,
  EyeSlashIcon,
  DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import { QRCodeSVG } from 'qrcode.react';
import { AlertOctagon } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

type ProfileInfoType = {
  profile: User;
};

export default function MultiFAAuth({ profile }: ProfileInfoType) {
  return (
    <Card className="mt-4 rounded-[20px] bg-card shadow-none">
      <CardHeader>
        <Label>Security Settings</Label>
        <CardTitle>2FA Authentication</CardTitle>
        <p className="text-sm text-muted-foreground font-medium">
          Configure your Account 2FA Authentication
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          {!profile.mfa ? (
            <ModalUpdate profile={profile} />
          ) : (
            <ModalDelete profile={profile} />
          )}
        </div>
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
      <Button
        variant="danger"
        onClick={() => setOpen(true)}
        className="rounded-[12px] font-bold h-[44px] px-6 transition-all hover:scale-[1.02] active:scale-95 shadow-none"
      >
        <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
        Disable 2FA
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label className="text-destructive">Security Verification</Label>
            <DialogTitle className="flex items-center gap-2">
              Disable 2FA
            </DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="id" value={profile.id} />
            <input name="password" type="hidden" value={password} />
            {!state?.success ? (
              <div className="space-y-8">
                <p className="text-sm text-muted-foreground leading-relaxed antialiased">
                  To disable multifactor authentication, please type the code
                  from your current authenticator app or request one via email.
                </p>

                <div className="space-y-4">
                  <Label>Enter Verification Code</Label>
                  <div className="flex justify-center py-2 bg-secondary/5 rounded-[12px] border border-border/40">
                    <OTPInputWrapper onChange={(value) => setPassword(value)} />
                  </div>
                  {state?.errors?.password && (
                    <p className="text-[12px] font-bold text-accent-red mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                      {state?.errors?.password}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-foreground hover:bg-secondary/10 font-bold text-xs uppercase tracking-wider"
                    disabled={sending}
                    onClick={async () => {
                      setSending(true);
                      const result = await sendOTP();
                      setSending(false);
                      setOtpSent(result.success ? 'sent' : 'failed');
                    }}
                  >
                    {otpSent === 'sent'
                      ? '✓ Code resent to email'
                      : 'Send backup code to email'}
                  </Button>
                  {otpSent === 'failed' && (
                    <p className="text-[11px] text-accent-red font-bold text-center">
                      Failed to send code. Please try again later.
                    </p>
                  )}
                </div>

                <div className="p-4 bg-[var(--color-accent-red)] rounded-[12px] border border-destructive/20">
                  <p className="text-[12px] text-destructive font-medium leading-normal flex gap-2">
                    <AlertOctagon className="h-4 w-4 flex-shrink-0" />
                    Warning: Disabling 2FA will reduce your account security.
                  </p>
                </div>

                {!state?.success && state?.message && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">
                      {state.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              state?.message && (
                <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertDescription className="font-bold">
                    {state.message}
                  </AlertDescription>
                </Alert>
              )
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="font-bold"
              >
                {state?.success ? 'Go Back' : 'Keep 2FA Active'}
              </Button>
              {!state?.success && (
                <Button
                  variant="danger"
                  type="submit"
                  disabled={pending}
                  className="font-bold px-8 shadow-none"
                >
                  {pending ? 'Disabling...' : 'Confirm Disable'}
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
      <Button
        onClick={() => setOpen(true)}
        className="rounded-[12px] bg-primary font-bold h-[44px] px-6 transition-all hover:scale-[1.02] active:scale-95 shadow-none"
      >
        <DevicePhoneMobileIcon className="h-4 w-4 mr-2" />
        Configure TOTP
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-10 max-w-[480px]">
          <DialogHeader className="mb-6">
            <Label>Step-by-step Setup</Label>
            <DialogTitle className="flex items-center gap-2">
              Setup Authenticator
            </DialogTitle>
          </DialogHeader>
          <form action={action}>
            <input type="hidden" name="id" value={profile.id} />
            <input name="secret" type="hidden" value={secret} />
            <input name="password" type="hidden" value={password} />
            {!state?.success ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Label>1. Scan QR Code</Label>
                  <div className="flex justify-center p-6 bg-white rounded-[20px] border border-border/40 shadow-sm">
                    {url !== '' ? (
                      <QRCodeSVG value={url} size={180} />
                    ) : (
                      <Skeleton className="h-[180px] w-[180px] rounded-[12px]" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed px-1">
                    Scan this code with Google Authenticator, Authy, or your
                    preferred TOTP app.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>2. Manual Configuration</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        readOnly
                        type={isShowPassword ? 'text' : 'password'}
                        value={secret}
                        className="h-[48px] rounded-[12px] border-border/60 bg-secondary/5 pr-12 font-mono text-sm tracking-widest"
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setIsShowPassword(!isShowPassword)}
                      >
                        {isShowPassword ? (
                          <EyeSlashIcon className="h-5 w-5" />
                        ) : (
                          <EyeIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-[48px] rounded-[12px] border-border/60 font-bold px-4 hover:bg-secondary/5"
                      onClick={() => navigator.clipboard.writeText(secret)}
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>3. Verify Setup</Label>
                  <div className="flex justify-center py-2 bg-secondary/5 rounded-[12px] border border-border/40">
                    <OTPInputWrapper onChange={(value) => setPassword(value)} />
                  </div>
                  {state?.errors?.password && (
                    <p className="text-[12px] font-bold text-accent-red mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                      {state?.errors?.password}
                    </p>
                  )}
                </div>

                {!state?.success && state?.message && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-xs font-bold">
                      {state.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              state?.message && (
                <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
                  <CheckCircleIcon className="h-4 w-4" />
                  <AlertDescription className="font-bold">
                    {state.message}
                  </AlertDescription>
                </Alert>
              )
            )}
            <DialogFooter className="mt-8 gap-3 sm:gap-2">
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="font-bold"
              >
                {state?.success ? 'Finish' : 'Cancel Setup'}
              </Button>
              {!state?.success && (
                <Button
                  type="submit"
                  disabled={pending}
                  className="font-bold px-8 shadow-none"
                >
                  {pending ? 'Saving...' : 'Confirm Setup'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
