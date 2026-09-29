/** Site footer with the mandatory disclaimer and navigation summary. */
import { Link } from 'react-router-dom';
import { Github, GraduationCap } from 'lucide-react';
import Disclaimer from '../common/Disclaimer';

const GROUPS = [
  {
    title: 'Learn',
    links: [
      { to: '/loans', label: 'Loan types' },
      { to: '/glossary', label: 'Terminology' },
      { to: '/eligibility', label: 'Eligibility' },
      { to: '/documents', label: 'Documents' },
    ],
  },
  {
    title: 'Plan',
    links: [
      { to: '/calculator', label: 'EMI calculator' },
      { to: '/repayment', label: 'Repayment' },
      { to: '/faqs', label: 'FAQs' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/chat', label: 'AI assistant' },
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/login', label: 'Sign in' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-tint/[0.07] bg-ink-950/60">
      <div className="shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <span className="coin grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-ink-950">
                ₹
              </span>
              <span className="text-sm font-bold tracking-tight text-mist-50">
                Loan<span className="text-gold-300">Assistant</span>
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist-400">
              An educational AI assistant that explains how loans work — terminology, eligibility,
              documents and repayment — so you can understand the numbers before you speak to a
              lender.
            </p>

            <p className="mt-5 inline-flex items-center gap-2 rounded-lg border border-tint/[0.08] bg-tint/[0.02] px-2.5 py-1.5 text-2xs text-mist-400">
              <GraduationCap size={12} className="text-gold-300" />
              Project 4SU24CS045
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-2xs font-semibold uppercase tracking-wide3 text-mist-500">
                  {group.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-[0.8125rem] text-mist-300 transition-colors hover:text-gold-200"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-tint/[0.06] pt-8">
          <Disclaimer variant="full" className="border-0 bg-transparent p-0 shadow-none backdrop-filter-none" />
          <div className="mt-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="text-xs text-mist-600">
              Built as an educational project. Not affiliated with any bank or lender.
            </p>
            <a
              href="https://threejs.org"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-xs text-mist-600 transition-colors hover:text-mist-400"
            >
              <Github size={12} />
              3D by three.js
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
