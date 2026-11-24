import { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { SEED_REVIEWS, SEED_VENUES } from '../data/seedVenues';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { ADMIN_EMAIL } from '../i18n/translations';
import {
  Booking,
  BookingReceipt,
  BookingStatus,
  EventType,
  Language,
  PaymentMethod,
  Review,
  SlotType,
  UserProfile,
  Venue,
} from '../types';

function makeId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 14)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${randomPart}`;
}

export function getSlotHourRange(slot: SlotType): { startHour: number; endHour: number } {
  switch (slot) {
    case 'morning':
      return { startHour: 10, endHour: 14 };
    case 'evening':
      return { startHour: 16, endHour: 20 };
    case 'night':
      return { startHour: 20, endHour: 24 };
    case 'fullday':
      return { startHour: 10, endHour: 24 };
    default:
      return { startHour: 16, endHour: 20 };
  }
}

export function deriveSlotTypeFromHours(startHour: number, endHour: number): SlotType {
  if (startHour === 10 && endHour === 14) return 'morning';
  if (startHour === 16 && endHour === 20) return 'evening';
  if (startHour === 20 && endHour === 24) return 'night';
  if (startHour === 10 && endHour === 24) return 'fullday';
  return 'custom';
}

export function normalizeLegacyBooking(raw: Record<string, unknown>): Booking {
  const slot = (raw.slot as SlotType) || 'evening';
  const defaults = getSlotHourRange(slot);
  const startHour =
    typeof raw.startHour === 'number' ? raw.startHour : defaults.startHour;
  const endHour = typeof raw.endHour === 'number' ? raw.endHour : defaults.endHour;
  const date =
    typeof raw.date === 'string'
      ? raw.date
      : typeof raw.eventDate === 'string'
      ? raw.eventDate
      : '';
  const slotLockIds = Array.isArray(raw.slotLockIds)
    ? (raw.slotLockIds.filter((x): x is string => typeof x === 'string'))
    : typeof raw.slotLockId === 'string'
    ? [raw.slotLockId]
    : [];

  return {
    ...(raw as unknown as Booking),
    date,
    startHour,
    endHour,
    slot,
    slotLockIds,
  };
}

export async function ensureUserProfile(
  user: User,
  defaultLanguage: Language
): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    const newProfile: UserProfile = {
      uid: user.uid,
      displayName: (user.displayName || user.email?.split('@')[0] || 'Guest').slice(0, 80),
      email: (user.email || 'guest@partykarado.in').slice(0, 120),
      phone: '',
      preferredCity: 'Mumbai',
      preferredLanguage: defaultLanguage,
      pushEnabled: false,
      bookingAlerts: true,
      messageAlerts: true,
      savedVenueIds: [],
      role: 'guest',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(ref, newProfile);
    return newProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function ensureSeedCatalog(user: User | null): Promise<void> {
  if (!user || user.email !== ADMIN_EMAIL) return;

  try {
    const existingSnap = await getDocs(collection(db, 'venues'));
    if (existingSnap.empty) {
      const batch = writeBatch(db);
      for (const venue of SEED_VENUES) {
        batch.set(doc(db, 'venues', venue.id), {
          ...venue,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const review of SEED_REVIEWS) {
        batch.set(doc(db, 'reviews', review.id), {
          ...review,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      return;
    }

    // Backfill isActive on any pre-existing venue docs if missing
    const batch = writeBatch(db);
    let hasBackfill = false;
    existingSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (typeof data.isActive !== 'boolean') {
        hasBackfill = true;
        batch.update(docSnap.ref, {
          isActive: true,
          updatedAt: serverTimestamp(),
        });
      }
    });
    if (hasBackfill) {
      await batch.commit();
    }
  } catch (error) {
    console.warn('Seed catalog check skipped:', error);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<
    Pick<
      UserProfile,
      | 'displayName'
      | 'phone'
      | 'preferredCity'
      | 'preferredLanguage'
      | 'pushEnabled'
      | 'bookingAlerts'
      | 'messageAlerts'
      | 'savedVenueIds'
      | 'role'
    >
  >
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function queryBookingsForVenueDate(
  venueId: string,
  date: string
): Promise<Booking[]> {
  if (!venueId || !date) return [];
  const path = `bookings?venueId=${venueId}&date=${date}`;
  try {
    const q = query(
      collection(db, 'bookings'),
      where('venueId', '==', venueId),
      where('date', '==', date)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => normalizeLegacyBooking(d.data() as Record<string, unknown>))
      .filter((b) => b.bookingStatus !== 'cancelled');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface CreateBookingInput {
  venue: Venue;
  user: User;
  guestName: string;
  guestPhone: string;
  eventType: EventType;
  date: string;
  startHour: number;
  endHour: number;
  guestCount: number;
  specialRequests: string;
  paymentMethod: PaymentMethod;
  upiId?: string;
  cardHolder?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  bankCode?: string;
}

export async function verifyPaymentAndCreateBooking(
  input: CreateBookingInput
): Promise<Booking> {
  const durationHours = Math.max(1, input.endHour - input.startHour);
  const slot = deriveSlotTypeFromHours(input.startHour, input.endHour);
  const baseAmount = Math.round(input.venue.hourlyRate * durationHours);

  // Fresh query by venueId and date before authorizing payment
  const existingForDate = await queryBookingsForVenueDate(input.venue.id, input.date);
  const hasOverlap = existingForDate.some(
    (b) => b.startHour < input.endHour && b.endHour > input.startHour
  );
  if (hasOverlap) {
    throw new Error(
      'Selected hours overlap with an existing booking on this date. Please choose open hours.'
    );
  }

  const paymentRes = await fetch('/api/payments/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      venueId: input.venue.id,
      date: input.date,
      slot,
      startHour: input.startHour,
      endHour: input.endHour,
      guestCount: input.guestCount,
      baseAmount,
      cleaningFee: input.venue.cleaningFee,
      depositAmount: input.venue.depositAmount,
      paymentMethod: input.paymentMethod,
      upiId: input.upiId,
      cardHolder: input.cardHolder,
      cardNumber: input.cardNumber,
      cardExpiry: input.cardExpiry,
      cardCvv: input.cardCvv,
      bankCode: input.bankCode,
    }),
  });

  const paymentData = (await paymentRes.json()) as {
    verified?: boolean;
    transactionId?: string;
    paymentLast4?: string;
    gstAmount?: number;
    totalAmount?: number;
    error?: string;
  };

  if (!paymentRes.ok || !paymentData.verified || !paymentData.transactionId) {
    throw new Error(paymentData.error || 'Payment verification failed.');
  }

  const bookingId = makeId('bk');
  const notifId = makeId('ntf');
  const hoursList: number[] = [];
  for (let h = input.startHour; h < input.endHour; h += 1) {
    hoursList.push(h);
  }
  const slotLockIds = hoursList.map((h) => `${input.venue.id}__${input.date}__h${h}`);

  const bookingDoc: Omit<
    Booking,
    'guestName' | 'guestPhone' | 'guestEmail' | 'specialRequests' | 'paymentMethod' | 'paymentLast4' | 'transactionId'
  > = {
    id: bookingId,
    venueId: input.venue.id,
    venueName: input.venue.name.slice(0, 100),
    venueNeighborhood: `${input.venue.neighborhood}, ${input.venue.city}`.slice(0, 100),
    hostId: input.venue.hostId,
    userId: input.user.uid,
    eventType: input.eventType,
    date: input.date,
    startHour: input.startHour,
    endHour: input.endHour,
    slot,
    slotLockIds,
    guestCount: input.guestCount,
    baseAmount,
    cleaningFee: input.venue.cleaningFee,
    depositAmount: input.venue.depositAmount,
    gstAmount: paymentData.gstAmount ?? 0,
    totalAmount: paymentData.totalAmount ?? baseAmount,
    paymentStatus: 'paid',
    bookingStatus: 'confirmed',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const receiptDoc: BookingReceipt = {
    bookingId,
    userId: input.user.uid,
    hostId: input.venue.hostId,
    guestName: input.guestName.trim().slice(0, 80),
    guestPhone: input.guestPhone.trim().slice(0, 20),
    guestEmail: (input.user.email || 'guest@partykarado.in').slice(0, 120),
    specialRequests: input.specialRequests.trim().slice(0, 500),
    paymentMethod: input.paymentMethod,
    paymentLast4: paymentData.paymentLast4 ?? '',
    transactionId: paymentData.transactionId,
    createdAt: serverTimestamp(),
  };

  const timeWindowLabel = `${String(input.startHour).padStart(2, '0')}:00–${String(
    input.endHour
  ).padStart(2, '0')}:00`;

  try {
    await runTransaction(db, async (tx) => {
      // Phase 1: All reads first
      const venueRef = doc(db, 'venues', input.venue.id);
      const venueSnap = await tx.get(venueRef);
      if (!venueSnap.exists()) {
        throw new Error('This venue listing is no longer available.');
      }
      const venueData = venueSnap.data() as Venue;
      if (venueData.isActive === false) {
        throw new Error('This venue has been paused by the administrator.');
      }

      const lockRefs = slotLockIds.map((lockId) => doc(db, 'slot_locks', lockId));
      const lockSnaps = await Promise.all(lockRefs.map((ref) => tx.get(ref)));
      const takenIndex = lockSnaps.findIndex((s) => s.exists());
      if (takenIndex !== -1) {
        const conflictHour = hoursList[takenIndex];
        throw new Error(
          `Hour ${String(conflictHour).padStart(2, '0')}:00 was just booked by another guest. Please select different hours.`
        );
      }

      // Phase 2: Atomic writes
      lockRefs.forEach((lockRef, idx) => {
        tx.set(lockRef, {
          venueId: input.venue.id,
          date: input.date,
          hour: hoursList[idx],
          slot,
          bookingId,
          userId: input.user.uid,
          status: 'confirmed',
          createdAt: serverTimestamp(),
        });
      });

      tx.set(doc(db, 'bookings', bookingId), bookingDoc);
      tx.set(doc(db, 'booking_receipts', bookingId), receiptDoc);
      tx.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: input.user.uid,
        type: 'booking_confirmed',
        title: `Booking Confirmed: ${input.venue.name.slice(0, 60)}`,
        titleHi: `बुकिंग पक्की हुई: ${input.venue.nameHi.slice(0, 60)}`,
        titleMr: `बुकिंग निश्चित झाली: ${input.venue.nameMr.slice(0, 60)}`,
        body: `${input.date} (${timeWindowLabel}) · Ref ${paymentData.transactionId}`,
        bodyHi: `${input.date} (${timeWindowLabel}) · रसीद ${paymentData.transactionId}`,
        bodyMr: `${input.date} (${timeWindowLabel}) · पावती ${paymentData.transactionId}`,
        bookingId,
        venueId: input.venue.id,
        read: false,
        createdAt: serverTimestamp(),
      });
    });

    return {
      ...bookingDoc,
      ...receiptDoc,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('just booked') ||
        error.message.includes('paused') ||
        error.message.includes('no longer available'))
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, `bookings/${bookingId}`);
  }
}

export async function cancelBookingAndReleaseSlot(booking: Booking): Promise<void> {
  const notifId = makeId('ntf');
  const lockIdsToDelete =
    booking.slotLockIds && booking.slotLockIds.length > 0
      ? booking.slotLockIds
      : (() => {
          const ids: string[] = [];
          for (let h = booking.startHour; h < booking.endHour; h += 1) {
            ids.push(`${booking.venueId}__${booking.date}__h${h}`);
          }
          return ids;
        })();

  try {
    await runTransaction(db, async (tx) => {
      const bookingRef = doc(db, 'bookings', booking.id);
      const bookingSnap = await tx.get(bookingRef);
      if (!bookingSnap.exists()) {
        throw new Error('Booking record not found.');
      }

      const lockRefs = lockIdsToDelete.map((id) => doc(db, 'slot_locks', id));
      const lockSnaps = await Promise.all(lockRefs.map((ref) => tx.get(ref)));

      tx.update(bookingRef, {
        bookingStatus: 'cancelled',
        paymentStatus: 'refunded',
        updatedAt: serverTimestamp(),
      });

      lockSnaps.forEach((snap, idx) => {
        if (snap.exists()) {
          tx.delete(lockRefs[idx]);
        }
      });

      tx.set(doc(db, 'notifications', notifId), {
        id: notifId,
        userId: booking.userId,
        type: 'booking_cancelled',
        title: `Booking Cancelled & Refunded`,
        titleHi: `बुकिंग रद्द व रिफंड जारी`,
        titleMr: `बुकिंग रद्द आणि परतावा जारी`,
        body: `${booking.venueName.slice(0, 80)} on ${booking.date} has been released.`,
        bodyHi: `${booking.date} की बुकिंग रद्द कर दी गई और रिफंड शुरू हो गया है।`,
        bodyMr: `${booking.date} ची बुकिंग रद्द केली आहे आणि परतावा सुरू झाला आहे.`,
        bookingId: booking.id,
        venueId: booking.venueId,
        read: false,
        createdAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function advanceBookingStatus(
  booking: Booking,
  nextStatus: Extract<BookingStatus, 'checked_in' | 'completed'>
): Promise<void> {
  const notifId = makeId('ntf');
  const batch = writeBatch(db);
  batch.update(doc(db, 'bookings', booking.id), {
    bookingStatus: nextStatus,
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'notifications', notifId), {
    id: notifId,
    userId: booking.userId,
    type: 'booking_updated',
    title:
      nextStatus === 'checked_in'
        ? `Check-in Ready: ${booking.venueName.slice(0, 60)}`
        : `Event Completed: ${booking.venueName.slice(0, 60)}`,
    titleHi:
      nextStatus === 'checked_in'
        ? `चेक-इन सक्रिय: ${booking.venueName.slice(0, 60)}`
        : `समारंभ संपन्न: ${booking.venueName.slice(0, 60)}`,
    titleMr:
      nextStatus === 'checked_in'
        ? `चेक-इन सुरू: ${booking.venueName.slice(0, 60)}`
        : `सोहळा पूर्ण: ${booking.venueName.slice(0, 60)}`,
    body: `Your reservation status is now ${nextStatus.replace('_', ' ')}.`,
    bodyHi: `आपकी बुकिंग की स्थिति अब ${nextStatus === 'checked_in' ? 'चेक-इन' : 'संपन्न'} है।`,
    bodyMr: `तुमच्या बुकिंगची स्थिती आता ${nextStatus === 'checked_in' ? 'चेक-इन' : 'पूर्ण'} आहे.`,
    bookingId: booking.id,
    venueId: booking.venueId,
    read: false,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `bookings/${booking.id}`);
  }
}

export async function publishReview(input: {
  venue: Venue;
  user: User;
  authorName: string;
  bookingId?: string;
  cleanlinessRating: number;
  ambienceRating: number;
  acousticsRating: number;
  hostRating: number;
  eventType: string;
  comment: string;
}): Promise<void> {
  const reviewId = makeId('rev');
  const overall = Number(
    (
      (input.cleanlinessRating +
        input.ambienceRating +
        input.acousticsRating +
        input.hostRating) /
      4
    ).toFixed(1)
  );

  const reviewPayload: Review = {
    id: reviewId,
    venueId: input.venue.id,
    bookingId: input.bookingId || '',
    userId: input.user.uid,
    authorName: input.authorName.trim().slice(0, 80),
    rating: overall,
    cleanlinessRating: input.cleanlinessRating,
    ambienceRating: input.ambienceRating,
    acousticsRating: input.acousticsRating,
    hostRating: input.hostRating,
    eventType: input.eventType.slice(0, 40),
    comment: input.comment.trim().slice(0, 1000),
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'reviews', reviewId), reviewPayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `reviews/${reviewId}`);
  }
}

export async function getOrCreateConversation(
  venue: Venue,
  user: User,
  guestName: string
): Promise<string> {
  const conversationId = `${venue.id}__${user.uid}`;
  const convRef = doc(db, 'conversations', conversationId);
  try {
    const snap = await getDoc(convRef);
    if (!snap.exists()) {
      await setDoc(convRef, {
        id: conversationId,
        venueId: venue.id,
        venueName: venue.name.slice(0, 100),
        guestId: user.uid,
        guestName: guestName.trim().slice(0, 80) || 'Guest',
        hostId: venue.hostId,
        hostName: venue.hostName.slice(0, 80),
        lastMessage: '',
        lastSenderId: user.uid,
        unreadByGuest: 0,
        unreadByHost: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return conversationId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}`);
  }
}

