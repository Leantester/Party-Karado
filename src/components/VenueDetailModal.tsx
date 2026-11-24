import React, { useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Lock,
  MapPin,
  MessageSquare,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  XCircle,
} from 'lucide-react';
import { OperationType, db, handleFirestoreError } from '../firebase';
import { TranslationBundle, formatINR } from '../i18n/translations';
import {
  deriveSlotTypeFromHours,
  getSlotHourRange,
  normalizeLegacyBooking,
  publishReview,
  verifyPaymentAndCreateBooking,
} from '../services/firestoreService';
import {
  Booking,
  EventType,
  Language,
  PaymentMethod,
  Review,
  SlotLock,
  SlotType,
  Venue,
} from '../types';

interface VenueDetailModalProps {
  venue: Venue;
  language: Language;
  t: TranslationBundle;
  user: User | null;
  userDisplayName: string;
  userPhone: string;
  slotLocks: SlotLock[];
  reviews: Review[];
  initialDate: string;
  onClose: () => void;
  onSignIn: () => Promise<void>;
  onMessageHost: (venue: Venue) => void;
  onGoToBookings: () => void;
}

const PRESET_SLOTS: Exclude<SlotType, 'custom'>[] = [
  'morning',
  'evening',
  'night',
  'fullday',
];

// 14 hourly blocks covering 10:00 through 24:00 (10:00–11:00 ... 23:00–24:00)
const BOOKABLE_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

