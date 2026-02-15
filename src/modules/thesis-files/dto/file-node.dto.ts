// src/modules/thesis-files/dto/file-node.dto.ts

export class FileNodeMetadata {
  description?: string;
  status?: string;
  advisor?: string;
  owner?: string;
  code?: string;
  updatedAt?: Date | string; // รองรับทั้ง Date Object และ String จาก JSON
  
  // Flag บอก Frontend
  isHybridView?: boolean;
  displayStatus?: string;
  statusColor?: 'success' | 'warning' | 'error' | 'info' | 'default';

  submissionPdfUrl?: string;
}

export class FileNode {
  id: string;
  name: string;
  type: 'FOLDER' | 'FILE';
  path: string;

  mimeType?: string;
  size?: number;
  url?: string;
  downloadUrl?: string;

  metadata?: FileNodeMetadata;
}