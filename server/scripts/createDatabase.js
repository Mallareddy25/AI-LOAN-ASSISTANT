'use strict';

/**
 * Creates the application database (and the test database) if they do not
 * exist. Safe to run repeatedly.
 *
 *   npm run db:create
 */

const { getAdminConnection, success, info, fail, config } = require('./dbHelpers');

async function createDatabases() {
  const connection = await getAdminConnection({ withDatabase: false });

  try {
    info(`Connecting to MySQL at ${config.database.host}:${config.database.port} as ${config.database.user}`);

    const databases = [config.database.database, process.env.DATABASE_TEST_NAME || `${config.database.database}_test`];

    for (const name of databases) {
      if (!/^[A-Za-z0-9_]+$/.test(name)) {
        throw new Error(`Unsafe database name: ${name}`);
      }
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      success(`Database "${name}" is ready`);
    }
  } finally {
    await connection.end();
  }
}

createDatabases()
  .then(() => {
    console.log('\nNext: npm run db:migrate');
    process.exit(0);
  })
  .catch((error) => {
    fail(`Could not create the database: ${error.message}`);
    console.error('\nCheck your MySQL credentials in server/.env (DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD).');
    process.exit(1);
  });
