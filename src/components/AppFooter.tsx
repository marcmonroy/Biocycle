import { Database, TrendingUp } from 'lucide-react';

interface AppFooterProps {
  isEnglish?: boolean;
}

export function AppFooter({ isEnglish = false }: AppFooterProps) {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-8 mb-20">
      <div className="max-w-[430px] mx-auto px-5 py-6">
        <div className="flex items-center justify-center gap-6 text-sm">
          <a
            href="/research"
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>{isEnglish ? 'Research' : 'Investigacion'}</span>
          </a>
          <a
            href="/trading-floor"
            className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <TrendingUp className="w-4 h-4" />
            <span>{isEnglish ? 'Trading Floor' : 'Trading Floor'}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
