'use client';

import { useEffect, useState } from 'react';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

function formatPrice(price: number): string {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

interface Totals {
  total_items: number;
  total_value: number;
  available_count: number;
  available_value: number;
  reserved_count: number;
  reserved_value: number;
  sold_count: number;
  sold_value: number;
}

interface BuyerRow {
  buyer_name: string;
  buyer_contact: string;
  status: string;
  item_count: number;
  total_value: number;
}

interface BuyerItem {
  buyer_name: string;
  buyer_contact: string;
  status: string;
  variation_name: string;
  item_title: string;
  price: number;
}

export default function ResumoPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [buyers, setBuyers] = useState<BuyerRow[]>([]);
  const [buyerItems, setBuyerItems] = useState<BuyerItem[]>([]);
  const [expandedBuyers, setExpandedBuyers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/summary', { headers: getHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar resumo');
        return res.json();
      })
      .then((data) => {
        setTotals(data.totals);
        setBuyers(data.buyers);
        setBuyerItems(data.buyerItems || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-gray-500">Carregando...</p>;
  if (error) return <p className="text-red-600">{error}</p>;
  if (!totals) return null;

  const cards = [
    {
      label: 'Total de itens',
      count: totals.total_items,
      value: totals.total_value,
      color: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    {
      label: 'Disponíveis',
      count: totals.available_count,
      value: totals.available_value,
      color: 'bg-green-50 border-green-200 text-green-800',
    },
    {
      label: 'Reservados',
      count: totals.reserved_count,
      value: totals.reserved_value,
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    },
    {
      label: 'Vendidos',
      count: totals.sold_count,
      value: totals.sold_value,
      color: 'bg-gray-50 border-gray-200 text-gray-700',
    },
  ];

  const reservedBuyers = buyers.filter((b) => b.status === 'reserved');
  const soldBuyers = buyers.filter((b) => b.status === 'sold');

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Resumo financeiro
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`border rounded-lg p-4 ${card.color}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{formatPrice(card.value)}</p>
            <p className="text-sm opacity-70 mt-1">
              {card.count} {card.count === 1 ? 'item' : 'itens'}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-8">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Progresso de vendas
        </h3>
        <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
          {totals.sold_value > 0 && (
            <div
              className="bg-gray-400 transition-all"
              style={{
                width: `${(totals.sold_value / totals.total_value) * 100}%`,
              }}
              title={`Vendido: ${formatPrice(totals.sold_value)}`}
            />
          )}
          {totals.reserved_value > 0 && (
            <div
              className="bg-yellow-400 transition-all"
              style={{
                width: `${(totals.reserved_value / totals.total_value) * 100}%`,
              }}
              title={`Reservado: ${formatPrice(totals.reserved_value)}`}
            />
          )}
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
            Vendido ({((totals.sold_value / totals.total_value) * 100).toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />
            Reservado ({((totals.reserved_value / totals.total_value) * 100).toFixed(0)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-100 inline-block border border-gray-200" />
            Disponível ({((totals.available_value / totals.total_value) * 100).toFixed(0)}%)
          </span>
        </div>
      </div>

      {/* Buyers - Reserved */}
      {reservedBuyers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Reservas pendentes
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="pb-2 font-medium">Comprador</th>
                  <th className="pb-2 font-medium">Contato</th>
                  <th className="pb-2 font-medium text-right">Itens</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {reservedBuyers.map((b, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 text-gray-800">{b.buyer_name}</td>
                    <td className="py-2 text-gray-500">{b.buyer_contact}</td>
                    <td className="py-2 text-right text-gray-700">{b.item_count}</td>
                    <td className="py-2 text-right font-medium text-yellow-700">
                      {formatPrice(b.total_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Buyers - Sold */}
      {soldBuyers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Vendas confirmadas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="pb-2 font-medium">Comprador</th>
                  <th className="pb-2 font-medium">Contato</th>
                  <th className="pb-2 font-medium text-right">Itens</th>
                  <th className="pb-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {soldBuyers.map((b, i) => {
                  const key = `${b.buyer_name}|||${b.buyer_contact}|||sold`;
                  const isExpanded = expandedBuyers.has(key);
                  const items = buyerItems.filter(
                    (bi) => bi.buyer_name === b.buyer_name && bi.buyer_contact === b.buyer_contact && bi.status === 'sold'
                  );
                  return (
                    <>
                      <tr
                        key={i}
                        className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedBuyers((prev) => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key); else next.add(key);
                          return next;
                        })}
                      >
                        <td className="py-2 text-gray-800">
                          <span className="mr-1 text-xs text-gray-400">{isExpanded ? '▼' : '▶'}</span>
                          {b.buyer_name}
                        </td>
                        <td className="py-2 text-gray-500">{b.buyer_contact}</td>
                        <td className="py-2 text-right text-gray-700">{b.item_count}</td>
                        <td className="py-2 text-right font-medium text-green-700">
                          {formatPrice(b.total_value)}
                        </td>
                      </tr>
                      {isExpanded && items.map((bi, j) => (
                        <tr key={`${i}-${j}`} className="bg-gray-50 border-b border-gray-50">
                          <td className="py-1.5 pl-8 text-gray-600 text-xs" colSpan={2}>
                            {bi.item_title}
                            {bi.variation_name !== 'Padrão' && (
                              <span className="text-gray-400"> — {bi.variation_name}</span>
                            )}
                          </td>
                          <td className="py-1.5 text-right text-gray-500 text-xs" colSpan={2}>
                            {formatPrice(bi.price)}
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
