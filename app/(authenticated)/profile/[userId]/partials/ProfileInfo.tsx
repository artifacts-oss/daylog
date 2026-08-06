'use client';

import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { ChangeEvent, useActionState, useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { updateProfile, type SafeProfile } from '../lib/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import UserAvatar from '@/components/UserAvatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const cropperTemplate = `
  <cropper-canvas background>
    <cropper-image scalable translatable></cropper-image>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection initial-coverage="0.8" aspect-ratio="1">
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair centered></cropper-crosshair>
    </cropper-selection>
  </cropper-canvas>
`;

type ProfileInfoType = {
  profile: SafeProfile;
};

export default function ProfileInfo({ profile }: ProfileInfoType) {
  const t = useTranslations('ProfileInfo');
  const router = useRouter();
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const [profileImage, setProfileImage] = useState(profile.profileImage ?? '');
  const [profileImageChanged, setProfileImageChanged] = useState(false);
  const [source, setSource] = useState('');
  const [photoError, setPhotoError] = useState('');
  const cropperRef = useRef<Cropper | null>(null);
  const refreshedStateRef = useRef<typeof state>(undefined);

  useEffect(() => {
    if (state?.success && refreshedStateRef.current !== state) {
      refreshedStateRef.current = state;
      setProfileImageChanged(false);
      setTimeout(() => router.refresh(), 0);
    }
  }, [router, state]);

  useEffect(() => {
    return () => {
      cropperRef.current?.destroy();
      if (source) URL.revokeObjectURL(source);
    };
  }, [source]);

  const startCropper = (image: HTMLImageElement) => {
    cropperRef.current?.destroy();
    const cropper = new Cropper(image, { template: cropperTemplate });
    const cropperImage = cropper.getCropperImage();
    const selection = cropper.getCropperSelection();
    cropperImage?.$ready().then(() => {
      const imageRect = cropperImage.getBoundingClientRect();
      const selectionRect = selection?.getBoundingClientRect();
      if (selectionRect) {
        const coverage = Math.max(
          selectionRect.width / imageRect.width,
          selectionRect.height / imageRect.height,
        );
        if (coverage > 1) cropperImage.$zoom(coverage - 1);
      }
      const initialScale = Math.hypot(...cropperImage.$getTransform().slice(0, 2));
      cropperImage.addEventListener('transform', ((event: CustomEvent<{ matrix: number[]; oldMatrix: number[] }>) => {
        const { matrix, oldMatrix } = event.detail;
        if (Math.hypot(...matrix.slice(0, 2)) < initialScale) {
          event.preventDefault();
          return;
        }
        if (selection && Math.hypot(...matrix.slice(0, 2)) === Math.hypot(...oldMatrix.slice(0, 2))) {
          const current = cropperImage.getBoundingClientRect();
          const frame = selection.getBoundingClientRect();
          const x = matrix[4] - oldMatrix[4];
          const y = matrix[5] - oldMatrix[5];
          if (current.left + x > frame.left || current.right + x < frame.right ||
              current.top + y > frame.top || current.bottom + y < frame.bottom) {
            event.preventDefault();
          }
        }
      }) as EventListener);
    });
    if (selection) {
      selection.aspectRatio = 1;
      selection.movable = false;
      selection.resizable = false;
      selection.$center();
    }
    cropperRef.current = cropper;
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setPhotoError('');
    if (!file) return;
    if (file.size > 1_000_000) {
      setPhotoError(t('photoTooLarge'));
      return;
    }
    setSource(URL.createObjectURL(file));
  };

  const cropPhoto = async () => {
    const canvas = await cropperRef.current?.getCropperSelection()?.$toCanvas({ width: 512, height: 512 });
    if (canvas) {
      setProfileImage(canvas.toDataURL('image/jpeg', 0.85));
      setProfileImageChanged(true);
    }
    setSource('');
  };

  return (
    <form action={action}>
      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <input type="hidden" name="id" value={profile.id ?? 0} />
          <input type="hidden" name="profileImage" value={profileImageChanged ? profileImage : ''} />
          <input type="hidden" name="profileImageChanged" value={String(profileImageChanged)} />
          <div className="flex items-center gap-4 pb-3">
            <UserAvatar
              name={profile.name}
              email={profile.email}
              userId={profile.id}
              profileImage={profileImage}
              className="h-20 w-20 border border-border"
              fallbackClassName="bg-primary text-xl font-bold text-primary-foreground"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-md" asChild>
                  <Label htmlFor="profile-photo" className="mb-0 cursor-pointer" title={t('choosePhoto')}>
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                  </Label>
                </Button>
                <Input id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t('choosePhoto')} onChange={selectPhoto} />
                {profileImage && (
                  <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-md" aria-label={t('removePhoto')} title={t('removePhoto')} onClick={() => { setProfileImage(''); setProfileImageChanged(true); }}>
                    <Trash2 className="h-6 w-6" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('photoMaxSize')}</p>
            </div>
          </div>
          {state?.errors?.profileImage && <p className="text-[12px] text-accent-red">{state.errors.profileImage}</p>}
          {photoError && <p className="text-[12px] text-accent-red">{photoError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-2 relative pb-5">
              <Label htmlFor="name">{t('nameLabel')}</Label>
              <Input
                id="name"
                type="text"
                name="name"
                defaultValue={
                  typeof state?.data?.name === 'string'
                    ? state.data.name
                    : (profile.name ?? '')
                }
                placeholder={t('namePlaceholder')}
              />
              {state?.errors?.name && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {state?.errors?.name}
                </p>
              )}
            </div>
            <div className="space-y-2 relative pb-5">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                name="email"
                defaultValue={
                  typeof state?.data?.email === 'string'
                    ? state.data.email
                    : (profile.email ?? '')
                }
                placeholder={t('emailPlaceholder')}
              />
              {state?.errors?.email && (
                <p className="text-[12px] text-accent-red absolute -bottom-0 left-0">
                  {Array.isArray(state?.errors?.email)
                    ? state?.errors?.email.join(', ')
                    : state?.errors?.email}
                </p>
              )}
            </div>
          </div>
          {!state?.success && state?.message && (
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {state?.success && state?.message && (
            <Alert className="border-green-500/20 bg-green-500/5 text-green-500">
              <CheckCircleIcon className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={pending}>
            <CloudArrowDownIcon className="h-4 w-4 mr-2" />
            {pending ? t('saving') : t('saveChanges')}
          </Button>
        </CardContent>
      </Card>
      <Dialog open={!!source} onOpenChange={(open) => !open && setSource('')}>
        <DialogContent className="flex h-[min(calc(100dvh-2rem),720px)] max-w-xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b p-5 pr-16">
            <DialogTitle>{t('cropPhoto')}</DialogTitle>
            <DialogDescription>{t('cropPhotoDescription')}</DialogDescription>
          </DialogHeader>
          <div className="m-5 min-h-0 flex-1 overflow-hidden rounded-md bg-muted [&_cropper-canvas]:h-full [&_cropper-canvas]:w-full [&_cropper-selection]:overflow-hidden [&_cropper-selection]:rounded-full [&_cropper-selection]:ring-2 [&_cropper-selection]:ring-white [&_cropper-selection]:shadow-xl">
            {source && <img src={source} alt={t('cropPhoto')} className="block max-w-full" onLoad={(event) => startCropper(event.currentTarget)} />}
          </div>
          <DialogFooter className="shrink-0 border-t p-5">
            <Button type="button" className="w-full" onClick={cropPhoto}>{t('applyPhoto')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
