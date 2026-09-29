'use strict';

/**
 * Small MySQL helpers shared by the CLI scripts (create / migrate / seed).
 * These run outside the connection pool because the pool targets a database
 * that may not exist yet.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { config } = require('../src/config/env');

async function getAdminConnection({ withDatabase = true } = {}) {
  return mysql.createConnection({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    multipleStatements: true,
    ...(config.database.ssl ? { ssl: config.database.ssl } : {}),
    ...(withDatabase ? { database: config.database.database } : {}),
  });
}

/** Read a .sql file from the repository's database/ directory. */
function readSqlFile(filename) {
  const filePath = path.join(config.paths.database, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function success(message) {
  console.log(`\u001b[32m✓\u001b[0m ${message}`);
}

function info(message) {
  console.log(`\u001b[36m→\u001b[0m ${message}`);
}

function fail(message) {
  console.error(`\u001b[31m✗\u001b[0m ${message}`);
}

module.exports = { getAdminConnection, readSqlFile, success, info, fail, config };
