'use strict';

/**
 * Loads database/seed.sql (loan types, glossary, documents, eligibility
 * factors, FAQs and their bridge tables) and reports the row counts.
 *
 *   npm run db:seed
 */

const bcrypt = require('bcryptjs');
const { getAdminConnection, readSqlFile, success, info, fail, config } = require('./dbHelpers');

const EXPECTED = {
  loan_types: 6,
  loan_terms: 26,
  documents: 23,
  eligibility_factors: 11,
  faqs: 12,
};

/** Child tables first so foreign keys never block the reset. */
const KNOWLEDGE_TABLES = [
  'loan_type_documents',
  'loan_type_terms',
  'documents',
  'eligibility_factors',
  'loan_terms',
  'loan_types',
  'faqs',
];

async function truncateKnowledgeTables(connection) {
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of KNOWLEDGE_TABLES) {
    await connection.query(`TRUNCATE TABLE \`${table}\``);
  }
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');
}

async function seed() {
  const connection = await getAdminConnection({ withDatabase: false });

  try {
    const sql = readSqlFile('seed.sql');
    const overridden = sql.replace(/USE\s+`?loan_assistant`?\s*;/i, `USE \`${config.database.database}\`;`);

    info(`Seeding "${config.database.database}" — this replaces all knowledge-base content`);
    await connection.query(`USE \`${config.database.database}\``);
    await truncateKnowledgeTables(connection);
    await connection.query(overridden);
    success('Seed data loaded');

    const [counts] = await connection.query(
      `SELECT 'loan_types' AS entity, COUNT(*) AS total FROM loan_types
       UNION ALL SELECT 'loan_terms', COUNT(*) FROM loan_terms
       UNION ALL SELECT 'documents', COUNT(*) FROM documents
       UNION ALL SELECT 'eligibility_factors', COUNT(*) FROM eligibility_factors
       UNION ALL SELECT 'faqs', COUNT(*) FROM faqs
       UNION ALL SELECT 'loan_type_terms', COUNT(*) FROM loan_type_terms
       UNION ALL SELECT 'loan_type_documents', COUNT(*) FROM loan_type_documents`,
    );

    console.log('');
    counts.forEach((row) => {
      const expected = EXPECTED[row.entity];
      const marker = expected && Number(row.total) !== expected ? '  (expected ' + expected + ')' : '';
      console.log(`   ${String(row.entity).padEnd(22)} ${String(row.total).padStart(4)}${marker}`);
    });
    console.log('');

    if (!counts.length) {
      throw new Error('Seed produced no rows — check the seed file for errors.');
    }

    await ensureDemoUser(connection);
  } finally {
    await connection.end();
  }
}

/** Create the demo account the browser suites and README sign in with. */
async function ensureDemoUser(connection) {
  const [rows] = await connection.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [
    config.seed.demoEmail,
  ]);
  if (rows.length) {
    info(`Demo account already present: ${config.seed.demoEmail}`);
    return;
  }
  const hash = await bcrypt.hash(config.seed.demoPassword, config.auth.bcryptRounds);
  await connection.execute(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [config.seed.demoName, config.seed.demoEmail, hash, 'USER'],
  );
  success(`Demo account created: ${config.seed.demoEmail}`);
}

seed()
  .then(() => {
    console.log('Database setup complete. Start the app with: npm run dev\n');
    process.exit(0);
  })
  .catch((error) => {
    fail(`Seeding failed: ${error.message}`);
    if (error.sqlMessage) console.error(error.sqlMessage);
    process.exit(1);
  });
