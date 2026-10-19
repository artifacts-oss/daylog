'use client';

import { deleteBoard } from '@/app/(authenticated)/boards/lib/actions';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';
import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Board } from '@/prisma/generated/client';

type BoardModalDeleteType = {
  board: Board;
  redirectTo?: string;
  trigger?: ReactNode;
};

export default function BoardModalDelete({ board, redirectTo, trigger }: BoardModalDeleteType) {
  const router = useRouter();

  return (
    <ConfirmDeleteModal
      namespace="BoardDelete"
      entityTitle={board.title}
      onDelete={async () => {
        await deleteBoard(board);
        if (redirectTo) router.replace(redirectTo);
      }}
      trigger={trigger}
      triggerClassName="h-8 w-8 text-white hover:text-white hover:bg-white/10"
      triggerIconClassName="h-5 w-5"
    />
  );
}
