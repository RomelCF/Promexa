import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, MaxLength, IsNumber, Min, IsOptional, IsUrl, IsIn } from 'class-validator';
export class CreateProductDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsString() @MaxLength(10000) description: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) price: number;
  @IsString() @IsNotEmpty() @MaxLength(100) category: string;
  @IsString() @IsNotEmpty() @MaxLength(100) district: string;
  @IsOptional() @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false }) @MaxLength(500) image?: string;
  @IsOptional() @IsString() @MaxLength(20) contactPhone?: string;
}
export class ProductStatusDto {
  @IsIn(['Disponible', 'Reservado']) status: 'Disponible' | 'Reservado';
}
