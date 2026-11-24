import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  APILoadingStatus,
  AdvancedMarker,
  Map as GoogleMap,
  InfoWindow,
  useAdvancedMarkerRef,
  useApiLoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Compass, MapPin, Star, Users } from 'lucide-react';
import { TranslationBundle, formatINR } from '../i18n/translations';
import { Language, Venue } from '../types';

interface VenueMapViewProps {
  venues: Venue[];
  language: Language;
  t: TranslationBundle;
  apiKey: string;
  selectedVenueId: string | null;
  hoveredVenueId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onSelectVenue: (venueId: string) => void;
  onOpenVenue: (venue: Venue) => void;
  onLocateMe: () => void;
  isLocating: boolean;
}

interface VenueMarkerProps {
  venue: Venue;
  language: Language;
  zIndex: number;
  isSelected: boolean;
  isHovered: boolean;
  onMarkerClick: (
    venue: Venue,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
}

function VenuePriceMarker({
  venue,
  language,
  zIndex,
  isSelected,
  isHovered,
  onMarkerClick,
}: VenueMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const title =
    language === 'hi' ? venue.nameHi : language === 'mr' ? venue.nameMr : venue.name;
  const shortPrice = `₹${Math.round(venue.pricePerSlot / 1000)}k`;

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: venue.lat, lng: venue.lng }}
      zIndex={zIndex}
      title={title}
      onClick={() => {
        if (marker) {
          onMarkerClick(venue, marker);
        }
      }}
    >
      <div
        className={`px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums shadow-md border transition-transform duration-150 cursor-pointer whitespace-nowrap ${
          isSelected
            ? 'bg-[#C83E2B] text-white border-[#9B2C1D] scale-110'
            : isHovered
            ? 'bg-[#18181B] text-white border-[#18181B] scale-105'
            : 'bg-white text-[#18181B] border-[#D6D1C4] hover:border-[#18181B]'
        }`}
      >
        {shortPrice}
      </div>
    </AdvancedMarker>
  );
}

function MapViewportController({
  venues,
  userLocation,
  selectedVenueId,
}: {
  venues: Venue[];
  userLocation: { lat: number; lng: number } | null;
  selectedVenueId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (userLocation) {
      map.panTo(userLocation);
      map.setZoom(12);
      return;
    }
    if (selectedVenueId) {
      const target = venues.find((v) => v.id === selectedVenueId);
      if (target) {
        map.panTo({ lat: target.lat, lng: target.lng });
      }
      return;
    }
    if (venues.length > 0 && typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds();
      venues.forEach((v) => bounds.extend({ lat: v.lat, lng: v.lng }));
      map.fitBounds(bounds, 56);
    }
  }, [map, venues, userLocation, selectedVenueId]);

  return null;
}

