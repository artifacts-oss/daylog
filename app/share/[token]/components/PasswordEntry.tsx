'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LockClosedIcon } from '@heroicons/react/24/outline';

export default function PasswordEntry({ token, error }: { token: string, error?: string | null }) {
  const router = useRouter();
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/share/${token}?pw=${encodeURIComponent(password)}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="w-full max-w-sm rounded-[24px] border border-border bg-card p-8 shadow-2xl space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <LockClosedIcon className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Protected Content</h1>
            <p className="text-sm text-muted-foreground font-medium">This share is password protected</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-border bg-background px-4 focus:ring-2 focus:ring-primary/20"
              autoFocus
            />
            {error && <p className="text-[12px] font-bold text-rose-600 dark:text-rose-400 px-1 tracking-tight">{error}</p>}
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            View Content
          </Button>
        </form>
      </div>
      <div className="mt-8 text-[10px] font-black tracking-[0.2em] flex items-center gap-2 opacity-40">
        <span className="uppercase">POWERED BY</span>
        <a 
          href="https://github.com/artifacts-oss/daylog" 
          target="_blank" 
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors lowercase"
        >
          daylog
        </a>
      </div>
    </div>
  );
}
