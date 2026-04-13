export type ItineraryItem = {
  id: string;
  placeName: string;
  region: string;
  baseScore: number;
  xaiReason: string;
  imageUrl: string;
  visitDurationMin: number;
  order: number;
  travelTimeFromPreviousMin: number;
  startTime: string;
  endTime: string;
  scheduleScore: number;
  finalScore: number;
};
