import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import * as React from 'react';

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
} from './alert-dialog';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './breadcrumb';
import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Label } from './label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Separator } from './separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';
import { Skeleton } from './skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Textarea } from './textarea';

describe('UI Components', () => {
  beforeEach(() => {
    cleanup();
  });

  describe('AlertDialog', () => {
    it('renders alert dialog trigger', () => {
      render(
        <AlertDialog>
          <AlertDialogTrigger>Click me</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>,
      );
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });
  });

  describe('Alert', () => {
    it('renders alert with title and description', () => {
      render(
        <Alert>
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>
            You can add components to your app using the cli.
          </AlertDescription>
        </Alert>,
      );
      expect(screen.getByText('Heads up!')).toBeInTheDocument();
      expect(
        screen.getByText('You can add components to your app using the cli.'),
      ).toBeInTheDocument();
    });
  });

  describe('Avatar', () => {
    it('renders avatar with image and fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>,
      );
      expect(screen.getByText('CN')).toBeInTheDocument();
    });
  });

  describe('Breadcrumb', () => {
    it('renders breadcrumb list', () => {
      render(
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Components</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>,
      );
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Components')).toBeInTheDocument();
    });
  });

  describe('Button', () => {
    it('renders button with text', () => {
      render(<Button>Click me</Button>);
      expect(
        screen.getByRole('button', { name: /click me/i }),
      ).toBeInTheDocument();
    });

    it('applies variant and size classes', () => {
      const { rerender } = render(
        <Button variant="destructive" size="lg">
          Delete
        </Button>,
      );
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');

      rerender(
        <Button variant="outline" size="sm">
          Outline
        </Button>,
      );
      expect(screen.getByRole('button')).toHaveClass('border');
      expect(screen.getByRole('button')).toHaveClass('border-border');
    });
  });

  describe('Card', () => {
    it('renders card with all sections', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Card Content</p>
          </CardContent>
          <CardFooter>
            <p>Card Footer</p>
          </CardFooter>
        </Card>,
      );
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card Description')).toBeInTheDocument();
      expect(screen.getByText('Card Content')).toBeInTheDocument();
      expect(screen.getByText('Card Footer')).toBeInTheDocument();
    });
  });

  describe('Dialog', () => {
    it('renders dialog trigger', () => {
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog Title</DialogTitle>
              <DialogDescription>Dialog Description</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>,
      );
      expect(screen.getByText('Open Dialog')).toBeInTheDocument();
    });
  });

  describe('DropdownMenu', () => {
    it('renders dropdown menu trigger', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );
      expect(screen.getByText('Open Menu')).toBeInTheDocument();
    });
  });

  describe('Input', () => {
    it('renders input with placeholder', () => {
      render(<Input placeholder="Email" />);
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });

    it('is disabled when the disabled prop is passed', () => {
      render(<Input disabled placeholder="Disabled Input" />);
      expect(screen.getByPlaceholderText('Disabled Input')).toBeDisabled();
    });
  });

  describe('Label', () => {
    it('renders label text', () => {
      render(<Label htmlFor="email">Email address</Label>);
      expect(screen.getByText('Email address')).toBeInTheDocument();
    });
  });

  describe('Select', () => {
    it('renders select trigger', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectContent>
        </Select>,
      );
      expect(screen.getByText('Select a fruit')).toBeInTheDocument();
    });
  });

  describe('Separator', () => {
    it('renders separator', () => {
      const { container } = render(<Separator />);
      expect(container.firstChild).toHaveClass('shrink-0 bg-border');
    });
  });

  describe('Sheet', () => {
    it('renders sheet trigger', () => {
      render(
        <Sheet>
          <SheetTrigger>Open Sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet Title</SheetTitle>
              <SheetDescription>Sheet Description</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );
      expect(screen.getByText('Open Sheet')).toBeInTheDocument();
    });
  });

  describe('Skeleton', () => {
    it('renders skeleton with classes', () => {
      const { container } = render(<Skeleton className="h-4 w-[250px]" />);
      expect(container.firstChild).toHaveClass('animate-pulse');
      expect(container.firstChild).toHaveClass('rounded-md');
      expect(container.firstChild).toHaveClass('bg-muted');
    });
  });

  describe('Table', () => {
    it('renders table with content', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>INV001</TableCell>
            </TableRow>
          </TableBody>
        </Table>,
      );
      expect(screen.getByText('Invoice')).toBeInTheDocument();
      expect(screen.getByText('INV001')).toBeInTheDocument();
    });
  });

  describe('Textarea', () => {
    it('renders textarea with placeholder', () => {
      render(<Textarea placeholder="Type your message here." />);
      expect(
        screen.getByPlaceholderText('Type your message here.'),
      ).toBeInTheDocument();
    });
  });
});
