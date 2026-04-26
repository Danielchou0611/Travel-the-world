// ─── Core domain types ───────────────────────────────────────────

export type Interest = '美食' | '文化' | '購物' | '自然';

export interface TripPreferences {
  days: number;
  budget: number; // in TWD
  interests: Interest[];
  explorationStyle: number; // 0=輕鬆 100=探索
  foodVsAttractions: number; // 0=美食優先 100=景點優先
  mustVisit: string;
  ragContent: string;
}

export interface XAIScore {
  label: string;
  value: number; // 0-100
  color: string;
}

export interface XAIExplanation {
  summary: string;
  scores: XAIScore[];
  matchedInterests: Interest[];
}

export interface Attraction {
  id: string;
  name: string;
  nameEn: string;
  category: '景點' | '美食' | '活動' | '購物' | '自然';
  description: string;
  image: string; // URL or gradient placeholder
  duration: string; // e.g. "2–3 小時"
  rating: number;
  estimatedCost: string; // e.g. "¥500"
  location: string; // area name
  xai: XAIExplanation;
  baseScore: number; // for re-ranking
  foodScore: number; // weight for food preference
  explorationScore: number; // weight for exploration preference
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
