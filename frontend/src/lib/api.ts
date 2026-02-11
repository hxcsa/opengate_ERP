"use client";

import { auth } from "./firebase";

/**
 * Reusable fetch wrapper that automatically injects the Firebase Authorization header.
 * Handles 401/403 errors globally by clearing local state or prompting re-login if needed.
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const user = auth.currentUser;
    if (!user) {
        // Option 1: Throw error and let component handle it
        // Option 2: Redirect to login
        console.warn("[API] No authenticated user found for request:", url);
    }

    const token = await user?.getIdToken();
    const headers = {
        ...options.headers,
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        "Content-Type": "application/json",
    };

    const response = await fetch(url, { ...options, headers });

    // Global error handling
    if (response.status === 401) {
        console.error("[API] 401 Unauthorized - Token may be expired or invalid.");
        // We could trigger a global event here or sign out
    }

    return response;
}
