import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import type { CreateUserDto, UpdateUserDto } from './users.service';

function isAdmin(req: any) {
  return req.user?.role === 'ADMIN';
}

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    if (!isAdmin(req)) return { error: 'Acceso denegado' };
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  deactivate(@Req() req: any, @Param('id') id: string) {
    if (!isAdmin(req)) return { error: 'Acceso denegado' };
    return this.usersService.deactivate(id);
  }
}
