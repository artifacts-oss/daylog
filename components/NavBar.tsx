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
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NavBar({ user }: { user: User }) {
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
    <nav className="flex flex-col gap-2 px-4 py-2">
      {navItems.map((item) => (
        <motion.div
          key={item.name}
          animate={{
            scale: item.active ? [1, 1.02, 1] : 1,
          }}
          transition={{
            scale: { duration: 0.3, ease: 'easeInOut' },
          }}
        >
          <Link
            href={item.href}
            prefetch={true}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              item.active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        </motion.div>
      ))}
    </nav>
  );
}
