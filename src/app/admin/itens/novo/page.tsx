'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

function getHeaders(): HeadersInit {
  const pw = sessionStorage.getItem('adminPassword') ?? '';
  return { 'x-admin-password': pw };
}

interface PhotoPreview {
  file: File;
  url: string;
}

export default function NovoItemPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [variations, setVariations] = useState<{ name: string; price: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected) return;
    const newPhotos = Array.from(selected).map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].url);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    setPhotos((prev) => {
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
    setPhotos((prev) => {
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

  function addVariation() {
    setVariations((prev) => [...prev, { name: '', price: '' }]);
  }

  function updateVariationName(index: number, name: string) {
    setVariations((prev) => prev.map((v, i) => (i === index ? { ...v, name } : v)));
  }

  function updateVariationPrice(index: number, price: string) {
    setVariations((prev) => prev.map((v, i) => (i === index ? { ...v, price } : v)));
  }

  function removeVariation(index: number) {
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
    if (variations.length > 0 && variations.some((v) => !v.name.trim())) {
      setError('Preencha o nome de todas as variações ou remova as vazias');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('price', price);
      photos.forEach((p) => formData.append('files', p.file));

      if (variations.length > 0) {
        const variationsPayload = variations.map((v) => ({
          name: v.name.trim(),
          price: v.price ? parseFloat(v.price) : null,
        }));
        formData.append('variations', JSON.stringify(variationsPayload));
      }

      const res = await fetch('/api/items', {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Erro ao criar item');
      }

      router.push('/admin/itens');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Novo item</h2>

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

        {/* Variations */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Variações
          </label>
          {variations.length === 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Sem variações, uma variação padrão será criada automaticamente.
            </p>
          )}
          {variations.length > 0 && (
            <div className="space-y-2 mb-2">
              {variations.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
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

        <div className="mb-6">
          <label
            htmlFor="photos"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
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
          {photos.length > 0 && (
            <>
              <p className="mt-2 text-xs text-gray-500">
                Arraste para reordenar ou toque em uma foto para defini-la como principal.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {photos.map((photo, i) => (
                  <div
                    key={photo.url}
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
                      src={photo.url}
                      alt={`Preview ${i + 1}`}
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
            {submitting ? 'Criando...' : 'Criar item'}
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
