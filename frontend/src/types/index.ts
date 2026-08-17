export type Role = "admin" | "front" | "kitchen" | "bar";
export type ShiftType = "morning" | "evening" | "night" | "full_day";

export interface User {
  _id: string;
  name: string;
  username: string;
  role: Role;
  shift?: ShiftType;
  phone?: string;
  salary?: number;
  jobTitle?: string;
  notes?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface UserStats {
  total: number;
  active: number;
  shifts: {
    morning: number;
    evening: number;
    night: number;
  };
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
  paymentStatus?: "unpaid" | "pending_transfer" | "paid" | "failed";
  discount?: number;
  notes?: string;
  publicToken?: string;
  rating?: number;
  ratingComment?: string;
  createdBy?: User | string;
  extra?: Record<string, any>;
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

export interface ServiceCall {
  _id: string;
  tableId: string;
  type: string;
  note?: string;
  status: "open" | "acknowledged" | "resolved";
  handledBy?: { _id: string; name: string } | null;
  handledAt?: string;
  createdAt: string;
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
  message?: string;
}
