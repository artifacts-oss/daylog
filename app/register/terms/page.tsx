'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  ChevronLeft,
  Scale,
  ShieldCheck,
  UserCheck,
  BookOpen,
  AlertOctagon,
  PowerOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

const sections = [
  {
    icon: BookOpen,
    title: 'Introduction',
    content:
      'By registering for an account on our platform, you agree to comply with these terms and conditions. Please read them carefully before proceeding with your registration.',
  },
  {
    icon: UserCheck,
    title: 'Your Account',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account.',
  },
  {
    icon: ShieldCheck,
    title: 'Acceptable Use',
    content:
      'You agree to use our platform for lawful purposes only. Prohibited activities include, but are not limited to: engaging in fraud, violating laws, or uploading harmful content.',
  },
  {
    icon: Scale,
    title: 'License and Property',
    content:
      'This platform is licensed under the Apache 2.0 License. You may use, modify, and share the platform in compliance with the terms of this license.',
    link: 'https://www.apache.org/licenses/LICENSE-2.0',
  },
  {
    icon: AlertOctagon,
    title: 'Limitation of Liability',
    content:
      'To the maximum extent permitted by law, we are not liable for any damages resulting from your use of this platform, including data loss or service interruptions.',
  },
  {
    icon: PowerOff,
    title: 'Termination',
    content:
      'We reserve the right to terminate your account at our sole discretion if you violate these terms and conditions.',
  },
  {
    icon: RefreshCw,
    title: 'Changes to Terms',
    content:
      'We may update these terms from time to time. Any changes will be communicated to you and will take effect immediately upon posting.',
  },
];

export default function Page() {
  return (
    <div className="relative min-h-screen bg-background px-4 py-12 overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px] animate-slow-pulse" />
        <div
          className="absolute bottom-[0%] right-[-5%] w-[35%] h-[35%] bg-primary/5 rounded-full blur-[120px] animate-slow-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-2xl mx-auto space-y-8"
      >
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="-ml-3 gap-1 text-muted-foreground hover:text-foreground"
          >
            <Link href="/register">
              <ChevronLeft className="h-4 w-4" />
              Back to Registration
            </Link>
          </Button>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-widest antialiased">
            Legal Agreement
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight text-center md:text-left balance">
            Terms of Service
          </h1>
          <p className="text-muted-foreground text-center md:text-left text-lg">
            Please review the following agreement for using Daylog.
          </p>
        </div>

        <Card className="glass-card border-border/50 shadow-2xl backdrop-blur-md bg-card/70 ring-1 ring-white/10 overflow-hidden">
          <CardHeader className="bg-primary/[0.03] border-b border-border/50 py-8 px-8">
            <CardTitle className="text-xl font-bold">
              User Registration Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="p-8 hover:bg-primary/[0.01] transition-colors"
                >
                  <div className="flex gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center ring-1 ring-primary/10 shadow-sm">
                      <section.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg tracking-tight">
                        {section.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed text-sm antialiased">
                        {section.content}
                      </p>
                      {section.link && (
                        <a
                          href={section.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-2 tracking-wide"
                        >
                          View License Detail
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="bg-primary/[0.03] border-t border-border/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-medium">
              Effective Date: February 22, 2026
            </p>
            <div className="text-[10px] font-bold bg-primary/10 px-4 py-1.5 rounded-full text-primary uppercase tracking-wider ring-1 ring-primary/20">
              Apache 2.0 Licensed
            </div>
          </CardFooter>
        </Card>

        <div className="text-center pt-4">
          <Button
            asChild
            className="rounded-full px-10 py-6 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Link href="/register">I understand, take me back</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
