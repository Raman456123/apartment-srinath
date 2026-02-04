
export enum UserRole {
  RESIDENT = 'RESIDENT',
  ADMIN = 'ADMIN',
  WORKER = 'WORKER'
}

export enum ComplaintStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum Category {
  ELECTRICAL = 'ELECTRICAL',
  PLUMBING = 'PLUMBING',
  CLEANING = 'CLEANING',
  LIFT = 'LIFT',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  unitNumber?: string;
  workerType?: Category;
}

export interface Complaint {
  id: string;
  residentId: string;
  residentName: string;
  unitNumber: string;
  category: Category;
  description: string;
  priority: Priority;
  status: ComplaintStatus;
  createdAt: number;
  workerId?: string;
  workerName?: string;
  feedback?: string;
  rating?: number;
}
