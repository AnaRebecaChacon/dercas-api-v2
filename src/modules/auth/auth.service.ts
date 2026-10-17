import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../common/database/database.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const res = await this.db.query(
      `SELECT u.id, u.correo, u.password_hash, u.nombres, u.apellidos, u.activo
       FROM gacor.usuarios u WHERE u.correo = $1`,
      [dto.correo]
    );

    if (res.rowCount === 0) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const user = res.rows[0];
    if (!user.activo) {
      throw new UnauthorizedException('El usuario está inactivo');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Consultar permisos del usuario
    const permissionsRes = await this.db.query(
      `SELECT DISTINCT p.codigo 
       FROM gacor.permisos p
       JOIN gacor.rol_permiso rp ON rp.permiso_id = p.id
       JOIN gacor.usuario_rol ur ON ur.rol_id = rp.rol_id
       WHERE ur.usuario_id = $1 AND p.activo = true`,
      [user.id]
    );

    const permissions = permissionsRes.rows.map((r) => r.codigo);

    const payload = {
      sub: user.id,
      email: user.correo,
      client: dto.client,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        correo: user.correo,
        nombres: user.nombres,
        apellidos: user.apellidos,
        permissions,
      },
    };
  }
}
