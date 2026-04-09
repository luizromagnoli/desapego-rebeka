export interface ItemPhoto {
  id: string;
  item_id: string;
  filename: string;
  sort_order: number;
}

export interface ItemVariation {
  id: string;
  item_id: string;
  name: string;
  price: number | null;
  previous_price: number | null;
  status: 'available' | 'reserved' | 'sold';
  buyer_name: string | null;
  buyer_contact: string | null;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  previous_price: number | null;
  category: string | null;
  status: 'available' | 'reserved' | 'sold';
  buyer_name: string | null;
  buyer_contact: string | null;
  created_at: string;
  photos: ItemPhoto[];
  variations: ItemVariation[];
}
