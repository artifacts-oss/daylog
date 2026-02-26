'use client';

import { User } from '@/prisma/generated/client';
import {
  HomeIcon,
  Squares2X2Icon,
  UserIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface NavBarProps {
  user: User;
  isCollapsed?: boolean;
}

export default function NavBar({ user, isCollapsed = false }: NavBarProps) {
  const path = usePathname();
  const adminPattern = /^\/admin\/?$/;
  const homePattern = /^\/$/;
  const profilePattern = /^\/profile\/[a-zA-Z0-9_-]+\/?$/;
  const boardPattern = /^\/boards(\/[a-zA-Z0-9_-]+)?\/?$/;
  const notePattern = /^\/boards\/[a-zA-Z0-9_-]+\/notes(\/[a-zA-Z0-9_-]+)?\/?$/;

  const navItems = [
    {
      name: 'Home',
      href: '/',
      icon: HomeIcon,
      active: homePattern.test(path),
    },
    {
      name: 'Boards',
      href: '/boards',
      icon: Squares2X2Icon,
      active: boardPattern.test(path) || notePattern.test(path),
    },
    {
      name: 'Profile',
      href: `/profile/${user?.id}`,
      icon: UserIcon,
      active: profilePattern.test(path),
    },
  ];

  if (user?.role === 'admin') {
    navItems.push({
      name: 'Admin',
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
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
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
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
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
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="relative z-10 font-bold text-sm tracking-tight whitespace-nowrap"
                >
                  {item.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>
      ))}
    </nav>
  );
}
