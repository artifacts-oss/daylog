import Image from 'next/image';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import { getTranslations } from 'next-intl/server';
import {
  ArrowRightIcon,
  EyeIcon,
  LinkIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import TimeDiff from '@/components/TimeDiff';
import { cn } from '@/lib/utils';
import { stringToColor } from '@/utils/color';
import { DAY_MS, HEATMAP_WEEKS, getHeatmapStart } from '@/utils/heatmap';
import { getImageUrlOrFile } from '@/utils/image';
import {
  getActivityHeatmap,
  getContinueNote,
  getExpiringShares,
  getForgottenNotes,
  getHomeStats,
  getOnThisDay,
} from '@/app/(authenticated)/lib/home';


const noteUrl = (n: { id: number; boardsId: number | null }) =>
  `/boards/${n.boardsId}/notes/${n.id}`;

const PINK = 'var(--color-text-accent-pink)';

const cardClass = 'rounded-[20px] border border-border bg-background';
// Secondary sections (memories, forgotten, expiring) sit in dotted boxes.
const boxClass = 'flex-1 rounded-[20px] border-2 border-dotted border-border';
const metaClass =
  'text-[12px] font-bold uppercase tracking-wider text-muted-foreground';

function Section({
  title,
  aside,
  children,
}: PropsWithChildren<{ title: string; aside?: string }>) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4 px-1">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {aside && (
          <span className="text-xs text-muted-foreground">{aside}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: PropsWithChildren) {
  return (
    <div
      className={cn(
        boxClass,
        'px-5 py-8 text-center text-sm text-muted-foreground',
      )}
    >
      {children}
    </div>
  );
}