export async function sendChatMessage(input: {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'guest' | 'host';
  text: string;
}): Promise<void> {
  const messageId = makeId('msg');
  const trimmed = input.text.trim().slice(0, 1000);
  if (!trimmed) return;

  const batch = writeBatch(db);
  batch.set(doc(db, 'conversations', input.conversationId, 'messages', messageId), {
    id: messageId,
    senderId: input.senderId,
    senderName: input.senderName.trim().slice(0, 80) || 'User',
    senderRole: input.senderRole,
    text: trimmed,
    createdAt: serverTimestamp(),
  });

  batch.update(doc(db, 'conversations', input.conversationId), {
    lastMessage: trimmed.slice(0, 300),
    lastSenderId: input.senderId,
    unreadByGuest: input.senderRole === 'host' ? 1 : 0,
    unreadByHost: input.senderRole === 'guest' ? 1 : 0,
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      `conversations/${input.conversationId}/messages/${messageId}`
    );
  }
}

export async function markConversationRead(
  conversationId: string,
  role: 'guest' | 'host'
): Promise<void> {
  const path = `conversations/${conversationId}`;
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      ...(role === 'guest' ? { unreadByGuest: 0 } : { unreadByHost: 0 }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function markAllNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const batch = writeBatch(db);
  for (const id of notificationIds) {
    batch.update(doc(db, 'notifications', id), { read: true });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'notifications');
  }
}

