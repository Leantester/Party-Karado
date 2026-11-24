import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import {
  Bell,
  Compass,
  Globe,
  LayoutGrid,
  Map as MapIcon,
  Menu,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MessagesView } from './components/MessagesView';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ProfileDashboard } from './components/ProfileDashboard';
import { VenueCard } from './components/VenueCard';
import { VenueDetailModal } from './components/VenueDetailModal';
import { VenueMapView } from './components/VenueMapView';
import { SEED_REVIEWS, SEED_VENUES } from './data/seedVenues';
import { OperationType, auth, db, googleProvider, handleFirestoreError } from './firebase';
import { AMENITY_KEYS, TRANSLATIONS } from './i18n/translations';
import {
  ensureSeedCatalog,
  ensureUserProfile,
  getOrCreateConversation,
  getSlotHourRange,
  normalizeLegacyBooking,
  updateUserProfile,
} from './services/firestoreService';
import {
  AppNotification,
  Booking,
  BookingReceipt,
  CapacityBand,
  Conversation,
  FilterState,
  HourlyRateBand,
  Language,
  Review,
  SlotLock,
  SlotType,
  SortOption,
  UserProfile,
  Venue,
} from './types';

type ActiveSection = 'explore' | 'map' | 'messages' | 'profile';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function PartyKaradoApp() {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('pk_lang') : null;
    if (saved === 'hi' || saved === 'mr' || saved === 'en') return saved;
    return 'en';
  });
  const t = TRANSLATIONS[language];

  const [section, setSection] = useState<ActiveSection>('explore');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Maps API key + Demo Key Quota Defense
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // Auth & Profile
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Live Firestore Data
  const [firestoreVenues, setFirestoreVenues] = useState<Venue[]>([]);
  const [venuesLoaded, setVenuesLoaded] = useState(false);
  const [firestoreReviews, setFirestoreReviews] = useState<Review[]>([]);
  const [slotLocks, setSlotLocks] = useState<SlotLock[]>([]);
  const [guestBookings, setGuestBookings] = useState<Booking[]>([]);
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);
  const [guestReceipts, setGuestReceipts] = useState<BookingReceipt[]>([]);
  const [hostReceipts, setHostReceipts] = useState<BookingReceipt[]>([]);
  const [guestConversations, setGuestConversations] = useState<Conversation[]>([]);
  const [hostConversations, setHostConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // UI Selection & Filtering
  const [activeVenue, setActiveVenue] = useState<Venue | null>(null);
  const [selectedMapVenueId, setSelectedMapVenueId] = useState<string | null>(null);
  const [hoveredVenueId, setHoveredVenueId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [notifDrawerOpen, setNotifDrawerOpen] = useState(false);
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);
  const seenNotifIdsRef = useRef<Set<string>>(new Set());
  const initialNotifLoadRef = useRef(true);

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    city: 'all',
    category: 'all',
    capacityBand: 'all',
    hourlyRateBand: 'all',
    amenities: [],
    date: '',
    slot: 'any',
    sortBy: 'recommended',
  });

  // Listen for Google Maps Quota Events
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Fetch Maps API key fallback from server if not in Vite env
  useEffect(() => {
    if (mapsApiKey) return;
    fetch('/api/maps-config')
      .then((res) => res.json())
      .then((data: { apiKey?: string }) => {
        if (data.apiKey) setMapsApiKey(data.apiKey);
      })
      .catch(() => {
        // Fallback map stays active if no key configured
      });
  }, [mapsApiKey]);

  // Persist language choice
  const handleLanguageChange = useCallback(
    (nextLang: Language) => {
      setLanguage(nextLang);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('pk_lang', nextLang);
      }
      if (user) {
        void updateUserProfile(user.uid, { preferredLanguage: nextLang });
      }
    },
    [user]
  );

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        try {
          const prof = await ensureUserProfile(currentUser, language);
          setProfile(prof);
          if (prof.preferredLanguage) {
            setLanguage(prof.preferredLanguage);
          }
          await ensureSeedCatalog(currentUser);
        } catch (err) {
          console.error('Profile initialization warning:', err);
        }
      } else {
        setProfile(null);
        setGuestBookings([]);
        setHostBookings([]);
        setGuestReceipts([]);
        setHostReceipts([]);
        setGuestConversations([]);
        setHostConversations([]);
        setNotifications([]);
        initialNotifLoadRef.current = true;
        seenNotifIdsRef.current.clear();
      }
    });
    return () => unsub();
  }, []);

  // Public Catalog Listeners (Venues, Reviews, Slot Locks)
  useEffect(() => {
    const unsubVenues = onSnapshot(
      collection(db, 'venues'),
      (snap) => {
        setFirestoreVenues(snap.docs.map((d) => d.data() as Venue));
        setVenuesLoaded(true);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'venues')
    );

    const unsubReviews = onSnapshot(
      collection(db, 'reviews'),
      (snap) => {
        setFirestoreReviews(snap.docs.map((d) => d.data() as Review));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reviews')
    );

    const unsubLocks = onSnapshot(
      collection(db, 'slot_locks'),
      (snap) => {
        setSlotLocks(snap.docs.map((d) => d.data() as SlotLock));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'slot_locks')
    );

    return () => {
      unsubVenues();
      unsubReviews();
      unsubLocks();
    };
  }, []);

  // Authenticated Private Listeners (Profile, Bookings, Receipts, Conversations, Notifications)
  useEffect(() => {
    if (!authReady || !user) return;

    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => handleFirestoreError(err, OperationType.GET, `users/${user.uid}`)
    );

    const unsubGuestBookings = onSnapshot(
      query(collection(db, 'bookings'), where('userId', '==', user.uid)),
      (snap) => {
        setGuestBookings(
          snap.docs.map((d) =>
            normalizeLegacyBooking(d.data() as Record<string, unknown>)
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubHostBookings = onSnapshot(
      query(collection(db, 'bookings'), where('hostId', '==', user.uid)),
      (snap) => {
        setHostBookings(
          snap.docs.map((d) =>
            normalizeLegacyBooking(d.data() as Record<string, unknown>)
          )
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'bookings')
    );

    const unsubGuestReceipts = onSnapshot(
      query(collection(db, 'booking_receipts'), where('userId', '==', user.uid)),
      (snap) => {
        setGuestReceipts(snap.docs.map((d) => d.data() as BookingReceipt));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'booking_receipts')
    );

    const unsubHostReceipts = onSnapshot(
      query(collection(db, 'booking_receipts'), where('hostId', '==', user.uid)),
      (snap) => {
        setHostReceipts(snap.docs.map((d) => d.data() as BookingReceipt));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'booking_receipts')
    );

    const unsubGuestConvs = onSnapshot(
      query(collection(db, 'conversations'), where('guestId', '==', user.uid)),
      (snap) => {
        setGuestConversations(snap.docs.map((d) => d.data() as Conversation));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const unsubHostConvs = onSnapshot(
      query(collection(db, 'conversations'), where('hostId', '==', user.uid)),
      (snap) => {
        setHostConversations(snap.docs.map((d) => d.data() as Conversation));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'notifications'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as AppNotification);
        list.sort((a, b) => {
          const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
          const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds ?? 0;
          return bSec - aSec;
        });

        if (initialNotifLoadRef.current) {
          list.forEach((n) => seenNotifIdsRef.current.add(n.id));
          initialNotifLoadRef.current = false;
        } else {
          for (const item of list) {
            if (!seenNotifIdsRef.current.has(item.id)) {
              seenNotifIdsRef.current.add(item.id);
              setLiveToast(item);
              if (
                typeof window !== 'undefined' &&
                'Notification' in window &&
                Notification.permission === 'granted'
              ) {
                const title =
                  language === 'hi'
                    ? item.titleHi
                    : language === 'mr'
                    ? item.titleMr
                    : item.title;
                const body =
                  language === 'hi'
                    ? item.bodyHi
                    : language === 'mr'
                    ? item.bodyMr
                    : item.body;
                new Notification(title, { body });
              }
            }
          }
        }

        setNotifications(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
    );

    return () => {
      unsubProfile();
      unsubGuestBookings();
      unsubHostBookings();
      unsubGuestReceipts();
      unsubHostReceipts();
      unsubGuestConvs();
      unsubHostConvs();
      unsubNotifs();
    };
  }, [authReady, user, language]);

  // Auto-dismiss live toast after 5s
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 5000);
    return () => clearTimeout(timer);
  }, [liveToast]);

  const handleSignIn = useCallback(async () => {
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in cancelled or failed:', err);
    } finally {
      setSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
  }, []);

  const handleEnablePush = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setPushPermission(perm);
    if (perm === 'granted' && user) {
      await updateUserProfile(user.uid, { pushEnabled: true });
    }
  }, [user]);

  // Use live Firestore venues whenever Firestore has docs; fallback to seed list only if collection is empty
  const allVenues = useMemo(() => {
    if (venuesLoaded && firestoreVenues.length > 0) {
      return [...firestoreVenues].sort((a, b) => a.name.localeCompare(b.name));
    }
    return SEED_VENUES;
  }, [venuesLoaded, firestoreVenues]);

  // Customer-visible venues in Explore & Map View (live-updated on isActive changes)
  const activeVenues = useMemo(
    () => allVenues.filter((v) => v.isActive !== false),
    [allVenues]
  );

  // Keep open detail modal synced with live Firestore venue updates
  const liveActiveVenue = useMemo(() => {
    if (!activeVenue) return null;
    return allVenues.find((v) => v.id === activeVenue.id) || activeVenue;
  }, [activeVenue, allVenues]);

  const reviews = useMemo(() => {
    const byId: Record<string, Review> = {};
    for (const r of SEED_REVIEWS) byId[r.id] = r;
    for (const r of firestoreReviews) byId[r.id] = r;
    return Object.values(byId);
  }, [firestoreReviews]);

  const bookings = useMemo(() => {
    const receiptById: Record<string, BookingReceipt> = {};
    for (const r of guestReceipts) receiptById[r.bookingId] = r;
    for (const r of hostReceipts) receiptById[r.bookingId] = r;

    const byId: Record<string, Booking> = {};
    for (const b of guestBookings) byId[b.id] = b;
    for (const b of hostBookings) byId[b.id] = b;

    return Object.values(byId)
      .map((b) => {
        const receipt = receiptById[b.id];
        return receipt
          ? {
              ...b,
              guestName: receipt.guestName,
              guestPhone: receipt.guestPhone,
              guestEmail: receipt.guestEmail,
              specialRequests: receipt.specialRequests,
              paymentMethod: receipt.paymentMethod,
              paymentLast4: receipt.paymentLast4,
              transactionId: receipt.transactionId,
            }
          : b;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [guestBookings, hostBookings, guestReceipts, hostReceipts]);

  const conversations = useMemo(() => {
    const byId: Record<string, Conversation> = {};
    for (const c of guestConversations) byId[c.id] = c;
    for (const c of hostConversations) byId[c.id] = c;
    return Object.values(byId).sort((a, b) => {
      const aSec = (a.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
      const bSec = (b.updatedAt as { seconds?: number } | undefined)?.seconds ?? 0;
      return bSec - aSec;
    });
  }, [guestConversations, hostConversations]);

  // Compute live rating per venue from reviews
  const venueRatings = useMemo(() => {
    const map: Record<string, { avg: number; count: number }> = {};
    const grouped: Record<string, number[]> = {};
    for (const rev of reviews) {
      if (!grouped[rev.venueId]) grouped[rev.venueId] = [];
      grouped[rev.venueId].push(rev.rating);
    }
    for (const v of allVenues) {
      const list = grouped[v.id];
      if (list && list.length > 0) {
        const avg = list.reduce((s, n) => s + n, 0) / list.length;
        map[v.id] = { avg, count: list.length };
      } else {
        map[v.id] = { avg: v.ratingAvg, count: v.reviewCount };
      }
    }
    return map;
  }, [allVenues, reviews]);

  // Availability check per venue for selected date/slot filter using hourly slot_locks
  const getVenueDateAvailability = useCallback(
    (venueId: string): 'open' | 'booked' | 'neutral' => {
      if (!filters.date) return 'neutral';
      const locksForDay = slotLocks.filter(
        (l) => l.venueId === venueId && l.date === filters.date
      );
      if (locksForDay.length === 0) return 'open';

      const takenHours = new Set<number>();
      for (const lock of locksForDay) {
        if (typeof lock.hour === 'number') {
          takenHours.add(lock.hour);
        } else {
          const r = getSlotHourRange(lock.slot);
          for (let h = r.startHour; h < r.endHour; h += 1) {
            takenHours.add(h);
          }
        }
      }

      if (filters.slot !== 'any') {
        const target = getSlotHourRange(filters.slot);
        for (let h = target.startHour; h < target.endHour; h += 1) {
          if (takenHours.has(h)) return 'booked';
        }
        return 'open';
      }

      return takenHours.size >= 14 ? 'booked' : 'open';
    },
    [filters.date, filters.slot, slotLocks]
  );

  const filteredVenues = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const list = activeVenues.filter((v) => {
      if (q) {
        const hay = `${v.name} ${v.nameHi} ${v.nameMr} ${v.neighborhood} ${v.city} ${v.address}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.city !== 'all' && v.city !== filters.city) return false;
      if (filters.category !== 'all' && v.category !== filters.category) return false;

      if (filters.capacityBand === 'intimate' && v.capacityMin > 40) return false;
      if (
        filters.capacityBand === 'medium' &&
        (v.capacityMax < 40 || v.capacityMin > 120)
      )
        return false;
      if (
        filters.capacityBand === 'grand' &&
        (v.capacityMax < 120 || v.capacityMin > 300)
      )
        return false;
      if (filters.capacityBand === 'mega' && v.capacityMax < 300) return false;

      const rate = v.hourlyRate ?? Math.round(v.pricePerSlot / 4);
      if (filters.hourlyRateBand === 'budget' && rate > 8000) return false;
      if (filters.hourlyRateBand === 'mid' && (rate <= 8000 || rate > 15000)) return false;
      if (filters.hourlyRateBand === 'premium' && rate <= 15000) return false;

      for (const reqAmenity of filters.amenities) {
        if (!v.amenities.includes(reqAmenity)) return false;
      }

      if (filters.date && getVenueDateAvailability(v.id) === 'booked') {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (userLocation && filters.sortBy === 'recommended') {
        return (
          haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng) -
          haversineKm(userLocation.lat, userLocation.lng, b.lat, b.lng)
        );
      }
      if (filters.sortBy === 'rating') {
        return (venueRatings[b.id]?.avg ?? 0) - (venueRatings[a.id]?.avg ?? 0);
      }
      if (filters.sortBy === 'price_asc') {
        return a.pricePerSlot - b.pricePerSlot;
      }
      if (filters.sortBy === 'capacity_desc') {
        return b.capacityMax - a.capacityMax;
      }
      return (venueRatings[b.id]?.avg ?? 0) - (venueRatings[a.id]?.avg ?? 0);
    });

    return list;
  }, [activeVenues, filters, userLocation, venueRatings, getVenueDateAvailability]);

  const handleToggleSave = useCallback(
    async (venueId: string) => {
      if (!user) {
        await handleSignIn();
        return;
      }
      const existingSaved = profile?.savedVenueIds || [];
      const nextSaved = existingSaved.includes(venueId)
        ? existingSaved.filter((id) => id !== venueId)
        : [...existingSaved, venueId];
      await updateUserProfile(user.uid, { savedVenueIds: nextSaved });
    },
    [user, profile, handleSignIn]
  );

  const handleMessageHost = useCallback(
    async (venue: Venue) => {
      if (!user) {
        await handleSignIn();
        return;
      }
      const convId = await getOrCreateConversation(
        venue,
        user,
        profile?.displayName || user.displayName || 'Guest'
      );
      setActiveConversationId(convId);
      setActiveVenue(null);
      setSection('messages');
    },
    [user, profile, handleSignIn]
  );

  const handleLocateMe = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setSection('map');
        setIsLocating(false);
      },
      () => {
        // Center on Mumbai Bandra if geolocation denied so map remains responsive
        setUserLocation({ lat: 19.0607, lng: 72.8295 });
        setSection('map');
        setIsLocating(false);
      },
      { timeout: 6000 }
    );
  }, []);

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = conversations.reduce((sum, c) => {
    if (!user) return sum;
    return sum + (c.hostId === user.uid ? c.unreadByHost : c.unreadByGuest);
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B]">
      {/* Demo Key Quota Banner */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setActiveVenue(null);
              setSection('explore');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#18181B] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {t.brand}
          </button>

          {/* Zone 2: 4 Clean Single-Line Nav Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#57534E]"
          >
            {(
              [
                { id: 'explore', label: t.nav.explore },
                { id: 'map', label: t.nav.mapView },
                {
                  id: 'messages',
                  label:
                    unreadMessages > 0
                      ? `${t.nav.messages} (${unreadMessages})`
                      : t.nav.messages,
                },
                { id: 'profile', label: t.nav.profile },
              ] as const
            ).map((item) => {
              const active = !activeVenue && section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveVenue(null);
                    setSection(item.id);
                  }}
                  className={`py-1 whitespace-nowrap shrink-0 transition-colors border-b-2 cursor-pointer ${
                    active
                      ? 'text-[#18181B] border-[#C83E2B]'
                      : 'border-transparent hover:text-[#18181B] hover:border-[#D6D1C4]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="px-4 py-2 text-xs font-medium text-[#18181B] bg-white border border-[#D6D1C4] rounded-lg hover:border-[#18181B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {t.nav.signOut}
              </button>
            ) : (
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleSignIn()}
                className="px-4 py-2 text-xs font-medium text-white bg-[#C83E2B] rounded-lg hover:bg-[#AE3221] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {signingIn ? t.common.signingIn : t.nav.signIn}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Menu"
              className="md:hidden p-2 rounded-lg text-[#18181B] hover:bg-[#F3F1EC] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E5E1D8] bg-white px-4 py-3 flex flex-col gap-1">
            {(
              [
                { id: 'explore', label: t.nav.explore },
                { id: 'map', label: t.nav.mapView },
                { id: 'messages', label: t.nav.messages },
                { id: 'profile', label: t.nav.profile },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveVenue(null);
                  setSection(item.id);
                  setMobileMenuOpen(false);
                }}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#18181B] hover:bg-[#F3F1EC] cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Accessible Workspace Bar: Language Switcher (EN / HI / MR) + Real-Time Alerts */}
      <div className="bg-[#F3F1EC] border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#57534E] shrink-0" />
            <span className="text-xs font-medium text-[#57534E] hidden sm:inline">
              {t.languageLabel}:
            </span>
            <div
              role="group"
              aria-label={t.languageLabel}
              className="inline-flex items-center gap-1 p-0.5 bg-white border border-[#E5E1D8] rounded-lg"
            >
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'hi', label: 'हिन्दी' },
                  { code: 'mr', label: 'मराठी' },
                ] as const
              ).map((langOption) => (
                <button
                  key={langOption.code}
                  type="button"
                  onClick={() => handleLanguageChange(langOption.code)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    language === langOption.code
                      ? 'bg-[#18181B] text-white'
                      : 'text-[#57534E] hover:text-[#18181B]'
                  }`}
                >
                  {langOption.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setNotifDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E5E1D8] hover:border-[#18181B] rounded-lg text-xs font-medium text-[#18181B] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Bell className="w-3.5 h-3.5 text-[#C83E2B]" />
            <span>{t.notifications.title}</span>
            {unreadNotifications > 0 && (
              <span className="font-semibold text-[#C83E2B] tabular-nums">
                ({unreadNotifications})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Live Push Notification Toast */}
      {liveToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-[#18181B] text-white rounded-xl p-4 shadow-xl border border-[#3F3F46]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {language === 'hi'
                  ? liveToast.titleHi
                  : language === 'mr'
                  ? liveToast.titleMr
                  : liveToast.title}
              </p>
              <p className="mt-1 text-xs text-zinc-300">
                {language === 'hi'
                  ? liveToast.bodyHi
                  : language === 'mr'
                  ? liveToast.bodyMr
                  : liveToast.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              aria-label={t.common.close}
              className="p-1 text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Router */}
      <main className="flex-1">
        {liveActiveVenue ? (
          <VenueDetailModal
            venue={liveActiveVenue}
            language={language}
            t={t}
            user={user}
            userDisplayName={profile?.displayName || user?.displayName || ''}
            userPhone={profile?.phone || ''}
            slotLocks={slotLocks}
            reviews={reviews}
            initialDate={filters.date}
            onClose={() => setActiveVenue(null)}
            onSignIn={handleSignIn}
            onMessageHost={handleMessageHost}
            onGoToBookings={() => {
              setActiveVenue(null);
              setSection('profile');
            }}
          />
        ) : section === 'messages' ? (
          <MessagesView
            t={t}
            user={user}
            userDisplayName={profile?.displayName || user?.displayName || ''}
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
            onSignIn={handleSignIn}
          />
        ) : section === 'profile' ? (
          <ProfileDashboard
            t={t}
            language={language}
            onChangeLanguage={handleLanguageChange}
            user={user}
            profile={profile}
            bookings={bookings}
            venues={allVenues}
            onSignIn={handleSignIn}
            onOpenVenue={setActiveVenue}
            onMessageHost={handleMessageHost}
          />
        ) : (
          <>
            {/* Storefront Hero (Shown in Explore mode) */}
            {section === 'explore' && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-center py-2">
                    <p className="text-xs font-semibold tracking-wide text-[#C83E2B]">
                      {t.hero.eyebrow}
                    </p>
                    <h1
                      className="mt-3 font-display font-semibold text-[#18181B] text-balance leading-[1.12]"
                      style={{ fontSize: 'clamp(2.15rem, 3.8vw, 3.35rem)' }}
                    >
                      {t.hero.title}
                    </h1>
                    <p className="mt-4 text-base text-[#57534E] leading-relaxed max-w-xl">
                      {t.hero.subtitle}
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                      <a
                        href="#venue-catalog"
                        className="px-6 py-3 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] transition-colors whitespace-nowrap"
                      >
                        {t.hero.ctaBrowse}
                      </a>
                      <button
                        type="button"
                        onClick={() => setSection('map')}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-[#D6D1C4] hover:border-[#18181B] text-[#18181B] text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <MapIcon className="w-4 h-4 text-[#C83E2B]" />
                        <span>{t.hero.ctaMap}</span>
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="h-full min-h-[280px] lg:min-h-[360px] rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#F3F1EC]">
                      <img
                        src="/src/assets/images/hero_rooftop_celebration_1795445659359.jpg"
                        alt="Party Karado Rooftop Celebration"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* 4-Column Trust Strip Below Hero Split */}
                <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 border border-[#E5E1D8] bg-white rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#E5E1D8]">
                  {[
                    { value: `${activeVenues.length}`, label: t.hero.statVenues },
                    { value: '100%', label: t.hero.statBooking },
                    { value: '4.8 ★', label: t.hero.statVerified },
                    { value: '3', label: t.hero.statSupport },
                  ].map((stat) => (
                    <div key={stat.label} className="px-5 py-4">
                      <p className="text-lg font-semibold text-[#18181B] tabular-nums">
                        {stat.value}
                      </p>
                      <p className="text-xs text-[#57534E] mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Filter Toolbar + Venue Catalog / Split Map */}
            <section
              id="venue-catalog"
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"
            >
              {/* Intuitive Multi-Filter Panel */}
              <div className="bg-white border border-[#E5E1D8] rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <label className="md:col-span-4 relative block">
                    <span className="sr-only">{t.filters.searchPlaceholder}</span>
                    <Search className="w-4 h-4 text-[#57534E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                      }
                      placeholder={t.filters.searchPlaceholder}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                    />
                  </label>

                  <select
                    aria-label={t.filters.allCities}
                    value={filters.city}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, city: e.target.value }))
                    }
                    className="md:col-span-2 px-3 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                  >
                    <option value="all">{t.filters.allCities}</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Pune">Pune</option>
                    <option value="Thane">Thane</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                  </select>

                  <select
                    aria-label={t.filters.allCategories}
                    value={filters.category}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="md:col-span-2 px-3 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                  >
                    <option value="all">{t.filters.allCategories}</option>
                    {Object.entries(t.categories).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label={t.filters.capacityLabel}
                    value={filters.capacityBand}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        capacityBand: e.target.value as CapacityBand,
                      }))
                    }
                    className="md:col-span-2 px-3 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm text-[#18181B]"
                  >
                    <option value="all">{t.filters.capacityAll}</option>
                    <option value="intimate">{t.filters.capacityIntimate}</option>
                    <option value="medium">{t.filters.capacityMedium}</option>
                    <option value="grand">{t.filters.capacityGrand}</option>
                    <option value="mega">{t.filters.capacityMega}</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={isLocating}
                    className="md:col-span-2 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#18181B] text-white text-sm font-medium rounded-lg hover:bg-[#C83E2B] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Compass className="w-4 h-4" />
                    <span>{isLocating ? t.filters.locating : t.filters.nearMe}</span>
                  </button>
                </div>

                {/* Date/Slot + Hourly Rate + Sort + View Mode Row */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-[#E5E1D8] items-center">
                  <div className="md:col-span-2">
                    <select
                      aria-label={t.filters.hourlyRateLabel}
                      value={filters.hourlyRateBand}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          hourlyRateBand: e.target.value as HourlyRateBand,
                        }))
                      }
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      <option value="all">{t.filters.hourlyAll}</option>
                      <option value="budget">{t.filters.hourlyBudget}</option>
                      <option value="mid">{t.filters.hourlyMid}</option>
                      <option value="premium">{t.filters.hourlyPremium}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <input
                      type="date"
                      aria-label={t.filters.dateLabel}
                      value={filters.date}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, date: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <select
                      aria-label={t.filters.slotLabel}
                      value={filters.slot}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          slot: e.target.value as SlotType | 'any',
                        }))
                      }
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      <option value="any">{t.filters.slotAny}</option>
                      <option value="morning">{t.slots.morning}</option>
                      <option value="evening">{t.slots.evening}</option>
                      <option value="night">{t.slots.night}</option>
                      <option value="fullday">{t.slots.fullday}</option>
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <select
                      aria-label={t.filters.sortLabel}
                      value={filters.sortBy}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: e.target.value as SortOption,
                        }))
                      }
                      className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      <option value="recommended">{t.filters.sortRecommended}</option>
                      <option value="rating">{t.filters.sortRating}</option>
                      <option value="price_asc">{t.filters.sortPriceAsc}</option>
                      <option value="capacity_desc">{t.filters.sortCapacityDesc}</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 flex items-center justify-end gap-2">
                    <div className="flex items-center p-1 bg-[#F3F1EC] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSection('explore')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                          section === 'explore'
                            ? 'bg-white text-[#18181B] shadow-sm'
                            : 'text-[#57534E]'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>{t.filters.showGrid}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSection('map')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer whitespace-nowrap ${
                          section === 'map'
                            ? 'bg-white text-[#18181B] shadow-sm'
                            : 'text-[#57534E]'
                        }`}
                      >
                        <MapIcon className="w-3.5 h-3.5" />
                        <span>{t.filters.showSplitMap}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Amenity Multi-Filter Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-xs font-medium text-[#57534E] mr-1">
                    {t.filters.amenitiesLabel}:
                  </span>
                  {AMENITY_KEYS.map((key) => {
                    const active = filters.amenities.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            amenities: active
                              ? prev.amenities.filter((a) => a !== key)
                              : [...prev.amenities, key],
                          }))
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-[#C83E2B] text-white border-[#C83E2B]'
                            : 'bg-[#FAF9F6] text-[#57534E] border-[#E5E1D8] hover:border-[#18181B] hover:text-[#18181B]'
                        }`}
                      >
                        {t.amenities[key]}
                      </button>
                    );
                  })}

                  {(filters.searchQuery ||
                    filters.city !== 'all' ||
                    filters.category !== 'all' ||
                    filters.capacityBand !== 'all' ||
                    filters.hourlyRateBand !== 'all' ||
                    filters.amenities.length > 0 ||
                    filters.date) && (
                    <button
                      type="button"
                      onClick={() =>
                        setFilters({
                          searchQuery: '',
                          city: 'all',
                          category: 'all',
                          capacityBand: 'all',
                          hourlyRateBand: 'all',
                          amenities: [],
                          date: '',
                          slot: 'any',
                          sortBy: 'recommended',
                        })
                      }
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#C83E2B] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{t.filters.resetFilters}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Count Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[#57534E] tabular-nums">
                  <span className="font-semibold text-[#18181B]">
                    {filteredVenues.length}
                  </span>{' '}
                  {t.filters.resultsCount}
                </p>
              </div>

              {/* Split Map + List OR 3-Column Venue Grid */}
              {section === 'map' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-7 lg:sticky lg:top-24">
                    <VenueMapView
                      venues={filteredVenues}
                      language={language}
                      t={t}
                      apiKey={mapsApiKey}
                      selectedVenueId={selectedMapVenueId}
                      hoveredVenueId={hoveredVenueId}
                      userLocation={userLocation}
                      onSelectVenue={setSelectedMapVenueId}
                      onOpenVenue={setActiveVenue}
                      onLocateMe={handleLocateMe}
                      isLocating={isLocating}
                    />
                  </div>
                  <div className="lg:col-span-5 grid grid-cols-1 gap-5">
                    {filteredVenues.map((venue) => {
                      const stats = venueRatings[venue.id] || {
                        avg: venue.ratingAvg,
                        count: venue.reviewCount,
                      };
                      const dist = userLocation
                        ? haversineKm(
                            userLocation.lat,
                            userLocation.lng,
                            venue.lat,
                            venue.lng
                          )
                        : null;
                      return (
                        <VenueCard
                          key={venue.id}
                          venue={venue}
                          language={language}
                          t={t}
                          ratingAvg={stats.avg}
                          reviewCount={stats.count}
                          isSaved={Boolean(profile?.savedVenueIds?.includes(venue.id))}
                          isSelectedOnMap={selectedMapVenueId === venue.id}
                          availabilityStatus={getVenueDateAvailability(venue.id)}
                          distanceKm={dist}
                          onToggleSave={handleToggleSave}
                          onHover={setHoveredVenueId}
                          onOpen={setActiveVenue}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVenues.map((venue) => {
                    const stats = venueRatings[venue.id] || {
                      avg: venue.ratingAvg,
                      count: venue.reviewCount,
                    };
                    const dist = userLocation
                      ? haversineKm(
                          userLocation.lat,
                          userLocation.lng,
                          venue.lat,
                          venue.lng
                        )
                      : null;
                    return (
                      <VenueCard
                        key={venue.id}
                        venue={venue}
                        language={language}
                        t={t}
                        ratingAvg={stats.avg}
                        reviewCount={stats.count}
                        isSaved={Boolean(profile?.savedVenueIds?.includes(venue.id))}
                        availabilityStatus={getVenueDateAvailability(venue.id)}
                        distanceKm={dist}
                        onToggleSave={handleToggleSave}
                        onHover={setHoveredVenueId}
                        onOpen={setActiveVenue}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Clean Minimal Footer */}
      <footer className="mt-12 border-t border-[#E5E1D8] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#57534E]">
          <span>
            © {new Date().getFullYear()} {t.brand}
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('hi')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              हिन्दी
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('mr')}
              className="hover:text-[#18181B] cursor-pointer"
            >
              मराठी
            </button>
          </div>
        </div>
      </footer>

      <NotificationDrawer
        open={notifDrawerOpen}
        onClose={() => setNotifDrawerOpen(false)}
        t={t}
        language={language}
        notifications={notifications}
        onEnablePush={handleEnablePush}
        pushPermission={pushPermission}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PartyKaradoApp />
    </ErrorBoundary>
  );
}
