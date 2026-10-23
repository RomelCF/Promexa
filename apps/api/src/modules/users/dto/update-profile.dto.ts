import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl } from 'class-validator';

export class UpdateProfileDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(255)
  email: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false },
    { message: 'La foto debe tener una URL HTTP o HTTPS valida' })
  @MaxLength(500)
  avatar?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false },
    { message: 'La foto de portada debe tener una URL HTTP o HTTPS valida' })
  @MaxLength(500)
  coverImage?: string | null;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() || null : value)
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string | null;
}
