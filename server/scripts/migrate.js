'use strict';

/**
 * Applies database/schema.sql to the configured database, then makes sure the
 * seed administrator's bcrypt hash matches the password in .env.
 *
 *   npm run db:migrate
 *
 * schema.sql uses CREATE TABLE IF NOT EXISTS and never drops anything, so this
 * command is safe to re-run and safe to run against a populated database.
 * `npm run db:reset` is the destructive alternative.
 */

const bcrypt = require('bcryptjs');
const { getAdminConnection, readSqlFile, success, info, fail, config } = require('./dbHelpers');

async function migrate() {
  const sql = readSqlFile('schema.sql');

  const connection = await getAdminConnection({ withDatabase: false });
  try {
    info(`Applying database/schema.sql to "${config.database.database}"`);
    // schema.sql contains USE `loan_assistant`; override it with the configured
    // name so a non-default database name still works.
    const overridden = sql.replace(
      /USE\s+`?loan_assistant`?\s*;/i,
      `USE \`${config.database.database}\`;`,
    );
    await connection.query(overridden);
    success('Schema applied (tables created)');

    await connection.query(`USE \`${config.database.database}\``);

    // Keep the admin password in sync with the .env value.
    const [rows] = await connection.execute(
      'SELECT id, password_hash FROM users WHERE email = ? LIMIT 1',
      [config.seed.adminEmail],
    );

    if (!rows.length) {
      info('No admin account found — creating one from the seed settings');
      const hash = await bcrypt.hash(config.seed.adminPassword, config.auth.bcryptRounds);
      await connection.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [config.seed.adminName, config.seed.adminEmail, hash, 'ADMIN'],
      );
      success(`Admin account created: ${config.seed.adminEmail}`);
    } else {
      const hash = await bcrypt.hash(config.seed.adminPassword, config.auth.bcryptRounds);
      await connection.execute('UPDATE users SET password_hash = ? WHERE email = ?', [
        hash,
        config.seed.adminEmail,
      ]);
      success(`Admin password synced with SEED_ADMIN_PASSWORD in .env (${config.seed.adminEmail})`);
    }

    // Housekeeping: refresh_tokens only ever grows, so drop rows that can no
    // longer be used. Safe to do here because every live row has a future
    // expires_at.
    const [purge] = await connection.query(
      'DELETE FROM refresh_tokens WHERE expires_at < UTC_TIMESTAMP()',
    );
    const purged = purge.affectedRows || 0;
    if (purged) success(`Purged ${purged} expired refresh token(s)`);
  } finally {
    await connection.end();
  }
}

// Exported so that db:reset can apply reset.sql first and then reuse this exact
// logic instead of duplicating it.
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('\nNext: npm run db:seed');
      process.exit(0);
    })
    .catch((error) => {
      fail(`Migration failed: ${error.message}`);
      if (error.sqlMessage) console.error(error.sqlMessage);
      process.exit(1);
    });
}

module.exports = { migrate };
