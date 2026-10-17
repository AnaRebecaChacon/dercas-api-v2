import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('catalog')
  getCatalog() {
    return this.adminService.getCatalog();
  }

  @Get('data/:relation')
  getRows(
    @Param('relation') relation: string,
    @Query('offset', new ParseIntPipe({ optional: true })) offset = 0,
  ) {
    return this.adminService.getRows(relation, offset);
  }
}
