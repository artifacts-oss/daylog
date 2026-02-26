'use client';

import Link from 'next/link';
import NavThemeToggle from './NavThemeToggle';
import NavSearch from './NavSearch';
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
  UserIcon,
  ArrowRightStartOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { signout } from '@/app/(authenticated)/lib/actions';

import { User } from '@/prisma/generated/client';

interface NavHeaderProps {
  user: User;
}

export default function NavHeader({ user }: NavHeaderProps) {
  if (!user) {
    return null;
  }

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="hidden md:flex flex-shrink-0 items-center justify-between h-20 px-6 border-b border-border bg-background">
      <div className="flex-1 max-w-md">
        <NavSearch />
      </div>
      <div className="flex items-center gap-2">
        <NavThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted transition-colors outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <span className="text-[16px] font-[500] text-foreground">
                  {user?.name}
                </span>
                <span className="text-[12px] font-[500] uppercase text-muted-foreground/70">
                  {user?.role}
                </span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href={`/profile/${user?.id}`}
                className="flex items-center cursor-pointer"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            {user?.role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link
                  href="/admin"
                  className="flex items-center cursor-pointer"
                >
                  <ShieldCheckIcon className="mr-2 h-4 w-4" />
                  <span>Administration</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signout()}
              className="flex items-center text-destructive focus:text-destructive cursor-pointer"
            >
              <ArrowRightStartOnRectangleIcon className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
