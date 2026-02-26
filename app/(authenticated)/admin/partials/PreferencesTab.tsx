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
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage access controls and authentication methods.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="mfa"
              checked={settings.mfa}
              onChange={() => handleToggle('mfa')}
              label="Two-Factor Authentication (2FA)"
              description="Require an extra code from an authenticator app to sign in."
            />
            <Switch
              name="settings"
              value="allowReg"
              checked={settings.allowReg}
              onChange={() => handleToggle('allowReg')}
              label="Public Registration"
              description="Allow new users to create an account on this instance."
            />
          </CardContent>
        </Card>

        {/* Third Party Section */}
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle>Third-party Integrations</CardTitle>
            <CardDescription>
              Connect external services and data sources.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="allowUnsplash"
              checked={settings.allowUnsplash}
              onChange={() => handleToggle('allowUnsplash')}
              label="Unsplash Integration"
              description="Use Unsplash as a high-quality source for board covers and images."
              extraInfo={
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border border-border/40">
                  <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    Requires{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      UNSPLASH_ACCESS_KEY
                    </code>{' '}
                    in environment variables.
                    <a
                      href="https://unsplash.com/developers"
                      target="_blank"
                      className="ml-1 text-primary hover:underline"
                    >
                      Learn more
                    </a>
                  </div>
                </div>
              }
            />
          </CardContent>
        </Card>

        {/* Storage Section */}
        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Configure where your media and attachments are stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/40">
            <Switch
              name="settings"
              value="enableS3"
              checked={settings.enableS3}
              onChange={() => handleToggle('enableS3')}
              label="Amazon S3 Storage"
              description="Offload file storage to an AWS S3 bucket instead of local storage."
              extraInfo={
                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 bg-muted/50 p-3 rounded-lg border border-border/40">
                  <InformationCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>
                    Requires S3 bucket credentials in environment variables.
                  </div>
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
          {pending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
