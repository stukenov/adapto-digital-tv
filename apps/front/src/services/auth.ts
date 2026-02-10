// Auth service using REST API session-based endpoints
// Uses CSRF cookie and credentials-included requests

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(";")[0] || null;
  return null;
}

export type AuthUser = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
};

export async function ensureCsrf(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/csrf/`, {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });
    if (res.ok) {
      try {
        const data = await res.json();
        return data?.csrftoken || getCookie("csrftoken");
      } catch {
        return getCookie("csrftoken");
      }
    }
  } catch {
    // ignore
  }
  return getCookie("csrftoken");
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  } catch {
    return null;
  }
}

export async function checkAuth(): Promise<boolean> {
  const me = await getCurrentUser();
  return !!me;
}

export async function login(username: string, password: string): Promise<boolean> {
  const csrf = await ensureCsrf();
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(csrf ? { "X-CSRFToken": csrf } : {}),
    },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) return false;
  return checkAuth();
}

export async function logout(): Promise<boolean> {
  const csrf = await ensureCsrf();
  try {
    const res = await fetch(`${API_BASE}/auth/logout/`, {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(csrf ? { "X-CSRFToken": csrf } : {}),
      },
    });
    // After attempting logout, verify actual auth state
    const stillAuthed = await checkAuth();
    return !stillAuthed && res.ok;
  } catch {
    // If request fails, consider user still authed
    return false;
  }
}


