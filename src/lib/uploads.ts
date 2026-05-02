import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { prisma } from '@/lib/prisma';

const execFileAsync = promisify(execFile);

export async function storeUploadedFile(file: File, userId?: number | null) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = path.extname(file.name);
  const safeName = `${crypto.randomUUID()}${extension}`;
  const uploadDir = path.join(process.cwd(), 'uploads');

  await fs.mkdir(uploadDir, { recursive: true });
  const storagePath = path.join(uploadDir, safeName);
  await fs.writeFile(storagePath, bytes);

  const upload = await prisma.upload.create({
    data: {
      userId: userId ?? null,
      originalName: file.name,
      fileName: safeName,
      mimeType: file.type || 'application/octet-stream',
      size: bytes.byteLength,
      storagePath,
      scanStatus: 'pending'
    }
  });

  await scanUpload(upload.id, storagePath);
  return upload;
}

async function scanUpload(uploadId: string, storagePath: string) {
  const scanner = process.env.VIRUS_SCANNER_COMMAND;
  if (!scanner) {
    await prisma.upload.update({
      where: { id: uploadId },
      data: { scanStatus: 'clean' }
    });
    return;
  }

  try {
    await execFileAsync(scanner, [storagePath]);
    await prisma.upload.update({
      where: { id: uploadId },
      data: { scanStatus: 'clean' }
    });
  } catch (error) {
    await prisma.upload.update({
      where: { id: uploadId },
      data: { scanStatus: 'infected' }
    });
    console.error('VIRUS_SCAN_ERROR', error);
  }
}
