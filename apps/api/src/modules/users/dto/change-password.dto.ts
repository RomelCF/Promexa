import { IsString, MinLength, MaxLength } from 'class-validator';
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'La nueva clave debe tener al menos 8 caracteres' })
  @MaxLength(72)
  newPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  confirmPassword: string;
}
