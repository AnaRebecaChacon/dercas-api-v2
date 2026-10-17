import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

const PAGE_SIZE = 50;
const MAX_OFFSET = 100_000;
const SENSITIVE_COLUMN = /(password|token|secret|hash|credential|private.?key)/i;

export interface DatabaseRelation {
  schema: string;
  name: string;
  type: 'table' | 'partitioned table' | 'view' | 'materialized view';
  estimated_rows: number;
  columns: string[];
}

const ACTIVE_MODULES = [
  {
    name: 'Health',
    endpoints: [
      { method: 'GET', path: '/api/v1/health/live', purpose: 'Comprueba que el proceso responde.' },
      { method: 'GET', path: '/api/v1/health/ready', purpose: 'Comprueba la conexión con PostgreSQL.' },
    ],
  },
  {
    name: 'Authentication',
    endpoints: [
      { method: 'POST', path: '/api/v1/auth/login', purpose: 'Inicia sesión y devuelve un JWT.' },
    ],
  },
  {
    name: 'Users',
    endpoints: [
      { method: 'GET', path: '/api/v1/users', purpose: 'Lista usuarios.' },
      { method: 'GET', path: '/api/v1/users/:id', purpose: 'Consulta un usuario por ID.' },
    ],
  },
];

@Injectable()
export class AdminService {
  constructor(private readonly db: DatabaseService) {}

  async getCatalog() {
    const result = await this.db.query<{
      schema: string;
      name: string;
      relation_type: DatabaseRelation['type'];
      estimated_rows: string;
      columns: string[];
    }>(
      `SELECT n.nspname AS schema,
              c.relname AS name,
              CASE c.relkind
                WHEN 'r' THEN 'table'
                WHEN 'p' THEN 'partitioned table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized view'
              END AS relation_type,
              GREATEST(c.reltuples, 0)::bigint::text AS estimated_rows,
              COALESCE(
                array_agg(a.attname::text ORDER BY a.attnum)
                  FILTER (WHERE a.attnum IS NOT NULL AND NOT a.attisdropped),
                ARRAY[]::text[]
              ) AS columns
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
       WHERE n.nspname = 'gacor'
         AND c.relkind IN ('r', 'p', 'v', 'm')
       GROUP BY n.nspname, c.relname, c.relkind, c.reltuples
       ORDER BY c.relkind, c.relname`,
    );

    return {
      modules: ACTIVE_MODULES,
      relations: result.rows.map((row) => ({
        schema: row.schema,
        name: row.name,
        type: row.relation_type,
        estimated_rows: Number(row.estimated_rows),
        columns: row.columns,
      })),
      note: 'Los endpoints son los conectados actualmente en el código. Las filas son estimaciones de PostgreSQL; se excluyen columnas con credenciales, tokens y hashes.',
    };
  }

  async getRows(relationName: string, requestedOffset: number) {
    const offset = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0
      ? Math.min(requestedOffset, MAX_OFFSET)
      : 0;
    const catalog = await this.db.query<{
      name: string;
      relation_type: DatabaseRelation['type'];
      columns: string[];
    }>(
      `SELECT c.relname AS name,
              CASE c.relkind
                WHEN 'r' THEN 'table'
                WHEN 'p' THEN 'partitioned table'
                WHEN 'v' THEN 'view'
                WHEN 'm' THEN 'materialized view'
              END AS relation_type,
              COALESCE(
                array_agg(a.attname::text ORDER BY a.attnum)
                  FILTER (WHERE a.attnum IS NOT NULL AND NOT a.attisdropped),
                ARRAY[]::text[]
              ) AS columns
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0
       WHERE n.nspname = 'gacor'
         AND c.relname = $1
         AND c.relkind IN ('r', 'p', 'v', 'm')
       GROUP BY c.relname, c.relkind`,
      [relationName],
    );

    if (catalog.rowCount !== 1) {
      throw new NotFoundException('No se encontró la tabla o vista solicitada');
    }

    const relation = catalog.rows[0];
    const safeColumns = relation.columns.filter((column) => !SENSITIVE_COLUMN.test(column));
    if (safeColumns.length === 0) {
      return { name: relation.name, type: relation.relation_type, rows: [], offset, limit: PAGE_SIZE };
    }

    const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const selectedColumns = safeColumns.map(identifier).join(', ');
    const result = await this.db.query(
      `SELECT ${selectedColumns}
       FROM gacor.${identifier(relation.name)}
       LIMIT $1 OFFSET $2`,
      [PAGE_SIZE, offset],
    );

    return {
      name: relation.name,
      type: relation.relation_type,
      columns: safeColumns,
      rows: result.rows,
      offset,
      limit: PAGE_SIZE,
      has_more: result.rowCount === PAGE_SIZE,
    };
  }
}
