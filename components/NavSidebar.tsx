'use client';

import NavBar from './NavBar';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3Icon,
  UserIcon,
  ArrowRightStartOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { signout } from '@/app/(authenticated)/lib/actions';
import NavThemeToggle from './NavThemeToggle';
import { cn } from '@/lib/utils';

import { User } from '@/prisma/generated/client';

interface NavSidebarProps {
  user: User;
}

export default function NavSidebar({ user }: NavSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!user) return null;

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 240 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        className="hidden md:flex flex-col border-r border-border bg-background h-screen sticky top-0 z-50"
      >
        <div className="flex items-center justify-center h-20 border-b border-border relative transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={isCollapsed ? 'collapsed' : 'expanded'}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-center"
            >
              <Link
                href="/"
                className="flex items-center justify-center transition-transform duration-300 hover:scale-105 px-4"
              >
                <Image
                  src={isCollapsed ? '/daylog-logo.svg' : '/daylog.svg'}
                  alt="daylog"
                  width={isCollapsed ? 40 : 150}
                  height={40}
                  className="h-10 w-auto logo-invert"
                  priority
                />
              </Link>
            </motion.div>
          </AnimatePresence>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              'rounded-full hover:bg-muted transition-all duration-300 z-50',
              isCollapsed
                ? 'absolute -right-3 top-16 bg-background border shadow-sm h-6 w-6'
                : 'absolute right-4',
            )}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="h-4 w-4" />
            ) : (
              <ChevronLeftIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>

        <div className="flex-1 flex flex-col py-6 overflow-y-auto overflow-x-hidden">
          <NavBar user={user} isCollapsed={isCollapsed} />
        </div>
      </motion.aside>

      {/* Mobile Topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-background/80 backdrop-blur-md">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bars3Icon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[80%] max-w-sm p-0 flex flex-col border-r-0"
          >
            <SheetHeader className="h-20 px-6 border-b flex flex-row items-center justify-between flex-shrink-0">
              <SheetTitle className="flex items-center">
                <Link href="/">
                  <Image
                    src="/daylog.svg"
                    alt="daylog"
                    width={150}
                    height={40}
                    className="h-10 w-auto logo-invert"
                    priority
                  />
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col py-6 overflow-y-auto">
              <NavBar user={user} />
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <Image
            src="/daylog-logo.svg"
            alt="daylog"
            width={40}
            height={40}
            className="h-10 w-auto logo-invert"
            priority
          />
        </Link>

        <div className="flex items-center gap-2">
          <NavThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center p-0.5 rounded-full hover:bg-muted transition-all outline-none">
                <Avatar className="h-8 w-8 border-2 border-primary/10">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-2xl p-2 shadow-2xl border-primary/5"
            >
              <DropdownMenuLabel className="px-3 py-3 border-b mb-1">
                <div className="flex flex-col">
                  <span className="text-sm font-bold tracking-tight">
                    {user?.name}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {user?.role}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link
                  href={`/profile/${user?.id}`}
                  className="rounded-xl flex items-center py-2.5 cursor-pointer"
                >
                  <UserIcon className="mr-3 h-4 w-4 opacity-60" />
                  <span className="font-medium">Profile</span>
                </Link>
              </DropdownMenuItem>
              {user?.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="rounded-xl flex items-center py-2.5 cursor-pointer"
                  >
                    <ShieldCheckIcon className="mr-3 h-4 w-4 opacity-60" />
                    <span className="font-medium">Administration</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => signout()}
                className="rounded-xl flex items-center py-2.5 text-destructive focus:text-destructive cursor-pointer group"
              >
                <ArrowRightStartOnRectangleIcon className="mr-3 h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span className="font-medium">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
