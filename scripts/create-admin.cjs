require('dotenv').config();

const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

async function createAdmin() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@gacor.com.gt').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL no contiene un correo válido');
  }

  const password = randomBytes(24).toString('base64url');
  const passwordHash = await bcrypt.hash(password, 12);
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

    const existingUser = await client.query(
      'SELECT id FROM gacor.usuarios WHERE correo = $1',
      [email],
    );
    if (existingUser.rowCount > 0) {
      throw new Error(`Ya existe un usuario con el correo ${email}`);
    }

    const adminRole = await client.query(
      `SELECT id FROM gacor.roles
       WHERE codigo = 'ADMINISTRADOR' AND activo = true`,
    );
    if (adminRole.rowCount !== 1) {
      throw new Error('No existe el rol ADMINISTRADOR activo; inicializa primero el esquema de la base');
    }

    const user = await client.query(
      `INSERT INTO gacor.usuarios (nombres, apellidos, correo, password_hash, activo)
       VALUES ('Administrador', 'GACOR', $1, $2, true)
       RETURNING id`,
      [email, passwordHash],
    );
    await client.query(
      `INSERT INTO gacor.usuario_rol (usuario_id, rol_id)
       VALUES ($1, $2)`,
      [user.rows[0].id, adminRole.rows[0].id],
    );
    await client.query('COMMIT');

    console.log('Usuario administrador creado correctamente.');
    console.log(`Correo: ${email}`);
    console.log(`Contraseña temporal (guárdala ahora): ${password}`);
    console.log('Cámbiala después del primer inicio de sesión.');
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

createAdmin().catch((error) => {
  console.error(`No se pudo crear el usuario administrador: ${error.message}`);
  process.exitCode = 1;
});
