import "server-only";
import { JarvisIntelligenceService } from "@/jarvis/server/JarvisIntelligenceService";

/**
 * Server-only accessor for the intelligence service. The constructor throws
 * when HERMES_API_KEY is absent; routes translate that into an explicit 503
 * so /app keeps loading with the organ reported as not configured (NFR-004)
 * instead of crashing or faking availability.
 */
export function getJarvisService():
  | { service: JarvisIntelligenceService; error?: undefined }
  | { service?: undefined; error: string } {
  try {
    return { service: new JarvisIntelligenceService() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "intelligence core not configured" };
  }
}
