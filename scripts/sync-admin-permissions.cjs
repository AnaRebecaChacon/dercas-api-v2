require('dotenv').config();

const { Pool } = require('pg');

async function syncAdminPermissions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const pool = new Pool({
    connectionString,
    ssl:
      process.env.NODE_ENV === 'production' || connectionString.includes('neon.tech')
        ? { rejectUnauthorized: false }
        : false,
  });
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO gacor.rol_permiso (rol_id, permiso_id)
       SELECT r.id, p.id
       FROM gacor.roles r
       CROSS JOIN gacor.permisos p
       WHERE r.codigo = 'ADMINISTRADOR'
       ON CONFLICT DO NOTHING
       RETURNING permiso_id`,
    );
    const roles = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM gacor.roles
       WHERE codigo = 'ADMINISTRADOR'`,
    );
    if (roles.rows[0].count !== 1) {
      throw new Error('Debe existir exactamente un rol ADMINISTRADOR');
    }

    await client.query('COMMIT');
    console.log(`Permisos sincronizados con el rol ADMINISTRADOR: ${result.rowCount}`);
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

syncAdminPermissions().catch((error) => {
  console.error(`No se pudieron sincronizar los permisos de administrador: ${error.message}`);
  process.exitCode = 1;
});
