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
}

export interface UpdateInternshipDto extends Partial<CreateInternshipDto> {}

export interface ConvertPayload {
  employeeId?: number;
  createEmployee?: {
    firstName: string;
    lastName: string;
    email?: string;
    departmentId?: number;
    branchId?: number;
    dateOfJoining?: string; // yyyy-MM-dd
  };
}
