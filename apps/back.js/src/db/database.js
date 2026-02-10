import pg from 'pg';

const { Pool, types } = pg;

const DEFAULT_CONNECTION = 'postgresql://postgres:postgres@postgres:5432/postgres';
const connectionString =
  process.env.EXPRESS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  DEFAULT_CONNECTION;

const sslEnforcedValues = new Set(['1', 'true', 'TRUE', 'require', 'VERIFY-FULL', 'verify-full']);
const sslValue = process.env.EXPRESS_DB_SSL || process.env.DB_SSL || process.env.PGSSLMODE;
const useSSL = sslValue ? sslEnforcedValues.has(sslValue) : false;

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.EXPRESS_DB_POOL_SIZE || process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: Number(process.env.EXPRESS_DB_IDLE_TIMEOUT || 30000)
});

pool.on('error', (err) => {
  console.error('Unexpected error on PostgreSQL client', err);
});

let poolClosed = false;

// Force timestamps to be returned as strings to keep formatting deterministic.
types.setTypeParser(1114, (value) => value); // TIMESTAMP WITHOUT TIME ZONE
types.setTypeParser(1184, (value) => value); // TIMESTAMP WITH TIME ZONE

types.setTypeParser(1082, (value) => value); // DATE

function prepareQuery(sql, params) {
  if (!params || params.length === 0) {
    return { text: sql, values: [] };
  }

  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });

  if (index !== params.length) {
    throw new Error(
      `Incorrect number of query parameters. Expected ${index}, received ${params.length}`
    );
  }

  return { text, values: params };
}

export async function query(sql, params = []) {
  const { text, values } = prepareQuery(sql, params);
  const result = await pool.query(text, values);
  return result.rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function verifyConnection() {
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
  } finally {
    client.release();
  }
}

export async function closeAll() {
  if (poolClosed) {
    return;
  }

  poolClosed = true;
  await pool.end();
  console.log('Database pool closed');
}

export default pool;
