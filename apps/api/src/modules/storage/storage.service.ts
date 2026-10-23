import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException, StreamableFile } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
const sharp: typeof import('sharp').default = require('sharp');
import { randomUUID } from 'crypto';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { resolve, join } from 'path';

@Injectable()
export class StorageService {
  private readonly directory = resolve(process.cwd(), 'uploads');
  constructor(private readonly config: ConfigService) {}
  private get s3() {
    return new S3Client({
      region: this.config.get('AWS_REGION') || 'us-east-1',
      endpoint: this.config.get<string>('AWS_S3_ENDPOINT')?.trim().split(' ')[0] || undefined,
      forcePathStyle: Boolean(this.config.get<string>('AWS_S3_ENDPOINT')?.trim()),
    });
  }
  private validateKey(purpose: string, userId: string, file: string) {
    if (!['avatar', 'post', 'cover'].includes(purpose) || !/^[a-zA-Z0-9_-]{1,100}$/.test(userId)
      || !/^[a-f0-9-]{36}\.webp$/.test(file)) throw new NotFoundException();
    return `${purpose}/${userId}/${file}`;
  }
  async upload(purpose: string, userId: string, file?: { buffer: Buffer; size: number }) {
    if (!['avatar', 'post', 'cover'].includes(purpose)) throw new BadRequestException('Destino de imagen invalido');
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona una imagen');
    const max = (purpose === 'avatar' ? 5 : 10) * 1024 * 1024;
    if (file.size > max) throw new BadRequestException(`La imagen supera ${purpose === 'avatar' ? 5 : 10} MB`);
    let buffer: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 40000000, animated: false });
      const metadata = await image.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('Unsupported image');
      buffer = await image.rotate().resize({ width: purpose === 'avatar' ? 512 : 1920,
        height: purpose === 'avatar' ? 512 : (purpose === 'cover' ? 1080 : 1920), fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    } catch {
      throw new BadRequestException('Imagen invalida. Usa JPG, JFIF, PNG o WebP sin animacion');
    }
    const key = this.validateKey(purpose, userId, `${randomUUID()}.webp`);
    try {
      if (this.config.get('STORAGE_DRIVER') === 's3') {
        const client = this.s3;
        try { await client.send(new PutObjectCommand({ Bucket: this.config.getOrThrow('AWS_S3_BUCKET_NAME'), Key: key, Body: buffer, ContentType: 'image/webp' })); }
        finally { client.destroy(); }
      } else {
        const target = join(this.directory, key);
        await mkdir(resolve(target, '..'), { recursive: true });
        await writeFile(target, buffer, { flag: 'wx' });
      }
    } catch { throw new ServiceUnavailableException('No se pudo guardar la imagen'); }
    const base = (this.config.get<string>('PUBLIC_API_URL') || `http://localhost:${this.config.get('API_PORT') || 3001}/api/v1`).replace(/\/$/, '');
    return { key, url: `${base}/storage/images/${key}` };
  }
  async read(purpose: string, userId: string, file: string) {
    const key = this.validateKey(purpose, userId, file);
    try {
      let buffer: Buffer;
      if (this.config.get('STORAGE_DRIVER') === 's3') {
        const client = this.s3;
        try {
          const object = await client.send(new GetObjectCommand({ Bucket: this.config.getOrThrow('AWS_S3_BUCKET_NAME'), Key: key }));
          buffer = Buffer.from(await object.Body.transformToByteArray());
        } finally { client.destroy(); }
      } else buffer = await readFile(join(this.directory, key));
      return new StreamableFile(buffer, { type: 'image/webp', length: buffer.length });
    } catch { throw new NotFoundException('Imagen no disponible'); }
  }
}
