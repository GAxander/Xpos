import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async processPayment(data: CreatePaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { payments: true },
    });

    if (!order) throw new BadRequestException('La orden no existe');
    if (order.status === 'CLOSED') throw new BadRequestException('Esta cuenta ya está cerrada');

    const newPayment = await this.prisma.payment.create({
      data: {
        orderId: data.orderId,
        amount: data.amount,
        tipAmount: data.tipAmount ?? 0,
        paymentMethod: data.paymentMethod,
      },
    });

    const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0) + data.amount;

    if (totalPaid >= Number(order.totalAmount)) {
      // 1. Cerramos la orden y liberamos la mesa
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CLOSED' },
      });

      if (order.tableId) {
        await this.prisma.table.update({
          where: { id: order.tableId },
          data: { status: 'FREE' },
        });
      }

      // ==========================================
      // 2. EL MOTOR DE INVENTARIO (AHORA SÍ, PERFECTO)
      // ==========================================
      
      // Obtenemos los detalles usando "items" (el nombre real en tu base de datos)
      const orderDetails = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: {
          items: { // <-- ¡Corregido aquí!
            include: {
              product: {
                include: {
                  recipeItems: true,
                }
              }
            }
          }
        },
      });

      if (orderDetails && orderDetails.items) {
        for (const item of orderDetails.items) { // <-- ¡Y corregido aquí!
          if (item.product && item.product.recipeItems) {
            for (const recipeItem of item.product.recipeItems) {
              const totalDeducted = item.quantity * Number(recipeItem.quantityRequired);
              
              await this.prisma.inventoryItem.update({
                where: { id: recipeItem.inventoryItemId },
                data: {
                  stockQuantity: { decrement: totalDeducted }
                }
              });
            }
          }
        }
      }
    }

    return newPayment;
  }

  async getDailyClosure(dateString?: string) {
    const targetDate = dateString ? new Date(dateString) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Agrupar pagos
    const paymentsGrouped = await this.prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: { createdAt: { gte: startOfDay, lte: endOfDay } },
      _sum: { amount: true, tipAmount: true },
    });

    const closedOrdersCount = await this.prisma.order.count({
      where: { status: 'CLOSED', updatedAt: { gte: startOfDay, lte: endOfDay } },
    });

    let totalIncome = 0;
    let totalTips = 0;
    const breakdown = { CASH: 0, CARD: 0, TRANSFER: 0 };

    paymentsGrouped.forEach((group) => {
      const amount = Number(group._sum.amount || 0);
      const tips = Number(group._sum.tipAmount || 0);
      breakdown[group.paymentMethod as keyof typeof breakdown] = amount;
      totalIncome += amount;
      totalTips += tips; // Aquí ya sumamos el total de propinas del día
    });

    // ==========================================
    // NUEVO: OBTENER DETALLE DE PROPINAS
    // ==========================================
    // Buscamos los pagos específicos de hoy que tengan propina > 0
    const paymentsWithTips = await this.prisma.payment.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        tipAmount: { gt: 0 }, 
      },
      include: {
        order: {
          include: {
            table: true, // Hacemos el JOIN con la mesa para sacar el número
          },
        },
      },
      orderBy: {
        createdAt: 'desc' // Las propinas más recientes primero
      }
    });

    // Mapeamos los datos al formato exacto que espera tu Modal del Frontend
    const tipsDetail = paymentsWithTips.map(payment => ({
      id: payment.id,
      // Si la orden tiene mesa, mostramos el número. Si fue para llevar (null), lo indicamos.
      table: payment.order?.table ? `Mesa ${payment.order.table.number}` : 'Mostrador / Para llevar',
      amount: Number(payment.tipAmount),
      method: payment.paymentMethod,
    }));


    // ==========================================
    // GESTIÓN DEL FONDO DE CAJA Y GASTOS 
    // ==========================================
    // (Asegúrate de haber agregado CashShift y CashExpense a tu schema.prisma)
    const activeShift = await this.prisma.cashShift.findFirst({
      where: { 
        status: 'OPEN',
        openedAt: { gte: startOfDay, lte: endOfDay }
      },
      include: { expenses: true }
    });

    const openingCash = activeShift ? Number(activeShift.openingAmount) : 0;
    
    const totalExpenses = activeShift?.expenses.reduce(
      (sum, exp) => sum + Number(exp.amount), 0
    ) || 0;

    const expectedCashInDrawer = openingCash + breakdown.CASH - totalExpenses;

    // ==========================================
    // NUEVO: OBTENER DETALLE DE ÓRDENES CERRADAS
    // ==========================================
    // ==========================================
    // OBTENER DETALLE DE ÓRDENES CERRADAS (Ahora incluye ítems)
    // ==========================================
    const closedOrders = await this.prisma.order.findMany({
      where: {
        status: 'CLOSED',
        updatedAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        table: true,
        payments: true,
        items: {
          include: { product: true } // <-- NUEVO: Incluimos los productos de la orden
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const ordersDetail = closedOrders.map(order => {
      const methods = order.payments.map(p => p.paymentMethod);
      const totalTip = order.payments.reduce((sum, p) => sum + Number(p.tipAmount || 0), 0);

      return {
        id: order.id,
        table: order.table ? `Mesa ${order.table.number}` : 'Mostrador / Llevar',
        amount: Number(order.totalAmount),
        tip: totalTip,
        methods: [...new Set(methods)],
        payments: order.payments.map(p => ({
          id: p.id,
          method: p.paymentMethod,
          amount: Number(p.amount)
        })),
        // NUEVO: Mapeamos los platos para que el frontend los pueda contar
        items: order.items.map(i => ({
          productId: i.product?.id || 'desconocido',
          name: i.product?.name || 'Producto eliminado',
          quantity: Number(i.quantity)
        }))
      };
    });
    const ordersWithItems = await this.prisma.order.findMany({
      where: {
        status: 'CLOSED',
        updatedAt: { gte: startOfDay, lte: endOfDay }
      },
      include: {
        items: {
          include: {
            product: true // Traemos la info del producto para saber el nombre
          }
        }
      }
    });

    // Agrupamos y sumamos las cantidades por ID de producto
    const productSales: Record<string, { id: string; name: string; quantity: number }> = {};

    ordersWithItems.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          const productId = item.product.id;
          if (!productSales[productId]) {
            productSales[productId] = {
              id: productId,
              name: item.product.name,
              quantity: 0
            };
          }
          productSales[productId].quantity += Number(item.quantity);
        }
      });
    });

    // Convertimos el objeto en un Array y lo ordenamos (los más vendidos primero)
    const soldProducts = Object.values(productSales).sort((a, b) => b.quantity - a.quantity);

    // ==========================================
    // GESTIÓN DEL FONDO DE CAJA Y GASTOS
    // ==========================================
    // ... (el resto de tu código de activeShift, expenses, etc.)

    // En el return final, asegúrate de devolver soldProducts:
    return {
      date: startOfDay.toISOString().split('T')[0],
      shiftId: activeShift?.id || null,
      openingCash,
      totalExpenses,
      totalIncome,
      totalTips,       
      tipsDetail,      
      ordersDetail,      
      soldProducts,    // <-- AÑADE ESTA LÍNEA AQUÍ
      breakdown,
      closedOrdersCount,
      expectedCashInDrawer,
    };
  }

  // ==========================================
  // ACTUALIZAR UN PAGO EXISTENTE
  // ==========================================
  async updatePayment(id: string, data: { amount: number; tipAmount: number; paymentMethod: any }) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        amount: data.amount,
        tipAmount: data.tipAmount,
        paymentMethod: data.paymentMethod
      }
    });
  }

  // ==========================================
  // ELIMINAR UN PAGO
  // ==========================================
  async deletePayment(id: string) {
    return this.prisma.payment.delete({
      where: { id }
    });
  }
}