function GoogleMapInner({
  venues,
  language,
  t,
  selectedVenueId,
  hoveredVenueId,
  userLocation,
  onSelectVenue,
  onOpenVenue,
  onLocateMe,
  isLocating,
}: Omit<VenueMapViewProps, 'apiKey'>) {
  const status = useApiLoadingStatus();
  const [activeMarker, setActiveMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);
  const [infoVenue, setInfoVenue] = useState<Venue | null>(null);

  const sortedVenues = useMemo(() => {
    return [...venues]
      .sort((a, b) => b.lat - a.lat)
      .map((venue, idx) => ({ venue, baseZ: idx }));
  }, [venues]);

  const handleMarkerClick = useCallback(
    (venue: Venue, marker: google.maps.marker.AdvancedMarkerElement) => {
      onSelectVenue(venue.id);
      setActiveMarker(marker);
      setInfoVenue(venue);
    },
    [onSelectVenue]
  );

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <FallbackInteractiveMap
        venues={venues}
        language={language}
        t={t}
        selectedVenueId={selectedVenueId}
        onSelectVenue={onSelectVenue}
        onOpenVenue={onOpenVenue}
        onLocateMe={onLocateMe}
        isLocating={isLocating}
      />
    );
  }

  const defaultCenter = venues[0]
    ? { lat: venues[0].lat, lng: venues[0].lng }
    : { lat: 19.076, lng: 72.8777 };

  return (
    <div className="relative w-full h-[460px] lg:h-[580px] rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#F3F1EC]">
      <GoogleMap
        defaultCenter={defaultCenter}
        defaultZoom={10}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        streetViewControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        <MapViewportController
          venues={venues}
          userLocation={userLocation}
          selectedVenueId={selectedVenueId}
        />

        {userLocation && (
          <AdvancedMarker position={userLocation} zIndex={1200} title="Your Location">
            <div className="w-4 h-4 rounded-full bg-[#1D4ED8] border-2 border-white shadow-md" />
          </AdvancedMarker>
        )}

        {sortedVenues.map(({ venue, baseZ }) => {
          const isSelected = selectedVenueId === venue.id;
          const isHovered = hoveredVenueId === venue.id;
          const zIndex = isSelected ? 1000 : isHovered ? 999 : baseZ;
          return (
            <VenuePriceMarker
              key={venue.id}
              venue={venue}
              language={language}
              zIndex={zIndex}
              isSelected={isSelected}
              isHovered={isHovered}
              onMarkerClick={handleMarkerClick}
            />
          );
        })}

        {infoVenue && activeMarker && (
          <InfoWindow
            anchor={activeMarker}
            pixelOffset={[0, -8]}
            onCloseClick={() => {
              setInfoVenue(null);
              setActiveMarker(null);
            }}
          >
            <div className="w-60 p-1 font-sans text-[#18181B]">
              <img
                src={infoVenue.imageUrl}
                alt={infoVenue.name}
                referrerPolicy="no-referrer"
                className="w-full h-28 object-cover rounded-lg mb-2 bg-[#F3F1EC]"
              />
              <p className="text-xs text-[#57534E] truncate">
                {infoVenue.neighborhood}, {infoVenue.city}
              </p>
              <h4 className="font-semibold text-sm text-[#18181B] leading-snug mt-0.5 line-clamp-1">
                {language === 'hi'
                  ? infoVenue.nameHi
                  : language === 'mr'
                  ? infoVenue.nameMr
                  : infoVenue.name}
              </h4>
              <div className="flex items-center justify-between mt-2 text-xs text-[#57534E]">
                <span className="font-semibold text-[#18181B] tabular-nums">
                  {formatINR(infoVenue.pricePerSlot)}
                </span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="w-3.5 h-3.5 text-[#B45309] fill-[#B45309]" />
                  {infoVenue.ratingAvg.toFixed(1)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenVenue(infoVenue)}
                className="mt-2.5 w-full py-2 px-3 bg-[#C83E2B] text-white text-xs font-medium rounded-md hover:bg-[#AE3221] transition-colors cursor-pointer"
              >
                {t.map.openVenue}
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/95 backdrop-blur-sm border border-[#E5E1D8] rounded-lg shadow-sm text-xs font-medium text-[#18181B] hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
        >
          <Compass className="w-4 h-4 text-[#C83E2B]" />
          {isLocating ? t.filters.locating : t.map.centerOnMe}
        </button>
      </div>

      <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 backdrop-blur-sm border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#57534E] shadow-sm">
        {t.map.interactiveMapReady}
      </div>
    </div>
  );
}

function FallbackInteractiveMap({
  venues,
  language,
  t,
  selectedVenueId,
  onSelectVenue,
  onOpenVenue,
  onLocateMe,
  isLocating,
}: Omit<VenueMapViewProps, 'apiKey' | 'hoveredVenueId' | 'userLocation'>) {
  const selectedVenue =
    venues.find((v) => v.id === selectedVenueId) || venues[0] || null;

  const minLat = 18.45;
  const maxLat = 19.3;
  const minLng = 72.75;
  const maxLng = 73.95;

  return (
    <div className="relative w-full h-[460px] lg:h-[580px] rounded-xl overflow-hidden border border-[#E5E1D8] bg-[#EFECE5] flex flex-col justify-between p-4">
      <div className="flex items-center justify-between gap-3 z-10">
        <div className="bg-white/95 border border-[#E5E1D8] rounded-lg px-3 py-2 text-xs text-[#57534E]">
          {t.map.missingKeyNotice}
        </div>
        <button
          type="button"
          onClick={onLocateMe}
          disabled={isLocating}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-[#E5E1D8] rounded-lg shadow-sm text-xs font-medium text-[#18181B] hover:bg-[#FAF9F6] cursor-pointer whitespace-nowrap shrink-0"
        >
          <Compass className="w-4 h-4 text-[#C83E2B]" />
          {isLocating ? t.filters.locating : t.map.centerOnMe}
        </button>
      </div>

      <div className="relative flex-1 my-3 rounded-lg border border-[#E5E1D8] bg-[#FAF9F6]/70 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full opacity-35"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="pk-grid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#D6D1C4" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pk-grid)" />
        </svg>

        {venues.map((venue) => {
          const x = Math.min(
            90,
            Math.max(10, ((venue.lng - minLng) / (maxLng - minLng)) * 100)
          );
          const y = Math.min(
            86,
            Math.max(14, (1 - (venue.lat - minLat) / (maxLat - minLat)) * 100)
          );
          const isSelected = selectedVenue?.id === venue.id;
          return (
            <button
              key={venue.id}
              type="button"
              onClick={() => onSelectVenue(venue.id)}
              style={{ left: `${x}%`, top: `${y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-semibold tabular-nums shadow-sm border transition-transform cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#C83E2B] text-white border-[#9B2C1D] scale-110 z-20'
                  : 'bg-white text-[#18181B] border-[#D6D1C4] hover:border-[#18181B] z-10'
              }`}
            >
              ₹{Math.round(venue.pricePerSlot / 1000)}k
            </button>
          );
        })}
      </div>

      {selectedVenue && (
        <div className="bg-white border border-[#E5E1D8] rounded-xl p-3.5 flex items-center gap-4 shadow-sm z-10">
          <img
            src={selectedVenue.imageUrl}
            alt={selectedVenue.name}
            referrerPolicy="no-referrer"
            className="w-20 h-16 object-cover rounded-lg shrink-0 bg-[#F3F1EC]"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#57534E] truncate flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#C83E2B] shrink-0" />
              {selectedVenue.neighborhood}, {selectedVenue.city}
            </p>
            <h4 className="font-semibold text-sm text-[#18181B] truncate mt-0.5">
              {language === 'hi'
                ? selectedVenue.nameHi
                : language === 'mr'
                ? selectedVenue.nameMr
                : selectedVenue.name}
            </h4>
            <div className="flex items-center gap-3 text-xs text-[#57534E] mt-1 tabular-nums">
              <span className="font-semibold text-[#18181B]">
                {formatINR(selectedVenue.pricePerSlot)}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {selectedVenue.capacityMax}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenVenue(selectedVenue)}
            className="px-4 py-2.5 bg-[#C83E2B] text-white text-xs font-medium rounded-lg hover:bg-[#AE3221] transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          >
            {t.map.openVenue}
          </button>
        </div>
      )}
    </div>
  );
}

export const VenueMapView: React.FC<VenueMapViewProps> = ({
  apiKey,
  language,
  ...rest
}) => {
  if (!apiKey) {
    return <FallbackInteractiveMap language={language} {...rest} />;
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['marker']}
      language={language}
      region="IN"
    >
      <GoogleMapInner language={language} {...rest} />
    </APIProvider>
  );
};
