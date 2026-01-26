export interface GroupProgressDto {
  groupId: string;
  thesisCode: string;
  thesisName: string;
  students: { id: string; name: string; code: string }[];
  submissions: {
    roundId: number;
    roundTitle: string;
    roundNumber: number;
    status: string; // 'PENDING', 'IN_PROGRESS', 'COMPLETED'
    submittedAt?: Date;
    fileUrl?: string;
  }[];
}