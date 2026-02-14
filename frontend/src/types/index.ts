export interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  phone?: string;
  agency?: {
    name?: string;
    address?: string;
    gstNumber?: string;
  };
  role: 'super_admin' | 'admin' | 'senior_agent' | 'agent' | 'junior_agent';
  commissionRate?: number;
  totalEarnings?: number;
  isActive?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  passportDetails?: {
    passportNumber?: string;
    issuedCountry?: string;
    issueDate?: string;
    expiryDate?: string;
  };
  nationality?: string; // Kept for backward compatibility if needed, but backend doesn't seem to direct map it
  dateOfBirth?: string;
  agent_id?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields to be supported/migrated
  name?: string;
  passport_number?: string;
  date_of_birth?: string;
}

export interface Booking {
  _id: string;
  bookingReference: string;
  customer: string | Customer;
  agent: string | Agent;
  itinerary?: string | Itinerary;
  bookingType: 'flight' | 'hotel' | 'package' | 'transfer' | 'activity' | 'visa' | 'insurance' | 'custom';
  tripDetails: {
    title: string;
    description?: string;
    tripType?: string;
    origin?: string;
    destination: string;
    startDate: string;
    endDate: string;
    numberOfNights?: number;
  };
  travelers: {
    adults: number;
    children?: number;
    infants?: number;
    travelerDetails?: { name: string; age: number; gender: string; passportNumber?: string }[];
  };
  pricing: {
    basePrice: number;
    taxes?: number;
    serviceCharge?: number;
    discount?: number;
    discountReason?: string;
    totalAmount: number;
    currency?: string;
  };
  status: 'draft' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'refunded';
  paymentStatus?: 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
  amountPaid?: number;
  amountDue?: number;
  internalNotes?: string;
  specialRequests?: string;
  createdAt?: string;
  updatedAt?: string;
  // Legacy/Helper fields for UI safe access if needed (optional)
  notes?: string;
}

export interface Itinerary {
  _id: string;
  title: string;
  destinations: { city: string; country: string; arrivalDate?: string; departureDate?: string }[];
  duration: { nights: number; days: number };
  description?: string;
  dayPlans: ItineraryDay[];
  pricing: {
    perPersonCost?: number;
    totalBaseCost?: number;
    taxes?: number;
    serviceCharge?: number;
    discount?: number;
    totalCost: number;
  };
  agent_id?: string;
  inclusions?: string[];
  exclusions?: string[];
  status?: 'draft' | 'proposed' | 'approved' | 'rejected' | 'modified';
  tripType: 'domestic' | 'international' | 'honeymoon' | 'family' | 'adventure' | 'business' | 'group' | 'solo' | 'pilgrimage';
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  activities: {
    time?: string;
    activity: string;
    location?: string;
    duration?: string;
    notes?: string;
    cost?: number;
  }[];
  accommodation?: {
    hotelName?: string;
    hotelRating?: number;
    roomType?: string;
    checkIn?: string;
    checkOut?: string;
    address?: string;
    cost?: number;
    confirmationNumber?: string;
  };
  meals?: {
    breakfast?: { included: boolean; venue?: string; cost?: number };
    lunch?: { included: boolean; venue?: string; cost?: number };
    dinner?: { included: boolean; venue?: string; cost?: number };
  };
}

export interface Lead {
  _id: string;
  leadReference?: string;
  contactInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    alternatePhone?: string;
    city?: string;
    country?: string;
  };
  enquiryDetails: {
    destination?: string[];
    tripType?: string;
    startDate?: string;
    endDate?: string;
    flexibleDates?: boolean;
    numberOfTravelers?: {
      adults: number;
      children?: number;
      infants?: number;
    };
    budgetRange?: {
      min?: number;
      max?: number;
      currency?: string;
    };
    specialRequirements?: string;
  };
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  priority?: string;
  agent?: string | Agent;
  score?: number;
  fullName?: string; // Virtual
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for backward compatibility during refactor if needed (used in rendering currently)
  name?: string;
  email?: string;
  phone?: string;
  destination?: string;
  travel_date?: string;
  budget?: number;
  num_travelers?: number;
  message?: string;
}

export interface Payment {
  _id: string;
  booking: string | Booking;
  agent?: string | Agent;
  customer?: string | Customer;
  transactionId?: string;
  amount: number;
  paymentMethod?: 'credit_card' | 'debit_card' | 'bank_transfer' | 'upi' | 'wallet' | 'cash' | 'cheque';
  paymentType?: 'full' | 'partial' | 'advance' | 'balance' | 'refund';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  notes?: string;
  receipt?: { receiptNumber?: string; generatedAt?: string };
  createdAt?: string;
  updatedAt?: string;
  // Legacy fields for backward compatibility
  booking_id?: string | Booking;
  method?: string;
  transaction_id?: string;
  payment_date?: string;
}

export interface Commission {
  _id: string;
  agent: string | Agent;
  booking: string | Booking;
  bookingAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  commissionTier?: string;
  bonusAmount?: number;
  totalEarning?: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'on_hold';
  paidAt?: string;
  month?: number;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
}


export interface Document {
  _id: string;
  fileName: string;
  originalName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string | Agent;
  linkedTo?: {
    model: 'Booking' | 'Customer' | 'Itinerary' | 'Agent';
    documentId: string;
  };
  category: 'itinerary' | 'passport' | 'visa' | 'ticket' | 'receipt' | 'profile_photo' | 'other';
  createdAt?: string;
}

export interface Permission {
  _id: string;
  role: 'super_admin' | 'admin' | 'senior_agent' | 'agent' | 'junior_agent';
  permissions: {
    canCreateAdmin: boolean;
    canDeleteAgents: boolean;
    canViewAllAgents: boolean;
    canApproveAgents: boolean;
    canChangeAnyRole: boolean;
    canViewAllBookings: boolean;
    canDeleteAnyBooking: boolean;
    canUpdateAnyBooking: boolean;
    canViewAllCustomers: boolean;
    canDeleteAnyCustomer: boolean;
    canApproveCommissions: boolean;
    canProcessRefunds: boolean;
    canViewAllPayments: boolean;
    canViewFinancialReports: boolean;
    canAssignLeads: boolean;
    canViewAllLeads: boolean;
    canManageSettings: boolean;
    canViewAuditLogs: boolean;
    canManageTeam: boolean;
    canUploadFiles: boolean;
    canViewAnalytics: boolean;
    canManageNotifications: boolean;
    [key: string]: boolean;
  };
  lastModifiedBy?: string | Agent;
  version: number;
  updatedAt?: string;
}

export interface DashboardStats {
  totalCustomers: number;
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalLeads: number;
  conversionRate: number;
  // Enhanced Analytics
  revenueByMonth?: { year: number; month: number; totalRevenue: number; bookingCount: number }[];
  previousPeriodRevenue?: number;
  revenueGrowth?: number; // percentage
  bookingGrowth?: number; // percentage
  topAgents?: { _id: string; agentInfo: Agent[]; totalRevenue: number; totalBookings: number }[];
  leadFunnel?: { _id: string; count: number }[];
}

export interface AuthResponse {
  token: string;
  agent: Agent;
  message?: string;
}
