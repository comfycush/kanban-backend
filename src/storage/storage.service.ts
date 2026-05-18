import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.getOrThrow<string>('S3_BUCKET');
    const region = this.config.get<string>('S3_REGION', 'us-east-1');
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const keyId = this.config.getOrThrow<string>('S3_ACCESS_KEY');
    const secret = this.config.getOrThrow<string>('S3_SECRET_KEY');
    this.publicBaseUrl = this.config.getOrThrow<string>('S3_PUBLIC_BASE_URL');
    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: !!endpoint,
      credentials: { accessKeyId: keyId, secretAccessKey: secret },
    });
  }

  /**
   * Uploads a file and returns a public URL (configure S3 bucket policy for access).
   */
  async uploadObject(
    buffer: Buffer,
    contentType: string,
    orgId: string,
    prefix: string,
    originalName: string,
  ): Promise<string> {
    const key = `orgs/${orgId}/${prefix}/${Date.now()}-${randomUUID()}-${this.safeName(originalName)}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
        }),
      );
    } catch (e) {
      this.log.error('S3 upload failed', e);
      throw new InternalServerErrorException('File upload failed');
    }
    return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
  }

  /**
   * Best-effort delete for an object referenced by {@link uploadObject}'s return URL.
   */
  async deleteObjectByPublicUrl(publicUrl: string): Promise<void> {
    const key = this.keyFromPublicUrl(publicUrl);
    if (!key) {
      this.log.warn(`Cannot derive S3 key from URL: ${publicUrl}`);
      return;
    }
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (e) {
      this.log.error('S3 delete failed', e);
    }
  }

  private keyFromPublicUrl(publicUrl: string): string | null {
    const base = this.publicBaseUrl.replace(/\/$/, '');
    const u = publicUrl.trim();
    if (!u.startsWith(`${base}/`)) return null;
    return u.slice(base.length + 1);
  }

  private safeName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
  }
}
