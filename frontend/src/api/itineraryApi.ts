import type { ItineraryItem } from "../types";

type ApiResult = {
  ok: boolean;
  message: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const USE_MOCK_API = API_BASE_URL.length === 0;

function endpoint(path: string) {
  return `${API_BASE_URL}${path}`;
}

async function request(path: string, init: RequestInit): Promise<ApiResult> {
  if (USE_MOCK_API) {
    console.info(`[mock-api] ${init.method ?? "GET"} ${path}`, init.body ?? "");
    return { ok: true, message: "Mock saved" };
  }

  try {
    const response = await fetch(endpoint(path), {
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      ...init,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `API ${init.method ?? "GET"} ${path} failed: ${response.status}`,
      };
    }

    return { ok: true, message: "Saved" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "API request failed",
    };
  }
}

export async function updateItineraryOrder(items: ItineraryItem[]): Promise<ApiResult> {
  const results = await Promise.all(
    items.map((item, index) =>
      request(`/api/itinerary/${item.id}/`, {
        method: "PATCH",
        body: JSON.stringify({
          order: index + 1,
          start_time: item.startTime,
          end_time: item.endTime,
          visit_duration_min: item.visitDurationMin,
          travel_time_from_previous_min: item.travelTimeFromPreviousMin,
          base_score: Number(item.baseScore.toFixed(4)),
          schedule_score: Number(item.scheduleScore.toFixed(4)),
          final_score: Number(item.finalScore.toFixed(4)),
        }),
      }),
    ),
  );
  const failed = results.find((result) => !result.ok);
  return failed ?? { ok: true, message: "Order saved" };
}

export function deleteItineraryItem(itemId: string): Promise<ApiResult> {
  return request(`/api/itinerary/${itemId}/`, {
    method: "DELETE",
  });
}
