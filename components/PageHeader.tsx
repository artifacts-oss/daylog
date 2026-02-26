'use client';

import { truncateWord } from '@/utils/text';
import React, { PropsWithChildren } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { motion } from 'framer-motion';

type PageHeader = {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  breadcrumbs?: Array<{ name: string; href: string }>;
};

export default function PageHeader({
  ...props
}: PropsWithChildren<PageHeader>) {
  return (
    <div className="relative border-b border-border bg-background overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl transform-gpu pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/3 rounded-full blur-2xl transform-gpu pointer-events-none" />

      {props.imageUrl && (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${props.imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent" />
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div className="flex-1 space-y-4">
            {props.breadcrumbs && (
              <Breadcrumb>
                <BreadcrumbList className="text-[12px] font-[600] uppercase tracking-wider text-muted-foreground">
                  {props.breadcrumbs.map((item, index, arr) => (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {index < arr.length - 1 ? (
                          <BreadcrumbLink
                            asChild
                            className="hover:text-foreground transition-colors"
                          >
                            <Link href={item.href}>
                              {truncateWord(item.name, 30)}
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="text-foreground/80">
                            {truncateWord(item.name, 30)}
                          </BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {index < arr.length - 1 && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            )}

            <div className="space-y-2">
              <h1
                className="text-[42px] font-[800] tracking-tight text-foreground leading-[0.95]"
                title={props.title ?? ''}
              >
                {props.title ? (
                  truncateWord(props.title, 50)
                ) : (
                  <span className="text-muted-foreground/70 animate-pulse">
                    Loading...
                  </span>
                )}
              </h1>
              {props.description && (
                <p className="text-[16px] text-foreground/80 max-w-2xl font-[450] leading-relaxed">
                  {props.description}
                </p>
              )}
            </div>
          </div>

          {props.children && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex items-center gap-3 bg-muted/50 p-1.5 rounded-[20px] border border-border backdrop-blur-sm"
            >
              {props.children}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
