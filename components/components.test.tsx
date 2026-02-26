import { User } from '@/prisma/generated/client';
import { cleanup, render, screen } from '@testing-library/react';
import { describe } from 'node:test';
import { beforeEach, expect, it, vi } from 'vitest';
import FormField from './FormField';
import Loader from './Loader';
import NavBar from './NavBar';
import NavHeader from './NavHeader';
import OTPInputWrapper from './OTPInputWrapper';
import Page from './Page';
import PageBody from './PageBody';
import PageContainer from './PageContainer';
import PageFooter from './PageFooter';
import PageFooterSponsor from './PageFooterSponsor';
import PageHeader from './PageHeader';
import Placeholder from './Placeholder';
import TimeDiff from './TimeDiff';
import NavSidebar from './NavSidebar';

vi.mock('input-otp', () => ({
  __esModule: true,
  OTPInput: ({ onChange }: { onChange: (value: string) => void }) => (
    <input
      data-testid="mocked-input-otp"
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  SlotProps: ({ char, isActive }: { char: string; isActive: boolean }) => (
    <div className={`slot ${isActive ? 'active' : ''}`}>{char}</div>
  ),
}));

vi.mock('@/app/login/lib/actions', () => ({
  getCurrentSession: () => {
    return {
      user: {
        id: 1,
        name: 'Test User',
        role: 'user',
      },
    };
  },
}));

const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('Component Tests', () => {
  beforeEach(() => {
    cleanup();
  });

  it('renders TimeDiff component', () => {
    const { container } = render(<TimeDiff updatedAt={new Date()} />);
    expect(container).toBeInTheDocument();
  });

  it('renders Placeholder component', () => {
    const { container } = render(<Placeholder />);
    expect(container).toBeInTheDocument();
  });

  it('renders Placeholder component with only background', () => {
    const { container } = render(<Placeholder background={true} />);
    expect(container).toBeInTheDocument();
    expect(container.querySelector('.card-body')).not.toBeInTheDocument();
  });

  it('renders PageHeader component', () => {
    const { container } = render(
      <PageHeader title="Test Title" breadcrumbs={[]} />,
    );
    expect(container).toBeInTheDocument();
  });

  it('renders PageHeader component with breadcrumbs', () => {
    const { container } = render(
      <PageHeader
        title="Test Title"
        breadcrumbs={[
          { name: 'Home', href: '/' },
          { name: 'Dashboard', href: '/dashboard' },
        ]}
      />,
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  // TODO: implement image in the new ui
  // it('renders PageHeader component with imageUrl', () => {
  //   const { container } = render(
  //     <PageHeader
  //       title="Test Title"
  //       breadcrumbs={[]}
  //       imageUrl="test-image.jpg"
  //     />
  //   );
  //   expect(container).toBeInTheDocument();
  //   expect(container.querySelector('img')).toBeInTheDocument();
  // });

  it('renders PageFooterSponsor component', () => {
    const { container } = render(<PageFooterSponsor />);
    expect(container).toBeInTheDocument();
  });

  it('renders PageFooter component', () => {
    const { container } = render(<PageFooter />);
    expect(container).toBeInTheDocument();
  });

  it('renders PageFooterSponsor component inside PageFooter', () => {
    vi.stubEnv('SHOW_SPONSOR_FOOTER', 'true');
    const { container } = render(<PageFooter />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Buy me a Coffee')).toBeInTheDocument();
  });

  it('does not render PageFooterSponsor component inside PageFooter when env is false', () => {
    vi.stubEnv('SHOW_SPONSOR_FOOTER', 'false');
    const { container } = render(<PageFooter />);
    expect(container).toBeInTheDocument();
    expect(screen.queryByText('Buy me a Coffee')).not.toBeInTheDocument();
  });

  it('renders PageContainer component', async () => {
    const pageContainer = await PageContainer({ children: <div>Test</div> });
    const { container } = render(pageContainer);
    expect(container).toBeInTheDocument();
  });

  it('renders PageBody component', () => {
    const { container } = render(<PageBody>Test Content</PageBody>);
    expect(container).toBeInTheDocument();
  });

  it('renders Page component', async () => {
    const page = await Page({ children: <div>Test</div> });
    const { container } = render(page);
    expect(container).toBeInTheDocument();
  });

  it('renders OTPInputWrapper component', () => {
    const { container } = render(<OTPInputWrapper onChange={() => {}} />);
    expect(container).toBeInTheDocument();
  });

  it('renders OTPInputWrapper component with slots', () => {
    vi.mock('input-otp', () => ({
      __esModule: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      OTPInput: ({ render }: { render: any }) => {
        return <div>{render({ slots: [] })}</div>;
      },
      SlotProps: ({ char, isActive }: { char: string; isActive: boolean }) => (
        <div className={`slot ${isActive ? 'active' : ''}`}>{char}q</div>
      ),
    }));
    const { container } = render(<OTPInputWrapper onChange={() => {}} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders NavHeader component', async () => {
    const navHeader = await NavHeader({
      user: { id: 1, name: 'Test User', role: 'user' } as User,
    });
    const { container } = render(navHeader);
    expect(container).toBeInTheDocument();
  });

  it('renders NavBar component', () => {
    const { container } = render(
      <NavBar user={{ id: 1, role: 'user' } as User} />,
    );
    expect(container).toBeInTheDocument();
  });

  it('renders NavBar component with admin role', () => {
    const { container } = render(
      <NavBar user={{ id: 1, role: 'admin' } as User} />,
    );
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('not shows admin nav for non-admin users', () => {
    const { container } = render(
      <NavBar user={{ id: 1, role: 'user' } as User} />,
    );
    expect(container).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('renders Loader component', () => {
    const { container } = render(<Loader caption="Loading..." />);
    expect(container).toBeInTheDocument();
  });

  it('renders FormField component', () => {
    const { container } = render(<FormField label="Test Label" name="test" />);
    expect(container).toBeInTheDocument();
  });

  it('renders NavSidebar component', () => {
    const { container } = render(
      <NavSidebar user={{ id: 1, role: 'user' } as User} />,
    );
    expect(container).toBeInTheDocument();
  });

  it('renders Loader component', () => {
    const { container } = render(<Loader caption="Loading..." />);
    expect(container).toBeInTheDocument();
  });
});
