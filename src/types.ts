// ─── Core domain types ───────────────────────────────────────────

export type Interest = '美食' | '文化' | '購物' | '自然';

export interface TripPreferences {
  days: number;
  budget: number; // in TWD
  interests: Interest[];
  destination: string[];
  explorationStyle: number; // 0=輕鬆 100=探索
  foodVsAttractions: number; // 0=美食優先 100=景點優先
  mustVisit: string;
  ragContent: string;
  specialRequirements?: string;
  type?: 'J' | 'P'; // J人 or P人 flow
}

export interface XAIScore {
  label: string;
  value: number; // 0-100
  color?: string;
}

export interface XAIExplanation {
  summary: string;
  scores: XAIScore[];
  matchedInterests: Interest[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  name: string;
  category: '景點' | '美食' | '活動' | '購物' | '自然' | '文化';
  description: string;
  image: string; // URL or gradient placeholder
  duration: string; // e.g. "2–3 小時"
  rating: number;
  estimatedCost: string; // e.g. "¥500"
  location: string; // area name
  position?: Coordinates | null;
  xai: XAIExplanation;
  baseScore: number; // for re-ranking
  foodScore: number; // weight for food preference
  explorationScore: number; // weight for exploration preference
}

export interface PreferenceProfile {
  [key: string]: number;
}

export interface RecommendationPoi {
  id: string;
  name: string;
  region: string;
  category: string;
  interests?: string[];
  image_url?: string;
  final_score?: number;
  score_breakdown?: {
    interest_match?: number;
    static_score?: number;
  };
  google_rating?: number;
  static_score?: number;
  lat?: number;
  lng?: number;
  context?: string;
  description?: string;
}

export interface RecommendationMetadata {
  regions: string[];
  categories: string[];
  poi_count?: number;
}

export interface RestaurantMetadata {
  regions: string[];
  categories: string[];
  venue_types?: string[];
  restaurant_count?: number;
}

export interface RestaurantVenue {
  id: string;
  name: string;
  region: string;
  category: string;
  image_url?: string;
  google_rating?: number;
  static_score?: number;
  final_score?: number;
  lat?: number;
  lng?: number;
  context?: string;
  description?: string;
}

export interface DayPlan {
  day: number;
  date: string;
  attractions: Attraction[];
  warning?: string;
}

export interface TripSummary {
  totalDays: number;
  totalBudget: string;
  totalAttractions: number;
  avgPerDay: number;
}

export interface Trip {
  id: string;
  preferences: TripPreferences;
  summary: TripSummary;
  days: DayPlan[];
  generatedAt: string;
}
