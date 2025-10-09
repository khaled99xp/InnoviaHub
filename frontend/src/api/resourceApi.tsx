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

// Search for resources by type
export async function searchResources(
  token: string,
  resourceType: string
): Promise<Resource[]> {
  const resources = await fetchResources(token);

  console.log("All resources:", resources);
  console.log("Searching for type:", resourceType);

  let filteredResources = resources.filter((resource) =>
    resource.resourceTypeName
      ?.toLowerCase()
      .includes(resourceType.toLowerCase())
  );

  console.log("Filtered resources:", filteredResources);

  // For now, just return the first few resources of the matching type
  // In the future, we can add capacity filtering when the Resource type is updated
  return filteredResources.slice(0, 3); // Return first 3 matching resources
}

// Check resource availability for specific date and time
export async function checkResourceAvailability(
  token: string,
  resourceId: number,
  date: string,
  timeslot: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/resources/${resourceId}/availability?date=${date}&timeslot=${timeslot}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.log("Availability check failed:", response.status);
      return false;
    }

    const data = await response.json();
    return data.available;
  } catch (error) {
    console.error("Error checking availability:", error);
    return false;
  }
}
