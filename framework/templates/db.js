import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${process.env.ENV ?? 'local'}`, override: false });
dotenv.config({ path: '.env', override: false });

/**
 * Creates a Postgres client for a given environment prefix.
 * Env vars follow the pattern {PREFIX}DB_HOST, {PREFIX}DB_PORT, {PREFIX}DB_USERNAME,
 * {PREFIX}DB_PASSWORD, {PREFIX}DB_DATABASE.
 *
 *   createDbClient()      -> DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
 *   createDbClient('QA_') -> QA_DB_HOST, QA_DB_PORT, QA_DB_USERNAME, QA_DB_PASSWORD, QA_DB_DATABASE
 *
 * Add as many environments as the project needs (UAT_, STAGING_, ...) without touching this file —
 * just set the matching env vars and pass the prefix.
 */
export function createDbClient(envPrefix = '') {
  return new pg.Client({
    host: process.env[`${envPrefix}DB_HOST`],
    port: parseInt(process.env[`${envPrefix}DB_PORT`]),
    user: process.env[`${envPrefix}DB_USERNAME`],
    password: process.env[`${envPrefix}DB_PASSWORD`],
    database: process.env[`${envPrefix}DB_DATABASE`],
    ssl: { rejectUnauthorized: false },
  });
}