export async function createAdminVenueListing(input: {
  user: User;
  hostName: string;
  name: string;
  city: 'Mumbai' | 'Pune' | 'Thane' | 'Navi Mumbai';
  neighborhood: string;
  address: string;
  category: Venue['category'];
  hourlyRate: number;
  capacityMin: number;
  capacityMax: number;
  amenities: string[];
  description: string;
  rules?: string;
  isActive?: boolean;
}): Promise<Venue> {
  const venueId = makeId('venue');
  const cityCoords: Record<Venue['city'], { lat: number; lng: number }> = {
    Mumbai: { lat: 19.076 + (Math.random() - 0.5) * 0.04, lng: 72.8777 + (Math.random() - 0.5) * 0.04 },
    Pune: { lat: 18.5204 + (Math.random() - 0.5) * 0.04, lng: 73.8567 + (Math.random() - 0.5) * 0.04 },
    Thane: { lat: 19.2183 + (Math.random() - 0.5) * 0.03, lng: 72.9781 + (Math.random() - 0.5) * 0.03 },
    'Navi Mumbai': { lat: 19.033 + (Math.random() - 0.5) * 0.03, lng: 73.0297 + (Math.random() - 0.5) * 0.03 },
  };
  const fallbackImages: Record<Venue['category'], string> = {
    rooftop: '/src/assets/images/hero_rooftop_celebration_1795445659359.jpg',
    banquet: '/src/assets/images/venue_banquet_grand_1795445658214.jpg',
    poolside: '/src/assets/images/venue_poolside_villa_1795445657428.jpg',
    courtyard: '/src/assets/images/venue_heritage_courtyard_1795445657495.jpg',
    lawn: '/src/assets/images/venue_garden_lawn_1795445657705.jpg',
    lounge: '/src/assets/images/venue_acoustic_lounge_1795445658181.jpg',
  };
  const coords = cityCoords[input.city];
  const pricePerSlot = Math.max(1000, Math.round(input.hourlyRate * 4));
  const safeMin = Math.max(1, Math.min(input.capacityMin, input.capacityMax));
  const venue: Venue = {
    id: venueId,
    hostId: input.user.uid,
    hostName: input.hostName.trim().slice(0, 80) || 'Venue Admin',
    hostRoleLabel: 'Verified Space Admin',
    name: input.name.trim().slice(0, 100),
    nameHi: input.name.trim().slice(0, 140),
    nameMr: input.name.trim().slice(0, 140),
    category: input.category,
    city: input.city,
    neighborhood: input.neighborhood.trim().slice(0, 80),
    address: input.address.trim().slice(0, 200),
    lat: Number(coords.lat.toFixed(4)),
    lng: Number(coords.lng.toFixed(4)),
    capacityMin: safeMin,
    capacityMax: input.capacityMax,
    hourlyRate: input.hourlyRate,
    pricePerSlot,
    depositAmount: Math.round(pricePerSlot * 0.2),
    cleaningFee: 2500,
    amenities: input.amenities.slice(0, 15),
    description: input.description.trim().slice(0, 1200),
    descriptionHi: input.description.trim().slice(0, 1500),
    descriptionMr: input.description.trim().slice(0, 1500),
    imageUrl: fallbackImages[input.category],
    ratingAvg: 5,
    reviewCount: 0,
    rules:
      input.rules?.trim().slice(0, 500) ||
      'Standard municipal sound limits apply after 22:30. Direct coordination with host prior to arrival.',
    isActive: input.isActive ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'venues', venueId), venue);
    return venue;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `venues/${venueId}`);
  }
}

