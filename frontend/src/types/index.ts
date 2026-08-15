export type Role = "admin" | "front" | "kitchen" | "bar";

export interface User {
  _id: string;
  name: string;
  username: string;
  role: Role;
  isActive: boolean;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  sort: number;
  isActive: boolean;
}

export interface MenuOptionChoice {
  name: string;
  priceDelta: number;
}

export interface MenuOption {
  label: string;
  type: "single" | "multi";
  required: boolean;
  choices: MenuOptionChoice[];
}

export interface MenuItem {
  _id: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  station: "kitchen" | "bar";
  category: Category | string;
  price: number;
  desc?: string;
  descAr?: string;
  descEn?: string;
  recipe?: string;
  available: boolean;
  options: MenuOption[];
  sort: number;
  imageUrl?: string;
  isSignature?: boolean;
}

export interface OrderItem {
  _id?: string;
  menuId: string;
  name: string;
  station: "kitchen" | "bar";
  price: number;
  qty: number;
  options?: Record<string, any>;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  notes?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  tableId: string;
  items: OrderItem[];
  status: "active" | "preparing" | "ready" | "served" | "archived" | "cancelled" | "unpaid";
  totalPrice: number;
  guests: number;
  dineIn: boolean;
  payMethod?: string;
  discount?: number;
  notes?: string;
  createdBy?: User | string;
  createdAt: string;
  updatedAt?: string;
}

export interface Table {
  _id: string;
  tableNo: string;
  seats: number;
  status: "available" | "occupied" | "reserved";
  isActive: boolean;
}

export interface LoginResponse {
  status: string;
  token: string;
  data: {
    user: User;
  };
}

export interface ApiResponse<T> {
  status: string;
  results?: number;
  data: T;
}