const EVENTS: EventType[] = [
  'birthday',
  'sangeet',
  'anniversary',
  'corporate',
  'cocktail',
  'family',
];

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({
  venue,
  language,
  t,
  user,
  userDisplayName,
  userPhone,
  slotLocks,
  reviews,
  initialDate,
  onClose,
  onSignIn,
  onMessageHost,
  onGoToBookings,
}) => {
  const venueReviews = useMemo(
    () => reviews.filter((r) => r.venueId === venue.id),
    [reviews, venue.id]
  );

  const ratingStats = useMemo(() => {
    if (venueReviews.length === 0) {
      return {
        avg: venue.ratingAvg,
        count: venue.reviewCount,
        cleanliness: venue.ratingAvg,
        ambience: venue.ratingAvg,
        acoustics: venue.ratingAvg,
        host: venue.ratingAvg,
      };
    }
    const n = venueReviews.length;
    const sum = venueReviews.reduce(
      (acc, r) => ({
        rating: acc.rating + r.rating,
        cleanliness: acc.cleanliness + r.cleanlinessRating,
        ambience: acc.ambience + r.ambienceRating,
        acoustics: acc.acoustics + r.acousticsRating,
        host: acc.host + r.hostRating,
      }),
      { rating: 0, cleanliness: 0, ambience: 0, acoustics: 0, host: 0 }
    );
    return {
      avg: sum.rating / n,
      count: n,
      cleanliness: sum.cleanliness / n,
      ambience: sum.ambience / n,
      acoustics: sum.acoustics / n,
      host: sum.host / n,
    };
  }, [venueReviews, venue.ratingAvg, venue.reviewCount]);

  const defaultTomorrow = useMemo(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, [initialDate]);

  const [date, setDate] = useState(defaultTomorrow);
  const [startHour, setStartHour] = useState(16);
  const [endHour, setEndHour] = useState(20);
  const [dateBookings, setDateBookings] = useState<Booking[]>([]);

  const [guestCount, setGuestCount] = useState(
    Math.min(venue.capacityMax, Math.max(venue.capacityMin, 50))
  );
  const [eventType, setEventType] = useState<EventType>('birthday');
  const [guestName, setGuestName] = useState(userDisplayName);
  const [guestPhone, setGuestPhone] = useState(userPhone);
  const [specialRequests, setSpecialRequests] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [upiId, setUpiId] = useState('celebrate@okaxis');
  const [cardHolder, setCardHolder] = useState(userDisplayName || '');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('424');
  const [bankCode, setBankCode] = useState('HDFC');

  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Review state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cleanlinessRating, setCleanlinessRating] = useState(5);
  const [ambienceRating, setAmbienceRating] = useState(5);
  const [acousticsRating, setAcousticsRating] = useState(5);
  const [hostRating, setHostRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Real-time query of bookings by venueId and date to disable overlapping hours
  useEffect(() => {
    if (!venue.id || !date) return;
    const q = query(
      collection(db, 'bookings'),
      where('venueId', '==', venue.id),
      where('date', '==', date)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const active = snap.docs
          .map((d) => normalizeLegacyBooking(d.data() as Record<string, unknown>))
          .filter((b) => b.bookingStatus !== 'cancelled');
        setDateBookings(active);
      },
      (err) => {
        handleFirestoreError(
          err,
          OperationType.LIST,
          `bookings?venueId=${venue.id}&date=${date}`
        );
      }
    );
    return () => unsub();
  }, [venue.id, date]);

  // Compute exact booked hours from BOTH bookings(venueId, date) AND slot_locks
  const bookedHoursSet = useMemo(() => {
    const taken = new Set<number>();

    for (const b of dateBookings) {
      for (let h = b.startHour; h < b.endHour; h += 1) {
        taken.add(h);
      }
    }

    for (const lock of slotLocks) {
      if (lock.venueId !== venue.id || lock.date !== date) continue;
      if (typeof lock.hour === 'number') {
        taken.add(lock.hour);
      } else {
        const range = getSlotHourRange(lock.slot);
        for (let h = range.startHour; h < range.endHour; h += 1) {
          taken.add(h);
        }
      }
    }

    return taken;
  }, [dateBookings, slotLocks, venue.id, date]);

  const isRangeOverlapping = (sHour: number, eHour: number): boolean => {
    for (let h = sHour; h < eHour; h += 1) {
      if (bookedHoursSet.has(h)) return true;
    }
    return false;
  };

  // Auto-shift default selection if current selected hours overlap a newly booked range
  useEffect(() => {
    if (!isRangeOverlapping(startHour, endHour)) return;
    const firstFreeHour = BOOKABLE_HOURS.find((h) => !bookedHoursSet.has(h));
    if (firstFreeHour !== undefined) {
      let nextEnd = firstFreeHour + 1;
      while (
        nextEnd <= 24 &&
        nextEnd - firstFreeHour < 4 &&
        !bookedHoursSet.has(nextEnd - 1)
      ) {
        nextEnd += 1;
      }
      if (isRangeOverlapping(firstFreeHour, nextEnd)) {
        nextEnd = firstFreeHour + 1;
      }
      setStartHour(firstFreeHour);
      setEndHour(nextEnd);
    }
  }, [bookedHoursSet]);

  const selectedSlotType = deriveSlotTypeFromHours(startHour, endHour);
  const selectedDuration = Math.max(1, endHour - startHour);
  const isSelectedRangeTaken = isRangeOverlapping(startHour, endHour);
  const isVenuePaused = venue.isActive === false;

  const baseAmount = Math.round(venue.hourlyRate * selectedDuration);
  const gstAmount = Math.round((baseAmount + venue.cleaningFee) * 0.18);
  const totalPayable =
    baseAmount + venue.cleaningFee + venue.depositAmount + gstAmount;

  const title =
    language === 'hi' ? venue.nameHi : language === 'mr' ? venue.nameMr : venue.name;
  const description =
    language === 'hi'
      ? venue.descriptionHi
      : language === 'mr'
      ? venue.descriptionMr
      : venue.description;

  const handleHourClick = (hour: number) => {
    if (bookedHoursSet.has(hour)) return;
    // If clicking before current start, or clicking an already multi-hour range, reset to 1-hour selection
    if (hour < startHour || endHour - startHour > 1) {
      setStartHour(hour);
      setEndHour(hour + 1);
      return;
    }
    if (hour === startHour) {
      setStartHour(hour);
      setEndHour(hour + 1);
      return;
    }
    // Try extending from startHour to hour + 1 if contiguous range has no booked hours
    if (!isRangeOverlapping(startHour, hour + 1)) {
      setEndHour(hour + 1);
    } else {
      setStartHour(hour);
      setEndHour(hour + 1);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await onSignIn();
      return;
    }
    if (isVenuePaused) {
      setBookingError(t.detail.inactiveVenueNotice);
      return;
    }
    if (isSelectedRangeTaken) {
      setBookingError(
        'Selected hours overlap with an existing booking. Please pick open hours.'
      );
      return;
    }
    if (!guestName.trim() || guestPhone.trim().length < 7) {
      setBookingError('Please enter your contact name and a valid mobile number.');
      return;
    }

    setBookingError(null);
    setIsProcessing(true);
    try {
      const booking = await verifyPaymentAndCreateBooking({
        venue,
        user,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        eventType,
        date,
        startHour,
        endHour,
        guestCount,
        specialRequests,
        paymentMethod,
        upiId,
        cardHolder,
        cardNumber,
        cardExpiry,
        cardCvv,
        bankCode,
      });
      setConfirmedBooking(booking);
    } catch (err) {
      setBookingError(
        err instanceof Error
          ? err.message
          : 'Unable to complete booking. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublishReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      await onSignIn();
      return;
    }
    if (reviewComment.trim().length < 5) {
      setReviewError('Please write at least a brief sentence about your experience.');
      return;
    }
    setReviewError(null);
    setReviewSubmitting(true);
    try {
      await publishReview({
        venue,
        user,
        authorName: userDisplayName || user.displayName || 'Verified Guest',
        cleanlinessRating,
        ambienceRating,
        acousticsRating,
        hostRating,
        eventType: t.events[eventType],
        comment: reviewComment,
      });
      setReviewComment('');
      setShowReviewForm(false);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to publish review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const slotLabel = (slot: Exclude<SlotType, 'custom'>) => {
    switch (slot) {
      case 'morning':
        return { name: t.slots.morning, time: t.slots.morningTime };
      case 'evening':
        return { name: t.slots.evening, time: t.slots.eveningTime };
      case 'night':
        return { name: t.slots.night, time: t.slots.nightTime };
      case 'fullday':
        return { name: t.slots.fullday, time: t.slots.fulldayTime };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#18181B] hover:text-[#C83E2B] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t.detail.backToVenues}</span>
        </button>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Imagery, Overview, Amenities, Host, Reviews */}
          <div className="lg:col-span-7 space-y-8">
            <div className="rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#F3F1EC] aspect-[16/10]">
              <img
                src={venue.imageUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                <span>{t.categories[venue.category] || venue.category}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C83E2B]" />
                  {venue.address}
                </span>
              </div>
              <h1 className="mt-2 font-display text-3xl sm:text-4xl font-semibold text-[#18181B] text-balance leading-tight">
                {title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#57534E] tabular-nums">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#18181B]">
                  <Star className="w-4 h-4 text-[#B45309] fill-[#B45309]" />
                  {ratingStats.avg.toFixed(1)} ({ratingStats.count} {t.venueCard.reviews})
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {venue.capacityMin}–{venue.capacityMax} {t.venueCard.guests}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-[#E5E1D8]">
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.detail.overview}
              </h2>
              <p className="mt-3 text-base text-[#3F3F46] leading-relaxed">{description}</p>
            </div>

            <div className="pt-6 border-t border-[#E5E1D8]">
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.detail.amenitiesTitle}
              </h2>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {venue.amenities.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-2.5 p-3 bg-white border border-[#E5E1D8] rounded-lg text-sm text-[#18181B]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
                    <span>{t.amenities[key] || key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-[#E5E1D8]">
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.detail.houseRules}
              </h2>
              <p className="mt-2 text-sm text-[#57534E] leading-relaxed">{venue.rules}</p>
            </div>

            {/* Host Card */}
            <div className="p-5 bg-white border border-[#E5E1D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#57534E]">
                  {t.detail.hostedBy} <span aria-hidden="true">·</span> {venue.hostRoleLabel}
                </p>
                <p className="mt-1 text-lg font-semibold text-[#18181B]">{venue.hostName}</p>
              </div>
              <button
                type="button"
                onClick={() => onMessageHost(venue)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#F3F1EC] hover:bg-[#E5E1D8] text-[#18181B] text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4 text-[#C83E2B]" />
                <span>{t.detail.messageHost}</span>
              </button>
            </div>

            {/* Reviews & Transparency Breakdown */}
            <div className="pt-6 border-t border-[#E5E1D8]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-[#18181B]">
                  {t.detail.reviewsTitle}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowReviewForm((prev) => !prev)}
                  className="px-4 py-2 bg-white border border-[#D6D1C4] hover:border-[#18181B] text-sm font-medium text-[#18181B] rounded-lg transition-colors cursor-pointer"
                >
                  {t.detail.writeReview}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white border border-[#E5E1D8] rounded-xl">
                {[
                  { label: t.detail.cleanliness, val: ratingStats.cleanliness },
                  { label: t.detail.ambience, val: ratingStats.ambience },
                  { label: t.detail.acoustics, val: ratingStats.acoustics },
                  { label: t.detail.hostCare, val: ratingStats.host },
                ].map((metric) => (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-xs text-[#57534E]">
                      <span className="truncate">{metric.label}</span>
                      <span className="font-semibold text-[#18181B] tabular-nums">
                        {metric.val.toFixed(1)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full bg-[#F3F1EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#B45309] rounded-full"
                        style={{ width: `${(metric.val / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {showReviewForm && (
                <form
                  onSubmit={handlePublishReview}
                  className="mt-4 p-5 bg-white border border-[#E5E1D8] rounded-xl space-y-4"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: t.detail.cleanliness,
                        value: cleanlinessRating,
                        setter: setCleanlinessRating,
                      },
                      {
                        label: t.detail.ambience,
                        value: ambienceRating,
                        setter: setAmbienceRating,
                      },
                      {
                        label: t.detail.acoustics,
                        value: acousticsRating,
                        setter: setAcousticsRating,
                      },
                      {
                        label: t.detail.hostCare,
                        value: hostRating,
                        setter: setHostRating,
                      },
                    ].map((item) => (
                      <label key={item.label} className="block text-xs text-[#57534E]">
                        <span className="block mb-1 font-medium text-[#18181B]">
                          {item.label}
                        </span>
                        <select
                          value={item.value}
                          onChange={(e) => item.setter(Number(e.target.value))}
                          className="w-full px-2.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n} value={n}>
                              {n} / 5
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={t.detail.reviewPlaceholder}
                    className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                  />

                  {reviewError && <p className="text-xs text-[#B91C1C]">{reviewError}</p>}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 text-sm text-[#57534E] hover:text-[#18181B] cursor-pointer"
                    >
                      {t.common.close}
                    </button>
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-5 py-2 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] disabled:opacity-50 cursor-pointer"
                    >
                      {user ? t.detail.submitReview : t.common.signInGoogle}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-4 space-y-4">
                {venueReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-white border border-[#E5E1D8] rounded-xl"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[#18181B]">
                          {review.authorName}
                        </p>
                        <p className="text-xs text-[#57534E]">{review.eventType}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#18181B] tabular-nums">
                        <Star className="w-4 h-4 text-[#B45309] fill-[#B45309]" />
                        {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-2.5 text-sm text-[#3F3F46] leading-relaxed">
                      {review.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Contiguous Booking & Payment Gateway */}
          <aside className="lg:col-span-5 lg:sticky lg:top-6 bg-white border border-[#E5E1D8] rounded-xl p-6 shadow-sm">
            {confirmedBooking ? (
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-[#15803D] shrink-0 mt-0.5" />
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-[#18181B]">
                      {t.detail.bookingConfirmedTitle}
                    </h2>
                    <p className="mt-1 text-sm text-[#57534E]">
                      {t.detail.bookingConfirmedSubtitle}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-[#FAF9F6] border border-[#E5E1D8] rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t.detail.transactionId}</span>
                    <span className="font-mono font-medium text-[#18181B]">
                      {confirmedBooking.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t.detail.selectDate}</span>
                    <span className="tabular-nums font-medium text-[#18181B]">
                      {confirmedBooking.date} ({formatHour(confirmedBooking.startHour)} –{' '}
                      {formatHour(confirmedBooking.endHour)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#57534E]">{t.detail.totalPayable}</span>
                    <span className="tabular-nums font-semibold text-[#18181B]">
                      {formatINR(confirmedBooking.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={onGoToBookings}
                    className="flex-1 py-3 px-4 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] transition-colors cursor-pointer"
                  >
                    {t.detail.viewMyBookings}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 bg-[#F3F1EC] text-[#18181B] text-sm font-medium rounded-lg hover:bg-[#E5E1D8] transition-colors cursor-pointer"
                  >
                    {t.detail.bookAnother}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-[#E5E1D8] pb-4">
                  <h2 className="font-display text-xl font-semibold text-[#18181B]">
                    {t.detail.bookingTitle}
                  </h2>
                  <div className="text-right tabular-nums">
                    <div>
                      <span className="text-xl font-semibold text-[#18181B]">
                        {formatINR(venue.hourlyRate)}
                      </span>{' '}
                      <span className="text-xs text-[#57534E]">{t.venueCard.perHour}</span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      {formatINR(venue.pricePerSlot)} {t.venueCard.perSlot}
                    </p>
                  </div>
                </div>

                {isVenuePaused && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>{t.detail.inactiveVenueNotice}</span>
                  </div>
                )}

                {/* Step 1: Real-Time Availability & Overlapping Hours */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#18181B]">{t.detail.step1}</p>
                  <label className="block">
                    <span className="text-xs text-[#57534E] flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {t.detail.selectDate}
                    </span>
                    <input
                      type="date"
                      value={date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B] tabular-nums"
                    />
                  </label>

                  {/* Quick Slot Presets */}
                  <div>
                    <span className="text-xs text-[#57534E] flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5" />
                      {t.detail.selectSlot}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {PRESET_SLOTS.map((slot) => {
                        const range = getSlotHourRange(slot);
                        const taken = isRangeOverlapping(range.startHour, range.endHour);
                        const info = slotLabel(slot);
                        const active =
                          selectedSlotType === slot &&
                          startHour === range.startHour &&
                          endHour === range.endHour;
                        return (
                          <button
                            key={slot}
                            type="button"
                            disabled={taken || isVenuePaused}
                            onClick={() => {
                              setStartHour(range.startHour);
                              setEndHour(range.endHour);
                            }}
                            className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              taken
                                ? 'bg-[#F3F1EC] border-[#E5E1D8] text-[#78716C] opacity-75'
                                : active
                                ? 'bg-[#C83E2B]/10 border-[#C83E2B] text-[#18181B]'
                                : 'bg-[#FAF9F6] border-[#D6D1C4] text-[#18181B] hover:border-[#18181B]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold truncate">{info.name}</span>
                              {taken ? (
                                <XCircle className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                              ) : (
                                <CheckCircle2
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    active ? 'text-[#C83E2B]' : 'text-[#15803D]'
                                  }`}
                                />
                              )}
                            </div>
                            <p className="text-[11px] text-[#57534E] mt-0.5 tabular-nums">
                              {info.time} · {taken ? t.detail.unavailable : t.detail.available}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Hourly Grid (Disables Overlapping Booked Hours) */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#18181B]">
                        {t.detail.selectHoursTitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#57534E] mb-2">
                      {t.detail.selectHoursHint}
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {BOOKABLE_HOURS.map((hour) => {
                        const isBooked = bookedHoursSet.has(hour);
                        const isSelected = !isBooked && hour >= startHour && hour < endHour;
                        return (
                          <button
                            key={hour}
                            type="button"
                            disabled={isBooked || isVenuePaused}
                            onClick={() => handleHourClick(hour)}
                            className={`px-2 py-1.5 rounded-md border text-[11px] font-medium tabular-nums transition-colors cursor-pointer disabled:cursor-not-allowed ${
                              isBooked
                                ? 'bg-[#F3F1EC] border-[#E5E1D8] text-[#A8A29E] line-through'
                                : isSelected
                                ? 'bg-[#C83E2B] border-[#C83E2B] text-white'
                                : 'bg-[#FAF9F6] border-[#D6D1C4] text-[#18181B] hover:border-[#18181B]'
                            }`}
                          >
                            {formatHour(hour)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-[#57534E] tabular-nums">
                      {t.detail.selectedHoursSummary}:{' '}
                      <span className="font-semibold text-[#18181B]">
                        {formatHour(startHour)} – {formatHour(endHour)} ({selectedDuration}h)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Step 2: Event & Guest Details */}
                <div className="space-y-3 pt-4 border-t border-[#E5E1D8]">
                  <p className="text-sm font-semibold text-[#18181B]">{t.detail.step2}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.detail.guestCount}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={venue.capacityMax}
                        value={guestCount}
                        onChange={(e) => setGuestCount(Number(e.target.value))}
                        required
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.detail.eventType}
                      </span>
                      <select
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value as EventType)}
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                      >
                        {EVENTS.map((ev) => (
                          <option key={ev} value={ev}>
                            {t.events[ev]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.detail.guestName}
                      </span>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.detail.guestPhone}
                      </span>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="+91 98200 00000"
                        required
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.detail.specialRequests}
                    </span>
                    <input
                      type="text"
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder={t.detail.specialRequestsPlaceholder}
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    />
                  </label>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E5E1D8] rounded-xl space-y-2 text-sm">
                  <p className="text-xs font-semibold text-[#18181B] mb-2">
                    {t.detail.priceBreakdown}
                  </p>
                  <div className="flex justify-between text-[#57534E]">
                    <span>
                      {t.detail.baseTariff} ({formatINR(venue.hourlyRate)} × {selectedDuration}h)
                    </span>
                    <span className="tabular-nums text-[#18181B]">{formatINR(baseAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[#57534E]">
                    <span>{t.detail.cleaningFee}</span>
                    <span className="tabular-nums text-[#18181B]">
                      {formatINR(venue.cleaningFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#57534E]">
                    <span>{t.detail.securityDeposit}</span>
                    <span className="tabular-nums text-[#18181B]">
                      {formatINR(venue.depositAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#57534E]">
                    <span>{t.detail.gst}</span>
                    <span className="tabular-nums text-[#18181B]">{formatINR(gstAmount)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#E5E1D8] flex justify-between font-semibold text-[#18181B]">
                    <span>{t.detail.totalPayable}</span>
                    <span className="text-base tabular-nums">{formatINR(totalPayable)}</span>
                  </div>
                </div>

                {/* Step 3: Secure Payment Gateway */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#18181B]">{t.detail.step3}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-[#15803D]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {t.detail.paymentMethodTitle}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F3F1EC] rounded-lg">
                    {(
                      [
                        { id: 'upi', label: t.detail.upiLabel, icon: Smartphone },
                        { id: 'card', label: t.detail.cardLabel, icon: CreditCard },
                        { id: 'netbanking', label: t.detail.netbankingLabel, icon: Landmark },
                      ] as const
                    ).map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`py-2 px-2 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                            paymentMethod === m.id
                              ? 'bg-white text-[#18181B] shadow-sm'
                              : 'text-[#57534E] hover:text-[#18181B]'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethod === 'upi' && (
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder={t.detail.upiIdPlaceholder}
                      required
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    />
                  )}

                  {paymentMethod === 'card' && (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder={t.detail.cardHolderPlaceholder}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder={t.detail.cardNumberPlaceholder}
                        required
                        className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm font-mono tabular-nums"
                      />
                      <div className="grid grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder={t.detail.cardExpiryPlaceholder}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm font-mono tabular-nums"
                        />
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          placeholder={t.detail.cardCvvPlaceholder}
                          maxLength={4}
                          required
                          className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm font-mono tabular-nums"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <select
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      <option value="HDFC">HDFC Bank</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="SBI">State Bank of India (SBI)</option>
                      <option value="AXIS">Axis Bank</option>
                      <option value="KOTAK">Kotak Mahindra Bank</option>
                    </select>
                  )}
                </div>

                {bookingError && (
                  <p className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
                    {bookingError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isProcessing || isSelectedRangeTaken || isVenuePaused}
                  className="w-full py-3.5 px-5 bg-[#C83E2B] text-white text-sm font-semibold rounded-lg hover:bg-[#AE3221] transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {!user
                      ? t.detail.signInToBook
                      : isProcessing
                      ? t.detail.processingPayment
                      : `${t.detail.payAndConfirm} (${formatINR(totalPayable)})`}
                  </span>
                </button>
              </form>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};
