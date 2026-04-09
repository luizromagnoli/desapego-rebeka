'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Item } from '@/lib/types';
import { getCart, addToCart, removeFromCart } from '@/lib/cart';
import ItemCard from '@/components/ItemCard';

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
  const catsParam = searchParams.get('cats') || '';
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    () => new Set(catsParam ? catsParam.split(',').filter(Boolean) : [])
  );
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [categoryDropdownOpen]);

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

  // Derive available categories from items
  const availableCategories = Array.from(
    new Set(items.map((item) => item.category).filter((c): c is string => c !== null))
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      const catsValue = Array.from(next).join(',');
      updateParams({ cats: catsValue || null, page: '1' });
      return next;
    });
  }

  function clearCategories() {
    setSelectedCategories(new Set());
    updateParams({ cats: null, page: '1' });
  }

  // Filter by search
  const searchTerm = search.trim().toLowerCase();
  const searchFiltered = searchTerm
    ? items.filter((item) => item.title.toLowerCase().includes(searchTerm))
    : items;

  // Filter by categories
  const filteredItems = selectedCategories.size > 0
    ? searchFiltered.filter((item) => item.category !== null && selectedCategories.has(item.category))
    : searchFiltered;

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
          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center text-left text-sm text-gray-600">
            <div className="bg-gray-50 px-5 py-3 rounded-md">
              <p className="font-semibold text-gray-700 mb-1.5">Regras</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Retirada em Alphaville (Barueri/SP) ou Itu/SP, a combinar.</li>
                <li>Móveis e itens grandes: retirada somente em Alphaville.</li>
                <li>Reservas não pagas em 24h serão liberadas.</li>
                <li><a href="http://api.whatsapp.com/send?phone=5511950803161" target="_blank" rel="noopener noreferrer" className="text-amber-700 underline hover:text-amber-800">WhatsApp</a> para combinar retirada.</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 px-5 py-3 rounded-md">
              <p className="font-semibold text-amber-800 mb-1.5">Envio e Pagamento</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Envio a combinar para compras acima de R$300,00. Não enviaremos móveis e itens muito grandes. Frete por conta do comprador.</li>
                <li>Aceitamos pagamento por cartão, mas será cobrada a taxa do cartão.</li>
              </ul>
            </div>
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
            {/* Category filter */}
            {availableCategories.length > 0 && (
              <div className="relative ml-2" ref={categoryDropdownRef}>
                <button
                  onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                    selectedCategories.size > 0
                      ? 'bg-amber-100 text-amber-800 border-amber-400'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
                  }`}
                >
                  Categorias{selectedCategories.size > 0 ? ` (${selectedCategories.size})` : ''}
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[220px] max-h-72 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100 flex justify-between items-center">
                      <span className="text-xs text-gray-500 font-medium">Filtrar por categoria</span>
                      {selectedCategories.size > 0 && (
                        <button
                          onClick={clearCategories}
                          className="text-xs text-amber-700 hover:text-amber-800 font-medium"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    {availableCategories.map((cat) => (
                      <label
                        key={cat}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(cat)}
                          onChange={() => toggleCategory(cat)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <span className="text-xs text-gray-400 ml-auto">
              {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              cartVariationIds={cartVariationIds}
              onToggleVariation={toggleVariation}
            />
          ))}
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
