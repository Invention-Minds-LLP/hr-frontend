// Adjust the path if you keep models elsewhere
export type InternshipStatus =
  'DRAFT' | 'OFFERED' | 'ACTIVE' | 'COMPLETED' | 'CONVERTED' | 'DROPPED';

export interface Internships {
  id: number;
  employeeId: number | null;
  mentorId: number | null;
  startDate: string;         // ISO string from API
  endDate: string | null;
  status: InternshipStatus;
  notes: string | null;

  candidateName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  stipend: number | null;

  createdAt: string;
  updatedAt: string;
  departmentId?: number | null;
  departmentName?: string | null;

  // Optional enrichments from the API
  employee?: { id: number; firstName: string; lastName: string } | null;
  employeeName?: string | null;
  mentorName?: string | null;
}

export interface InternshipListResponse {
  items: Internships[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateInternshipDto {
  candidateName: string;
  startDate: string; // yyyy-MM-dd or ISO
  email?: string;
  phone?: string;
  title?: string;
  stipend?: number;
  notes?: string;
  employeeId?: number | null;
  mentorId?: number | null;
  endDate?: string | null;
  status?: InternshipStatus;
  departmentId?: number | null;
}

export interface UpdateInternshipDto extends Partial<CreateInternshipDto> {}

export interface ConvertPayload {
  employeeId?: number;
  createEmployee?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    departmentId?: number;
    branchId?: number;
    dateOfJoining?: string; // yyyy-MM-dd
  };
}

export interface InternshipAnalytics {
  total: number;
  active: number;
  byStatus: Record<string, number>;
  conversionRate: number;   // % of resolved internships that converted
  dropRate: number;         // % of resolved internships that dropped
  avgDurationDays: number;
  byDepartment: { departmentId: number; name: string; count: number }[];
  topMentors: { mentorId: number; name: string; count: number }[];
}

export type InternshipRecommendation = 'RETAIN' | 'EXTEND' | 'COMPLETE' | 'TERMINATE';

export interface InternshipEvaluation {
  id: number;
  internshipId: number;
  evaluatorId: number | null;
  evaluatorName?: string | null;
  periodLabel: string | null;
  evaluationDate: string;        // ISO string from API
  rating: number | null;         // 1-5
  strengths: string | null;
  areasToImprove: string | null;
  comments: string | null;
  recommendation: InternshipRecommendation | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEvaluationDto {
  evaluatorId?: number | null;
  periodLabel?: string | null;
  evaluationDate?: string | null; // yyyy-MM-dd or ISO
  rating?: number | null;
  strengths?: string | null;
  areasToImprove?: string | null;
  comments?: string | null;
  recommendation?: InternshipRecommendation | null;
}

export interface EvaluationListResponse {
  items: InternshipEvaluation[];
}

export type StipendStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface InternshipStipend {
  id: number;
  internshipId: number;
  periodMonth: string;       // ISO string from API (first of month)
  amount: number;
  status: StipendStatus;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StipendSummary {
  paidAmount: number;
  pendingAmount: number;
  paidCount: number;
  pendingCount: number;
}

export interface StipendListResponse {
  items: InternshipStipend[];
  summary: StipendSummary;
}

export interface CreateStipendDto {
  periodMonth: string;       // yyyy-MM-dd (first of month)
  amount: number;
  status?: StipendStatus;
  paidAt?: string | null;
  notes?: string | null;
}

export interface UpdateStipendDto extends Partial<CreateStipendDto> {}
