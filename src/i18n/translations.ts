import { Language } from '../types';

export const ADMIN_EMAIL = 'leantester@gmail.com';

export const AMENITY_KEYS = [
  'ac_hall',
  'rooftop',
  'poolside',
  'dj_sound',
  'valet_parking',
  'catering_allowed',
  'bar_license',
  'wheelchair_access',
] as const;

export type AmenityKey = (typeof AMENITY_KEYS)[number];

export interface TranslationBundle {
  brand: string;
  nav: {
    explore: string;
    mapView: string;
    messages: string;
    profile: string;
    signIn: string;
    signOut: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaBrowse: string;
    ctaMap: string;
    statVenues: string;
    statBooking: string;
    statVerified: string;
    statSupport: string;
  };
  languageLabel: string;
  filters: {
    searchPlaceholder: string;
    allCities: string;
    allCategories: string;
    capacityLabel: string;
    capacityAll: string;
    capacityIntimate: string;
    capacityMedium: string;
    capacityGrand: string;
    capacityMega: string;
    hourlyRateLabel: string;
    hourlyAll: string;
    hourlyBudget: string;
    hourlyMid: string;
    hourlyPremium: string;
    dateLabel: string;
    slotLabel: string;
    slotAny: string;
    amenitiesLabel: string;
    sortLabel: string;
    sortRecommended: string;
    sortRating: string;
    sortPriceAsc: string;
    sortCapacityDesc: string;
    resetFilters: string;
    nearMe: string;
    locating: string;
    resultsCount: string;
    showGrid: string;
    showSplitMap: string;
  };
  categories: Record<string, string>;
  amenities: Record<string, string>;
  slots: {
    morning: string;
    morningTime: string;
    evening: string;
    eveningTime: string;
    night: string;
    nightTime: string;
    fullday: string;
    fulldayTime: string;
    custom: string;
  };
  events: {
    birthday: string;
    sangeet: string;
    anniversary: string;
    corporate: string;
    cocktail: string;
    family: string;
  };
  venueCard: {
    guests: string;
    perHour: string;
    perSlot: string;
    slotHours: string;
    reviews: string;
    moreAmenities: string;
    availableForDate: string;
    bookedForDate: string;
    viewDetails: string;
    save: string;
    saved: string;
    away: string;
  };
  detail: {
    backToVenues: string;
    overview: string;
    amenitiesTitle: string;
    houseRules: string;
    hostedBy: string;
    messageHost: string;
    reviewsTitle: string;
    cleanliness: string;
    ambience: string;
    acoustics: string;
    hostCare: string;
    writeReview: string;
    submitReview: string;
    reviewPlaceholder: string;
    bookingTitle: string;
    step1: string;
    step2: string;
    step3: string;
    selectDate: string;
    selectSlot: string;
    selectHoursTitle: string;
    selectHoursHint: string;
    bookedHour: string;
    selectedHoursSummary: string;
    inactiveVenueNotice: string;
    available: string;
    unavailable: string;
    guestCount: string;
    eventType: string;
    guestName: string;
    guestPhone: string;
    specialRequests: string;
    specialRequestsPlaceholder: string;
    priceBreakdown: string;
    baseTariff: string;
    cleaningFee: string;
    securityDeposit: string;
    gst: string;
    totalPayable: string;
    paymentMethodTitle: string;
    upiLabel: string;
    cardLabel: string;
    netbankingLabel: string;
    upiIdPlaceholder: string;
    cardHolderPlaceholder: string;
    cardNumberPlaceholder: string;
    cardExpiryPlaceholder: string;
    cardCvvPlaceholder: string;
    selectBank: string;
    payAndConfirm: string;
    processingPayment: string;
    signInToBook: string;
    bookingConfirmedTitle: string;
    bookingConfirmedSubtitle: string;
    transactionId: string;
    viewMyBookings: string;
    bookAnother: string;
  };
  messages: {
    title: string;
    subtitle: string;
    noThreads: string;
    noThreadsDesc: string;
    selectThread: string;
    typeMessage: string;
    send: string;
    hostBadge: string;
    guestBadge: string;
    quickQuestions: string[];
    signInPrompt: string;
  };
  profile: {
    title: string;
    subtitle: string;
    tabBookings: string;
    tabSaved: string;
    tabAccount: string;
    tabHost: string;
    upcomingBookings: string;
    noBookings: string;
    noBookingsDesc: string;
    cancelBooking: string;
    markCheckedIn: string;
    markCompleted: string;
    leaveReview: string;
    chatHost: string;
    receiptId: string;
    statusLabels: {
      confirmed: string;
      checked_in: string;
      completed: string;
      cancelled: string;
    };
    accountSettings: string;
    fullName: string;
    phone: string;
    preferredCity: string;
    preferredLanguage: string;
    pushPrefsTitle: string;
    enableBrowserPush: string;
    browserPushActive: string;
    browserPushBlocked: string;
    bookingAlertsLabel: string;
    messageAlertsLabel: string;
    saveProfile: string;
    profileSaved: string;
    hostTitle: string;
    hostSubtitle: string;
    addVenue: string;
    venueNameLabel: string;
    cityLabel: string;
    neighborhoodLabel: string;
    addressLabel: string;
    priceLabel: string;
    capacityMinLabel: string;
    capacityMaxLabel: string;
    hourlyRateInputLabel: string;
    categoryLabel: string;
    descriptionLabel: string;
    publishVenue: string;
    adminBadge: string;
    adminRequiredNotice: string;
    activeStatus: string;
    pausedStatus: string;
    activateVenue: string;
    pauseVenue: string;
    editVenue: string;
    saveChanges: string;
    cancelEdit: string;
    deleteVenue: string;
    rulesLabel: string;
  };
  notifications: {
    title: string;
    markAllRead: string;
    empty: string;
    enableAlertsCta: string;
  };
  map: {
    title: string;
    centerOnMe: string;
    openVenue: string;
    missingKeyNotice: string;
    interactiveMapReady: string;
  };
  common: {
    loading: string;
    close: string;
    signInGoogle: string;
    signingIn: string;
    requiredSignIn: string;
  };
}

