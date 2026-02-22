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
    <div className="border-b bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            {props.breadcrumbs && (
              <Breadcrumb className="mb-2">
                <BreadcrumbList>
                  {props.breadcrumbs.map((item, index, arr) => (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {index < arr.length - 1 ? (
                          <BreadcrumbLink href={item.href}>
                            {truncateWord(item.name, 30)}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage>
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
            <h1
              className="text-2xl md:text-3xl font-semibold tracking-tight"
              title={props.title ?? ''}
            >
              {truncateWord(props.title ?? '', 50) ?? (
                <span className="text-muted-foreground">Loading...</span>
              )}
            </h1>
            {props.description && (
              <p className="text-muted-foreground mt-1">{props.description}</p>
            )}
          </div>
          {props.children && (
            <div className="flex items-center gap-2">{props.children}</div>
          )}
        </div>
      </div>
    </div>
  );
}
