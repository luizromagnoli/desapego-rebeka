'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Item } from '@/lib/types';
import { getCart, addToCart, removeFromCart } from '@/lib/cart';

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

type SortOption = 'name' | 'price_asc' | 'price_desc';
const ITEMS_PER_PAGE = 20;

function getItemMinPrice(item: Item): number {
  const vars = item.variations || [];
  if (vars.length === 0) return item.price;
  return Math.min(...vars.map((v) => v.price ?? item.price));
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Carregando...</p></div>}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartVariationIds, setCartVariationIds] = useState<string[]>([]);
  const [storeLocked, setStoreLocked] = useState<boolean | null>(null);

  const sortBy = (searchParams.get('sort') as SortOption) || 'name';
  const search = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || (key === 'page' && value === '1') || (key === 'sort' && value === 'name')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }

  useEffect(() => {
    setCartVariationIds(getCart());
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const locked = data.store_locked === 'true';
        setStoreLocked(locked);
        if (locked) {
          setLoading(false);
          return;
        }
        // Only fetch items if store is unlocked
        return fetch('/api/items')
          .then((res) => {
            if (!res.ok) throw new Error('Erro ao carregar itens');
            return res.json();
          })
          .then((data: Item[]) => {
            setItems(data);
            setLoading(false);
          });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro');
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
    const matched = vars.filter((v) => cartVariationIds.includes(v.id));
    return sum + matched.reduce((s, v) => s + (v.price ?? item.price), 0);
  }, 0);

  // Filter by search
  const searchTerm = search.trim().toLowerCase();
  const filteredItems = searchTerm
    ? items.filter((item) => item.title.toLowerCase().includes(searchTerm))
    : items;

  // Sort items: available first, then within each group apply user sort
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Available items first, then reserved
    const statusOrder = { available: 0, reserved: 1, sold: 2 };
    const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] ?? 0) -
      (statusOrder[b.status as keyof typeof statusOrder] ?? 0);
    if (statusDiff !== 0) return statusDiff;

    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title, 'pt-BR');
      case 'price_asc':
        return getItemMinPrice(a) - getItemMinPrice(b);
      case 'price_desc':
        return getItemMinPrice(b) - getItemMinPrice(a);
      default:
        return 0;
    }
  });

  const totalPages = Math.ceil(sortedItems.length / ITEMS_PER_PAGE);
  const paginatedItems = sortedItems.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleSortChange(newSort: SortOption) {
    updateParams({ sort: newSort, page: '1' });
  }

  function handleSearchChange(value: string) {
    updateParams({ q: value, page: '1' });
  }

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
          <div className="mt-4 text-left inline-block bg-gray-50 px-5 py-3 rounded-md text-sm text-gray-600">
            <p className="font-semibold text-gray-700 mb-1.5">Regras</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Não realizamos envio dos itens.</li>
              <li>Retirada em Alphaville (Barueri/SP) ou Itu/SP, a combinar.</li>
              <li>Móveis e itens grandes: retirada somente em Alphaville.</li>
              <li>Reservas não pagas em 24h serão liberadas.</li>
              <li><a href="http://api.whatsapp.com/send?phone=5511950803161" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline hover:text-amber-800">WhatsApp</a> para combinar retirada.</li>
            </ul>
          </div>
        </div>
      </header>

      {/* Lock screen - show while checking or when locked */}
      {storeLocked !== false && (
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center max-w-md px-4">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Aguarde</h2>
            <p className="text-gray-600">Os itens ficarão disponíveis em breve.</p>
          </div>
        </div>
      )}

      {/* Content */}
      {storeLocked === false && (
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

        {/* Search and sort */}
        {!loading && !error && items.length > 0 && (
          <div className="mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        )}

        {!loading && !error && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500 mr-1">Ordenar:</span>
            {([
              { key: 'name' as SortOption, label: 'Nome' },
              { key: 'price_asc' as SortOption, label: 'Menor preço' },
              { key: 'price_desc' as SortOption, label: 'Maior preço' },
            ]).map((opt) => (
              <button
                key={opt.key}
                onClick={() => handleSortChange(opt.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                  sortBy === opt.key
                    ? 'bg-amber-100 text-amber-800 border-amber-400'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">
              {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedItems.map((item) => {
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
                      loading="lazy"
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
                    {(() => {
                      if (!hasMultipleVariations) {
                        const vPrice = variations[0]?.price;
                        return (
                          <p className="mt-1 text-lg font-bold text-amber-700">
                            {formatPrice(vPrice ?? item.price)}
                          </p>
                        );
                      }
                      const prices = variations.map((v) => v.price ?? item.price);
                      const min = Math.min(...prices);
                      const max = Math.max(...prices);
                      return (
                        <p className="mt-1 text-lg font-bold text-amber-700">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => { updateParams({ page: String(Math.max(1, page - 1)) }); window.scrollTo(0, 0); }}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md text-sm border border-gray-300 text-gray-600 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => { updateParams({ page: String(p) }); window.scrollTo(0, 0); }}
                className={`w-9 h-9 rounded-md text-sm font-medium border transition-colors ${
                  p === page
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => { updateParams({ page: String(Math.min(totalPages, page + 1)) }); window.scrollTo(0, 0); }}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-md text-sm border border-gray-300 text-gray-600 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        )}
      </main>
      )}

      {/* Floating cart bar */}
      {storeLocked === false && cartVariationIds.length > 0 && (
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
