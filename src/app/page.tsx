'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Item } from '@/lib/types';
import { getCart, addToCart, removeFromCart } from '@/lib/cart';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function HomePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartVariationIds, setCartVariationIds] = useState<string[]>([]);

  useEffect(() => {
    setCartVariationIds(getCart());
  }, []);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar itens');
        return res.json();
      })
      .then((data: Item[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  function toggleVariation(variationId: string) {
    if (cartVariationIds.includes(variationId)) {
      removeFromCart(variationId);
      setCartVariationIds((prev) => prev.filter((id) => id !== variationId));
    } else {
      addToCart(variationId);
      setCartVariationIds((prev) => [...prev, variationId]);
    }
  }

  // Compute total price from cart
  const cartTotal = items.reduce((sum, item) => {
    const vars = item.variations || [];
    const matchCount = vars.filter((v) => cartVariationIds.includes(v.id)).length;
    return sum + item.price * matchCount;
  }, 0);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold text-amber-700">
            Desapego Rebeka - Equipamentos Fotográficos
          </h1>
          <p className="mt-2 text-gray-600">
            Equipamentos, móveis e acessórios de estúdio fotográfico
          </p>
          <p className="mt-3 text-sm text-gray-500 bg-gray-50 inline-block px-4 py-2 rounded-md">
            Retirada no estúdio em Alphaville - Barueri/SP, na data combinada. Para fotógrafos de Itu/SP a entrega será a combinar em Itu.
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {loading && (
          <p className="text-center text-gray-500">Carregando itens...</p>
        )}

        {error && (
          <p className="text-center text-red-600">{error}</p>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-center text-gray-500">
            Nenhum item disponível no momento.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => {
            const variations = item.variations || [];
            const availableVariations = variations.filter((v) => v.status === 'available');
            const allUnavailable = availableVariations.length === 0;
            const hasMultipleVariations = variations.length > 1;
            const firstPhoto = item.photos?.[0];

            // For single-variation items, check if it's in cart
            const singleVariation = !hasMultipleVariations && variations.length === 1 ? variations[0] : null;
            const isSelected = singleVariation ? cartVariationIds.includes(singleVariation.id) : false;

            return (
              <div
                key={item.id}
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
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
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
                <div className="p-4">
                  <Link href={`/item/${item.id}`} className="block cursor-pointer">
                    <h2 className="font-semibold text-gray-800 hover:text-amber-700 transition-colors line-clamp-2">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-lg font-bold text-amber-700">
                      {formatPrice(item.price)}
                    </p>
                    {hasMultipleVariations && (
                      <p className="text-xs text-gray-500 mt-1">
                        {availableVariations.length} de {variations.length} disponíveis
                      </p>
                    )}
                  </Link>

                  {/* For single-variation items, show select button directly */}
                  {!hasMultipleVariations && singleVariation && singleVariation.status === 'available' && (
                    <button
                      onClick={() => toggleVariation(singleVariation.id)}
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
                  {hasMultipleVariations && availableVariations.length > 0 && (
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
          })}
        </div>
      </main>

      {/* Floating cart bar */}
      {cartVariationIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <p className="text-sm sm:text-base text-gray-700">
              <span className="font-semibold">{cartVariationIds.length}</span>{' '}
              {cartVariationIds.length === 1 ? 'item selecionado' : 'itens selecionados'}{' '}
              &mdash;{' '}
              <span className="font-bold text-amber-700">
                {formatPrice(cartTotal)}
              </span>
            </p>
            <Link
              href="/carrinho"
              className="bg-amber-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Ver carrinho
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
