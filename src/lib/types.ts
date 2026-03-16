export interface ItemPhoto {
  id: string;
  item_id: string;
  filename: string;
  sort_order: number;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  status: 'available' | 'reserved' | 'sold';
  buyer_name: string | null;
  buyer_contact: string | null;
  created_at: string;
  photos: ItemPhoto[];
}
