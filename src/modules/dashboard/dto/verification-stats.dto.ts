// src/modules/dashboard/dto/verification-stats.dto.ts

export interface IPassRateStat {
  total: number;
  passed: number;
  percentage: number;
}

export interface IActiveUsersStat {
  activeStudents: number;
  instructors: number;
  admins: number;
}

export interface IVerificationStatsFilter {
  academicYear?: number;
  term?: number;
}

export interface IVerificationStats {
  firstPassRate: IPassRateStat; // R1
  secondPassRate: IPassRateStat; // R2
  totalFilesProcessed: number;
  avgSpeed: string;
  storageUsed: {
    percentage: number;
    text: string; 
  };
  users: IActiveUsersStat;
}