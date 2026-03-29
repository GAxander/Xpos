import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface UpdateRestaurantConfigDto {
  name?: string;
  slogan?: string;
  address?: string;
  phone?: string;
  ruc?: string;
  logoUrl?: string;
}

@Injectable()
export class RestaurantConfigService {
  constructor(private prisma: PrismaService) {}

  /**
   * Gets the singleton config record. Creates it with defaults if it doesn't exist.
   */
  async getConfig() {
    return this.prisma.restaurantConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', name: 'Mi Restaurante' },
    });
  }

  /**
   * Partially updates the singleton config record.
   */
  async updateConfig(dto: UpdateRestaurantConfigDto) {
    return this.prisma.restaurantConfig.upsert({
      where: { id: 'default' },
      update: dto,
      create: { id: 'default', name: dto.name ?? 'Mi Restaurante', ...dto },
    });
  }
}
