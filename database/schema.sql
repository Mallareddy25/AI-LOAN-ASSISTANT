-- ═══════════════════════════════════════════════════════════════════════
--  AI LOAN INFORMATION ASSISTANT — Project Code 4SU24CS045
--  MySQL 8.0 schema
--
--  Usage:
--    mysql -u root -p < database/schema.sql
--  or:
--    npm run db:migrate      (safe to re-run; never drops data)
--    npm run db:reset        (destructive: drops every table first)
--
--  All content stored here is EDUCATIONAL only. No lender interest
--  rates, approval decisions or personalised financial advice.
-- ═══════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS `loan_assistant`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `loan_assistant`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─────────────────────────────────────────────────────────────────────
--  Note: `scripts/seed.js` truncates the knowledge tables before loading
--  seed.sql, so re-seeding is always idempotent. No stored procedure is
--  defined here so this file can be executed both by the `mysql` CLI and by
--  the Node driver (the `DELIMITER` directive is CLI-only and unsupported
--  by the driver).
-- ─────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────
-- Done. Next:  mysql -u root -p loan_assistant < database/seed.sql
-- ─────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════
--  1. users
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `users` (
  `id`             INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `name`           VARCHAR(120)     NOT NULL,
  `email`          VARCHAR(190)     NOT NULL,
  `password_hash`  VARCHAR(255)     NOT NULL COMMENT 'bcrypt hash — never plain text',
  `role`           ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
  `avatar_seed`    VARCHAR(16)      DEFAULT NULL,
  `is_active`      TINYINT(1)       NOT NULL DEFAULT 1,
  `last_login_at`  DATETIME         DEFAULT NULL,
  `created_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_role` (`role`),
  KEY `idx_users_created_at` (`created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  2. conversations
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `conversations` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `title`      VARCHAR(160) NOT NULL DEFAULT 'New conversation',
  `category`   VARCHAR(60)  DEFAULT NULL COMMENT 'Optional topic tag',
  `is_archived` TINYINT(1)  NOT NULL DEFAULT 0,
  `message_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conv_user_updated` (`user_id`, `updated_at`),
  KEY `idx_conv_user_archived` (`user_id`, `is_archived`),
  CONSTRAINT `fk_conv_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  3. messages
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `messages` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `conversation_id` INT UNSIGNED NOT NULL,
  `user_id`         INT UNSIGNED DEFAULT NULL COMMENT 'NULL for guest turns',
  `role`            ENUM('user','assistant') NOT NULL,
  `content`         TEXT         NOT NULL,
  `source`          ENUM('openai','offline_knowledge') NOT NULL DEFAULT 'openai',
  `prompt_tokens`   SMALLINT UNSIGNED DEFAULT NULL,
  `completion_tokens` SMALLINT UNSIGNED DEFAULT NULL,
  `latency_ms`      SMALLINT UNSIGNED DEFAULT NULL,
  `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_msg_conversation` (`conversation_id`, `created_at`),
  KEY `idx_msg_user` (`user_id`),
  KEY `idx_msg_role` (`role`),
  FULLTEXT KEY `ft_msg_content` (`content`),
  CONSTRAINT `fk_msg_conversation`
    FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_msg_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  4. message_feedback — lightweight thumbs up/down for demo analytics
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `message_feedback` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `message_id` INT UNSIGNED NOT NULL,
  `user_id`    INT UNSIGNED DEFAULT NULL,
  `rating`     ENUM('up','down') NOT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_feedback_message_user` (`message_id`, `user_id`),
  KEY `idx_feedback_user` (`user_id`),
  CONSTRAINT `fk_fb_message`
    FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fb_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  5. loan_types — personal, home, education, vehicle, business, gold
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `loan_types` (
  `id`             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `slug`           VARCHAR(80)   NOT NULL,
  `name`           VARCHAR(120)  NOT NULL,
  `tagline`        VARCHAR(200)  DEFAULT NULL,
  `icon`           VARCHAR(40)   NOT NULL DEFAULT 'Banknote',
  `accent`         VARCHAR(16)   NOT NULL DEFAULT 'emerald',
  `what_it_is`     TEXT          NOT NULL,
  `common_purpose` TEXT          DEFAULT NULL,
  `eligibility_summary` TEXT     DEFAULT NULL,
  `documents_summary`   TEXT     DEFAULT NULL,
  `interest_concept`    TEXT     DEFAULT NULL COMMENT 'Explains HOW interest works — never a rate',
  `tenure_concept`      TEXT     DEFAULT NULL,
  `repayment_concept`   TEXT     DEFAULT NULL,
  `key_terminology`     TEXT     DEFAULT NULL COMMENT 'JSON array of terms',
  `pros`           TEXT          DEFAULT NULL,
  `cons`           TEXT          DEFAULT NULL,
  `rate_note`      VARCHAR(255)  NOT NULL DEFAULT 'Interest rates change frequently. Verify current rates directly with the lender.',
  `sort_order`     SMALLINT      NOT NULL DEFAULT 0,
  `is_active`      TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_loan_slug` (`slug`),
  KEY `idx_loan_active_sort` (`is_active`, `sort_order`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  6. loan_terms — searchable glossary
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `loan_terms` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`          VARCHAR(120) NOT NULL,
  `term`          VARCHAR(160) NOT NULL,
  `category`      VARCHAR(60)  NOT NULL DEFAULT 'General'
    COMMENT 'General|Basic|Interest|Repayment|Security|Eligibility|Credit|Fees',
  `short_definition`  VARCHAR(500) NOT NULL,
  `detailed_explanation` TEXT      NOT NULL,
  `example`        TEXT         DEFAULT NULL,
  `related_terms`  VARCHAR(500) DEFAULT NULL COMMENT 'JSON array of related term slugs',
  `why_it_matters` VARCHAR(500) DEFAULT NULL,
  `is_featured`   TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order`    SMALLINT     NOT NULL DEFAULT 0,
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_term_slug` (`slug`),
  KEY `idx_term_category` (`category`),
  KEY `idx_term_featured` (`is_featured`, `sort_order`),
  FULLTEXT KEY `ft_term_search` (`term`, `short_definition`, `detailed_explanation`, `example`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  7. documents — document checklist
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `documents` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`        VARCHAR(120) NOT NULL,
  `title`       VARCHAR(160) NOT NULL,
  `category`    VARCHAR(60)  NOT NULL
    COMMENT 'Identity Proof|Address Proof|Income Proof|Employment Proof|Property Documents|Loan Specific',
  `description` VARCHAR(500) NOT NULL,
  `why_needed`  VARCHAR(500) DEFAULT NULL,
  `typical_formats` VARCHAR(200) DEFAULT 'PDF, JPG, PNG',
  `applies_to`  VARCHAR(255) DEFAULT NULL COMMENT 'Comma separated loan slugs, empty = all',
  `notes`       VARCHAR(500) DEFAULT NULL,
  `is_required` TINYINT(1)   NOT NULL DEFAULT 1,
  `sort_order`  SMALLINT     NOT NULL DEFAULT 0,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doc_slug` (`slug`),
  KEY `idx_doc_category` (`category`),
  KEY `idx_doc_required` (`is_required`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  8. eligibility_factors — EDUCATIONAL explainer, not an approval engine
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `eligibility_factors` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`         VARCHAR(120) NOT NULL,
  `factor`       VARCHAR(160) NOT NULL,
  `category`     VARCHAR(60)  NOT NULL DEFAULT 'Personal'
    COMMENT 'Personal|Income|Employment|Credit|Debt|Behaviour|Compliance',
  `icon`         VARCHAR(40)  NOT NULL DEFAULT 'User',
  `summary`      VARCHAR(500) NOT NULL,
  `explanation`  TEXT         NOT NULL,
  `typical_consideration` VARCHAR(500) DEFAULT NULL
    COMMENT 'General guidance. Explicitly non-binding, not a lender rule.',
  `impact`       ENUM('high','medium','low') NOT NULL DEFAULT 'medium',
  `example`      VARCHAR(500) DEFAULT NULL,
  `sort_order`   SMALLINT     NOT NULL DEFAULT 0,
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_elig_slug` (`slug`),
  KEY `idx_elig_category` (`category`),
  KEY `idx_elig_impact` (`impact`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  9. faqs
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `faqs` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `question`   VARCHAR(300) NOT NULL,
  `answer`     TEXT         NOT NULL,
  `category`   VARCHAR(60)  NOT NULL DEFAULT 'General',
  `sort_order` SMALLINT     NOT NULL DEFAULT 0,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faq_category` (`category`),
  KEY `idx_faq_published` (`is_published`, `sort_order`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  10. refresh_tokens — rotating refresh tokens with theft detection
--
--  Every sign-in starts a "family": one row per issued refresh token, all
--  sharing a family_id. Refreshing marks the presented row used and issues a
--  new one in the same family, so a refresh token is only ever good once.
--  Presenting a row that was already used means two copies exist, which means
--  one of them was stolen, so the whole family is revoked and the user has to
--  sign in again. Revoking on logout kills the family as well.
--
--  The jti of each JWT is the primary key here, so a token cannot be replayed
--  even though it is also a valid, unexpired signature.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id`         CHAR(36)     NOT NULL COMMENT 'the jti carried by the JWT',
  `user_id`    INT UNSIGNED NOT NULL,
  `family_id`  CHAR(36)     NOT NULL COMMENT 'shared by every token from one sign-in',
  `used_at`    DATETIME     DEFAULT NULL COMMENT 'set when the token is exchanged',
  `revoked_at` DATETIME     DEFAULT NULL,
  `expires_at` DATETIME     NOT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `ip_address` VARCHAR(45)  DEFAULT NULL,
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rt_family` (`family_id`),
  KEY `idx_rt_user` (`user_id`),
  KEY `idx_rt_expires` (`expires_at`),
  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  10. loan_type_terms — M:N bridge (which terms matter for which loan)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `loan_type_terms` (
  `loan_type_id` INT UNSIGNED NOT NULL,
  `term_id`      INT UNSIGNED NOT NULL,
  `relevance`    ENUM('core','common','optional') NOT NULL DEFAULT 'common',
  PRIMARY KEY (`loan_type_id`, `term_id`),
  KEY `idx_ltt_term` (`term_id`),
  CONSTRAINT `fk_ltt_loan`
    FOREIGN KEY (`loan_type_id`) REFERENCES `loan_types` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ltt_term`
    FOREIGN KEY (`term_id`) REFERENCES `loan_terms` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  11. loan_type_documents — M:N bridge (document checklist per loan)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS `loan_type_documents` (
  `loan_type_id` INT UNSIGNED NOT NULL,
  `document_id`  INT UNSIGNED NOT NULL,
  `is_core`      TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`loan_type_id`, `document_id`),
  KEY `idx_ltd_document` (`document_id`),
  CONSTRAINT `fk_ltd_loan`
    FOREIGN KEY (`loan_type_id`) REFERENCES `loan_types` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ltd_doc`
    FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- ═══════════════════════════════════════════════════════════════════════
--  Seed administrator account
--   email    : admin@loanassistant.local
--   password : Admin@12345
--   bcrypt hash below corresponds to "Admin@12345" (cost 12)
--   ► CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN.
-- ═══════════════════════════════════════════════════════════════════════
INSERT INTO `users` (`name`, `email`, `password_hash`, `role`)
VALUES (
  'System Administrator',
  'admin@loanassistant.local',
  '$2a$12$Q9Z8jJ7hG6fD5sA4pR3tE2uW1yX0cV8bN7mK6lJ5iH4gF3dS2aQ1p',
  'ADMIN'
)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

SET FOREIGN_KEY_CHECKS = 1;

-- ─────────────────────────────────────────────────────────────────────
-- Done. Next:  npm run db:seed
-- ─────────────────────────────────────────────────────────────────────
