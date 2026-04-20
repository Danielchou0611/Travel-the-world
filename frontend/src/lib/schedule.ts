import type { ItineraryItem } from "../types";

const DAY_START_TIME = "09:00";
const SAME_REGION_TRAVEL_MIN = 30;
const CROSS_REGION_TRAVEL_MIN = 75;
const RECOMMENDED_END_MINUTES = 18 * 60;

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function estimateTravelTime(previousItem: ItineraryItem | null, item: ItineraryItem) {
  if (!previousItem) {
    return 0;
  }

  return previousItem.region === item.region ? SAME_REGION_TRAVEL_MIN : CROSS_REGION_TRAVEL_MIN;
}

export function calculateScheduleScore(
  item: ItineraryItem,
  travelTimeFromPreviousMin: number,
  endMinutes: number,
) {
  const travelPenalty = Math.min(travelTimeFromPreviousMin / CROSS_REGION_TRAVEL_MIN, 1) * 0.25;
  const overtimePenalty =
    endMinutes > RECOMMENDED_END_MINUTES
      ? Math.min((endMinutes - RECOMMENDED_END_MINUTES) / 180, 1) * 0.2
      : 0;
  const durationPenalty = item.visitDurationMin > 150 ? 0.08 : 0;

  return Math.max(0, 1 - travelPenalty - overtimePenalty - durationPenalty);
}

export function calculateFinalScore(baseScore: number, scheduleScore: number) {
  void scheduleScore;
  return baseScore;
}

export function recalculateSchedule(items: ItineraryItem[]) {
  let cursorMinutes = timeToMinutes(DAY_START_TIME);

  return items.map((item, index) => {
    const previousItem = index > 0 ? items[index - 1] : null;
    const travelTimeFromPreviousMin = estimateTravelTime(previousItem, item);
    const startMinutes = cursorMinutes + travelTimeFromPreviousMin;
    const endMinutes = startMinutes + item.visitDurationMin;
    const scheduleScore = calculateScheduleScore(item, travelTimeFromPreviousMin, endMinutes);
    const finalScore = calculateFinalScore(item.baseScore, scheduleScore);

    cursorMinutes = endMinutes;

    return {
      ...item,
      order: index + 1,
      travelTimeFromPreviousMin,
      startTime: minutesToTime(startMinutes),
      endTime: minutesToTime(endMinutes),
      scheduleScore,
      finalScore,
    };
  });
}