export async function ContinueSection() {
  const [note, t] = await Promise.all([
    getContinueNote(),
    getTranslations('HomeDashboard'),
  ]);

  if (!note) return <Empty>{t('continueEmpty')}</Empty>;

  return (
    <Link
      href={noteUrl(note)}
      className={cn(
        cardClass,
        'group flex h-full flex-col sm:flex-row overflow-hidden',
      )}
    >
      <div
        className={cn(
          'relative flex min-h-32 sm:min-h-52 items-end p-5 sm:w-1/3',
          note.imageUrl && 'bg-black',
        )}
        style={
          note.imageUrl
            ? undefined
            : {
                backgroundImage: `linear-gradient(135deg, ${stringToColor(note.title)}, color-mix(in srgb, ${stringToColor(note.title)}, black 45%))`,
              }
        }
      >
        {note.imageUrl && (
          <>
            <Image
              fill
              className="object-cover dark:brightness-90"
              src={getImageUrlOrFile(note.imageUrl)}
              alt=""
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        )}
        <span className="relative text-[12px] font-bold uppercase tracking-wider text-white">
          {t('continueTitle')}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-7">
        <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
          {note.boardTitle && `${note.boardTitle} · `}
          <TimeDiff updatedAt={note.updatedAt} />
        </span>
        <h3 className="text-2xl font-extrabold tracking-tight line-clamp-2">
          {note.title}
        </h3>
        {note.snippet && (
          <p className="text-muted-foreground leading-relaxed line-clamp-2">
            {note.snippet}
          </p>
        )}
        <span className="mt-auto inline-flex h-8 items-center gap-1.5 self-start rounded-full px-3 text-sm font-bold text-primary transition-all hover:bg-primary/5">
          {t('continueOpen')}
          <ArrowRightIcon className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export async function StatsSection() {
  const [stats, note] = await Promise.all([getHomeStats(), getContinueNote()]);
  if (!stats) return null;
  const color = note ? stringToColor(note.title) : PINK;
  const t = await getTranslations('HomeDashboard');

  const items = [
    { label: t('statNotesWeek'), value: stats.notesThisWeek },
    {
      label: t('statNotesTotal'),
      value: stats.notesTotal,
      hint: t('statInBoards', { count: stats.boardsTotal }),
    },
    { label: t('statEditsWeek'), value: stats.editsThisWeek },
    {
      label: t('statShareViews'),
      value: stats.shareViewsTotal,
      hint: t('statViewsWeek', { count: stats.shareViewsThisWeek }),
      live: stats.shareViewsThisWeek > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(({ label, value, hint, live }) => (
        <div key={label} className={cn(cardClass, 'flex flex-col gap-1 p-5')}>
          <div className="text-3xl font-extrabold tracking-tight">{value}</div>
          <div className={cn(metaClass, 'flex items-center gap-2')}>
            {label}
            {live && (
              <span
                role="img"
                aria-label={t('statViewsLive')}
                title={t('statViewsLive')}
                className="relative flex size-2 shrink-0"
                style={{ color }}
              >
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-current" />
              </span>
            )}
          </div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      ))}
    </div>
  );
}

// Share of the accent color per heatmap level; level 0 is the empty-cell grey.
const LEVELS = [0, 30, 50, 75, 100];

const level = (count: number) =>
  count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;

const levelStyle = (color: string, lvl: number) =>
  lvl === 0
    ? undefined
    : {
        backgroundColor: `color-mix(in srgb, ${color} ${LEVELS[lvl]}%, transparent)`,
      };

export async function ActivitySection() {
  const [heatmap, note] = await Promise.all([
    getActivityHeatmap(),
    getContinueNote(),
  ]);
  if (!heatmap) return null;
  // Same color as the "continue" note panel; pink when there is no note yet.
  const color = note ? stringToColor(note.title) : PINK;
  const t = await getTranslations('HomeDashboard');

  // Columns are weeks starting on Sunday, ending with the current (partial) week. All in UTC to match the query.
  const now = new Date();
  const start = getHeatmapStart(now);
  const cells = Array.from(
    { length: (HEATMAP_WEEKS - 1) * 7 + now.getUTCDay() + 1 },
    (_, i) => {
      const day = new Date(start + i * DAY_MS).toISOString().slice(0, 10);
      return { day, count: heatmap.days[day] ?? 0 };
    },
  );
  const summary = t('activitySummary', {
    total: heatmap.total,
    streak: heatmap.streak,
  });

  return (
    <Section title={t('activityTitle')} aside={t('activityRange')}>
      <div
        className={cn(cardClass, 'flex flex-wrap items-center gap-8 p-6')}
        style={{
          backgroundImage: `linear-gradient(to bottom left, color-mix(in srgb, ${color} 20%, transparent), color-mix(in srgb, ${color} 7%, transparent) 22%, transparent 45%)`,
        }}
      >
        <div className="flex min-w-40 flex-col gap-1">
          <div className="text-3xl font-extrabold tracking-tight">
            {t('streakDays', { count: heatmap.streak })}
          </div>
          <div className={metaClass}>{t('streakLabel')}</div>
          <div className="text-xs text-muted-foreground">
            {t('yearEdits', { count: heatmap.total })}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_520px] flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 max-w-full overflow-x-auto pb-1">
            <div
              role="img"
              aria-label={summary}
              className="grid grid-flow-col grid-rows-7 gap-[3px] w-max"
            >
              {cells.map(({ day, count }) => (
                <div
                  key={day}
                  title={t('activityDay', { day, count })}
                  className="size-[11px] rounded-[3px] bg-muted"
                  style={levelStyle(color, level(count))}
                />
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground"
          >
            <span className="mr-1">{t('legendLess')}</span>
            {LEVELS.map((pct, i) => (
              <span
                key={pct}
                className="size-[11px] rounded-[3px] bg-muted"
                style={levelStyle(color, i)}
              />
            ))}
            <span className="ml-1">{t('legendMore')}</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

export async function OnThisDaySection() {
  const [notes, t] = await Promise.all([
    getOnThisDay(),
    getTranslations('HomeDashboard'),
  ]);

  return (
    <Section
      title={t('onThisDayTitle')}
      aside={
        notes.length ? t('onThisDayCount', { count: notes.length }) : undefined
      }
    >
      {notes.length === 0 ? (
        <Empty>{t('onThisDayEmpty')}</Empty>
      ) : (
        <div className={cn(boxClass, 'flex flex-col gap-3 p-4')}>
          {notes.map((n) => (
            <Link
              key={n.id}
              href={noteUrl(n)}
              className="relative flex min-h-18 flex-col justify-end gap-1 overflow-hidden rounded-xl p-3 text-white"
              style={
                n.imageUrl
                  ? {
                      backgroundImage: `url(${getImageUrlOrFile(encodeURI(n.imageUrl))})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                  : { backgroundColor: stringToColor(n.title) }
              }
            >
              {n.imageUrl && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
              )}
              <span className="relative text-[11px] font-bold text-white">
                {n.monthsAgo % 12 === 0
                  ? t('yearsAgo', { count: n.monthsAgo / 12 })
                  : t('monthsAgo', { count: n.monthsAgo })}
              </span>
              <span className="relative text-sm font-bold line-clamp-2">
                {n.title}
              </span>
            </Link>
          ))}
        </div>
      )}
    </Section>
  );
}

export async function ForgottenSection() {
  const [notes, t] = await Promise.all([
    getForgottenNotes(),
    getTranslations('HomeDashboard'),
  ]);

  return (
    <Section title={t('forgottenTitle')} aside={t('forgottenRange')}>
      {notes.length === 0 ? (
        <Empty>{t('forgottenEmpty')}</Empty>
      ) : (
        <ul className={cn(boxClass, 'divide-y divide-border px-5 py-1')}>
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{n.title}</div>
                <div className="text-xs text-muted-foreground">
                  <TimeDiff updatedAt={n.updatedAt} />
                </div>
              </div>
              <Link
                href={noteUrl(n)}
                aria-label={t('review')}
                title={t('review')}
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-border hover:bg-muted"
              >
                <EyeIcon className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export async function ExpiringSharesSection() {
  const [shares, t] = await Promise.all([
    getExpiringShares(),
    getTranslations('HomeDashboard'),
  ]);

  return (
    <Section title={t('expiringTitle')} aside={t('expiringRange')}>
      {shares.length === 0 ? (
        <Empty>{t('expiringEmpty')}</Empty>
      ) : (
        <ul className={cn(boxClass, 'divide-y divide-border px-5 py-1')}>
          {shares.map((s) => (
            <li key={s.id}>
              <Link
                href={s.url}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    {s.hasPassword ? (
                      <LockClosedIcon className="size-4" />
                    ) : (
                      <LinkIcon className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {s.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t(
                        s.entityType === 'NOTE' ? 'entityNote' : 'entityBoard',
                      )}{' '}
                      · {t('expiringViews', { count: s.views })}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-text-accent-yellow dark:text-[var(--color-accent-yellow)]">
                  <TimeDiff updatedAt={s.expiresAt} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
