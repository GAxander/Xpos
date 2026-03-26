import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
// Ajusta esta ruta de importación para que apunte a donde tienes tu PrismaService
import { PrismaService } from '../../../prisma/prisma.service'; 

@Injectable()
export class ProductsService {
  // Inyectamos el servicio de Prisma que ya usas para tus usuarios
  constructor(private readonly prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const { modifierGroups, ...productData } = createProductDto;

    const newProduct = await this.prisma.product.create({
      data: {
        ...productData,
        modifierGroups: modifierGroups && modifierGroups.length > 0 ? {
          create: modifierGroups.map(mg => ({
            name: mg.name,
            minSelect: mg.minSelect,
            maxSelect: mg.maxSelect,
            options: {
              create: mg.options.map(opt => ({
                targetProductId: opt.targetProductId,
                priceOverride: opt.priceOverride
              }))
            }
          }))
        } : undefined
      },
      include: {
        category: true,
        station: true,
        modifierGroups: {
          include: { options: { include: { targetProduct: true } } }
        }
      }
    });

    return {
      ...newProduct,
      category: newProduct.category?.name || 'Sin Categoría',
      categoryId: newProduct.categoryId
    };
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      orderBy: { name: 'asc' },
      include: { 
        category: true, 
        station: true,
        modifierGroups: {
          include: { options: { include: { targetProduct: true } } }
        }
      }
    });

    return products.map(p => ({
      ...p,
      category: p.category?.name || 'Sin Categoría',
      categoryId: p.categoryId
    }));
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({ 
      where: { id },
      include: { 
        category: true, 
        station: true,
        modifierGroups: {
          include: { options: { include: { targetProduct: true } } }
        }
      }
    });
    if (!product) throw new NotFoundException(`Producto con ID ${id} no encontrado`);
    
    return {
      ...product,
      category: product.category?.name || 'Sin Categoría',
      categoryId: product.categoryId
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    await this.findOne(id);
    
    // Si viene la propiedad modifierGroups en el DTO, reescribimos los modificadores
    // Prisma permite borrar los existentes (deleteMany) y recrearlos en una sola operación.
    const { modifierGroups, ...productData } = updateProductDto as any; // Cast avoid TS strict partial checks

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        modifierGroups: modifierGroups !== undefined ? {
          deleteMany: {},
          create: modifierGroups.map((mg: any) => ({
            name: mg.name,
            minSelect: mg.minSelect,
            maxSelect: mg.maxSelect,
            options: {
              create: mg.options.map((opt: any) => ({
                targetProductId: opt.targetProductId,
                priceOverride: opt.priceOverride
              }))
            }
          }))
        } : undefined
      },
      include: { 
        category: true, 
        station: true,
        modifierGroups: {
          include: { options: { include: { targetProduct: true } } }
        }
      }
    });

    return {
      ...updatedProduct,
      category: updatedProduct.category?.name || 'Sin Categoría',
      categoryId: updatedProduct.categoryId
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    return await this.prisma.product.update({
      where: { id },
      data: { isActive: false }
    });
  }
}