export type VisionFrame = {
  bitmap: ImageBitmap;
  at: number;
};

export interface VisionAdapter {
  readonly id: string;
  enable(): Promise<void>;
  disable(): Promise<void>;
  capture(): Promise<VisionFrame | null>;
}
