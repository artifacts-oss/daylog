'use client';

import Loader from '@/components/Loader';
import { User } from '@/prisma/generated/client';
import {
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  EllipsisHorizontalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { deleteUser, getUsers, setRole } from '../lib/actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';

export default function UsersTable({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const [users, setUsers] = useState<User[] | null>();
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const users = await getUsers();
    setUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClickRole = async (userId: number, role: string) => {
    await setRole(userId, role === 'user' ? 'admin' : 'user');
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader caption="Fetching directory..." />
      </div>
    );
  }

  return (
    <div className="relative">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[300px] font-semibold">User</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="w-[100px] text-right font-semibold">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {users?.map((u, index) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="group border-b last:border-0 transition-colors hover:bg-muted/30"
              >
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors font-semibold">
                      {u.name?.charAt(0).toUpperCase() ||
                        u.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-foreground truncate">
                        {u.name || 'Unnamed User'}
                        {u.id === currentUserId && (
                          <span className="ml-2 text-[10px] uppercase tracking-wider font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full ring-1 ring-inset ring-primary/20">
                            You
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      u.role === 'admin'
                        ? 'bg-primary/5 text-primary border-primary/20'
                        : 'bg-muted/50 text-muted-foreground border-transparent',
                    )}
                  >
                    {u.role === 'admin' ? (
                      <ShieldCheckIcon className="h-3.5 w-3.5" />
                    ) : (
                      <UserCircleIcon className="h-3.5 w-3.5" />
                    )}
                    {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="py-4 text-right">
                  <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-muted"
                        >
                          <EllipsisHorizontalIcon className="h-5 w-5" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <a
                            href={`/profile/${u.id}`}
                            className="flex items-center cursor-pointer"
                          >
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Edit Profile
                          </a>
                        </DropdownMenuItem>

                        {u.id !== currentUserId && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Permissions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleClickRole(u.id, u.role)}
                              className="flex items-center cursor-pointer"
                            >
                              {u.role === 'user' ? (
                                <>
                                  <ChevronUpIcon className="mr-2 h-4 w-4 text-primary" />
                                  Elevate to Admin
                                </>
                              ) : (
                                <>
                                  <ChevronDownIcon className="mr-2 h-4 w-4 text-destructive" />
                                  Demote to User
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="flex items-center text-destructive focus:text-destructive cursor-pointer">
                                <TrashIcon className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5 text-destructive" />
                          Delete User
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete{' '}
                          <strong className="text-foreground">
                            {u.name || u.email}
                          </strong>
                          ? This action cannot be undone and will permanently
                          remove all data associated with this account.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                          onClick={async () => {
                            const deleted = await deleteUser(u.id);
                            if (deleted) {
                              await loadData();
                            }
                          }}
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </div>
  );
}
