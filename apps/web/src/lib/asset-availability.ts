import { existsSync } from "node:fs";
import { join } from "node:path";
import { ASSET_REGISTRY, type AssetId } from "./assets";

/**
 * Server-side check: is the binary for a canonical asset ID actually present
 * under public/? The manifest ships without binaries in this repository, so
 * the lab routes report availability honestly instead of faking coverage
 * (NFR-004: fallbacks must be explicit).
 */
export function isAssetBinaryAvailable(id: AssetId): boolean {
  const entry = ASSET_REGISTRY[id];
  if (!entry) return false;
  const publicDir = join(process.cwd(), "public");
  return (
    existsSync(join(publicDir, entry.webp.replace(/^\//, ""))) ||
    existsSync(join(publicDir, entry.png.replace(/^\//, "")))
  );
}
