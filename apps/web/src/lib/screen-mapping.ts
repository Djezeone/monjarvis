import mapping from "../../../../assets/manifests/screen-asset-mapping.json";

export interface ScreenMapping {
  purpose: string;
  primary_assets: string[];
  rules?: string[];
}

export const SCREEN_ASSET_MAPPING = mapping as Record<string, ScreenMapping>;

export function getScreenMapping(route: string): ScreenMapping | undefined {
  return SCREEN_ASSET_MAPPING[route];
}
