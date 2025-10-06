import type { Resource } from "@/types/resource";
import { API_BASE_URL } from "@/utils/constants";

//Getting recourses from endpoint
export async function fetchResources(token: string): Promise<Resource[]> {
  const res = await fetch(`${API_BASE_URL}/resources`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log("fetchResources status:", res.status);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kunde inte hämta resurser: ${res.status} - ${text}`);
  }
  return res.json();
}
