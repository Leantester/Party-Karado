export type Language = 'en' | 'hi' | 'mr';

export type VenueCategory =
  | 'rooftop'
  | 'banquet'
  | 'poolside'
  | 'courtyard'
  | 'lawn'
  | 'lounge';

export type CityName = 'Mumbai' | 'Pune' | 'Thane' | 'Navi Mumbai';

export type SlotType = 'morning' | 'evening' | 'night' | 'fullday' | 'custom';

export type EventType =
  | 'birthday'
  | 'sangeet'
  | 'anniversary'
  | 'corporate'
  | 'cocktail'
  | 'family';

export type PaymentMethod = 'upi' | 'card' | 'netbanking';

export type BookingStatus = 'confirmed' | 'checked_in' | 'completed' | 'cancelled';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  preferredCity: string;
  preferredLanguage: Language;
  pushEnabled: boolean;
  bookingAlerts: boolean;
  messageAlerts: boolean;
  savedVenueIds: string[];
  role: 'guest' | 'host';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Venue {
  id: string;
  hostId: string;
  hostName: string;
  hostRoleLabel: string;
  name: string;
  nameHi: string;
  nameMr: string;
  category: VenueCategory;
  city: CityName;
  neighborhood: string;
  address: string;
  lat: number;
  lng: number;
  capacityMin: number;
  capacityMax: number;
  hourlyRate: number;
  pricePerSlot: number;
  depositAmount: number;
  cleaningFee: number;
  amenities: string[];
  description: string;
  descriptionHi: string;
  descriptionMr: string;
  imageUrl: string;
  ratingAvg: number;
  reviewCount: number;
  rules: string;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SlotLock {
  venueId: string;
  date: string;
  hour?: number;
  slot: SlotType;
  bookingId: string;
  userId: string;
  status: 'reserved' | 'confirmed';
  createdAt?: unknown;
}

export interface Booking {
  id: string;
  venueId: string;
  venueName: string;
  venueNeighborhood: string;
  hostId: string;
  userId: string;
  eventType: EventType;
  date: string;
  startHour: number;
  endHour: number;
  slot: SlotType;
  slotLockIds: string[];
  guestCount: number;
  baseAmount: number;
  cleaningFee: number;
  depositAmount: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'refunded';
  bookingStatus: BookingStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  // Optional client-merged fields from private booking_receipts/{bookingId}
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  specialRequests?: string;
  paymentMethod?: PaymentMethod;
  paymentLast4?: string;
  transactionId?: string;
}

export interface BookingReceipt {
  bookingId: string;
  userId: string;
  hostId: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  specialRequests: string;
  paymentMethod: PaymentMethod;
  paymentLast4: string;
  transactionId: string;
  createdAt?: unknown;
}

export interface Review {
  id: string;
  venueId: string;
  bookingId: string;
  userId: string;
  authorName: string;
  rating: number;
  cleanlinessRating: number;
  ambienceRating: number;
  acousticsRating: number;
  hostRating: number;
  eventType: string;
  comment: string;
  createdAt?: unknown;
}

export interface Conversation {
  id: string;
  venueId: string;
  venueName: string;
  guestId: string;
  guestName: string;
  hostId: string;
  hostName: string;
  lastMessage: string;
  lastSenderId: string;
  unreadByGuest: number;
  unreadByHost: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'guest' | 'host';
  text: string;
  createdAt?: unknown;
}

export interface AppNotification {
  id: string;
  userId: string;
  type:
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_updated'
    | 'host_message'
    | 'review_posted';
  title: string;
  titleHi: string;
  titleMr: string;
  body: string;
  bodyHi: string;
  bodyMr: string;
  bookingId: string;
  venueId: string;
  read: boolean;
  createdAt?: unknown;
}

export type CapacityBand = 'all' | 'intimate' | 'medium' | 'grand' | 'mega';

export type HourlyRateBand = 'all' | 'budget' | 'mid' | 'premium';

export type SortOption = 'recommended' | 'rating' | 'price_asc' | 'capacity_desc';

export interface FilterState {
  searchQuery: string;
  city: string;
  category: string;
  capacityBand: CapacityBand;
  hourlyRateBand: HourlyRateBand;
  amenities: string[];
  date: string;
  slot: SlotType | 'any';
  sortBy: SortOption;
}
