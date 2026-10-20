'use client';

import { Attachment } from '@/prisma/generated/client';
import { useState } from 'react';
import { useRef } from 'react';
import { saveAttachment, deleteAttachment } from '../../lib/actions';
import { getImageUrlOrFile } from '@/utils/image';
import {
  PaperClipIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

type AttachmentSidebarProps = {
  noteId: number;
  attachments: Attachment[];
  onAttachmentsChange: () => void;
  onInsertLink: (fileName: string, fileUrl: string) => void;
  onClose: () => void;
};

export default function AttachmentSidebar({
  noteId,
  attachments,
  onAttachmentsChange,
  onInsertLink,
  onClose,
}: AttachmentSidebarProps) {
  const t = useTranslations('NoteEditor');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const result = await saveAttachment({
        noteId,
        fileName: file.name,
        fileDataUrl: dataUrl,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      event.target.value = '';
      onAttachmentsChange();
    } catch (uploadError) {
      console.error('Error uploading attachment:', uploadError);
      setError(t('uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: number) => {
    try {
      await deleteAttachment(noteId, attachmentId);
      onAttachmentsChange();
    } catch (error) {
      console.error('Error deleting attachment:', error);
    }
  };

  return (
    <div className="w-full lg:w-[340px] rounded-[20px] bg-muted border border-border p-6 flex flex-col gap-6 shadow-sm h-fit max-h-[calc(100vh-120px)] overflow-hidden">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-[800] text-foreground tracking-tight">
            {t('attachments')}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
            onClick={onClose}
            aria-label={t('closeSidebar')}
          >
            <XMarkIcon className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
        <p className="text-[14px] font-[500] text-muted-foreground leading-relaxed">
          {t('attachmentsHelp')}
        </p>
      </div>

      <div className="flex flex-col gap-2 min-h-[120px] overflow-y-auto custom-scrollbar pr-1">
        {attachments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-border rounded-[16px] bg-background">
            <PaperClipIcon className="h-8 w-8 text-muted-foreground/70 mb-2 opacity-50" />
            <p className="text-[12px] font-[500] text-muted-foreground/70 uppercase tracking-wider">
              {t('noAttachments')}
            </p>
          </div>
        )}

        {attachments.map((attachment) => {
          const fileUrl = getImageUrlOrFile(attachment.fileUrl);
          return (
            <div
              key={attachment.id}
              className="group flex items-center gap-3 p-3 rounded-[14px] bg-background border border-border shadow-sm hover:border-primary/40 hover:shadow-md transition-all duration-300"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-[10px] bg-primary/10 text-primary flex items-center justify-center">
                <PaperClipIcon className="h-5 w-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-[700] text-foreground truncate"
                  title={attachment.fileName}
                >
                  {attachment.fileName}
                </p>
                <p className="text-[11px] font-[500] text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-accent transition-colors"
                  onClick={() => onInsertLink(attachment.fileName, fileUrl)}
                  title={t('insertAttachmentLink')}
                >
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-accent transition-colors"
                  title={t('downloadAttachment')}
                >
                  <ArrowDownTrayIcon className="h-4 w-4 text-muted-foreground" />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={() => handleDelete(attachment.id)}
                  title={t('deleteAttachment')}
                >
                  <XMarkIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="text-[12px] font-[500] text-destructive bg-destructive/10 border border-destructive/20 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-[12px] font-[700] text-primary-foreground shadow-sm transition-all"
        >
          <PaperClipIcon className="h-5 w-5 mr-2" />
          {uploading ? t('uploading') : t('uploadAttachment')}
        </Button>
      </div>
    </div>
  );
}