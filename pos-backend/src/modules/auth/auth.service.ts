import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(data: RegisterDto) {
    // 1. Verificamos que el correo no exista
    const userExists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) throw new BadRequestException('El correo ya está registrado');

    // 2. Encriptamos la contraseña (10 rondas de "salting" es el estándar)
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 3. Guardamos el usuario
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      }
    });

    // 4. Retornamos el usuario pero SIN la contraseña por seguridad
    const { password, ...result } = user;
    return result;
  }

  async login(data: LoginDto) {
    // 1. Buscamos al usuario
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    // 2. Comparamos la contraseña en texto plano con el hash de la base de datos
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Credenciales inválidas');

    // 3. Si todo está bien, generamos el JWT (El pase VIP)
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, name: user.name, role: user.role }
    };
  }
}