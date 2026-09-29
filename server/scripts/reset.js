'use strict';

/**
 * DESTRUCTIVE: drops every table, re-applies the schema, then reseeds.
 *
 *   npm run db:reset
 *
 * For a normal schema change use `npm run db:migrate`, which never drops data.
 */

const { getAdminConnection, readSqlFile, success, info, fail, config } = require('./dbHelpers');
const { migrate } = require('./migrate');

async function reset() {
  const sql = readSqlFile('reset.sql');

  const connection = await getAdminConnection({ withDatabase: false });
  try {
    info(`Dropping every table in "${config.database.database}" — all data will be lost`);
    const overridden = sql.replace(
      /USE\s+`?loan_assistant`?\s*;/i,
      `USE \`${config.database.database}\`;`,
    );
    await connection.query(overridden);
    success('All tables dropped');
  } finally {
    await connection.end();
  }

  await migrate();
}

reset()
  .then(() => {
    console.log('\nNext: npm run db:seed');
    process.exit(0);
  })
  .catch((error) => {
    fail(`Reset failed: ${error.message}`);
    if (error.sqlMessage) console.error(error.sqlMessage);
    process.exit(1);
  });
