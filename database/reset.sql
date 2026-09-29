-- ═══════════════════════════════════════════════════════════════════════
--  AI LOAN INFORMATION ASSISTANT — DESTRUCTIVE RESET
--
--  Deletes every table and therefore all data. Use only for a clean slate:
--    npm run db:reset        (drops tables, then re-applies schema.sql)
--
--  `npm run db:migrate` is the non-destructive command and is safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `message_feedback`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `conversations`;
DROP TABLE IF EXISTS `loan_type_documents`;
DROP TABLE IF EXISTS `loan_type_terms`;
DROP TABLE IF EXISTS `eligibility_factors`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `loan_terms`;
DROP TABLE IF EXISTS `faqs`;
DROP TABLE IF EXISTS `loan_types`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;
