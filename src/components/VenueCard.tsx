import React from 'react';
import { Bookmark, MapPin, Star, Users } from 'lucide-react';
import { TranslationBundle, formatINR } from '../i18n/translations';
import { Language, Venue } from '../types';

interface VenueCardProps {
  venue: Venue;
  language: Language;
  t: TranslationBundle;
  ratingAvg: number;
  reviewCount: number;
  isSaved: boolean;
  isSelectedOnMap?: boolean;
  availabilityStatus?: 'open' | 'booked' | 'neutral';
  distanceKm?: number | null;
  onToggleSave: (venueId: string) => void;
  onHover: (venueId: string | null) => void;
  onOpen: (venue: Venue) => void;
}

export const VenueCard: React.FC<VenueCardProps> = ({
  venue,
  language,
  t,
  ratingAvg,
  reviewCount,
  isSaved,
  isSelectedOnMap,
  availabilityStatus = 'neutral',
  distanceKm,
  onToggleSave,
  onHover,
  onOpen,
}) => {
  const title =
    language === 'hi' ? venue.nameHi : language === 'mr' ? venue.nameMr : venue.name;
  const categoryLabel = t.categories[venue.category] || venue.category;

  return (
    <article
      onMouseEnter={() => onHover(venue.id)}
      onMouseLeave={() => onHover(null)}
      className={`group bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col ${
        isSelectedOnMap
          ? 'border-[#C83E2B] shadow-md'
          : 'border-[#E5E1D8] hover:border-[#C5BFB2] hover:-translate-y-0.5 hover:shadow-md'
      }`}
    >
      <div className="relative aspect-[4/3] w-full bg-[#F3F1EC] overflow-hidden">
        <img
          src={venue.imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(venue.id);
          }}
          aria-label={isSaved ? t.venueCard.saved : t.venueCard.save}
          className={`absolute top-3 right-3 min-w-[40px] min-h-[40px] px-3 py-2 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
            isSaved
              ? 'bg-[#C83E2B] text-white border-[#C83E2B]'
              : 'bg-white/95 text-[#18181B] border-[#E5E1D8] hover:bg-white'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-white' : ''}`} />
          <span>{isSaved ? t.venueCard.saved : t.venueCard.save}</span>
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs text-[#57534E]">
            <span className="truncate">
              {categoryLabel} <span aria-hidden="true">·</span> {venue.city}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-[#18181B] tabular-nums shrink-0">
              <Star className="w-3.5 h-3.5 text-[#B45309] fill-[#B45309]" />
              {ratingAvg.toFixed(1)}
              <span className="text-[#57534E] font-normal">({reviewCount})</span>
            </span>
          </div>

          <h3 className="mt-1.5 text-lg font-semibold text-[#18181B] leading-snug line-clamp-1">
            {title}
          </h3>

          <p className="mt-1 text-sm text-[#57534E] flex items-center gap-1.5 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#C83E2B] shrink-0" />
            <span className="truncate">{venue.neighborhood}</span>
            {typeof distanceKm === 'number' && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums shrink-0">
                  {distanceKm.toFixed(1)} {t.venueCard.away}
                </span>
              </>
            )}
          </p>

          <div className="mt-2.5 space-y-1 text-xs text-[#57534E]">
            <div className="inline-flex items-center gap-1.5 tabular-nums font-medium text-[#18181B]">
              <Users className="w-3.5 h-3.5 text-[#57534E]" />
              <span>
                {venue.capacityMin}–{venue.capacityMax} {t.venueCard.guests}
              </span>
            </div>
            <p className="line-clamp-1">
              {venue.amenities
                .slice(0, 3)
                .map((key) => t.amenities[key] || key)
                .join(' · ')}
              {venue.amenities.length > 3 &&
                ` · +${venue.amenities.length - 3} ${t.venueCard.moreAmenities}`}
            </p>
          </div>

          {availabilityStatus !== 'neutral' && (
            <p
              className={`mt-2.5 text-xs font-medium ${
                availabilityStatus === 'open' ? 'text-[#15803D]' : 'text-[#B91C1C]'
              }`}
            >
              {availabilityStatus === 'open'
                ? t.venueCard.availableForDate
                : t.venueCard.bookedForDate}
            </p>
          )}
        </div>

        <div className="pt-3.5 border-t border-[#E5E1D8] flex items-center justify-between gap-3">
          <div className="tabular-nums">
            <div>
              <span className="text-lg font-semibold text-[#18181B]">
                {formatINR(venue.hourlyRate)}
              </span>{' '}
              <span className="text-xs text-[#57534E]">{t.venueCard.perHour}</span>
            </div>
            <p className="text-[11px] text-[#78716C]">
              {formatINR(venue.pricePerSlot)} {t.venueCard.perSlot}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpen(venue)}
            className="px-4 py-2.5 bg-[#18181B] text-white text-sm font-medium rounded-lg hover:bg-[#C83E2B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {t.venueCard.viewDetails}
          </button>
        </div>
      </div>
    </article>
  );
};
