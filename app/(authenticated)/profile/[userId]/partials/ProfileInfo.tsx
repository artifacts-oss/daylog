'use client';

import { CloudArrowDownIcon } from '@heroicons/react/24/outline';
import { ChangeEvent, DragEvent, useActionState, useEffect, useRef, useState } from 'react';
import Cropper from 'cropperjs';
import { AlertOctagon, Crosshair, Image as ImageIcon, Minus, Plus, Trash2 } from 'lucide-react';
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
  <cropper-canvas>
    <cropper-image initial-center-size="cover" scalable translatable></cropper-image>
    <cropper-handle action="move" plain></cropper-handle>
    <cropper-selection initial-coverage="0.8" aspect-ratio="1">
      <cropper-grid role="grid" bordered covered></cropper-grid>
      <cropper-crosshair theme-color="rgba(255, 255, 255, 0.6)" centered></cropper-crosshair>
    </cropper-selection>
  </cropper-canvas>
`;

const MAX_CROP_ZOOM = 3;
const PROFILE_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';
const PROFILE_IMAGE_TYPES = new Set(PROFILE_IMAGE_ACCEPT.split(','));

const centerCropperImage = (cropper: Cropper) => {
  const cropperImage = cropper.getCropperImage();
  const selection = cropper.getCropperSelection();
  if (!cropperImage || !selection) return null;

  selection.$center();
  cropperImage.$center('cover');

  const imageRect = cropperImage.getBoundingClientRect();
  const selectionRect = selection.getBoundingClientRect();
  const coverage = Math.max(
    selectionRect.width / imageRect.width,
    selectionRect.height / imageRect.height,
  );
  if (coverage > 1) cropperImage.$zoom(coverage - 1);

  return cropperImage.$getTransform();
};

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
  const [photoDragActive, setPhotoDragActive] = useState(false);
  const [cropperReady, setCropperReady] = useState(false);
  const [zoomPercent, setZoomPercent] = useState(100);
  const cropperRef = useRef<Cropper | null>(null);
  const initialScaleRef = useRef(1);
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
    setCropperReady(false);
    setZoomPercent(100);
    if (!cropperImage || !selection) {
      cropper.destroy();
      setPhotoError(t('cropperError'));
      return;
    }

    selection.aspectRatio = 1;
    selection.movable = false;
    selection.resizable = false;
    cropperRef.current = cropper;

    cropperImage.$ready().then(() => {
      const initialTransform = centerCropperImage(cropper);
      if (!initialTransform) return;
      initialScaleRef.current = Math.hypot(initialTransform[0], initialTransform[1]);
      setCropperReady(true);
      cropperImage.addEventListener('transform', ((event: CustomEvent<{ matrix: number[]; oldMatrix: number[] }>) => {
        const { matrix, oldMatrix } = event.detail;
        const scale = Math.hypot(matrix[0], matrix[1]);
        if (scale < initialScaleRef.current || scale > initialScaleRef.current * MAX_CROP_ZOOM) {
          event.preventDefault();
          return;
        }
        setZoomPercent(Math.round((scale / initialScaleRef.current) * 100));
        if (scale === Math.hypot(oldMatrix[0], oldMatrix[1])) {
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
    }).catch((error) => {
      console.error(error);
      cropper.destroy();
      setCropperReady(false);
      setPhotoError(t('cropperError'));
      if (cropperRef.current === cropper) cropperRef.current = null;
    });
  };

  const processPhotoFile = (file: File | undefined) => {
    setPhotoError('');
    if (!file) return;
    if (!PROFILE_IMAGE_TYPES.has(file.type)) {
      setPhotoError(t('invalidPhotoType'));
      return;
    }
    if (file.size > 1_000_000) {
      setPhotoError(t('photoTooLarge'));
      return;
    }
    setCropperReady(false);
    setZoomPercent(100);
    setSource(URL.createObjectURL(file));
  };

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    processPhotoFile(file);
  };

  const handlePhotoDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    setPhotoDragActive(true);
  };

  const handlePhotoDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setPhotoDragActive(true);
  };

  const handlePhotoDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const target = event.relatedTarget;
    if (target instanceof Node && event.currentTarget.contains(target)) return;
    setPhotoDragActive(false);
  };

  const handlePhotoDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setPhotoDragActive(false);
    const files = Array.from(event.dataTransfer.files);
    const file = files.find((candidate) => PROFILE_IMAGE_TYPES.has(candidate.type)) ?? files[0];
    processPhotoFile(file);
  };

  const changeZoom = (percent: number) => {
    const nextPercent = Math.min(300, Math.max(100, percent));
    const cropperImage = cropperRef.current?.getCropperImage();
    if (!cropperImage) return;

    const currentScale = Math.hypot(...cropperImage.$getTransform().slice(0, 2));
    const targetScale = initialScaleRef.current * (nextPercent / 100);
    cropperImage.$zoom(targetScale / currentScale - 1);
    setZoomPercent(nextPercent);
  };

  const centerCrop = () => {
    const cropper = cropperRef.current;
    if (!cropper) return;
    const centeredTransform = centerCropperImage(cropper);
    if (!centeredTransform) return;
    initialScaleRef.current = Math.hypot(centeredTransform[0], centeredTransform[1]);
    setZoomPercent(100);
  };

  const closeCropper = () => {
    setSource('');
    setCropperReady(false);
    setPhotoError('');
    setZoomPercent(100);
  };

  const cropPhoto = async () => {
    if (!cropperReady) return;
    const canvas = await cropperRef.current?.getCropperSelection()?.$toCanvas({ width: 512, height: 512 });
    if (canvas) {
      setProfileImage(canvas.toDataURL('image/jpeg', 0.85));
      setProfileImageChanged(true);
    }
    closeCropper();
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
          <div
            role="group"
            aria-label={t('photoDropZone')}
            onDragEnter={handlePhotoDragEnter}
            onDragOver={handlePhotoDragOver}
            onDragLeave={handlePhotoDragLeave}
            onDrop={handlePhotoDrop}
            className={`flex flex-col items-start gap-4 rounded-xl border border-dashed px-4 py-4 transition-colors sm:flex-row sm:items-center ${photoDragActive ? 'border-primary bg-primary/10 ring-2 ring-primary/20' : 'border-border bg-muted/20'}`}
          >
            <UserAvatar
              name={profile.name}
              email={profile.email}
              userId={profile.id}
              profileImage={profileImage}
              className="h-20 w-20 border border-border"
              fallbackClassName="bg-primary text-xl font-bold text-primary-foreground"
            />
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-md" asChild>
                  <Label htmlFor="profile-photo" className="mb-0 cursor-pointer" title={t('choosePhoto')}>
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                  </Label>
                </Button>
                <Input id="profile-photo" type="file" accept={PROFILE_IMAGE_ACCEPT} className="sr-only" aria-label={t('choosePhoto')} onChange={selectPhoto} />
                {profileImage && (
                  <Button type="button" variant="outline" size="icon" className="h-14 w-14 rounded-full shadow-md" aria-label={t('removePhoto')} title={t('removePhoto')} onClick={() => { setProfileImage(''); setProfileImageChanged(true); }}>
                    <Trash2 className="h-6 w-6" aria-hidden="true" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t('photoMaxSize')}</p>
              <p className={`text-xs ${photoDragActive ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                {photoDragActive ? t('photoDropActive') : t('photoDropHint')}
              </p>
            </div>
          </div>
          {state?.errors?.profileImage && (
            <div className="rounded-[12px] border border-border bg-secondary/20 p-4">
              <p className="flex gap-2 text-[13px] font-medium leading-relaxed text-muted-foreground">
                <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {state.errors.profileImage}
              </p>
            </div>
          )}
          {photoError && (
            <div className="rounded-[12px] border border-border bg-secondary/20 p-4">
              <p className="flex gap-2 text-[13px] font-medium leading-relaxed text-muted-foreground">
                <AlertOctagon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {photoError}
              </p>
            </div>
          )}
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
      <Dialog open={!!source} onOpenChange={(open) => !open && closeCropper()}>
        <DialogContent className="flex h-[min(calc(100dvh-2rem),720px)] max-h-[calc(100dvh-2rem)] w-[min(92vw,600px)] max-w-none flex-col gap-4 overflow-y-auto rounded-lg border-border bg-background p-6 shadow-xl sm:max-h-[calc(100dvh-2rem)]">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('cropPhoto')}</DialogTitle>
            <DialogDescription>{t('cropPhotoDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <div
              className="relative mx-auto aspect-square overflow-hidden rounded-2xl bg-neutral-950 shadow-inner [&_cropper-canvas]:!h-full [&_cropper-canvas]:!w-full [&_cropper-handle]:cursor-grab [&_cropper-handle:active]:cursor-grabbing [&_cropper-image]:cursor-grab [&_cropper-image:active]:cursor-grabbing [&_cropper-selection]:pointer-events-none [&_cropper-selection]:!rounded-full [&_cropper-selection]:!border-2 [&_cropper-selection]:!border-white [&_cropper-selection]:shadow-[0_0_0_999px_rgba(0,0,0,0.58)]"
              style={{ width: 'min(100%, max(40px, calc(100dvh - 320px)), 420px)' }}
            >
              {source && (
                <img
                  src={source}
                  alt={t('cropPhoto')}
                  draggable={false}
                  className="block h-full w-full select-none object-contain"
                  onLoad={(event) => startCropper(event.currentTarget)}
                  onError={() => {
                    setCropperReady(false);
                    setPhotoError(t('cropperError'));
                  }}
                />
              )}
              {!cropperReady && (
                <div className="absolute inset-0 grid place-items-center bg-neutral-950/60 text-sm text-white">
                  {photoError || t('loadingCrop')}
                </div>
              )}
            </div>

            <div className="mx-auto mt-3 w-full max-w-[480px] shrink-0">
              <div className="mb-1 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{t('zoom')}</p>
                <Button type="button" variant="ghost" size="sm" disabled={!cropperReady} onClick={centerCrop}>
                  <Crosshair className="mr-2 h-4 w-4" aria-hidden="true" />
                  {t('centerCrop')}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={t('zoomOut')}
                  disabled={!cropperReady || zoomPercent <= 100}
                  onClick={() => changeZoom(zoomPercent - 10)}
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <input
                  aria-label={t('zoom')}
                  type="range"
                  min={100}
                  max={300}
                  step={1}
                  value={zoomPercent}
                  disabled={!cropperReady}
                  onChange={(event) => changeZoom(Number(event.currentTarget.value))}
                  className="h-10 min-w-0 flex-1 cursor-pointer accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  aria-label={t('zoomIn')}
                  disabled={!cropperReady || zoomPercent >= 300}
                  onClick={() => changeZoom(zoomPercent + 10)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
                <output className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {zoomPercent}%
                </output>
              </div>
            </div>
          </div>
          <DialogFooter className="shrink-0">
            <Button type="button" variant="ghost" onClick={closeCropper}>{t('cancel')}</Button>
            <Button type="button" disabled={!cropperReady} onClick={cropPhoto}>{t('applyPhoto')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
