'use strict';

/**
 * Canonical disclaimer copy. Defined once so the API, the AI system prompt and
 * the frontend banner can never drift apart.
 */

const DISCLAIMER_TEXT =
  'This assistant provides educational information about loans and does not provide loan approval, financial advice, or guarantees. Actual loan terms and eligibility depend on the respective lender and current policies.';

const SHORT_DISCLAIMER =
  'Educational information only — this is not a loan approval decision or personalised financial advice. Actual eligibility and terms depend on the lender\'s current policies and your verified information.';

const RATE_NOTE =
  'Interest rates, fees and eligibility rules differ between lenders and change over time. Always confirm current terms directly with the lender.';

const DOCS_NOTE =
  'Required documents vary by lender, applicant profile, and loan type.';

const ESTIMATOR_NOTE =
  'Educational Estimate — Not a Loan Approval Decision.';

const CREDENTIAL_WARNING =
  'Never share an OTP, password, PIN, CVV, or banking credential with anyone, including an AI assistant. No legitimate lender or assistant needs them.';

/** Structured disclaimer payload attached to AI and calculator responses. */
const DISCLAIMER_OBJECT = {
  full: DISCLAIMER_TEXT,
  short: SHORT_DISCLAIMER,
  rates: RATE_NOTE,
  documents: DOCS_NOTE,
  credentials: CREDENTIAL_WARNING,
  notAnApproval: true,
};

module.exports = {
  DISCLAIMER_TEXT,
  SHORT_DISCLAIMER,
  RATE_NOTE,
  DOCS_NOTE,
  ESTIMATOR_NOTE,
  CREDENTIAL_WARNING,
  DISCLAIMER_OBJECT,
};
