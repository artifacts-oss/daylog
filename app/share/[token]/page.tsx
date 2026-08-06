import { prisma } from '@/prisma/client';
import { notFound, redirect } from 'next/navigation';
import PasswordEntry from './components/PasswordEntry';
import SharedNoteView from './components/SharedNoteView';
import SharedBoardView from './components/SharedBoardView';
import { ClockIcon } from '@heroicons/react/24/outline';
import { cookies } from 'next/headers';
import { isEncrypted } from '@/utils/encryption';
import { getCurrentSession } from '@/app/login/lib/actions';

const ENCRYPTED_PLACEHOLDER = '[Encrypted content — not available in shared view]';

function maskEncryptedFields<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = { ...obj };
  for (const key of Object.keys(result)) {
    const val = result[key];
    if (typeof val === 'string' && isEncrypted(val)) {
      result[key] = ENCRYPTED_PLACEHOLDER;
    } else if (Array.isArray(val)) {
      result[key] = val.map((item) =>
        typeof item === 'object' && item !== null ? maskEncryptedFields(item as Record<string, unknown>) : item,
      );
    } else if (typeof val === 'object' && val !== null) {
      result[key] = maskEncryptedFields(val as Record<string, unknown>);
    }
  }
  return result as T;
}

export default async function PublicSharePage({ 
  params, 
}: { 
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const cookieStore = await cookies();
  const isAuthorized = cookieStore.get(`share_auth_${token}`)?.value === 'authorized';

  const share = await prisma.share.findUnique({
    where: { id: token },
  });

  if (!share || (share.expiresAt && new Date(share.expiresAt) < new Date())) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
         <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <ClockIcon className="h-10 w-10 text-muted-foreground/60" />
         </div>
         <div className="space-y-2">
            <h1 className="text-2xl font-black text-foreground">Link Expired</h1>
            <p className="text-muted-foreground font-medium max-w-xs">This sharing link has reached its expiration date or viewing limit.</p>
         </div>
         <div className="pt-8 text-[10px] font-black tracking-[0.2em] flex items-center gap-2 opacity-30">
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

  // If this is a canEdit share, redirect authenticated recipients to the note editor
  if (share.canEdit && share.entityType === 'NOTE' && share.scope === 'SPECIFIC') {
    const { user } = await getCurrentSession();
    if (user) {
      const isRecipient = await prisma.shareRecipient.findFirst({
        where: { shareId: share.id, userId: user.id },
      });
      if (isRecipient) {
        const note = await prisma.note.findUnique({ where: { id: share.entityId }, select: { boardsId: true } });
        if (note) redirect(`/boards/${note.boardsId}/notes/${share.entityId}?ref=community`);
      }
    }
  }

  // Password check
  if (share.password && !isAuthorized) {
    return <PasswordEntry token={token} />;
  }

  // Use snapshot if available; fall back to live data (with encrypted field masking)
  let entity: unknown = null;

  if (share.snapshot) {
    entity = JSON.parse(share.snapshot);
  } else {
    const userSelect = { select: { name: true, profileImage: true } };

    if (share.entityType === 'NOTE') {
      entity = await prisma.note.findUnique({
        where: { id: share.entityId },
        include: { boards: { include: { user: userSelect } } },
      });
    } else {
      entity = await prisma.board.findUnique({
        where: { id: share.entityId },
        include: {
          user: userSelect,
          notes: { include: { pictures: true } },
        },
      });
    }

    if (!entity) return notFound();
    entity = maskEncryptedFields(entity as Record<string, unknown>);
  }

  // Snapshots may predate profile pictures; always attach the creator's current profile.
  if (share.sharedBy && entity && typeof entity === 'object') {
    const creator = await prisma.user.findUnique({
      where: { id: share.sharedBy },
      select: { name: true, profileImage: true },
    });
    if (creator) {
      const record = entity as Record<string, unknown>;
      if (share.entityType === 'NOTE') {
        const boards = record.boards && typeof record.boards === 'object'
          ? record.boards as Record<string, unknown>
          : {};
        record.boards = { ...boards, user: creator };
      } else {
        record.user = creator;
      }
    }
  }

  // Handle one-time view with atomic check
  if (share.oneTime) {
    if (share.viewCount === 0) {
      // Use atomic update to prevent race conditions
      const updated = await prisma.share.updateMany({
        where: { id: share.id, viewCount: 0 },
        data: { viewCount: 1 }
      });
      
      if (updated.count === 0) {
        // Someone else got it first or it's already viewed
        return (
          <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
               <ClockIcon className="h-10 w-10 text-muted-foreground/60" />
            </div>
            <div className="space-y-2">
               <h1 className="text-2xl font-black text-foreground">Link Expired</h1>
               <p className="text-muted-foreground font-medium max-w-xs">This one-time link has already been viewed and is no longer accessible.</p>
            </div>
          </div>
        );
      }
      
      const { trackView } = await import('@/app/(authenticated)/shared/lib/actions');
      await trackView(share.id);
    } else {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
             <ClockIcon className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="space-y-2">
             <h1 className="text-2xl font-black text-foreground">Link Expired</h1>
             <p className="text-muted-foreground font-medium max-w-xs">This one-time link has already been viewed and is no longer accessible.</p>
          </div>
        </div>
      );
    }
  } else {
    const { trackView } = await import('@/app/(authenticated)/shared/lib/actions');
    await trackView(share.id);
  }

  if (share.entityType === 'NOTE') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <SharedNoteView note={entity as any} token={token} />;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SharedBoardView board={entity as any} token={token} />;
}
