'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Item, ItemPhoto, ItemVariation } from '@/lib/types';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

interface PhotoItem {
  type: 'existing';
  photo: ItemPhoto;
}

interface NewPhotoItem {
  type: 'new';
  file: File;
  url: string;
}

type DraggablePhoto = PhotoItem | NewPhotoItem;

interface VariationEdit {
  id?: string;
  name: string;
  price: string;
  status?: string;
  buyer_name?: string | null;
}

const CATEGORIES = [
  'Câmeras',
  'Lentes',
  'Iluminação',
  'Suportes e Estruturas',
  'Fundos Fotográficos',
  'Móveis de Estúdio',
  'Decoração',
  'Páscoa',
  'Roupas e Fantasias',
  'Toucas e Acessórios Newborn',
  'Posicionadores',
  'Props',
  'Mantas e Pelos',
];

export default function EditarItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [allPhotos, setAllPhotos] = useState<DraggablePhoto[]>([]);
  const [variations, setVariations] = useState<VariationEdit[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Erro ao carregar item');
      const item: Item = await res.json();
      setTitle(item.title);
      setDescription(item.description);
      setPrice(String(item.price));
      setCategory(item.category ?? '');
      const sorted = [...item.photos].sort((a, b) => a.sort_order - b.sort_order);
      setAllPhotos(sorted.map((photo) => ({ type: 'existing', photo })));
      setVariations(
        (item.variations || []).map((v: ItemVariation) => ({
          id: v.id,
          name: v.name,
          price: v.price != null ? String(v.price) : '',
          status: v.status,
          buyer_name: v.buyer_name,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    const newPhotos: DraggablePhoto[] = Array.from(selected).map((file) => ({
      type: 'new',
      file,
      url: URL.createObjectURL(file),
    }));
    setAllPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function removePhoto(index: number) {
    const photo = allPhotos[index];
    if (photo.type === 'existing') {
      try {
        const res = await fetch(`/api/items/${id}/photos/${photo.photo.id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!res.ok) throw new Error('Erro ao remover foto');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao remover foto');
        return;
      }
    } else {
      URL.revokeObjectURL(photo.url);
    }
    setAllPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    setAllPhotos((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(index, 1);
      updated.unshift(moved);
      return updated;
    });
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setAllPhotos((prev) => {
      const updated = [...prev];
      const [dragged] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, dragged);
      return updated;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function getPhotoSrc(photo: DraggablePhoto): string {
    if (photo.type === 'existing') {
      return `/api/uploads/${photo.photo.filename}`;
    }
    return photo.url;
  }

  function addVariation() {
    setVariations((prev) => [...prev, { name: '', price: '' }]);
  }

  function updateVariationName(index: number, name: string) {
    setVariations((prev) =>
      prev.map((v, i) => (i === index ? { ...v, name } : v))
    );
  }

  function updateVariationPrice(index: number, price: string) {
    setVariations((prev) =>
      prev.map((v, i) => (i === index ? { ...v, price } : v))
    );
  }

  function removeVariation(index: number) {
    const v = variations[index];
    if (v.id && (v.status === 'reserved' || v.buyer_name)) {
      if (!confirm('Esta variação possui reserva. Deseja realmente removê-la?')) {
        return;
      }
    }
    setVariations((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Título é obrigatório');
      return;
    }
    if (!price || Number(price) <= 0) {
      setError('Preço deve ser maior que zero');
      return;
    }

    // Validate variation names
    if (variations.length > 0) {
      const hasEmpty = variations.some((v) => !v.name.trim());
      if (hasEmpty) {
        setError('Preencha o nome de todas as variações ou remova as vazias');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      formData.append('category', category);

      // Send variations
      const variationsPayload = variations.map((v) => ({
        id: v.id,
        name: v.name.trim(),
        price: v.price ? parseFloat(v.price) : null,
      }));
      formData.append('variations', JSON.stringify(variationsPayload));

      // Send the photo order: existing photo IDs and new files in order
      const photoOrder: string[] = [];
      const newFiles: File[] = [];
      let newFileIndex = 0;

      for (const photo of allPhotos) {
        if (photo.type === 'existing') {
          photoOrder.push(photo.photo.id);
        } else {
          photoOrder.push(`new:${newFileIndex}`);
          newFiles.push(photo.file);
          newFileIndex++;
        }
      }

      formData.append('photoOrder', JSON.stringify(photoOrder));
      newFiles.forEach((file) => formData.append('files', file));

      const res = await fetch(`/api/items/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao salvar alterações');
      }

      router.push('/admin/itens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>;
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Editar item</h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-gray-200 rounded p-6 max-w-2xl"
      >
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Título
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Preço (R$)
          </label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Categoria
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione uma categoria</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Variations */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Variações
          </label>
          {variations.length > 0 && (
            <div className="space-y-2 mb-2">
              {variations.map((v, i) => (
                <div key={v.id ?? `new-${i}`} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVariationName(i, e.target.value)}
                    placeholder="Nome da variação"
                    className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={v.price}
                    onChange={(e) => updateVariationPrice(i, e.target.value)}
                    placeholder="Preço (opcional)"
                    className="w-32 border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {v.status && v.status !== 'available' && (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      v.status === 'reserved' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {v.status === 'reserved' ? 'Reservado' : 'Vendido'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeVariation(i)}
                    className="text-red-500 hover:text-red-700 text-sm px-2 py-1"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addVariation}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            + Adicionar variação
          </button>
        </div>

        {/* All photos - draggable */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fotos
          </label>
          <input
            id="photos"
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesChange}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {allPhotos.length > 0 && (
            <>
              <p className="mt-2 text-xs text-gray-500">
                Arraste para reordenar ou toque em uma foto para defini-la como principal.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {allPhotos.map((photo, i) => (
                  <div
                    key={photo.type === 'existing' ? photo.photo.id : photo.url}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={() => handleDrop(i)}
                    onDragEnd={handleDragEnd}
                    className={`relative group ${
                      dragIndex === i ? 'opacity-40' : ''
                    } ${dragOverIndex === i && dragIndex !== i ? 'ring-2 ring-blue-500 ring-offset-2 rounded' : ''}`}
                  >
                    <img
                      src={getPhotoSrc(photo)}
                      alt={`Foto ${i + 1}`}
                      className="w-20 h-20 object-cover rounded border border-gray-200 cursor-grab active:cursor-grabbing"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-[10px] text-center py-0.5 rounded-b">
                        Principal
                      </span>
                    )}
                    {i !== 0 && (
                      <button
                        type="button"
                        onClick={() => setAsCover(i)}
                        className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b opacity-0 group-hover:opacity-100 sm:opacity-0 max-sm:opacity-100 transition-opacity"
                      >
                        Capa
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white rounded px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/itens')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
