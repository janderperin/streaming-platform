import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import { CustomError } from '../middleware/errorHandler';

interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  expiresIn?: number;
}

interface DownloadOptions {
  expiresIn?: number;
}

class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || 'streaming-platform';
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || 'https://your-account-id.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
      }
    });
  }

  // Gerar URL assinada para upload
  async generateUploadUrl(
    key: string, 
    options: UploadOptions = {}
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600 // 1 hora por padrão
      });

      logger.info(`Generated upload URL for key: ${key}`);
      return signedUrl;
    } catch (error) {
      logger.error(`Failed to generate upload URL for ${key}:`, error);
      throw new CustomError('Failed to generate upload URL', 500);
    }
  }

  // Gerar URL assinada para download
  async generateDownloadUrl(
    key: string, 
    options: DownloadOptions = {}
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600 // 1 hora por padrão
      });

      logger.info(`Generated download URL for key: ${key}`);
      return signedUrl;
    } catch (error) {
      logger.error(`Failed to generate download URL for ${key}:`, error);
      throw new CustomError('Failed to generate download URL', 500);
    }
  }

  // Upload direto de arquivo
  async uploadFile(
    key: string, 
    fileBuffer: Buffer, 
    options: UploadOptions = {}
  ): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: options.contentType || 'application/octet-stream',
        Metadata: options.metadata
      });

      await this.s3Client.send(command);
      logger.info(`File uploaded successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to upload file ${key}:`, error);
      throw new CustomError('Failed to upload file', 500);
    }
  }

  // Deletar arquivo
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      logger.info(`File deleted successfully: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete file ${key}:`, error);
      throw new CustomError('Failed to delete file', 500);
    }
  }

  // Gerar chave única para arquivo
  generateFileKey(userId: string, fileName: string, folder: string = 'videos'): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = fileName.split('.').pop();
    
    return `${folder}/${userId}/${timestamp}_${randomString}.${extension}`;
  }

  // Gerar chave para thumbnail
  generateThumbnailKey(videoKey: string): string {
    const baseName = videoKey.replace(/\.[^/.]+$/, ''); // Remove extensão
    return `${baseName}_thumbnail.jpg`;
  }

  // Obter URL público (para arquivos públicos)
  getPublicUrl(key: string): string {
    const endpoint = process.env.R2_PUBLIC_ENDPOINT || process.env.R2_ENDPOINT;
    return `${endpoint}/${this.bucketName}/${key}`;
  }

  // Verificar se arquivo existe
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  // Obter metadados do arquivo
  async getFileMetadata(key: string): Promise<any> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.s3Client.send(command);
      
      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error(`Failed to get file metadata for ${key}:`, error);
      throw new CustomError('Failed to get file metadata', 500);
    }
  }

  // Copiar arquivo
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      // Primeiro, obter o arquivo original
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: sourceKey
      });

      const response = await this.s3Client.send(getCommand);
      
      if (!response.Body) {
        throw new Error('No file content found');
      }

      // Converter stream para buffer
      const chunks: Uint8Array[] = [];
      const reader = response.Body as any;
      
      for await (const chunk of reader) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);

      // Upload para novo local
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationKey,
        Body: fileBuffer,
        ContentType: response.ContentType,
        Metadata: response.Metadata
      });

      await this.s3Client.send(putCommand);
      logger.info(`File copied from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      logger.error(`Failed to copy file from ${sourceKey} to ${destinationKey}:`, error);
      throw new CustomError('Failed to copy file', 500);
    }
  }

  // Listar arquivos por prefixo
  async listFiles(prefix: string, maxKeys: number = 100): Promise<string[]> {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      });

      const response = await this.s3Client.send(command);
      
      return response.Contents?.map(obj => obj.Key || '') || [];
    } catch (error) {
      logger.error(`Failed to list files with prefix ${prefix}:`, error);
      throw new CustomError('Failed to list files', 500);
    }
  }

  // Calcular uso de storage por usuário
  async getUserStorageUsage(userId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    videoFiles: number;
    videoSize: number;
    thumbnailFiles: number;
    thumbnailSize: number;
  }> {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `videos/${userId}/`,
        MaxKeys: 1000
      });

      const response = await this.s3Client.send(command);
      
      let totalFiles = 0;
      let totalSize = 0;
      let videoFiles = 0;
      let videoSize = 0;
      let thumbnailFiles = 0;
      let thumbnailSize = 0;

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Size) {
            totalFiles++;
            totalSize += obj.Size;

            if (obj.Key?.includes('_thumbnail.')) {
              thumbnailFiles++;
              thumbnailSize += obj.Size;
            } else {
              videoFiles++;
              videoSize += obj.Size;
            }
          }
        }
      }

      return {
        totalFiles,
        totalSize,
        videoFiles,
        videoSize,
        thumbnailFiles,
        thumbnailSize
      };
    } catch (error) {
      logger.error(`Failed to calculate storage usage for user ${userId}:`, error);
      throw new CustomError('Failed to calculate storage usage', 500);
    }
  }

  // Limpar arquivos antigos (cleanup)
  async cleanupOldFiles(olderThanDays: number = 30): Promise<number> {
    try {
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'temp/', // Apenas arquivos temporários
        MaxKeys: 1000
      });

      const response = await this.s3Client.send(command);
      let deletedCount = 0;

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.LastModified && obj.LastModified < cutoffDate && obj.Key) {
            await this.deleteFile(obj.Key);
            deletedCount++;
          }
        }
      }

      logger.info(`Cleaned up ${deletedCount} old files`);
      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
      throw new CustomError('Failed to cleanup old files', 500);
    }
  }
}

export const storageService = new StorageService();

