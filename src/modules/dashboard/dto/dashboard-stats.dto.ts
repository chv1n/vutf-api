// src/modules/dashboard/dto/dashboard-stats.dto.ts

export interface IDashboardStats {
  totalActiveGroups: number;
  passed: number;
  inProgress: number;
  needsAttention: number;
  newFromLastWeek: number;
}