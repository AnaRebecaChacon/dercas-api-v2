import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../../common/database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get('live')
  live() {
    return { status: 'up', timestamp: new Date() };
  }

  @Get('ready')
  async ready() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ready', database: 'connected' };
    } catch (error) {
      throw new ServiceUnavailableException('La base de datos no está disponible');
    }
  }
}
