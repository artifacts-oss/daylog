'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShareIcon, 
  LockClosedIcon, 
  ClockIcon, 
  EyeIcon,
  CheckIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline';
import { createShare } from '@/app/(authenticated)/shared/lib/actions';

interface ShareDialogProps {
  entityType: 'NOTE' | 'BOARD';
  entityId: number;
  trigger?: React.ReactNode;
}

export default function ShareDialog({ entityType, entityId, trigger }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [oneTime, setOneTime] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const share = await createShare({
        entityType,
        entityId,
        password: password || undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        oneTime,
      });
      const url = `${window.location.origin}/share/${share.id}`;
      setShareLink(url);
    } catch (error) {
      console.error('Failed to create share:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
        setIsOpen(val);
        if (!val) {
            setShareLink(null);
            setPassword('');
            setExpiresAt('');
            setOneTime(false);
        }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 font-bold text-[10px] uppercase tracking-widest border-border shadow-sm hover:bg-muted transition-all">
            <ShareIcon className="h-3.5 w-3.5" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-[28px] p-0 overflow-hidden border border-border shadow-2xl">
        <div className="px-8 pt-8 pb-4">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black tracking-tight">
                    Share {entityType === 'NOTE' ? 'Note' : 'Board'}
                </DialogTitle>
                <p className="text-muted-foreground font-medium text-sm pt-1">
                    Configure your secure sharing link
                </p>
            </DialogHeader>
        </div>
        
        <div className="p-8 space-y-6">
          {!shareLink ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <LockClosedIcon className="h-3 w-3" />
                    Password Protection (Optional)
                  </Label>
                  <Input
                    type="password"
                    placeholder="Leave empty for public"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-border bg-muted/30 focus:bg-background transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <ClockIcon className="h-3 w-3" />
                    Expiration Date (Optional)
                  </Label>
                  <Input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="h-11 rounded-xl border-border bg-muted/30 focus:bg-background transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-background flex items-center justify-center border border-border">
                        <EyeIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground tracking-tight">One-time view</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Self-destructs after access</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={oneTime}
                    onChange={(e) => setOneTime(e.target.checked)}
                    className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary accent-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleCreate} 
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl font-bold tracking-tight bg-primary text-primary-foreground hover:bg-primary/90 transition-all border-none"
                >
                  {isLoading ? 'Generating...' : 'Create Secure Link'}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6 animate-in zoom-in-95 duration-300">
               <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/10 flex flex-col items-center gap-2 text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <CheckIcon className="h-6 w-6 stroke-[3]" />
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Link Shared Successfully</p>
               </div>

               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Access Link</Label>
                  <div className="flex gap-2">
                    <Input
                        readOnly
                        value={shareLink}
                        className="h-11 rounded-xl border-border bg-muted/40 font-mono text-[11px] px-4"
                    />
                    <Button onClick={copyToClipboard} className="h-11 w-11 rounded-xl p-0 shrink-0 bg-primary hover:bg-primary/90">
                        {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardIcon className="h-5 w-5" />}
                    </Button>
                  </div>
               </div>

               <div className="space-y-4">
                 <p className="text-[11px] text-center text-muted-foreground font-medium">
                    Anyone with this link can view the content based on your settings.
                 </p>
                 
                 <div className="flex justify-center">
                   <div className="text-[9px] font-black tracking-[0.2em] flex items-center gap-2 opacity-30 bg-muted/50 px-3 py-1.5 rounded-full border border-border">
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
               </div>

               <Button 
                 variant="ghost" 
                 onClick={() => setIsOpen(false)} 
                 className="w-full h-11 rounded-xl font-bold tracking-tight text-muted-foreground hover:text-foreground hover:bg-muted"
               >
                 Close Dialog
               </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
