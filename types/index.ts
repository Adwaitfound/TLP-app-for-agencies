export type UserRole = 'admin' | 'project_manager' | 'client'

export type ProjectStatus = 'planning' | 'in_progress' | 'in_review' | 'completed' | 'cancelled' | 'stuck'

export type ServiceType = 'social_media' | 'video_production' | 'design_branding'

export type InvoiceStatus = 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled'

// Service configuration
export const SERVICE_TYPES = {
  video_production: {
    value: 'video_production' as ServiceType,
    label: 'Video Production',
    description: 'Full-service video production from concept to final delivery',
    icon: '🎬',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  social_media: {
    value: 'social_media' as ServiceType,
    label: 'Social Media',
    description: 'Social media management, content creation, and strategy',
    icon: '📱',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  design_branding: {
    value: 'design_branding' as ServiceType,
    label: 'Design & Branding',
    description: 'Brand identity, graphic design, and creative services',
    icon: '🎨',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
} as const

export const SERVICE_TYPE_OPTIONS = Object.values(SERVICE_TYPES)

export type ClientStatus = 'active' | 'inactive'

export type CommentStatus = 'pending' | 'resolved'

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'blocked'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  company_name?: string
  phone?: string
  bio?: string
  website?: string
  industry?: string
  address?: string
  tax_id?: string
  company_size?: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  user_id: string
  company_name: string
  contact_person: string
  email: string
  phone?: string
  address?: string
  total_projects: number
  total_revenue: number
  status: ClientStatus
  created_at: string
}

export interface Project {
  id: string
  client_id: string
  name: string
  description?: string
  status: ProjectStatus
  service_type: ServiceType
  budget?: number
  start_date?: string
  deadline?: string
  progress_percentage: number
  thumbnail_url?: string
  drive_folder_url?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined data
  clients?: {
    company_name: string
    contact_person: string
    email: string
  }
}

export type FileType = 'document' | 'image' | 'video' | 'pdf' | 'other'
export type FileCategory = 'pre_production' | 'production' | 'post_production' | 'deliverables' | 'other'
export type StorageType = 'supabase' | 'google_drive'

export interface ProjectFile {
  id: string
  project_id: string
  file_name: string
  file_type: FileType
  file_category: FileCategory
  storage_type: StorageType
  file_url: string
  file_size?: number
  description?: string
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface ProjectComment {
  id: string
  project_id: string
  file_id?: string
  user_id: string
  comment_text: string
  timestamp_seconds?: number
  status: CommentStatus
  created_at: string
}

export interface Invoice {
  id: string
  invoice_number: string
  project_id?: string
  client_id: string
  issue_date: string
  due_date?: string
  subtotal?: number
  tax?: number
  total: number
  status: InvoiceStatus
  paid_at?: string
  created_at: string
  // New fields for invoice upload
  advance_amount?: number
  advance_date?: string
  tax_type?: 'gst' | 'non_gst' | 'both'
  invoice_file_url?: string
  notes?: string
  // Joined data
  clients?: {
    company_name: string
  }
  projects?: {
    name: string
  }
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
}

export interface Milestone {
  id: string
  project_id: string
  title: string
  description?: string
  due_date?: string
  status: MilestoneStatus
  completed_at?: string
  position: number
  created_by_email?: string
  created_at: string
  updated_at?: string
  // Joined data
  projects?: {
    name: string
    clients?: {
      company_name: string
    }
  }
}

export interface SubProject {
  id: string
  parent_project_id: string
  project_id?: string
  name: string
  description?: string
  status: ProjectStatus
  assigned_to?: string
  progress_percentage: number
  due_date?: string
  video_url?: string
  video_thumbnail_url?: string
  completed_at?: string
  created_by?: string
  created_at: string
  updated_at: string
  // Joined data
  assigned_user?: User
}

export interface SubProjectComment {
  id: string
  sub_project_id: string
  user_id: string
  comment_text: string
  created_at: string
  // Joined data
  users?: User
}

export interface SubProjectUpdate {
  id: string
  sub_project_id: string
  user_id: string
  update_text: string
  update_type: string
  created_at: string
  // Joined data
  users?: User
}

// Vendor and Payment Types
export type VendorType =
  | 'videographer'
  | 'photographer'
  | 'editor'
  | 'animator'
  | 'graphic_designer'
  | 'sound_engineer'
  | 'voice_artist'
  | 'equipment_rental'
  | 'studio_rental'
  | 'drone_operator'
  | 'makeup_artist'
  | 'talent'
  | 'location_scout'
  | 'production_assistant'
  | 'other'

export type PaymentFrequency = 'one_time' | 'weekly' | 'monthly' | 'per_project' | 'recurring'

export type PaymentStatus = 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled'

export const VENDOR_TYPES = {
  videographer: { label: 'Videographer', icon: '🎥' },
  photographer: { label: 'Photographer', icon: '📷' },
  editor: { label: 'Video Editor', icon: '✂️' },
  animator: { label: 'Animator', icon: '🎞️' },
  graphic_designer: { label: 'Graphic Designer', icon: '🎨' },
  sound_engineer: { label: 'Sound Engineer', icon: '🎧' },
  voice_artist: { label: 'Voice Artist', icon: '🎤' },
  equipment_rental: { label: 'Equipment Rental', icon: '📹' },
  studio_rental: { label: 'Studio Rental', icon: '🏢' },
  drone_operator: { label: 'Drone Operator', icon: '🚁' },
  makeup_artist: { label: 'Makeup Artist', icon: '💄' },
  talent: { label: 'Talent/Actor', icon: '🎭' },
  location_scout: { label: 'Location Scout', icon: '🗺️' },
  production_assistant: { label: 'Production Assistant', icon: '📋' },
  other: { label: 'Other', icon: '⚙️' },
} as const

export interface Vendor {
  id: string
  name: string
  vendor_type: VendorType
  phone?: string
  email?: string
  upi_id?: string
  bank_account_number?: string
  bank_ifsc_code?: string
  bank_account_name?: string
  address?: string
  total_projects_worked: number
  total_amount_paid: number
  average_rating?: number
  work_frequency?: PaymentFrequency
  last_worked_date?: string
  notes?: string
  skills?: string[]
  is_active: boolean
  preferred_vendor: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface VendorPayment {
  id: string
  vendor_id: string
  project_id?: string
  amount: number
  payment_date?: string
  scheduled_date?: string
  status: PaymentStatus
  payment_method?: string
  transaction_id?: string
  description: string
  payment_reason?: string
  invoice_number?: string
  receipt_url?: string
  paid_by?: string
  approved_by?: string
  created_at: string
  updated_at: string
  // Joined data
  vendors?: Vendor
  projects?: Project
}

export interface VendorProjectAssignment {
  id: string
  vendor_id: string
  project_id: string
  role?: string
  rate?: number
  estimated_hours?: number
  actual_hours?: number
  status: string
  rating?: number
  feedback?: string
  start_date?: string
  end_date?: string
  assigned_by?: string
  created_at: string
  updated_at: string
  // Joined data
  vendors?: Vendor
  projects?: Project
}
