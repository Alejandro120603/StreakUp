import { apiGet, API_ENDPOINTS } from "@/services/api/client";
import type { Quote } from "@/types/quotes";

export async function fetchRandomQuote(): Promise<Quote | null> {
  try {
    return await apiGet<Quote>(API_ENDPOINTS.quotes.random);
  } catch {
    return null; // non-critical — hide card silently on any failure
  }
}
