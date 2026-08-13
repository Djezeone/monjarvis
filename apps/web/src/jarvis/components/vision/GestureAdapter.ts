export type Gesture =
  | "open-palm"
  | "pinch"
  | "point"
  | "swipe-left"
  | "swipe-right"
  | "unknown";

export interface GestureAdapter {
  readonly id:string;
  enable():Promise<void>;
  disable():Promise<void>;
  onGesture(listener:(gesture:Gesture)=>void):()=>void;
}

// P2 intentionally defines only the contract.
// Add MediaPipe/other local vision implementation later after performance/privacy review.