export const TRANSLATIONS: Record<Language, TranslationBundle> = {
  en: {
    brand: 'Party Karado',
    nav: {
      explore: 'Explore Venues',
      mapView: 'Map View',
      messages: 'Host Chat',
      profile: 'My Profile',
      signIn: 'Sign In',
      signOut: 'Sign Out',
    },
    hero: {
      eyebrow: 'Curated Event Spaces Across Mumbai, Pune & Thane',
      title: 'Book remarkable party venues with instant slot confirmation.',
      subtitle:
        'Check live calendar availability, explore nearby spaces on Google Maps, message venue hosts directly, and complete protected payments in minutes.',
      ctaBrowse: 'Browse Venues',
      ctaMap: 'Open Map View',
      statVenues: 'Verified Spaces',
      statBooking: 'Real-Time Slot Lock',
      statVerified: 'Transparent Guest Reviews',
      statSupport: 'English · हिन्दी · मराठी',
    },
    languageLabel: 'Language',
    filters: {
      searchPlaceholder: 'Search by venue name, neighborhood, or landmark...',
      allCities: 'All Cities',
      allCategories: 'All Venue Types',
      capacityLabel: 'Guest Capacity',
      capacityAll: 'Any Guest Count',
      capacityIntimate: 'Intimate (Up to 40)',
      capacityMedium: 'Social (40 – 120)',
      capacityGrand: 'Grand (120 – 300)',
      capacityMega: 'Celebration Hall (300+)',
      hourlyRateLabel: 'Hourly Rate',
      hourlyAll: 'Any Hourly Rate',
      hourlyBudget: 'Up to ₹8,000 / hr',
      hourlyMid: '₹8,000 – ₹15,000 / hr',
      hourlyPremium: '₹15,000+ / hr',
      dateLabel: 'Event Date',
      slotLabel: 'Time Slot',
      slotAny: 'Any Slot',
      amenitiesLabel: 'Amenities',
      sortLabel: 'Sort By',
      sortRecommended: 'Recommended',
      sortRating: 'Highest Rated',
      sortPriceAsc: 'Price: Low to High',
      sortCapacityDesc: 'Largest Capacity',
      resetFilters: 'Reset Filters',
      nearMe: 'Nearby Spots',
      locating: 'Locating...',
      resultsCount: 'venues available',
      showGrid: 'Grid View',
      showSplitMap: 'Split Map View',
    },
    categories: {
      rooftop: 'Rooftop Terrace',
      banquet: 'Banquet Hall',
      poolside: 'Poolside Villa',
      courtyard: 'Heritage Courtyard',
      lawn: 'Garden Lawn',
      lounge: 'Acoustic Lounge',
    },
    amenities: {
      ac_hall: 'Air-Conditioned',
      rooftop: 'Open-Air Rooftop',
      poolside: 'Poolside Access',
      dj_sound: 'In-House DJ & Sound',
      valet_parking: 'Valet Parking',
      catering_allowed: 'Outside Catering OK',
      bar_license: 'Bar & Beverage Counter',
      wheelchair_access: 'Wheelchair Accessible',
    },
    slots: {
      morning: 'Morning Gathering',
      morningTime: '10:00 – 14:00',
      evening: 'Sunset & Evening',
      eveningTime: '16:00 – 20:00',
      night: 'Late Evening Party',
      nightTime: '20:00 – 24:00',
      fullday: 'Full Day Exclusive',
      fulldayTime: '10:00 – 24:00',
      custom: 'Custom Hours',
    },
    events: {
      birthday: 'Birthday Celebration',
      sangeet: 'Sangeet / Engagement',
      anniversary: 'Anniversary Dinner',
      corporate: 'Corporate Mixer',
      cocktail: 'Cocktail Evening',
      family: 'Family Get-Together',
    },
    venueCard: {
      guests: 'guests',
      perHour: '/ hr',
      perSlot: '/ 4h slot',
      slotHours: '4 hrs',
      reviews: 'reviews',
      moreAmenities: 'more',
      availableForDate: 'Open on selected date',
      bookedForDate: 'Slot booked',
      viewDetails: 'View & Book',
      save: 'Save',
      saved: 'Saved',
      away: 'km away',
    },
    detail: {
      backToVenues: 'Back to all venues',
      overview: 'About This Space',
      amenitiesTitle: 'Included Amenities',
      houseRules: 'Venue Guidelines',
      hostedBy: 'Hosted by',
      messageHost: 'Message Host',
      reviewsTitle: 'Guest Reviews & Transparency Ratings',
      cleanliness: 'Cleanliness',
      ambience: 'Ambience',
      acoustics: 'Sound & Acoustics',
      hostCare: 'Host Responsiveness',
      writeReview: 'Share Your Experience',
      submitReview: 'Publish Review',
      reviewPlaceholder: 'How was the sound system, hospitality, seating, and lighting?',
      bookingTitle: 'Reserve This Venue',
      step1: '1. Select Date & Slot',
      step2: '2. Event & Guest Details',
      step3: '3. Secure Payment',
      selectDate: 'Event Date',
      selectSlot: 'Quick Slot Presets',
      selectHoursTitle: 'Or Pick Exact Hours (Overlapping Hours Disabled)',
      selectHoursHint: 'Click start and end hours to build a contiguous window.',
      bookedHour: 'Booked',
      selectedHoursSummary: 'Selected Window',
      inactiveVenueNotice: 'This venue is currently paused by the administrator and cannot accept new bookings.',
      available: 'Available',
      unavailable: 'Booked',
      guestCount: 'Expected Guests',
      eventType: 'Occasion',
      guestName: 'Primary Contact Name',
      guestPhone: 'Mobile Number',
      specialRequests: 'Decor, Catering, or Timing Notes',
      specialRequestsPlaceholder: 'Share setup timing, dietary needs, or AV requirements...',
      priceBreakdown: 'Transparent Price Summary',
      baseTariff: 'Venue Slot Tariff',
      cleaningFee: 'Setup & Cleaning Fee',
      securityDeposit: 'Refundable Security Deposit',
      gst: 'GST (18% on Venue & Setup)',
      totalPayable: 'Total Payable',
      paymentMethodTitle: 'Protected Payment Gateway',
      upiLabel: 'UPI',
      cardLabel: 'Card',
      netbankingLabel: 'NetBanking',
      upiIdPlaceholder: 'yourname@okaxis',
      cardHolderPlaceholder: 'Name on card',
      cardNumberPlaceholder: '4242 4242 4242 4242',
      cardExpiryPlaceholder: 'MM/YY',
      cardCvvPlaceholder: 'CVV',
      selectBank: 'Choose Bank',
      payAndConfirm: 'Pay & Confirm Booking',
      processingPayment: 'Verifying Payment & Locking Slot...',
      signInToBook: 'Sign In with Google to Confirm Booking',
      bookingConfirmedTitle: 'Reservation Confirmed',
      bookingConfirmedSubtitle:
        'Your slot is locked in real time and a confirmation alert has been sent.',
      transactionId: 'Transaction Reference',
      viewMyBookings: 'View in My Profile',
      bookAnother: 'Keep Exploring',
    },
    messages: {
      title: 'Direct Host Messaging',
      subtitle: 'Coordinate catering, sound cutoffs, valet parking, and early setup directly.',
      noThreads: 'No conversations yet',
      noThreadsDesc: 'Open any venue and select "Message Host" to start coordinating your event.',
      selectThread: 'Select a conversation from the left to read and reply.',
      typeMessage: 'Write a message to the venue host...',
      send: 'Send',
      hostBadge: 'Host',
      guestBadge: 'Guest',
      quickQuestions: [
        'Is outside catering permitted for a family dinner?',
        'What time can our decorator arrive for setup?',
        'Is valet parking included in the evening slot?',
      ],
      signInPrompt: 'Please sign in to view and send real-time messages with venue hosts.',
    },
    profile: {
      title: 'Account & Booking Dashboard',
      subtitle: 'Manage upcoming reservations, saved venues, alert preferences, and host listings.',
      tabBookings: 'My Bookings',
      tabSaved: 'Saved Venues',
      tabAccount: 'Account & Alerts',
      tabHost: 'Host Studio',
      upcomingBookings: 'Reservations',
      noBookings: 'No reservations yet',
      noBookingsDesc: 'When you book a space on Party Karado, your receipt and live status appear here.',
      cancelBooking: 'Cancel & Refund',
      markCheckedIn: 'Mark Checked-In',
      markCompleted: 'Mark Completed',
      leaveReview: 'Rate & Review',
      chatHost: 'Message Host',
      receiptId: 'Receipt',
      statusLabels: {
        confirmed: 'Confirmed',
        checked_in: 'Checked In',
        completed: 'Completed',
        cancelled: 'Cancelled (Refunded)',
      },
      accountSettings: 'Personal Details & Language',
      fullName: 'Full Name',
      phone: 'Phone Number',
      preferredCity: 'Preferred City',
      preferredLanguage: 'Preferred Language',
      pushPrefsTitle: 'Real-Time Push Notifications',
      enableBrowserPush: 'Enable Browser Push Alerts',
      browserPushActive: 'Browser Push Alerts Enabled',
      browserPushBlocked: 'Notifications blocked in browser settings',
      bookingAlertsLabel: 'Reservation confirmations & status updates',
      messageAlertsLabel: 'Direct messages from venue hosts',
      saveProfile: 'Save Preferences',
      profileSaved: 'Preferences saved successfully.',
      hostTitle: 'Admin Location Management',
      hostSubtitle: 'Create, update, pause/activate (isActive), or remove venues pushed live to Explore & Map.',
      addVenue: 'Add New Venue',
      venueNameLabel: 'Venue Name',
      cityLabel: 'City',
      neighborhoodLabel: 'Neighborhood',
      addressLabel: 'Street Address',
      priceLabel: 'Slot Price (₹)',
      capacityMinLabel: 'Min Guests',
      capacityMaxLabel: 'Max Guests',
      hourlyRateInputLabel: 'Hourly Rate (₹/hr)',
      categoryLabel: 'Venue Type',
      descriptionLabel: 'Space Description',
      publishVenue: 'Create Venue',
      adminBadge: 'Admin Access',
      adminRequiredNotice: 'Venue creation, updates, and visibility toggles are restricted to authenticated administrators.',
      activeStatus: 'Active (Live)',
      pausedStatus: 'Paused (Hidden)',
      activateVenue: 'Activate',
      pauseVenue: 'Pause',
      editVenue: 'Edit',
      saveChanges: 'Save Changes',
      cancelEdit: 'Cancel',
      deleteVenue: 'Delete',
      rulesLabel: 'Venue Guidelines / Rules',
    },
    notifications: {
      title: 'Live Reservation Alerts',
      markAllRead: 'Mark all read',
      empty: 'You are all caught up. Reservation and message updates appear here in real time.',
      enableAlertsCta: 'Turn on desktop/mobile push alerts',
    },
    map: {
      title: 'Venue Locations & Nearby Spots',
      centerOnMe: 'Find Nearby Me',
      openVenue: 'Inspect & Book',
      missingKeyNotice: 'Interactive Google Map is initializing. Select any venue pin below to inspect details.',
      interactiveMapReady: 'Click any price pin on the map to preview and book.',
    },
    common: {
      loading: 'Loading...',
      close: 'Close',
      signInGoogle: 'Continue with Google',
      signingIn: 'Signing in...',
      requiredSignIn: 'Sign in with Google to book venues, save favorites, and message hosts.',
    },
  },
  hi: {
    brand: 'पार्टी करादो',
    nav: {
      explore: 'वेन्यू देखें',
      mapView: 'मैप व्यू',
      messages: 'होस्ट चैट',
      profile: 'मेरी प्रोफ़ाइल',
      signIn: 'साइन इन',
      signOut: 'साइन आउट',
    },
    hero: {
      eyebrow: 'मुंबई, पुणे और ठाणे के चुनिंदा इवेंट स्पेस',
      title: 'रियल-टाइम उपलब्धता के साथ शानदार पार्टी वेन्यू तुरंत बुक करें।',
      subtitle:
        'लाइव स्लॉट देखें, गूगल मैप पर नज़दीकी जगह खोजें, वेन्यू होस्ट से सीधे बात करें और सुरक्षित पेमेंट से बुकिंग पक्की करें।',
      ctaBrowse: 'वेन्यू देखें',
      ctaMap: 'मैप पर देखें',
      statVenues: 'सत्यापित वेन्यू',
      statBooking: 'रियल-टाइम स्लॉट लॉक',
      statVerified: 'पारदर्शी गेस्ट समीक्षाएं',
      statSupport: 'English · हिन्दी · मराठी',
    },
    languageLabel: 'भाषा',
    filters: {
      searchPlaceholder: 'वेन्यू नाम, इलाके या लैंडमार्क से खोजें...',
      allCities: 'सभी शहर',
      allCategories: 'सभी वेन्यू प्रकार',
      capacityLabel: 'मेहमान क्षमता',
      capacityAll: 'कोई भी क्षमता',
      capacityIntimate: 'छोटी पार्टी (40 तक)',
      capacityMedium: 'मध्यम पार्टी (40 – 120)',
      capacityGrand: 'भव्य आयोजन (120 – 300)',
      capacityMega: 'विशाल हॉल (300+)',
      hourlyRateLabel: 'प्रति घंटा दर',
      hourlyAll: 'कोई भी प्रति घंटा दर',
      hourlyBudget: '₹8,000 / घंटा तक',
      hourlyMid: '₹8,000 – ₹15,000 / घंटा',
      hourlyPremium: '₹15,000+ / घंटा',
      dateLabel: 'कार्यक्रम की तारीख',
      slotLabel: 'समय स्लॉट',
      slotAny: 'कोई भी समय',
      amenitiesLabel: 'सुविधाएं',
      sortLabel: 'क्रमबद्ध करें',
      sortRecommended: 'सुझाए गए',
      sortRating: 'सर्वोच्च रेटिंग',
      sortPriceAsc: 'कम से अधिक कीमत',
      sortCapacityDesc: 'अधिकतम क्षमता',
      resetFilters: 'फ़िल्टर रीसेट करें',
      nearMe: 'नज़दीकी स्थान',
      locating: 'खोज रहे हैं...',
      resultsCount: 'वेन्यू उपलब्ध हैं',
      showGrid: 'ग्रिड व्यू',
      showSplitMap: 'मैप के साथ देखें',
    },
    categories: {
      rooftop: 'रूफटॉप टेरेस',
      banquet: 'बैंक्वेट हॉल',
      poolside: 'पूलसाइड विला',
      courtyard: 'हेरिटेज आंगन',
      lawn: 'गार्डन लॉन',
      lounge: 'इनडोर लाउंज',
    },
    amenities: {
      ac_hall: 'एयर-कंडीशन्ड',
      rooftop: 'ओपन-एयर रूफटॉप',
      poolside: 'पूलसाइड एक्सेस',
      dj_sound: 'इन-हाउस डीजे व साउंड',
      valet_parking: 'वैले पार्किंग',
      catering_allowed: 'बाहरी कैटरिंग मान्य',
      bar_license: 'बार व ड्रिंक्स काउंटर',
      wheelchair_access: 'व्हीलचेयर सुविधा',
    },
    slots: {
      morning: 'सुबह का समारोह',
      morningTime: '10:00 – 14:00',
      evening: 'शाम व सनसेट स्लॉट',
      eveningTime: '16:00 – 20:00',
      night: 'नाइट पार्टी स्लॉट',
      nightTime: '20:00 – 24:00',
      fullday: 'पूरा दिन आरक्षित',
      fulldayTime: '10:00 – 24:00',
      custom: 'कस्टम घंटे',
    },
    events: {
      birthday: 'जन्मदिन समारोह',
      sangeet: 'संगीत / सगाई',
      anniversary: 'सालगिरह डिनर',
      corporate: 'कॉर्पोरेट मीटअप',
      cocktail: 'कॉकटेल शाम',
      family: 'पारिवारिक मिलन',
    },
    venueCard: {
      guests: 'मेहमान',
      perHour: '/ घंटा',
      perSlot: '/ 4 घंटे स्लॉट',
      slotHours: '4 घंटे',
      reviews: 'समीक्षाएं',
      moreAmenities: 'अधिक',
      availableForDate: 'चुनी गई तारीख पर उपलब्ध',
      bookedForDate: 'स्लॉट बुक है',
      viewDetails: 'विवरण व बुकिंग',
      save: 'सेव करें',
      saved: 'सेव किया गया',
      away: 'किमी दूर',
    },
    detail: {
      backToVenues: 'सभी वेन्यू पर वापस जाएं',
      overview: 'वेन्यू के बारे में',
      amenitiesTitle: 'उपलब्ध सुविधाएं',
      houseRules: 'वेन्यू नियम',
      hostedBy: 'होस्ट:',
      messageHost: 'होस्ट को संदेश भेजें',
      reviewsTitle: 'मेहमानों की समीक्षाएं और रेटिंग',
      cleanliness: 'स्वच्छता',
      ambience: 'माहौल',
      acoustics: 'साउंड सिस्टम',
      hostCare: 'होस्ट सहयोग',
      writeReview: 'अपना अनुभव साझा करें',
      submitReview: 'समीक्षा प्रकाशित करें',
      reviewPlaceholder: 'साउंड, साफ-सफाई, बैठने की व्यवस्था और लाइटिंग कैसी थी?',
      bookingTitle: 'यह वेन्यू बुक करें',
      step1: '1. तारीख और स्लॉट चुनें',
      step2: '2. कार्यक्रम व संपर्क विवरण',
      step3: '3. सुरक्षित पेमेंट',
      selectDate: 'कार्यक्रम की तारीख',
      selectSlot: 'त्वरित स्लॉट विकल्प',
      selectHoursTitle: 'या सटीक घंटे चुनें (बुक घंटे अक्षम हैं)',
      selectHoursHint: 'लगातार समय चुनने के लिए शुरुआती और अंतिम घंटे पर क्लिक करें।',
      bookedHour: 'बुक',
      selectedHoursSummary: 'चुना गया समय',
      inactiveVenueNotice: 'यह वेन्यू फिलहाल एडमिन द्वारा रोका गया है और नई बुकिंग स्वीकार नहीं कर रहा है।',
      available: 'उपलब्ध',
      unavailable: 'बुक है',
      guestCount: 'अनुमानित मेहमान',
      eventType: 'समारोह का प्रकार',
      guestName: 'संपर्क व्यक्ति का नाम',
      guestPhone: 'मोबाइल नंबर',
      specialRequests: 'सजावट, कैटरिंग या समय संबंधी नोट',
      specialRequestsPlaceholder: 'सेटअप समय, भोजन या माइक की आवश्यकता लिखें...',
      priceBreakdown: 'किराये का पूरा विवरण',
      baseTariff: 'वेन्यू स्लॉट शुल्क',
      cleaningFee: 'सेटअप व सफाई शुल्क',
      securityDeposit: 'वापसी योग्य सुरक्षा जमा',
      gst: 'जीएसटी (18% वेन्यू व सेटअप पर)',
      totalPayable: 'कुल देय राशि',
      paymentMethodTitle: 'सुरक्षित पेमेंट गेटवे',
      upiLabel: 'UPI',
      cardLabel: 'कार्ड',
      netbankingLabel: 'नेटबैंकिंग',
      upiIdPlaceholder: 'yourname@okaxis',
      cardHolderPlaceholder: 'कार्ड पर लिखा नाम',
      cardNumberPlaceholder: '4242 4242 4242 4242',
      cardExpiryPlaceholder: 'MM/YY',
      cardCvvPlaceholder: 'CVV',
      selectBank: 'बैंक चुनें',
      payAndConfirm: 'भुगतान करें और बुकिंग पक्की करें',
      processingPayment: 'पेमेंट सत्यापित हो रहा है...',
      signInToBook: 'बुकिंग पक्की करने के लिए Google से साइन इन करें',
      bookingConfirmedTitle: 'बुकिंग पक्की हो गई',
      bookingConfirmedSubtitle:
        'आपका स्लॉट रियल-टाइम में लॉक हो गया है और सूचना भेज दी गई है।',
      transactionId: 'ट्रांज़ैक्शन आईडी',
      viewMyBookings: 'मेरी बुकिंग देखें',
      bookAnother: 'अन्य वेन्यू देखें',
    },
    messages: {
      title: 'होस्ट के साथ सीधा संवाद',
      subtitle: 'कैटरिंग, डीजे समय, पार्किंग और सजावट के लिए होस्ट से सीधे बात करें।',
      noThreads: 'अभी कोई बातचीत नहीं है',
      noThreadsDesc: 'किसी भी वेन्यू पर जाकर "होस्ट को संदेश भेजें" चुनें।',
      selectThread: 'बातचीत पढ़ने और जवाब देने के लिए बाईं ओर से थ्रेड चुनें।',
      typeMessage: 'वेन्यू होस्ट को संदेश लिखें...',
      send: 'भेजें',
      hostBadge: 'होस्ट',
      guestBadge: 'मेहमान',
      quickQuestions: [
        'क्या फैमिली डिनर के लिए बाहर की कैटरिंग ला सकते हैं?',
        'सजावट के लिए हमारी टीम कितने बजे आ सकती है?',
        'क्या शाम के स्लॉट में वैले पार्किंग शामिल है?',
      ],
      signInPrompt: 'वेन्यू होस्ट से संदेश भेजने के लिए कृपया साइन इन करें।',
    },
    profile: {
      title: 'प्रोफ़ाइल और बुकिंग डैशबोर्ड',
      subtitle: 'अपनी बुकिंग, सेव किए गए वेन्यू, नोटिफिकेशन और होस्ट लिस्टिंग प्रबंधित करें।',
      tabBookings: 'मेरी बुकिंग',
      tabSaved: 'सेव किए गए वेन्यू',
      tabAccount: 'खाता और अलर्ट',
      tabHost: 'होस्ट स्टूडियो',
      upcomingBookings: 'मेरी बुकिंग सूची',
      noBookings: 'अभी कोई बुकिंग नहीं है',
      noBookingsDesc: 'जब आप पार्टी करादो पर वेन्यू बुक करेंगे, तो रसीद और लाइव स्थिति यहाँ दिखेगी।',
      cancelBooking: 'रद्द करें व रिफंड पाएं',
      markCheckedIn: 'चेक-इन चिह्नित करें',
      markCompleted: 'पूर्ण चिह्नित करें',
      leaveReview: 'रेटिंग व समीक्षा दें',
      chatHost: 'होस्ट से चैट करें',
      receiptId: 'रसीद',
      statusLabels: {
        confirmed: 'पुष्ट (Confirmed)',
        checked_in: 'चेक-इन हो गया',
        completed: 'संपन्न',
        cancelled: 'रद्द (रिफंड जारी)',
      },
      accountSettings: 'व्यक्तिगत विवरण व भाषा',
      fullName: 'पूरा नाम',
      phone: 'फ़ोन नंबर',
      preferredCity: 'पसंदीदा शहर',
      preferredLanguage: 'पसंदीदा भाषा',
      pushPrefsTitle: 'रियल-टाइम पुश नोटिफिकेशन',
      enableBrowserPush: 'ब्राउज़र पुश अलर्ट चालू करें',
      browserPushActive: 'ब्राउज़र पुश अलर्ट सक्रिय हैं',
      browserPushBlocked: 'ब्राउज़र सेटिंग में अलर्ट ब्लॉक हैं',
      bookingAlertsLabel: 'बुकिंग कन्फर्मेशन और स्टेटस अपडेट',
      messageAlertsLabel: 'वेन्यू होस्ट के सीधे संदेश',
      saveProfile: 'सेटिंग्स सेव करें',
      profileSaved: 'आपकी प्राथमिकताएं सेव हो गईं।',
      hostTitle: 'एडमिन स्थान प्रबंधन (Location Management)',
      hostSubtitle: 'वेन्यू बनाएं, अपडेट करें, सक्रिय/निष्क्रिय (isActive) टॉगल करें या हटाएं — सभी ग्राहकों को तुरंत लाइव दिखेगा।',
      addVenue: 'नया वेन्यू जोड़ें',
      venueNameLabel: 'वेन्यू का नाम',
      cityLabel: 'शहर',
      neighborhoodLabel: 'इलाका',
      addressLabel: 'पूरा पता',
      priceLabel: 'स्लॉट किराया (₹)',
      capacityMinLabel: 'न्यूनतम मेहमान',
      capacityMaxLabel: 'अधिकतम मेहमान',
      hourlyRateInputLabel: 'प्रति घंटा दर (₹/घंटा)',
      categoryLabel: 'वेन्यू प्रकार',
      descriptionLabel: 'विवरण',
      publishVenue: 'वेन्यू जोड़ें',
      adminBadge: 'एडमिन एक्सेस',
      adminRequiredNotice: 'वेन्यू जोड़ना, संपादित करना और सक्रिय/निष्क्रिय करना केवल सत्यापित एडमिन के लिए सीमित है।',
      activeStatus: 'सक्रिय (लाइव)',
      pausedStatus: 'निष्क्रिय (छिपा हुआ)',
      activateVenue: 'सक्रिय करें',
      pauseVenue: 'रोकें',
      editVenue: 'संपादित करें',
      saveChanges: 'बदलाव सहेजें',
      cancelEdit: 'रद्द करें',
      deleteVenue: 'हटाएं',
      rulesLabel: 'वेन्यू नियम',
    },
    notifications: {
      title: 'रियल-टाइम बुकिंग अलर्ट',
      markAllRead: 'सभी पढ़ा हुआ मानें',
      empty: 'कोई नया अलर्ट नहीं है। बुकिंग और संदेश के अपडेट यहाँ तुरंत दिखेंगे।',
      enableAlertsCta: 'तुरंत पुश अलर्ट चालू करें',
    },
    map: {
      title: 'वेन्यू लोकेशन और नज़दीकी स्थान',
      centerOnMe: 'मेरे पास खोजें',
      openVenue: 'देखें व बुक करें',
      missingKeyNotice: 'गूगल मैप लोड हो रहा है। विवरण देखने के लिए नीचे किसी भी पिन को चुनें।',
      interactiveMapReady: 'पूरी जानकारी और बुकिंग के लिए मैप पर किसी भी कीमत पिन पर क्लिक करें।',
    },
    common: {
      loading: 'लोड हो रहा है...',
      close: 'बंद करें',
      signInGoogle: 'Google से साइन इन करें',
      signingIn: 'साइन इन हो रहा है...',
      requiredSignIn: 'वेन्यू बुक करने, सेव करने और होस्ट से चैट करने के लिए साइन इन करें।',
    },
  },
  mr: {
    brand: 'पार्टी करादो',
    nav: {
      explore: 'व्हेन्यू पहा',
      mapView: 'मॅप व्ह्यू',
      messages: 'होस्ट चॅट',
      profile: 'माझे प्रोफाइल',
      signIn: 'साइन इन',
      signOut: 'साइन आउट',
    },
    hero: {
      eyebrow: 'मुंबई, पुणे आणि ठाण्यातील निवडक सेलिब्रेशन स्थळे',
      title: 'रिअल-टाइम उपलब्धतेसह तुमचे आवडते पार्टी व्हेन्यू त्वरित बुक करा.',
      subtitle:
        'थेट कॅलेंडर स्लॉट तपासा, गुगल मॅपवर जवळची ठिकाणे शोधा, व्हेन्यू होस्टशी संवाद साधा आणि सुरक्षित पेमेंटद्वारे बुकिंग निश्चित करा.',
      ctaBrowse: 'व्हेन्यू पहा',
      ctaMap: 'मॅपवर पहा',
      statVenues: 'पडताळलेली स्थळे',
      statBooking: 'रिअल-टाइम स्लॉट लॉक',
      statVerified: 'विश्वासार्ह गेस्ट रिव्ह्यू',
      statSupport: 'English · हिन्दी · मराठी',
    },
    languageLabel: 'भाषा',
    filters: {
      searchPlaceholder: 'व्हेन्यूचे नाव, परिसर किंवा ठिकाण शोधा...',
      allCities: 'सर्व शहरे',
      allCategories: 'सर्व व्हेन्यू प्रकार',
      capacityLabel: 'पाहुण्यांची क्षमता',
      capacityAll: 'कोणतीही क्षमता',
      capacityIntimate: 'लहान समारंभ (40 पर्यंत)',
      capacityMedium: 'मध्यम समारंभ (40 – 120)',
      capacityGrand: 'भव्य सोहळा (120 – 300)',
      capacityMega: 'मोठा हॉल (300+)',
      hourlyRateLabel: 'प्रति तास दर',
      hourlyAll: 'कोणताही तासाचा दर',
      hourlyBudget: '₹8,000 / तास पर्यंत',
      hourlyMid: '₹8,000 – ₹15,000 / तास',
      hourlyPremium: '₹15,000+ / तास',
      dateLabel: 'कार्यक्रमाची तारीख',
      slotLabel: 'वेळेचा स्लॉट',
      slotAny: 'कोणताही स्लॉट',
      amenitiesLabel: 'सुविधा',
      sortLabel: 'क्रमवारी',
      sortRecommended: 'शिफारस केलेले',
      sortRating: 'सर्वोत्तम रेटिंग',
      sortPriceAsc: 'कमी ते जास्त दर',
      sortCapacityDesc: 'जास्त क्षमता',
      resetFilters: 'फिल्टर रीसेट करा',
      nearMe: 'जवळपासची ठिकाणे',
      locating: 'शोधत आहे...',
      resultsCount: 'व्हेन्यू उपलब्ध आहेत',
      showGrid: 'ग्रिड व्ह्यू',
      showSplitMap: 'मॅपसह पहा',
    },
    categories: {
      rooftop: 'रूफटॉप टेरेस',
      banquet: 'बँक्वेट हॉल',
      poolside: 'पूलसाईड व्हिला',
      courtyard: 'हेरिटेज अंगण',
      lawn: 'गार्डन लॉन',
      lounge: 'इनडोअर लाउंज',
    },
    amenities: {
      ac_hall: 'एसी हॉल',
      rooftop: 'ओपन-एअर रूफटॉप',
      poolside: 'पूलसाईड प्रवेश',
      dj_sound: 'इन-हाऊस डीजे व साउंड',
      valet_parking: 'व्हॅले पार्किंग',
      catering_allowed: 'बाहेरील केटरिंगला परवानगी',
      bar_license: 'बार व ड्रिंक्स काउंटर',
      wheelchair_access: 'व्हीलचेअर सुविधा',
    },
    slots: {
      morning: 'सकाळचा समारंभ',
      morningTime: '10:00 – 14:00',
      evening: 'संध्याकाळचा स्लॉट',
      eveningTime: '16:00 – 20:00',
      night: 'रात्रीची पार्टी',
      nightTime: '20:00 – 24:00',
      fullday: 'पूर्ण दिवस राखीव',
      fulldayTime: '10:00 – 24:00',
      custom: 'कस्टम तास',
    },
    events: {
      birthday: 'वाढदिवस सोहळा',
      sangeet: 'संगीत / साखरपुडा',
      anniversary: 'वाढदिवस / अॅनिव्हर्सरी डिनर',
      corporate: 'कॉर्पोरेट मीटअप',
      cocktail: 'कॉकटेल संध्याकाळ',
      family: 'कौटुंबिक स्नेहमेळावा',
    },
    venueCard: {
      guests: 'पाहुणे',
      perHour: '/ तास',
      perSlot: '/ 4 तास स्लॉट',
      slotHours: '4 तास',
      reviews: 'रिव्ह्यू',
      moreAmenities: 'अधिक',
      availableForDate: 'निवडलेल्या तारखेला उपलब्ध',
      bookedForDate: 'स्लॉट बुक आहे',
      viewDetails: 'माहिती व बुकिंग',
      save: 'जतन करा',
      saved: 'जतन केले',
      away: 'किमी अंतरावर',
    },
    detail: {
      backToVenues: 'सर्व व्हेन्यूवर परत जा',
      overview: 'ठिकाणाविषयी माहिती',
      amenitiesTitle: 'उपलब्ध सुविधा',
      houseRules: 'व्हेन्यूचे नियम',
      hostedBy: 'होस्ट:',
      messageHost: 'होस्टला मेसेज करा',
      reviewsTitle: 'पाहुण्यांचे रिव्ह्यू आणि पारदर्शक रेटिंग',
      cleanliness: 'स्वच्छता',
      ambience: 'वातावरण',
      acoustics: 'साउंड व ध्वनी',
      hostCare: 'होस्टची तत्परता',
      writeReview: 'तुमचा अनुभव शेअर करा',
      submitReview: 'रिव्ह्यू प्रकाशित करा',
      reviewPlaceholder: 'स्वच्छता, साउंड सिस्टीम, बैठक व्यवस्था आणि प्रकाशयोजना कशी होती?',
      bookingTitle: 'हे व्हेन्यू बुक करा',
      step1: '1. तारीख आणि स्लॉट निवडा',
      step2: '2. कार्यक्रम व संपर्क तपशील',
      step3: '3. सुरक्षित पेमेंट',
      selectDate: 'कार्यक्रमाची तारीख',
      selectSlot: 'जलद स्लॉट पर्याय',
      selectHoursTitle: 'किंवा अचूक तास निवडा (बुक केलेले तास बंद आहेत)',
      selectHoursHint: 'सलग तास निवडण्यासाठी सुरुवातीचा आणि शेवटचा तास क्लिक करा.',
      bookedHour: 'बुक',
      selectedHoursSummary: 'निवडलेली वेळ',
      inactiveVenueNotice: 'हे व्हेन्यू सध्या अॅडमिनने तात्पुरते बंद ठेवले आहे आणि नवीन बुकिंग स्वीकारत नाही.',
      available: 'उपलब्ध',
      unavailable: 'बुक आहे',
      guestCount: 'अपेक्षित पाहुणे',
      eventType: 'समारंभाचा प्रकार',
      guestName: 'संपर्क व्यक्तीचे नाव',
      guestPhone: 'मोबाईल क्रमांक',
      specialRequests: 'सजावट, केटरिंग किंवा वेळेबाबत सूचना',
      specialRequestsPlaceholder: 'सेटअपची वेळ, जेवण किंवा माईकची गरज नमूद करा...',
      priceBreakdown: 'भाडे व खर्चाचा तपशील',
      baseTariff: 'व्हेन्यू स्लॉट शुल्क',
      cleaningFee: 'सेटअप व स्वच्छता शुल्क',
      securityDeposit: 'परत मिळणारी सुरक्षा ठेव',
      gst: 'जीएसटी (18% व्हेन्यू व सेटअपवर)',
      totalPayable: 'एकूण देय रक्कम',
      paymentMethodTitle: 'सुरक्षित पेमेंट गेटवे',
      upiLabel: 'UPI',
      cardLabel: 'कार्ड',
      netbankingLabel: 'नेटबँकिंग',
      upiIdPlaceholder: 'yourname@okaxis',
      cardHolderPlaceholder: 'कार्डवरील नाव',
      cardNumberPlaceholder: '4242 4242 4242 4242',
      cardExpiryPlaceholder: 'MM/YY',
      cardCvvPlaceholder: 'CVV',
      selectBank: 'बँक निवडा',
      payAndConfirm: 'पेमेंट करा आणि बुकिंग पक्की करा',
      processingPayment: 'पेमेंट तपासले जात आहे...',
      signInToBook: 'बुकिंग पक्की करण्यासाठी Google ने साइन इन करा',
      bookingConfirmedTitle: 'बुकिंग निश्चित झाली आहे',
      bookingConfirmedSubtitle:
        'तुमचा स्लॉट रिअल-टाइममध्ये लॉक केला गेला आहे आणि अलर्ट पाठवला आहे.',
      transactionId: 'ट्रान्झॅक्शन क्रमांक',
      viewMyBookings: 'माझ्या बुकिंग्ज पहा',
      bookAnother: 'इतर व्हेन्यू पहा',
    },
    messages: {
      title: 'होस्टशी थेट संवाद',
      subtitle: 'केटरिंग, साउंडची वेळ, व्हॅले पार्किंग आणि सजावटीसाठी थेट चर्चा करा.',
      noThreads: 'अद्याप कोणतेही संभाषण नाही',
      noThreadsDesc: 'कोणत्याही व्हेन्यूवर जाऊन "होस्टला मेसेज करा" निवडा.',
      selectThread: 'मेसेज वाचण्यासाठी आणि उत्तर देण्यासाठी डावीकडून संवाद निवडा.',
      typeMessage: 'व्हेन्यू होस्टला मेसेज लिहा...',
      send: 'पाठवा',
      hostBadge: 'होस्ट',
      guestBadge: 'पाहुणे',
      quickQuestions: [
        'कौटुंबिक स्नेहभोजनासाठी बाहेरील केटरिंगला परवानगी आहे का?',
        'सजावटीसाठी आमची टीम किती वाजता येऊ शकते?',
        'संध्याकाळच्या स्लॉटमध्ये व्हॅले पार्किंग समाविष्ट आहे का?',
      ],
      signInPrompt: 'व्हेन्यू होस्टशी संवाद साधण्यासाठी कृपया साइन इन करा.',
    },
    profile: {
      title: 'खाते आणि बुकिंग डॅशबोर्ड',
      subtitle: 'तुमच्या बुकिंग्ज, जतन केलेली ठिकाणे, अलर्ट आणि होस्ट लिस्टिंग्ज व्यवस्थापित करा.',
      tabBookings: 'माझ्या बुकिंग्ज',
      tabSaved: 'जतन केलेले व्हेन्यू',
      tabAccount: 'खाते व अलर्ट',
      tabHost: 'होस्ट स्टुडिओ',
      upcomingBookings: 'आरक्षण यादी',
      noBookings: 'अद्याप कोणतीही बुकिंग नाही',
      noBookingsDesc: 'तुम्ही पार्टी करादोवर व्हेन्यू बुक केल्यावर पावती आणि थेट स्थिती येथे दिसेल.',
      cancelBooking: 'रद्द करा व परतावा मिळवा',
      markCheckedIn: 'चेक-इन नोंदवा',
      markCompleted: 'पूर्ण झाले नोंदवा',
      leaveReview: 'रेटिंग व रिव्ह्यू द्या',
      chatHost: 'होस्टला मेसेज करा',
      receiptId: 'पावती',
      statusLabels: {
        confirmed: 'निश्चित (Confirmed)',
        checked_in: 'चेक-इन झाले',
        completed: 'पूर्ण झाले',
        cancelled: 'रद्द (परतावा जारी)',
      },
      accountSettings: 'वैयक्तिक माहिती व भाषा',
      fullName: 'पूर्ण नाव',
      phone: 'फोन नंबर',
      preferredCity: 'आवडते शहर',
      preferredLanguage: 'आवडती भाषा',
      pushPrefsTitle: 'रिअल-टाइम पुश नोटिफिकेशन्स',
      enableBrowserPush: 'ब्राउझर पुश अलर्ट सुरू करा',
      browserPushActive: 'ब्राउझर पुश अलर्ट सुरू आहेत',
      browserPushBlocked: 'ब्राउझर सेटिंग्जमध्ये अलर्ट बंद आहेत',
      bookingAlertsLabel: 'बुकिंग पुष्टीकरण आणि स्थिती अद्यतने',
      messageAlertsLabel: 'व्हेन्यू होस्टकडून थेट मेसेजेस',
      saveProfile: 'सेटिंग्ज जतन करा',
      profileSaved: 'तुमची प्राधान्ये यशस्वीरित्या जतन केली.',
      hostTitle: 'अॅडमिन लोकेशन व्यवस्थापन (Location Management)',
      hostSubtitle: 'व्हेन्यू जोडा, अपडेट करा, सक्रिय/बंद (isActive) करा किंवा काढून टाका — ग्राहकांना थेट लाइव्ह दिसेल.',
      addVenue: 'नवीन व्हेन्यू जोडा',
      venueNameLabel: 'व्हेन्यूचे नाव',
      cityLabel: 'शहर',
      neighborhoodLabel: 'परिसर',
      addressLabel: 'पूर्ण पत्ता',
      priceLabel: 'स्लॉट दर (₹)',
      capacityMinLabel: 'किमान पाहुणे',
      capacityMaxLabel: 'कमाल पाहुणे',
      hourlyRateInputLabel: 'प्रति तास दर (₹/तास)',
      categoryLabel: 'व्हेन्यू प्रकार',
      descriptionLabel: 'ठिकाणाचे वर्णन',
      publishVenue: 'व्हेन्यू जोडा',
      adminBadge: 'अॅडमिन प्रवेश',
      adminRequiredNotice: 'व्हेन्यू तयार करणे, संपादित करणे आणि सक्रिय/बंद करणे केवळ प्रमाणित अॅडमिनसाठी मर्यादित आहे.',
      activeStatus: 'सक्रिय (लाइव्ह)',
      pausedStatus: 'थांबवलेले (लपवलेले)',
      activateVenue: 'सक्रिय करा',
      pauseVenue: 'थांबवा',
      editVenue: 'संपादित करा',
      saveChanges: 'बदल जतन करा',
      cancelEdit: 'रद्द करा',
      deleteVenue: 'काढून टाका',
      rulesLabel: 'व्हेन्यूचे नियम',
    },
    notifications: {
      title: 'रिअल-टाइम बुकिंग अलर्ट',
      markAllRead: 'सर्व वाचलेले करा',
      empty: 'सध्या कोणतेही नवीन अलर्ट नाहीत. बुकिंग आणि चॅट अपडेट्स येथे त्वरित दिसतील.',
      enableAlertsCta: 'त्वरित पुश अलर्ट सुरू करा',
    },
    map: {
      title: 'व्हेन्यू लोकेशन आणि जवळची ठिकाणे',
      centerOnMe: 'माझ्या जवळचे शोधा',
      openVenue: 'तपासा व बुक करा',
      missingKeyNotice: 'इंटरअॅक्टिव्ह गुगल मॅप लोड होत आहे. तपशिलासाठी खालील कोणताही पिन निवडा.',
      interactiveMapReady: 'माहिती आणि बुकिंगसाठी मॅपवरील कोणत्याही किंमत पिनवर क्लिक करा.',
    },
    common: {
      loading: 'लोड होत आहे...',
      close: 'बंद करा',
      signInGoogle: 'Google ने साइन इन करा',
      signingIn: 'साइन इन होत आहे...',
      requiredSignIn: 'व्हेन्यू बुक करण्यासाठी, सेव्ह करण्यासाठी आणि होस्टशी चॅट करण्यासाठी साइन इन करा.',
    },
  },
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
