export interface MarketItem {
  id: number;
  user?: {
    id: number;
    name: string;
  };
  serviceType?: {
    id: number;
    name: string;
  };
  offer: number | boolean;
  description: string;
  startDate?: string;
  endDate?: string;
  userRating?: number;
}
