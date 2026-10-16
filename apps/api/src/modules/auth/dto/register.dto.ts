import { IsEmail, IsNotEmpty, MinLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @IsEmail({}, { message: 'Debe ingresar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsIn(['personal', 'business'], { message: 'El tipo de perfil debe ser personal o business' })
  profileType: 'personal' | 'business';
}
