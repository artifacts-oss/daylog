'use client';

import { useActionState, useEffect, useState } from 'react';
import { saveSettings, SettingsType } from '../lib/actions';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { motion } from 'framer-motion';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

function Switch({
  name,
  value,
  checked,
  onChange,
  label,
  description,
  extraInfo,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  extraInfo?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <label
            htmlFor={value}
            className="text-[12px] font-bold uppercase text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
          >
            {label}
          </label>
          {description && (
            <p className="text-sm text-muted-foreground max-w-[400px]">
              {description}
            </p>
          )}
        </div>
        <div
          className="relative inline-flex items-center cursor-pointer group"
          role="switch"
          aria-checked={checked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(!checked);
            }
          }}
          onClick={() => onChange(!checked)}
        >
          <input
            type="checkbox"
            name={name}
            id={value}
            value={value}
            checked={checked}
            readOnly
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white peer-checked:after:bg-background after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary transition-colors"></div>
        </div>
      </div>
      {extraInfo && <div className="mt-1">{extraInfo}</div>}
    </div>
  );
}

export default function PreferencesTab({
  initialSettings,
}: {
  initialSettings?: SettingsType | null;
}) {
  const t = useTranslations('Preferences');
  const [state, action, pending] = useActionState(saveSettings, {
    success: false,
    data: initialSettings ?? {
      mfa: false,
      allowReg: false,
      allowUnsplash: false,
      enableS3: false,
    },
    message: '',
  });

  const [settings, setSettings] = useState<SettingsType>(
    initialSettings || {
      mfa: false,
      allowReg: false,
      allowUnsplash: false,
      enableS3: false,
    },
  );

  useEffect(() => {
    if (state.success && state.data) {
      setSettings(state.data);
    }
  }, [state]);

  const handleToggle = (key: keyof SettingsType) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <form action={action} className="space-y-8">
      <div className="grid gap-8">
        {/* Security Section */}
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle>{t('securityTitle')}</CardTitle>
            <CardDescription>
              {t('securityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="mfa"
              checked={settings.mfa}
              onChange={() => handleToggle('mfa')}
              label={t('mfaLabel')}
              description={t('mfaDescription')}
            />
            <Switch
              name="settings"
              value="allowReg"
              checked={settings.allowReg}
              onChange={() => handleToggle('allowReg')}
              label={t('allowRegistrationLabel')}
              description={t('allowRegistrationDescription')}
            />
          </CardContent>
        </Card>

        {/* Third Party Section */}
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle>{t('integrationsTitle')}</CardTitle>
            <CardDescription>
              {t('integrationsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="allowUnsplash"
              checked={settings.allowUnsplash}
              onChange={() => handleToggle('allowUnsplash')}
              label={t('unsplashLabel')}
              description={t('unsplashDescription')}
              extraInfo={
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border border-border/40">
                  <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{t('unsplashInfo')}</div>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Storage Section */}
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle>{t('storageTitle')}</CardTitle>
            <CardDescription>
              {t('storageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="enableS3"
              checked={settings.enableS3}
              onChange={() => handleToggle('enableS3')}
              label={t('s3Label')}
              description={t('s3Description')}
              extraInfo={
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border border-border/40">
                  <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{t('s3Info')}</div>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          {state?.success && state?.message && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-sm text-green-600 font-medium"
            >
              <CheckIcon className="h-4 w-4" />
              {state.message}
            </motion.div>
          )}
        </div>
        <Button type="submit" disabled={pending} className="min-w-[140px]">
          {pending ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </form>
  );
}
