/**
 * Full-page chat experience.
 *
 * `ChatWindow` already owns message state, streaming-free pending states,
 * history, conversation switching and feedback, so this page just supplies
 * the immersive layout and a few contextual entry points.
 */
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, Info } from 'lucide-react';

import { ChatWindow } from '../components/chatbot';
import Disclaimer from '../components/common/Disclaimer';
import { scrollState } from '../utils/scrollEngine';

export default function ChatPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  // A shared question from the homepage hero / CTA can be passed as ?q=...
  const initialQuestion = params.get('q');
  // A saved conversation from the dashboard passes ?c=<conversationId>.
  const initialConversationId = params.get('c');

  useEffect(() => {
    // Keep the canvas from fighting the chat panel for scroll.
    scrollState.progress = 0;
  }, []);

  return (
    <div className="shell pb-16 pt-[calc(var(--nav-h)+2rem)]">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">
            <Sparkles size={11} className="text-gold-300" />
            AI Loan Information Assistant
          </span>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">Ask anything about loans</h1>
          <p className="lede mt-3 max-w-2xl">
            Answers come from a curated knowledge base covering loan types, eligibility, documents,
            interest, EMIs and repayment. The assistant never asks for your OTP, PIN, password or
            documents.
          </p>
        </div>
      </header>

      <ChatWindow
        initialQuestion={initialQuestion}
        initialConversationId={initialConversationId}
        onClose={() => navigate('/')}
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <Disclaimer variant="full" />
        <p className="flex items-start gap-2 text-xs leading-relaxed text-mist-500">
          <Info size={13} className="mt-0.5 shrink-0 text-mist-600" />
          This assistant is not a lender and cannot approve, decline or pre-approve any loan
          application.
        </p>
      </div>
    </div>
  );
}
