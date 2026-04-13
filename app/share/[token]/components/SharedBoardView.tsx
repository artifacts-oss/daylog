'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import NavThemeToggle from '@/components/NavThemeToggle';
import { removeMarkdownTags } from '@/utils/text';
import MDEditor from '@uiw/react-md-editor';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

interface SharedBoardViewProps {
  board: any;
  token: string;
}

export default function SharedBoardView({ board, token }: SharedBoardViewProps) {
  const { theme } = useTheme();
  const [selectedNote, setSelectedNote] = useState<any | null>(null);

  const getSharedImageUrl = (originalPath: string | null) => {
    if (!originalPath) return '';
    if (originalPath.startsWith('http')) return originalPath;
    // Ensure path is absolute for our proxy
    const path = originalPath.startsWith('/') ? originalPath : `/${originalPath}`;
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
    <main className="min-h-screen bg-background pb-24 text-foreground transition-colors duration-500">
      {/* Premium Header */}
      <header className="relative w-full overflow-hidden border-b border-border bg-card shadow-sm">
        {board.imageUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={getSharedImageUrl(board.imageUrl)}
              alt={board.title}
              fill
              className="object-cover opacity-60 scale-100"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-20 md:py-32 flex flex-col items-center text-center space-y-8">
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.05]">
              {board.title}
            </h1>
            {board.description && (
              <p className="text-xl md:text-2xl text-muted-foreground font-medium leading-relaxed">
                {board.description}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center">
               <span className="text-xl font-bold text-foreground">{board.user?.name || 'Unknown'}</span>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Author</span>
            </div>
            <div className="h-8 w-[1px] bg-border/60" />
            <div className="flex flex-col items-center">
               <span className="text-xl font-bold text-foreground">{board.notes.length}</span>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Notes</span>
            </div>
            <div className="h-8 w-[1px] bg-border/60" />
            <div className="flex flex-col items-center">
               <span className="text-xl font-bold text-primary italic">Shared</span>
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Public Board</span>
            </div>
          </div>
        </div>
      </header>

      {/* Masonry Content */}
      <div className="max-w-7xl mx-auto px-6 md:px-12 pt-16">
        <div className="masonry-container gap-6">
          {board.notes.map((note: any) => (
            <div key={note.id} className="masonry-item mb-6 group cursor-pointer" onClick={() => setSelectedNote(note)}>
              <div className="relative flex flex-col rounded-[24px] border border-border bg-card hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 overflow-hidden shadow-sm">
                {note.imageUrl && (
                  <div className="relative aspect-video overflow-hidden">
                    <Image
                      src={getSharedImageUrl(note.imageUrl)}
                      alt={note.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                )}
                
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-foreground leading-tight tracking-tight">
                      {note.title}
                    </h3>
                    <p className="text-sm text-muted-foreground/80 leading-relaxed line-clamp-4 font-medium">
                       {removeMarkdownTags(note.content || '')}
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t border-border/50">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                      {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Note View Modal */}
      <Dialog open={!!selectedNote} onOpenChange={(open) => !open && setSelectedNote(null)}>
        <DialogContent className="max-w-4xl h-[92dvh] md:h-[90vh] p-0 overflow-hidden border border-border rounded-[32px] shadow-2xl">
           {selectedNote && (
               <div className="flex flex-col h-full bg-background overflow-y-auto custom-scrollbar">
                  {selectedNote.imageUrl && (
                    <div className="relative w-full aspect-video md:aspect-[21/9] shrink-0">
                      <Image
                        src={getSharedImageUrl(selectedNote.imageUrl)}
                        alt={selectedNote.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    </div>
                  )}

                  <div className="px-8 md:px-16 py-12 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1 rounded-full">Note</span>
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                              {new Date(selectedNote.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                           </span>
                        </div>
                        <DialogTitle className="text-4xl md:text-5xl font-black tracking-tight text-foreground leading-tight">
                          {selectedNote.title}
                        </DialogTitle>
                      </div>

                      <article className="prose prose-zinc dark:prose-invert max-w-none pb-12">
                        <div data-color-mode={theme} className="markdown-content">
                          <MDEditor.Markdown 
                             source={processMarkdown(selectedNote.content || '*No content*')} 
                             style={{ backgroundColor: 'transparent', color: 'inherit', fontSize: '1.1rem', lineHeight: '1.7' }}
                          />
                        </div>
                      </article>
                  </div>
               </div>
           )}
        </DialogContent>
      </Dialog>

      <footer className="mt-32 pt-12 border-t border-border/30 flex flex-col items-center gap-6 opacity-40">
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

      {/* Floating Theme Toggle */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="rounded-full bg-background/80 backdrop-blur-md border border-border p-1 shadow-2xl">
          <NavThemeToggle />
        </div>
      </div>
    </main>
  );
}
