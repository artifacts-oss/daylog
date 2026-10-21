'use client';

import { useEffect, useRef, useState } from 'react';
import {
  SparklesIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  ArrowDownOnSquareIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import type { AiAction } from '@/lib/ai';

export type AiSource = { text: string; start: number; end: number };

type AiSidebarProps = {
  noteId: number;
  // Selected text (or the whole note) plus its range, read when an action runs
  getSource: () => AiSource;
  onInsert: (text: string, start: number, end: number) => void;
  onClose: () => void;
};

const QUICK_ACTIONS: { action: Exclude<AiAction, 'custom'>; label: string }[] = [
  { action: 'summarize', label: 'aiSummarize' },
  { action: 'improve', label: 'aiImprove' },
  { action: 'continue', label: 'aiContinue' },
  { action: 'actionItems', label: 'aiActionItems' },
];

export default function AiSidebar({
  noteId,
  getSource,
  onInsert,
  onClose,
}: AiSidebarProps) {
  const t = useTranslations('NoteEditor');
  const [instruction, setInstruction] = useState('');
  const [output, setOutput] = useState('');
  const [source, setSource] = useState<AiSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async (action: AiAction) => {
    const current = getSource();
    if (!current.text.trim()) {
      setError(t('aiEmptyNote'));
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSource(current);
    setOutput('');
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/notes/${noteId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          text: current.text,
          instruction: action === 'custom' ? instruction : undefined,
        }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setError(res.status === 429 ? t('aiRateLimited') : t('aiError'));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        setOutput(result);
      }
      if (!result.trim()) setError(t('aiNoResponse'));
    } catch (fetchError) {
      if (!controller.signal.aborted) {
        console.error('AI request failed:', fetchError);
        setError(t('aiError'));
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  };

  const hasResult = !!output && !loading && source !== null;

  return (
    <div className="w-full lg:w-[340px] rounded-[20px] bg-muted border border-border p-6 flex flex-col gap-6 shadow-sm h-fit max-h-[calc(100vh-120px)] overflow-hidden">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[20px] font-[800] text-foreground tracking-tight">
            {t('aiAssistant')}
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
          {t('aiHelp')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map(({ action, label }) => (
          <Button
            key={action}
            variant="outline"
            disabled={loading}
            onClick={() => void run(action)}
            className="rounded-[12px] border-border bg-background font-[600] text-[13px] hover:bg-accent"
          >
            {t(label)}
          </Button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (instruction.trim()) void run('custom');
        }}
      >
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={t('aiCustomPlaceholder')}
          aria-label={t('aiCustomPlaceholder')}
          maxLength={2000}
          rows={2}
          className="rounded-[12px] bg-background resize-none"
        />
        <Button
          type="submit"
          disabled={loading || !instruction.trim()}
          className="rounded-[12px] font-[700] text-primary-foreground shadow-sm"
        >
          <SparklesIcon className="h-5 w-5 mr-2" />
          {loading ? t('aiGenerating') : t('aiRun')}
        </Button>
      </form>

      {error && (
        <div className="text-[12px] font-[500] text-destructive bg-destructive/10 border border-destructive/20 rounded-[10px] px-3 py-2">
          {error}
        </div>
      )}

      {output && (
        <div className="flex flex-col gap-3 min-h-0">
          <div
            data-testid="ai-output"
            aria-live="polite"
            className="text-[13px] text-foreground whitespace-pre-wrap break-words bg-background border border-border rounded-[14px] p-3 overflow-y-auto custom-scrollbar max-h-[320px]"
          >
            {output}
          </div>
          {hasResult && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-[12px] bg-background font-[600] text-[13px]"
                onClick={() => onInsert(output, source.end, source.end)}
                title={t('aiInsertHelp')}
              >
                <ArrowDownOnSquareIcon className="h-4 w-4 mr-1.5" />
                {t('aiInsert')}
              </Button>
              <Button
                variant="outline"
                className="flex-1 rounded-[12px] bg-background font-[600] text-[13px]"
                onClick={() => onInsert(output, source.start, source.end)}
                title={t('aiReplaceHelp')}
              >
                <ArrowPathRoundedSquareIcon className="h-4 w-4 mr-1.5" />
                {t('aiReplace')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full hover:bg-accent"
                onClick={() => void navigator.clipboard?.writeText(output)}
                aria-label={t('aiCopy')}
                title={t('aiCopy')}
              >
                <ClipboardDocumentIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
