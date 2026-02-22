'use client';

import NavHeader from '@/components/NavHeader';
import NavMenu from '@/components/NavMenu';
import Page from '@/components/Page';
import PageBody from '@/components/PageBody';
import PageContainer from '@/components/PageContainer';
import PageFooter from '@/components/PageFooter';
import PageHeader from '@/components/PageHeader';
import MainContent from '@/components/MainContent';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentSession } from '../login/lib/actions';
import { getSettings, SettingsType } from './lib/actions';
import PreferencesTab from './partials/PreferencesTab';
import UserModal from './partials/UserModal';
import UsersTable from './partials/UsersTable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { UsersIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('users');
  const [initialSettings, setInitialSettings] = useState<SettingsType | null>(
    null,
  );
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { user } = await getCurrentSession();
      if (user === null) {
        return router.push('/login');
      }
      if (user.role !== 'admin') {
        return router.push('/');
      }
      setCurrentUser(user);

      const settings = await getSettings();
      setInitialSettings(settings);
      setLoading(false);
    }
    loadData();
  }, [router]);

  if (loading) {
    return null; // Or a loading spinner
  }

  const breadcrumbs = [
    { name: 'Home', href: '/' },
    { name: 'Admin', href: '/admin' },
  ];

  const tabs = [
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'preferences', label: 'Preferences', icon: Cog6ToothIcon },
  ];

  return (
    <Page>
      <NavMenu user={currentUser} />
      <MainContent>
        <NavHeader user={currentUser} />
        <PageContainer>
          <PageHeader
            title="Configuration"
            description="Manage your users and preferences"
            breadcrumbs={breadcrumbs}
          />
          <PageBody>
            <Card className="border-none bg-transparent shadow-none overflow-hidden">
              <CardHeader className="p-0 mb-6">
                <div className="flex border-b border-border/40">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors hover:text-foreground/80 focus:outline-none ${
                        activeTab === tab.id
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                          transition={{
                            type: 'spring',
                            stiffness: 380,
                            damping: 30,
                          }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === 'users' && (
                      <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold tracking-tight">
                              Users
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Manage user accounts and permissions.
                            </p>
                          </div>
                          <UserModal />
                        </div>
                        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
                          <UsersTable currentUserId={currentUser.id} />
                        </div>
                      </div>
                    )}
                    {activeTab === 'preferences' && (
                      <div className="max-w-2xl mx-auto py-4">
                        <PreferencesTab initialSettings={initialSettings} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </PageBody>
          <PageFooter />
        </PageContainer>
      </MainContent>
    </Page>
  );
}
