import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home } from 'lucide-react';

import PageTransition from '../components/animations/PageTransition';
import AIOrb from '../components/chatbot/AIOrb';

const SUGGESTIONS = [
  { to: '/loans', label: 'Loan types' },
  { to: '/eligibility', label: 'Eligibility factors' },
  { to: '/documents', label: 'Document checklist' },
  { to: '/calculator', label: 'EMI calculator' },
  { to: '/chat', label: 'Ask the assistant' },
];

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="shell grid min-h-[70svh] place-items-center py-20 text-center">
        <div className="flex flex-col items-center">
          <AIOrb size={120} />

          <p className="eyebrow mt-8">
            <Compass size={11} className="text-gold-300" />
            Error 404
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">This page went missing</h1>
          <p className="lede mx-auto mt-4 max-w-md">
            The link may be out of date. Here is where most people were heading.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            {SUGGESTIONS.map((item) => (
              <Link key={item.to} to={item.to} className="btn-ghost btn-sm">
                {item.label}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="btn-gold">
              <Home size={14} />
              Back to home
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="btn-ghost"
            >
              <ArrowLeft size={14} />
              Go back
            </button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
