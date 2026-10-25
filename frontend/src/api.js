// All requests to the backend go through this one function.
const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Painting images are served by the backend: http://localhost:5000/images/p-001.jpg
export function imageSrc(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http")) return imageUrl;
  return `${API}/${imageUrl}`;
}

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${API}/api${path}`, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Check that the backend is running.");
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Logged-in request rejected as 401 (expired token) -> send the user back to login
    if (res.status === 401 && token && !path.startsWith("/auth/")) {
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(data.message || "Something went wrong");
  }
  return data;
}

export const money = (n) => "₹" + Number(n).toLocaleString("en-IN");

// Date text "YYYY-MM-DD" for today + n days (used for the date pickers' min/max)
export function dateFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
