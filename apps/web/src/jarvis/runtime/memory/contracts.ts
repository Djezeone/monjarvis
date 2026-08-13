export type MemoryEpisode = {
  name:string;
  body:string;
  sourceDescription:string;
  groupId?:string;
  referenceTime?:string;
};

export type MemoryFact = {
  uuid?:string;
  fact:string;
  validAt?:string|null;
  invalidAt?:string|null;
  sourceNodeUuid?:string;
  targetNodeUuid?:string;
};

export interface MemoryAdapter {
  readonly id:string;
  health():Promise<boolean>;
  remember(episode:MemoryEpisode):Promise<{ok:boolean;id?:string}>;
  search(query:string,groupId?:string,limit?:number):Promise<MemoryFact[]>;
}
