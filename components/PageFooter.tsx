import getVersion from '@/app/(authenticated)/lib/version';
import PageFooterSponsor from './PageFooterSponsor';

export default function PageFooter() {
  const showSponsor =
    !process.env.SHOW_SPONSOR_FOOTER ||
    process.env.SHOW_SPONSOR_FOOTER === 'true';
  return showSponsor ? (
    <PageFooterSponsor />
  ) : (
    <footer className="border-t border-border bg-background py-6">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-6 text-[12px] font-[500] uppercase text-muted-foreground/70">
          <a
            href="https://github.com/artifacts-oss/daylog"
            className="hover:text-foreground transition-colors"
          >
            daylog
          </a>
          <span>·</span>
          <a
            href="https://github.com/artifacts-oss/daylog/releases"
            className="hover:text-foreground transition-colors"
            rel="noopener"
          >
            v{getVersion()}
          </a>
        </div>
      </div>
    </footer>
  );
}
