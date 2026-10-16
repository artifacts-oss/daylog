'use client';

import { User } from '@/prisma/generated/client';
import {
  HomeIcon,
  Squares2X2Icon,
  ShieldCheckIcon,
  ShareIcon,
  GlobeAltIcon,
  StarIcon,
  ClockIcon,
  DocumentTextIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import * as Accordion from '@radix-ui/react-accordion';
import type { QuickLink } from '@/app/(authenticated)/lib/actions';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FAST } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface NavBarProps {
  user: User;
  isCollapsed?: boolean;
  quickLinks?: QuickLinks;
}

export type QuickLinks = { favorites: QuickLink[]; recent: QuickLink[] };

export default function NavBar({
  user,
  isCollapsed = false,
  quickLinks,
}: NavBarProps) {
  const t = useTranslations('Navigation');
  const path = usePathname() || '/';
  const searchParams = useSearchParams();
  const adminPattern = /^\/admin\/?$/;
  const homePattern = /^\/$/;
  const boardPattern = /^\/boards(\/[a-zA-Z0-9_-]+)?\/?$/;
  const notePattern = /^\/boards\/[a-zA-Z0-9_-]+\/notes(\/[a-zA-Z0-9_-]+)?\/?$/;
  const isCommunityNote = notePattern.test(path) && searchParams.get('ref') === 'community';

  const navItems = [
    {
      name: t('home'),
      href: '/',
      icon: HomeIcon,
      active: homePattern.test(path),
    },
    {
      name: t('boards'),
      href: '/boards',
      icon: Squares2X2Icon,
      active: !isCommunityNote && (boardPattern.test(path) || notePattern.test(path)),
    },
    // Collapsed sidebar hides the quick-link accordions, so expose their pages as icons.
    ...(isCollapsed
      ? [
          {
            name: t('favorites'),
            href: '/favorites',
            icon: StarIcon,
            active: path.startsWith('/favorites'),
          },
          {
            name: t('recent'),
            href: '/recent',
            icon: ClockIcon,
            active: path.startsWith('/recent'),
          },
        ]
      : []),
    {
      name: t('shared'),
      href: '/shared',
      icon: ShareIcon,
      active: path.startsWith('/shared'),
    },
    {
      name: t('community'),
      href: '/community',
      icon: GlobeAltIcon,
      active: path.startsWith('/community') || isCommunityNote,
    },
  ];

  if (user?.role === 'admin') {
    navItems.push({
      name: t('admin'),
      href: '/admin',
      icon: ShieldCheckIcon,
      active: adminPattern.test(path),
    });
  }
  return (
    <nav
      className={cn(
        'flex flex-col gap-2 px-3 transition-all duration-300',
        isCollapsed ? 'items-center' : 'px-4',
      )}
    >
      {navItems.map((item) => (
        <motion.div
          key={item.name}
          layout
          transition={FAST}
          className="w-full"
        >
          <Link
            href={item.href}
            prefetch={true}
            className={cn(
              'group relative flex items-center rounded-xl transition-all duration-300',
              isCollapsed ? 'justify-center h-12 w-12' : 'gap-3 px-3 py-2.5',
              item.active
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {item.active && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20"
                transition={FAST}
              />
            )}
            <item.icon
              className={cn(
                'h-5 w-5 relative z-10 transition-transform duration-300',
                !item.active && 'group-hover:scale-110',
              )}
            />

            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={FAST}
                  className="relative z-10 font-bold text-sm tracking-tight whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>
      ))}

      {!isCollapsed && quickLinks && (
        <Accordion.Root
          type="multiple"
          defaultValue={['favorites', 'recent']}
          className="mt-6 w-full space-y-4"
        >
          {(['favorites', 'recent'] as const)
            .filter((section) => quickLinks[section].length > 0)
            .map((section) => (
              <Accordion.Item key={section} value={section}>
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 hover:text-foreground">
                    {t(section)}
                    <ChevronDownIcon className="h-3 w-3 transition-transform group-data-[state=closed]:-rotate-90" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="space-y-1">
                  {quickLinks[section].map((item) => {
                    const Icon = item.type === 'board' ? Squares2X2Icon : DocumentTextIcon;
                    return (
                      <Link
                        key={item.url}
                        href={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                          path === item.url
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                  <Link
                    href={`/${section}`}
                    className="block px-3 py-1 text-xs font-medium text-primary hover:underline"
                  >
                    {t('seeMore')}
                  </Link>
                </Accordion.Content>
              </Accordion.Item>
            ))}
        </Accordion.Root>
      )}
    </nav>
  );
}
