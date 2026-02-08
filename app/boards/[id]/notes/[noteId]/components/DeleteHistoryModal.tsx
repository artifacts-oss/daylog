'use client';

import { IconAlertTriangle, IconRestore } from '@tabler/icons-react';

type ClearHistoryModalProps = {
  id: string;
  title?: string;
  description?: string;
  actionLabel?: string;
  onConfirm: () => void;
  isLoading: boolean;
  variant?: 'danger' | 'primary';
};

export default function DeleteHistoryModal({
  id,
  title = 'Are you sure?',
  description = 'Do you really want to perform this action? This cannot be undone.',
  actionLabel = 'Yes, delete',
  onConfirm,
  isLoading,
  variant = 'danger',
}: ClearHistoryModalProps) {
  const isDanger = variant === 'danger';
  const colorClass = isDanger ? 'danger' : 'primary';

  return (
    <div className="modal" id={id} tabIndex={-1}>
      <div className="modal-dialog modal-sm" role="document">
        <div className="modal-content">
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
          <div className={`modal-status bg-${colorClass}`}></div>
          <div className="modal-body text-center py-4">
            <div className={`text-${colorClass} mb-2`}>
              {isDanger ? (
                <IconAlertTriangle size={48} />
              ) : (
                <IconRestore size={48} />
              )}
            </div>
            <h3>{title}</h3>
            <div className="text-secondary">{description}</div>
          </div>
          <div className="modal-footer">
            <div className="w-100">
              <div className="row">
                <div className="col">
                  <button
                    type="button"
                    className="btn w-100"
                    data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                </div>
                <div className="col">
                  <button
                    disabled={isLoading}
                    type="button"
                    className={`btn btn-${colorClass} w-100 ${
                      isLoading ? 'btn-loading disabled' : ''
                    }`}
                    onClick={() => {
                      onConfirm();
                    }}
                    data-bs-dismiss="modal"
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
