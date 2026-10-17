import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const res = await this.db.query(
      `SELECT id, codigo_empleado, nombres, apellidos, correo, puesto, departamento, telefono, activo, created_at
       FROM gacor.usuarios ORDER BY id DESC`
    );
    return res.rows;
  }

  async findOne(id: number) {
    const res = await this.db.query(
      `SELECT id, codigo_empleado, nombres, apellidos, correo, puesto, departamento, telefono, numero_licencia, tipo_licencia, vencimiento_licencia, activo, created_at
       FROM gacor.usuarios WHERE id = $1`,
      [id]
    );
    if (res.rowCount === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return res.rows[0];
  }
}
