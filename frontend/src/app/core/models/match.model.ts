export interface Match {
  id: string | number;
  username: string;
  serviceTypeName: string;
  isOffer: boolean;
  typeId?: number;
  providerId?: number;
  rating: number | null;  // Fachspezifische Bewertung
  userRating: number | null;  // Gesamtbewertung des Users
  reviewCount?: number;  // Anzahl der Bewertungen für den User
  completedCount?: number;  // Anzahl der abgeschlossenen Services mit diesem User
  isPerfectMatch: boolean;
  marketId?: number;
  hasActiveRequest?: boolean;  // Anfrage bereits geschickt
  hasActiveTutoring?: boolean; // Aktive Nachhilfe läuft
}

export interface MatchGroup {
  username: string;
  matches: Match[];
  userRating: number;
  reviewCount: number;
  isPerfectMatch: boolean;
}
