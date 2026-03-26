import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PrinterRoute } from '@prisma/client'; 

export class CreateCategoryDto {
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  name: string;

  @IsEnum(PrinterRoute, { message: 'La ruta de impresión debe ser KITCHEN o BAR' })
  printerRoute: PrinterRoute;
}