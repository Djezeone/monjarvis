export type JarvisAgent = {
  id:string;
  label:string;
  role:string;
  status:"idle"|"working"|"waiting"|"failed";
  childSessionId?:string;
  task?:string;
};

export class AgentRegistry {
  private agents=new Map<string,JarvisAgent>();
  upsert(agent:JarvisAgent){this.agents.set(agent.id,agent);}
  remove(id:string){this.agents.delete(id);}
  all(){return [...this.agents.values()];}
}
export const agentRegistry=new AgentRegistry();