export async function updateAdminVenueListing(
  venue: Venue,
  updates: {
    name: string;
    city: Venue['city'];
    neighborhood: string;
    address: string;
    category: Venue['category'];
    hourlyRate: number;
    capacityMin: number;
    capacityMax: number;
    amenities: string[];
    description: string;
    rules: string;
    isActive: boolean;
  }
): Promise<void> {
  const pricePerSlot = Math.max(1000, Math.round(updates.hourlyRate * 4));
  const safeMin = Math.max(1, Math.min(updates.capacityMin, updates.capacityMax));
  const path = `venues/${venue.id}`;
  try {
    await updateDoc(doc(db, 'venues', venue.id), {
      name: updates.name.trim().slice(0, 100),
      nameHi: updates.name.trim().slice(0, 140),
      nameMr: updates.name.trim().slice(0, 140),
      city: updates.city,
      neighborhood: updates.neighborhood.trim().slice(0, 80),
      address: updates.address.trim().slice(0, 200),
      category: updates.category,
      hourlyRate: updates.hourlyRate,
      pricePerSlot,
      depositAmount: Math.round(pricePerSlot * 0.2),
      capacityMin: safeMin,
      capacityMax: updates.capacityMax,
      amenities: updates.amenities.slice(0, 15),
      description: updates.description.trim().slice(0, 1200),
      descriptionHi: updates.description.trim().slice(0, 1500),
      descriptionMr: updates.description.trim().slice(0, 1500),
      rules: updates.rules.trim().slice(0, 500),
      isActive: updates.isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleVenueActiveStatus(
  venueId: string,
  nextIsActive: boolean
): Promise<void> {
  const path = `venues/${venueId}`;
  try {
    await updateDoc(doc(db, 'venues', venueId), {
      isActive: nextIsActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteAdminVenueListing(venueId: string): Promise<void> {
  const path = `venues/${venueId}`;
  try {
    await deleteDoc(doc(db, 'venues', venueId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function getNotificationsCollectionRef() {
  return collection(db, 'notifications');
}
