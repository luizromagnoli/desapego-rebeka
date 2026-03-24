'use client';

import Link from 'next/link';
import type { Item } from '@/lib/types';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

interface ItemCardProps {
  item: Item;
  cartVariationIds: string[];
  onToggleVariation?: (variationId: string) => void;
  compact?: boolean;
}

export default function ItemCard({ item, cartVariationIds, onToggleVariation, compact }: ItemCardProps) {
  const variations = item.variations || [];
  const availableVariations = variations.filter((v) => v.status === 'available');
  const allUnavailable = availableVariations.length === 0;
  const hasMultipleVariations = variations.length > 1;
  const firstPhoto = item.photos?.[0];

  const singleVariation = !hasMultipleVariations && variations.length === 1 ? variations[0] : null;
  const isSelected = singleVariation ? cartVariationIds.includes(singleVariation.id) : false;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all cursor-pointer hover:shadow-md hover:border-amber-300 ${
        allUnavailable ? 'opacity-60' : ''
      }`}
    >
      {/* Photo / Placeholder */}
      <Link href={`/item/${item.id}`} className="block relative">
        {firstPhoto ? (
          <img
            src={`/api/uploads/${firstPhoto.filename}`}
            alt={item.title}
            loading="lazy"
            className={`w-full object-cover ${compact ? 'h-36' : 'h-48'}`}
          />
        ) : (
          <div className={`w-full bg-gray-200 flex items-center justify-center ${compact ? 'h-36' : 'h-48'}`}>
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        )}
        {allUnavailable && (
          <span className="absolute top-2 right-2 bg-amber-600 text-white text-xs font-semibold px-2 py-1 rounded">
            Reservado
          </span>
        )}
      </Link>

      {/* Info */}
      <div className={compact ? 'p-3' : 'p-4'}>
        <Link href={`/item/${item.id}`} className="block cursor-pointer">
          <h2 className={`font-semibold text-gray-800 hover:text-amber-700 transition-colors line-clamp-2 ${compact ? 'text-sm' : ''}`}>
            {item.title}
          </h2>
          {(() => {
            if (!hasMultipleVariations) {
              const vPrice = variations[0]?.price;
              return (
                <p className={`mt-1 font-bold text-amber-700 ${compact ? 'text-base' : 'text-lg'}`}>
                  {formatPrice(vPrice ?? item.price)}
                </p>
              );
            }
            const prices = variations.map((v) => v.price ?? item.price);
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            return (
              <p className={`mt-1 font-bold text-amber-700 ${compact ? 'text-base' : 'text-lg'}`}>
                {min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}
              </p>
            );
          })()}
          {hasMultipleVariations && (
            <p className="text-xs text-gray-500 mt-1">
              {availableVariations.length} de {variations.length} disponíveis
            </p>
          )}
        </Link>

        {/* For single-variation items, show select button directly */}
        {!compact && onToggleVariation && !hasMultipleVariations && singleVariation && singleVariation.status === 'available' && (
          <button
            onClick={() => onToggleVariation(singleVariation.id)}
            className={`mt-3 w-full py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSelected
                ? 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            {isSelected ? 'Selecionado' : 'Selecionar'}
          </button>
        )}

        {/* For multi-variation items, link to detail page */}
        {!compact && hasMultipleVariations && availableVariations.length > 0 && (
          <Link
            href={`/item/${item.id}`}
            className="mt-3 w-full py-2 px-4 rounded-md text-sm font-medium transition-colors bg-amber-600 text-white hover:bg-amber-700 block text-center"
          >
            Ver opções
          </Link>
        )}
      </div>
    </div>
  );
}
