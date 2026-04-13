import { prisma } from '@/prisma/client';
import { notFound } from 'next/navigation';
import PasswordEntry from './components/PasswordEntry';
import SharedNoteView from './components/SharedNoteView';
import SharedBoardView from './components/SharedBoardView';
import { ClockIcon } from '@heroicons/react/24/outline';

export default async function PublicSharePage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ token: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const password = typeof sp.pw === 'string' ? sp.pw : null;

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

  // Fetch linked entity
  let entity: any = null;
  if (share.entityType === 'NOTE') {
    entity = await prisma.note.findUnique({
      where: { id: share.entityId },
      include: {
        boards: {
          include: {
            user: true
          }
        }
      }
    });
  } else {
    entity = await prisma.board.findUnique({
      where: { id: share.entityId },
      include: {
        user: true,
        notes: {
          include: {
            pictures: true
          }
        }
      }
    });
  }

  if (!entity) return notFound();

  // Password check
  if (share.password) {
    if (!password) {
      return <PasswordEntry token={token} />;
    }
    
    const { comparePassword } = await import('@/utils/crypto');
    const isValid = await comparePassword(password, share.password);
    
    if (!isValid) {
      return <PasswordEntry token={token} error="Invalid password" />;
    }
  }

  // Handle one-time view
  if (share.oneTime) {
    if (share.viewCount === 0) {
      const { trackView } = await import('@/app/(authenticated)/shared/lib/actions');
      await trackView(share.id);
    } else {
      // Already viewed
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
             <ClockIcon className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="space-y-2">
             <h1 className="text-2xl font-black text-foreground">Link Expired</h1>
             <p className="text-muted-foreground font-medium max-w-xs">This one-time link has already been viewed and is no longer accessible.</p>
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
  } else {
    // Normal track view
    const { trackView } = await import('@/app/(authenticated)/shared/lib/actions');
    await trackView(share.id);
  }

  if (share.entityType === 'NOTE') {
    return <SharedNoteView note={entity} token={token} />;
  }
  
  return <SharedBoardView board={entity} token={token} />;
}
