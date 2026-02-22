'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminTabs() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <ul className="nav nav-tabs card-header-tabs" data-bs-toggle="tabs">
      {isClient ? (
        <>
          <li className="nav-item">
            <Link
              href="#tabs-admin-users"
              className="nav-link active"
              data-bs-toggle="tab"
            >
              Users
            </Link>
          </li>
          <li className="nav-item">
            <Link
              href="#tabs-admin-preferences"
              className="nav-link"
              data-bs-toggle="tab"
            >
              Preferences
            </Link>
          </li>
        </>
      ) : (
        <li className="nav-item">
          <div
            data-testid="admin-tabs-placeholder"
            style={{ height: '37px' }}
          ></div>
        </li>
      )}
    </ul>
  );
}
