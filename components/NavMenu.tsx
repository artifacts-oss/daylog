import NavBar from './NavBar';
import Link from 'next/link';
import Image from 'next/image';
import NavThemeToggle from './NavThemeToggle';
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
import { signout } from '@/app/lib/actions';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface NavMenuProps {
  user: any;
}

export default function NavMenu({ user }: NavMenuProps) {
  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (!user) {
    return null;
  }

  return (
    <>
      <aside className="hidden md:flex flex-col w-64 border-r bg-background h-screen flex-shrink-0 sticky top-0">
        <div className="flex items-center h-16 px-4 border-b">
          <Link href="/">
            <Image
              src="/daylog.svg"
              alt="daylog"
              width="0"
              height="0"
              className="h-8 w-auto"
              style={{ width: 'auto', height: '32px' }}
              priority={true}
            />
          </Link>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <NavBar user={user} />
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4 border-b bg-background">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Bars3Icon className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="h-16 px-4 border-b flex flex-row items-center flex-shrink-0">
              <SheetTitle className="flex items-center">
                <Link href="/">
                  <Image
                    src="/daylog.svg"
                    alt="daylog"
                    width="0"
                    height="0"
                    className="h-8 w-auto"
                    style={{ width: 'auto', height: '32px' }}
                    priority={true}
                  />
                </Link>
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <NavBar user={user} />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/">
          <Image
            src="/daylog.svg"
            alt="daylog"
            width="0"
            height="0"
            className="h-8 w-auto"
            style={{ width: 'auto', height: '32px' }}
            priority={true}
          />
        </Link>
        <nav className="flex items-center gap-2">
          <NavThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center p-1 rounded-full hover:bg-muted transition-colors outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground capitalize font-normal">
                  {user?.role}
                </span>
              </DropdownMenuLabel>
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
        </nav>
      </div>
    </>
  );
}
