export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Get the device's current geographic position.
 * Returns null if permission denied, unavailable, or timeout.
 */
export function getCurrentPosition(): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        console.warn("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, // 10 minutes cache
      }
    );
  });
}

/**
 * Reverse geocode coordinates to a human-readable location string
 * using a simple free API (Nominatim / OpenStreetMap)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return null;
    const parts = [
      addr.road,
      addr.suburb,
      addr.city || addr.town || addr.village,
    ].filter(Boolean);
    return parts.join(", ") || null;
  } catch {
    return null;
  }
}
