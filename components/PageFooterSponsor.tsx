import getVersion from '@/app/lib/version';
import { HeartIcon } from '@heroicons/react/24/solid';
import { GithubIcon, Coffee } from 'lucide-react';

export default function PageFooterSponsor() {
  return (
    <footer className="border-t bg-background py-4">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              Made with <HeartIcon className="h-4 w-4 text-red-500" /> by{' '}
              <a
                href="https://github.com/artifacts-dav"
                className="hover:text-foreground transition-colors"
              >
                David R<sup>2</sup>
              </a>
            </span>
            <span>·</span>
            <a
              href="https://github.com/artifacts-oss/daylog/releases"
              className="hover:text-foreground transition-colors"
              rel="noopener"
            >
              v{getVersion()}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/artifacts-oss/daylog"
              target="_blank"
              className="hover:text-foreground transition-colors flex items-center gap-1"
              rel="noopener"
            >
              <GithubIcon className="h-4 w-4" /> Source code
            </a>
            <a
              href="https://buymeacoffee.com/davidartifacts"
              target="_blank"
              className="hover:text-foreground transition-colors flex items-center gap-1"
              rel="noopener"
            >
              <Coffee className="h-4 w-4" /> Buy me a Coffee
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
