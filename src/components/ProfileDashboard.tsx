import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Bell,
  Bookmark,
  Calendar,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageSquare,
  Pencil,
  Plus,
  Shield,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { AMENITY_KEYS, ADMIN_EMAIL, TranslationBundle, formatINR } from '../i18n/translations';
import {
  advanceBookingStatus,
  cancelBookingAndReleaseSlot,
  createAdminVenueListing,
  deleteAdminVenueListing,
  toggleVenueActiveStatus,
  updateAdminVenueListing,
  updateUserProfile,
} from '../services/firestoreService';
import { Booking, Language, UserProfile, Venue } from '../types';

interface ProfileDashboardProps {
  t: TranslationBundle;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  user: User | null;
  profile: UserProfile | null;
  bookings: Booking[];
  venues: Venue[];
  onSignIn: () => Promise<void>;
  onOpenVenue: (venue: Venue) => void;
  onMessageHost: (venue: Venue) => void;
}

export const ProfileDashboard: React.FC<ProfileDashboardProps> = ({
  t,
  language,
  onChangeLanguage,
  user,
  profile,
  bookings,
  venues,
  onSignIn,
  onOpenVenue,
  onMessageHost,
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'saved' | 'account' | 'host'>(
    'bookings'
  );
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [preferredCity, setPreferredCity] = useState(profile?.preferredCity || 'Mumbai');
  const [bookingAlerts, setBookingAlerts] = useState(profile?.bookingAlerts ?? true);
  const [messageAlerts, setMessageAlerts] = useState(profile?.messageAlerts ?? true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );

  // Admin Location Management state
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [venueName, setVenueName] = useState('');
  const [venueCity, setVenueCity] = useState<Venue['city']>('Mumbai');
  const [venueNeighborhood, setVenueNeighborhood] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [venueHourlyRate, setVenueHourlyRate] = useState(8500);
  const [venueCapacityMin, setVenueCapacityMin] = useState(20);
  const [venueCapacityMax, setVenueCapacityMax] = useState(100);
  const [venueCategory, setVenueCategory] = useState<Venue['category']>('rooftop');
  const [venueDesc, setVenueDesc] = useState('');
  const [venueRules, setVenueRules] = useState(
    'Standard municipal sound limits apply after 22:30. Direct coordination with host prior to arrival.'
  );
  const [venueAmenities, setVenueAmenities] = useState<string[]>([
    'ac_hall',
    'valet_parking',
  ]);
  const [venueIsActive, setVenueIsActive] = useState(true);
  const [savingVenue, setSavingVenue] = useState(false);
  const [adminStatusMsg, setAdminStatusMsg] = useState<string | null>(null);
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setPhone(profile.phone);
      setPreferredCity(profile.preferredCity || 'Mumbai');
      setBookingAlerts(profile.bookingAlerts);
      setMessageAlerts(profile.messageAlerts);
    }
  }, [profile]);

  if (!user) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-10">
          <UserIcon className="w-10 h-10 text-[#C83E2B] mx-auto mb-3" />
          <h2 className="font-display text-2xl font-semibold text-[#18181B]">
            {t.profile.title}
          </h2>
          <p className="mt-2 text-sm text-[#57534E] max-w-md mx-auto">
            {t.common.requiredSignIn}
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 px-6 py-3 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] transition-colors cursor-pointer"
          >
            {t.common.signInGoogle}
          </button>
        </div>
      </section>
    );
  }

  const savedVenues = venues.filter(
    (v) => v.isActive !== false && profile?.savedVenueIds?.includes(v.id)
  );
  const isAdminUser = user.email === ADMIN_EMAIL;

  const resetVenueForm = () => {
    setEditingVenue(null);
    setVenueName('');
    setVenueCity('Mumbai');
    setVenueNeighborhood('');
    setVenueAddress('');
    setVenueHourlyRate(8500);
    setVenueCapacityMin(20);
    setVenueCapacityMax(100);
    setVenueCategory('rooftop');
    setVenueDesc('');
    setVenueRules(
      'Standard municipal sound limits apply after 22:30. Direct coordination with host prior to arrival.'
    );
    setVenueAmenities(['ac_hall', 'valet_parking']);
    setVenueIsActive(true);
  };

  const startEditingVenue = (v: Venue) => {
    setEditingVenue(v);
    setVenueName(v.name);
    setVenueCity(v.city);
    setVenueNeighborhood(v.neighborhood);
    setVenueAddress(v.address);
    setVenueHourlyRate(v.hourlyRate);
    setVenueCapacityMin(v.capacityMin);
    setVenueCapacityMax(v.capacityMax);
    setVenueCategory(v.category);
    setVenueDesc(v.description);
    setVenueRules(v.rules);
    setVenueAmenities(v.amenities);
    setVenueIsActive(v.isActive !== false);
    setAdminStatusMsg(null);
    setAdminErrorMsg(null);
  };

  const handleEnableBrowserPush = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setBrowserPermission(result);
    if (result === 'granted') {
      await updateUserProfile(user.uid, { pushEnabled: true });
      new Notification('Party Karado', {
        body: 'Real-time booking and host chat alerts are now enabled.',
      });
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSavedMsg(false);
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim() || user.displayName || 'Guest',
        phone: phone.trim(),
        preferredCity,
        preferredLanguage: language,
        bookingAlerts,
        messageAlerts,
      });
      setProfileSavedMsg(true);
      setTimeout(() => setProfileSavedMsg(false), 3000);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSubmitAdminVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminUser) return;
    if (!venueName.trim() || !venueNeighborhood.trim() || venueDesc.trim().length < 10) {
      setAdminErrorMsg('Please enter venue name, neighborhood, and at least 10 characters of description.');
      return;
    }

    setSavingVenue(true);
    setAdminStatusMsg(null);
    setAdminErrorMsg(null);
    try {
      if (editingVenue) {
        await updateAdminVenueListing(editingVenue, {
          name: venueName,
          city: venueCity,
          neighborhood: venueNeighborhood,
          address: venueAddress || `${venueNeighborhood}, ${venueCity}`,
          category: venueCategory,
          hourlyRate: venueHourlyRate,
          capacityMin: venueCapacityMin,
          capacityMax: venueCapacityMax,
          amenities: venueAmenities,
          description: venueDesc,
          rules: venueRules,
          isActive: venueIsActive,
        });
        setAdminStatusMsg(`Updated: ${venueName.trim()}`);
      } else {
        const created = await createAdminVenueListing({
          user,
          hostName: displayName || user.displayName || 'Admin',
          name: venueName,
          city: venueCity,
          neighborhood: venueNeighborhood,
          address: venueAddress || `${venueNeighborhood}, ${venueCity}`,
          category: venueCategory,
          hourlyRate: venueHourlyRate,
          capacityMin: venueCapacityMin,
          capacityMax: venueCapacityMax,
          amenities: venueAmenities,
          description: venueDesc,
          rules: venueRules,
          isActive: venueIsActive,
        });
        setAdminStatusMsg(`Created: ${created.name}`);
      }
      resetVenueForm();
    } catch (err) {
      setAdminErrorMsg(err instanceof Error ? err.message : 'Unable to save venue.');
    } finally {
      setSavingVenue(false);
    }
  };

  const handleToggleActive = async (v: Venue) => {
    if (!isAdminUser) return;
    const nextState = v.isActive === false;
    setAdminErrorMsg(null);
    try {
      await toggleVenueActiveStatus(v.id, nextState);
      setAdminStatusMsg(
        `${v.name}: ${nextState ? t.profile.activeStatus : t.profile.pausedStatus}`
      );
    } catch (err) {
      setAdminErrorMsg(err instanceof Error ? err.message : 'Failed to toggle status.');
    }
  };

  const handleDeleteVenue = async (v: Venue) => {
    if (!isAdminUser) return;
    setAdminErrorMsg(null);
    try {
      await deleteAdminVenueListing(v.id);
      if (editingVenue?.id === v.id) resetVenueForm();
      setAdminStatusMsg(`Deleted: ${v.name}`);
    } catch (err) {
      setAdminErrorMsg(err instanceof Error ? err.message : 'Failed to delete venue.');
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E5E1D8] pb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#18181B]">
            {t.profile.title}
          </h1>
          <p className="mt-1 text-sm text-[#57534E]">
            {user.email} · {t.profile.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F3F1EC] rounded-lg">
          {(
            [
              { id: 'bookings', label: `${t.profile.tabBookings} (${bookings.length})` },
              { id: 'saved', label: `${t.profile.tabSaved} (${savedVenues.length})` },
              { id: 'account', label: t.profile.tabAccount },
              { id: 'host', label: t.profile.hostTitle },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-[#18181B] shadow-sm'
                  : 'text-[#57534E] hover:text-[#18181B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <div className="bg-white border border-[#E5E1D8] rounded-xl p-10 text-center">
              <Calendar className="w-8 h-8 text-[#C83E2B] mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-[#18181B]">{t.profile.noBookings}</h3>
              <p className="mt-1 text-sm text-[#57534E] max-w-md mx-auto">
                {t.profile.noBookingsDesc}
              </p>
            </div>
          ) : (
            bookings.map((booking) => {
              const linkedVenue = venues.find((v) => v.id === booking.venueId);
              const canHostManage = booking.hostId === user.uid || isAdminUser;
              const isTerminal =
                booking.bookingStatus === 'cancelled' ||
                booking.bookingStatus === 'completed';
              const windowLabel = `${String(booking.startHour).padStart(2, '0')}:00–${String(
                booking.endHour
              ).padStart(2, '0')}:00`;

              return (
                <div
                  key={booking.id}
                  className="bg-white border border-[#E5E1D8] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#57534E]">
                      <span
                        className={`font-semibold ${
                          booking.bookingStatus === 'cancelled'
                            ? 'text-[#B91C1C]'
                            : booking.bookingStatus === 'completed'
                            ? 'text-[#15803D]'
                            : 'text-[#B45309]'
                        }`}
                      >
                        {t.profile.statusLabels[booking.bookingStatus]}
                      </span>
                      {booking.transactionId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">
                            {t.profile.receiptId}: {booking.transactionId}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-[#18181B]">
                      {booking.venueName}
                    </h3>
                    <p className="text-sm text-[#57534E] tabular-nums">
                      {booking.date} · {windowLabel} ({t.slots[booking.slot]}) ·{' '}
                      {booking.guestCount} {t.venueCard.guests} · {t.events[booking.eventType]}
                    </p>
                    <p className="text-sm font-semibold text-[#18181B] tabular-nums">
                      {formatINR(booking.totalAmount)}
                      {booking.paymentMethod
                        ? ` (${booking.paymentMethod.toUpperCase()} ${booking.paymentLast4 || ''})`
                        : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {linkedVenue && (
                      <>
                        <button
                          type="button"
                          onClick={() => onMessageHost(linkedVenue)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F3F1EC] hover:bg-[#E5E1D8] text-[#18181B] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{t.profile.chatHost}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenVenue(linkedVenue)}
                          className="px-3.5 py-2 bg-white border border-[#D6D1C4] hover:border-[#18181B] text-[#18181B] text-xs font-medium rounded-lg transition-colors cursor-pointer"
                        >
                          {t.profile.leaveReview}
                        </button>
                      </>
                    )}

                    {canHostManage && booking.bookingStatus === 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => void advanceBookingStatus(booking, 'checked_in')}
                        className="px-3.5 py-2 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#3F3F46] cursor-pointer"
                      >
                        {t.profile.markCheckedIn}
                      </button>
                    )}

                    {canHostManage && booking.bookingStatus === 'checked_in' && (
                      <button
                        type="button"
                        onClick={() => void advanceBookingStatus(booking, 'completed')}
                        className="px-3.5 py-2 bg-[#15803D] text-white text-xs font-medium rounded-lg hover:bg-[#166534] cursor-pointer"
                      >
                        {t.profile.markCompleted}
                      </button>
                    )}

                    {!isTerminal && (
                      <button
                        type="button"
                        onClick={() => void cancelBookingAndReleaseSlot(booking)}
                        className="px-3.5 py-2 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-medium rounded-lg hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                      >
                        {t.profile.cancelBooking}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Saved Venues Tab */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedVenues.length === 0 ? (
            <div className="col-span-full bg-white border border-[#E5E1D8] rounded-xl p-10 text-center text-sm text-[#57534E]">
              <Bookmark className="w-8 h-8 text-[#C83E2B] mx-auto mb-2" />
              {t.venueCard.save}
            </div>
          ) : (
            savedVenues.map((venue) => (
              <div
                key={venue.id}
                className="bg-white border border-[#E5E1D8] rounded-xl overflow-hidden flex flex-col"
              >
                <img
                  src={venue.imageUrl}
                  alt={venue.name}
                  referrerPolicy="no-referrer"
                  className="aspect-[4/3] w-full object-cover bg-[#F3F1EC]"
                />
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#57534E]">
                      {venue.neighborhood}, {venue.city}
                    </p>
                    <h3 className="font-semibold text-base text-[#18181B] mt-0.5">
                      {language === 'hi'
                        ? venue.nameHi
                        : language === 'mr'
                        ? venue.nameMr
                        : venue.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-[#E5E1D8]">
                    <span className="font-semibold text-sm tabular-nums">
                      {formatINR(venue.hourlyRate)} {t.venueCard.perHour}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenVenue(venue)}
                      className="px-4 py-2 bg-[#18181B] text-white text-xs font-medium rounded-lg hover:bg-[#C83E2B] cursor-pointer"
                    >
                      {t.venueCard.viewDetails}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Account & Push Notification Settings Tab */}
      {activeTab === 'account' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveAccount}
            className="lg:col-span-7 bg-white border border-[#E5E1D8] rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-xl font-semibold text-[#18181B]">
              {t.profile.accountSettings}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs font-medium text-[#57534E] block mb-1">
                  {t.profile.fullName}
                </span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#57534E] block mb-1">
                  {t.profile.phone}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98200 00000"
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#57534E] block mb-1">
                  {t.profile.preferredCity}
                </span>
                <select
                  value={preferredCity}
                  onChange={(e) => setPreferredCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                >
                  <option value="Mumbai">Mumbai</option>
                  <option value="Pune">Pune</option>
                  <option value="Thane">Thane</option>
                  <option value="Navi Mumbai">Navi Mumbai</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#57534E] block mb-1">
                  {t.profile.preferredLanguage}
                </span>
                <select
                  value={language}
                  onChange={(e) => onChangeLanguage(e.target.value as Language)}
                  className="w-full px-3.5 py-2.5 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
              </label>
            </div>

            <div className="pt-2 space-y-2.5">
              <label className="flex items-center gap-3 text-sm text-[#18181B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookingAlerts}
                  onChange={(e) => setBookingAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#C83E2B]"
                />
                <span>{t.profile.bookingAlertsLabel}</span>
              </label>
              <label className="flex items-center gap-3 text-sm text-[#18181B] cursor-pointer">
                <input
                  type="checkbox"
                  checked={messageAlerts}
                  onChange={(e) => setMessageAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#C83E2B]"
                />
                <span>{t.profile.messageAlertsLabel}</span>
              </label>
            </div>

            <div className="pt-3 flex items-center gap-4">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] disabled:opacity-50 cursor-pointer"
              >
                {t.profile.saveProfile}
              </button>
              {profileSavedMsg && (
                <span className="text-xs font-medium text-[#15803D] inline-flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.profile.profileSaved}
                </span>
              )}
            </div>
          </form>

          <div className="lg:col-span-5 bg-white border border-[#E5E1D8] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-[#C83E2B]" />
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.profile.pushPrefsTitle}
              </h2>
            </div>
            <p className="text-sm text-[#57534E] leading-relaxed">
              {t.profile.bookingAlertsLabel} & {t.profile.messageAlertsLabel}.
            </p>
            <button
              type="button"
              onClick={() => void handleEnableBrowserPush()}
              className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                browserPermission === 'granted'
                  ? 'bg-[#ECFDF5] border border-[#A7F3D0] text-[#15803D]'
                  : 'bg-[#18181B] text-white hover:bg-[#C83E2B]'
              }`}
            >
              {browserPermission === 'granted'
                ? t.profile.browserPushActive
                : browserPermission === 'denied'
                ? t.profile.browserPushBlocked
                : t.profile.enableBrowserPush}
            </button>
          </div>
        </div>
      )}

      {/* Admin Location Management Tab */}
      {activeTab === 'host' && (
        <div className="space-y-6">
          {!isAdminUser ? (
            <div className="bg-white border border-[#E5E1D8] rounded-xl p-8 text-center space-y-2">
              <Shield className="w-8 h-8 text-[#C83E2B] mx-auto" />
              <h2 className="font-display text-xl font-semibold text-[#18181B]">
                {t.profile.hostTitle}
              </h2>
              <p className="text-sm text-[#57534E] max-w-lg mx-auto">
                {t.profile.adminRequiredNotice}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form
                onSubmit={handleSubmitAdminVenue}
                className="lg:col-span-6 bg-white border border-[#E5E1D8] rounded-xl p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#15803D] inline-flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      {t.profile.adminBadge}
                    </p>
                    <h2 className="font-display text-xl font-semibold text-[#18181B] mt-0.5">
                      {editingVenue ? `${t.profile.editVenue}: ${editingVenue.name}` : t.profile.addVenue}
                    </h2>
                    <p className="text-xs text-[#57534E] mt-1">{t.profile.hostSubtitle}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.profile.venueNameLabel}
                    </span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.profile.categoryLabel}
                    </span>
                    <select
                      value={venueCategory}
                      onChange={(e) => setVenueCategory(e.target.value as Venue['category'])}
                      className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      {Object.entries(t.categories).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.profile.cityLabel}
                    </span>
                    <select
                      value={venueCity}
                      onChange={(e) => setVenueCity(e.target.value as Venue['city'])}
                      className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    >
                      <option value="Mumbai">Mumbai</option>
                      <option value="Pune">Pune</option>
                      <option value="Thane">Thane</option>
                      <option value="Navi Mumbai">Navi Mumbai</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.profile.neighborhoodLabel}
                    </span>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={venueNeighborhood}
                      onChange={(e) => setVenueNeighborhood(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs text-[#57534E] block mb-1">
                      {t.profile.hourlyRateInputLabel}
                    </span>
                    <input
                      type="number"
                      min={500}
                      max={250000}
                      value={venueHourlyRate}
                      onChange={(e) => setVenueHourlyRate(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.profile.capacityMinLabel}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        value={venueCapacityMin}
                        onChange={(e) => setVenueCapacityMin(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-[#57534E] block mb-1">
                        {t.profile.capacityMaxLabel}
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={2000}
                        value={venueCapacityMax}
                        onChange={(e) => setVenueCapacityMax(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm tabular-nums"
                      />
                    </label>
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs text-[#57534E] block mb-1">
                    {t.profile.addressLabel}
                  </span>
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={(e) => setVenueAddress(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                  />
                </label>

                <div>
                  <span className="text-xs text-[#57534E] block mb-1.5">
                    {t.filters.amenitiesLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_KEYS.map((key) => {
                      const active = venueAmenities.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setVenueAmenities((prev) =>
                              prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                            active
                              ? 'bg-[#18181B] text-white border-[#18181B]'
                              : 'bg-[#FAF9F6] text-[#57534E] border-[#D6D1C4]'
                          }`}
                        >
                          {t.amenities[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="block">
                  <span className="text-xs text-[#57534E] block mb-1">
                    {t.profile.descriptionLabel}
                  </span>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    value={venueDesc}
                    onChange={(e) => setVenueDesc(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs text-[#57534E] block mb-1">
                    {t.profile.rulesLabel}
                  </span>
                  <input
                    type="text"
                    value={venueRules}
                    onChange={(e) => setVenueRules(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#FAF9F6] border border-[#D6D1C4] rounded-lg text-sm"
                  />
                </label>

                <label className="flex items-center gap-2.5 text-sm text-[#18181B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={venueIsActive}
                    onChange={(e) => setVenueIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#15803D]"
                  />
                  <span>{venueIsActive ? t.profile.activeStatus : t.profile.pausedStatus}</span>
                </label>

                {adminStatusMsg && (
                  <p className="text-xs font-medium text-[#15803D]">{adminStatusMsg}</p>
                )}
                {adminErrorMsg && (
                  <p className="text-xs font-medium text-[#B91C1C]">{adminErrorMsg}</p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingVenue}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C83E2B] text-white text-sm font-medium rounded-lg hover:bg-[#AE3221] disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{editingVenue ? t.profile.saveChanges : t.profile.publishVenue}</span>
                  </button>
                  {editingVenue && (
                    <button
                      type="button"
                      onClick={resetVenueForm}
                      className="px-4 py-2.5 bg-[#F3F1EC] text-[#18181B] text-sm font-medium rounded-lg hover:bg-[#E5E1D8] cursor-pointer"
                    >
                      {t.profile.cancelEdit}
                    </button>
                  )}
                </div>
              </form>

              <div className="lg:col-span-6 space-y-3">
                {venues.map((v) => {
                  const active = v.isActive !== false;
                  return (
                    <div
                      key={v.id}
                      className={`p-4 bg-white border rounded-xl space-y-3 ${
                        active ? 'border-[#E5E1D8]' : 'border-amber-200 bg-amber-50/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span
                              className={`font-semibold ${
                                active ? 'text-[#15803D]' : 'text-[#B45309]'
                              }`}
                            >
                              {active ? t.profile.activeStatus : t.profile.pausedStatus}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#57534E] tabular-nums">
                              {formatINR(v.hourlyRate)} {t.venueCard.perHour}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#18181B] truncate mt-0.5">
                            {v.name}
                          </p>
                          <p className="text-xs text-[#57534E]">
                            {v.neighborhood}, {v.city} · {v.capacityMin}–{v.capacityMax}{' '}
                            {t.venueCard.guests}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenVenue(v)}
                          className="px-3 py-1.5 bg-[#F3F1EC] text-xs font-medium text-[#18181B] rounded-lg hover:bg-[#E5E1D8] cursor-pointer shrink-0"
                        >
                          {t.venueCard.viewDetails}
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E1D8]">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(v)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border ${
                            active
                              ? 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                          }`}
                        >
                          {active ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>{active ? t.profile.pauseVenue : t.profile.activateVenue}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditingVenue(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-[#D6D1C4] text-[#18181B] hover:border-[#18181B] cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>{t.profile.editVenue}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDeleteVenue(v)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEE2E2] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t.profile.deleteVenue}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
