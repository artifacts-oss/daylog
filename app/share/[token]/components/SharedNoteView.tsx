'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import NavThemeToggle from '@/components/NavThemeToggle';
import MDEditor from '@uiw/react-md-editor';

interface SharedNoteViewProps {
  note: {
    title: string;
    content: string | null;
    imageUrl: string | null;
    createdAt: string;
    boards: {
      user: {
        name: string | null;
      } | null;
    } | null;
  };
  token: string;
}

export default function SharedNoteView({ note, token }: SharedNoteViewProps) {
  const { theme } = useTheme();

  const getSharedImageUrl = (originalPath: string | null) => {
    if (!originalPath) return '';
    if (originalPath.startsWith('http')) return originalPath;
    // Ensure path is absolute for our proxy
    const path = originalPath.startsWith('/')
      ? originalPath
      : `/${originalPath}`;
    return `/api/v1/share/${token}/image${path}`;
  };

  const processMarkdown = (content: string) => {
    if (!content) return '';
    return content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, path) => {
      // Handle internal image API paths
      if (path.includes('/api/v1/images?filePath=')) {
        const filePath = path.split('filePath=')[1];
        return `![${alt}](${getSharedImageUrl(decodeURIComponent(filePath))})`;
      }
      // Handle other absolute paths
      if (path.startsWith('/')) {
        return `![${alt}](${getSharedImageUrl(path)})`;
      }
      return match;
    });
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-all duration-500">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-24 space-y-12">
        {/* Header Section */}
        <header className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full">
              Shared Note
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              {new Date(note.createdAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.05]">
            {note.title}
          </h1>

          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-xs">
              {note.boards?.user?.name?.[0] || 'U'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {note.boards?.user?.name || 'Unknown'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Author
              </span>
            </div>
          </div>
        </header>

        {/* Hero Image */}
        {note.imageUrl && (
          <div className="relative w-full aspect-video md:aspect-[21/9] rounded-[24px] overflow-hidden border border-border shadow-xl">
            <Image
              src={getSharedImageUrl(note.imageUrl)}
              alt={note.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Content Area */}
        <article className="prose prose-zinc dark:prose-invert max-w-none">
          <div data-color-mode={theme} className="markdown-content">
            <MDEditor.Markdown
              source={processMarkdown(note.content || '*No content*')}
              style={{
                backgroundColor: 'transparent',
                color: 'inherit',
                fontSize: '1.25rem',
                lineHeight: '1.8',
              }}
            />
          </div>
        </article>

        {/* Footer Attribution */}
        <footer className="pt-24 border-t border-border/30 flex flex-col items-center gap-6 opacity-40">
           <div className="text-[10px] font-black tracking-[0.3em] flex items-center gap-2">
              <span className="uppercase opacity-60">POWERED BY</span>
              <a 
                href="https://github.com/artifacts-oss/daylog" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors lowercase"
              >
                daylog
              </a>
           </div>
        </footer>
      </div>

      {/* Floating Theme Toggle */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="rounded-full bg-background/80 backdrop-blur-md border border-border p-1 shadow-2xl">
          <NavThemeToggle />
        </div>
      </div>
    </main>
  );
}
