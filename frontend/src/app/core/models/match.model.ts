export interface Match {
  id: string | number;
  username: string;
  serviceTypeName: string;
  isOffer: boolean;
  typeId?: number;
  providerId?: number;
  rating: number | null;
  isPerfectMatch: boolean;
  marketId?: number;
}

export interface MatchGroup {
  username: string;
  matches: Match[];
  userRating: number;
  reviewCount: number;
  isPerfectMatch: boolean;
}
