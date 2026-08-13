import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query
from pydantic import BaseModel

from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
from graphiti_core.llm_client.config import LLMConfig
from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient
from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig
from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient

NEO4J_URI=os.getenv("NEO4J_URI","bolt://127.0.0.1:7687")
NEO4J_USER=os.getenv("NEO4J_USER","neo4j")
NEO4J_PASSWORD=os.getenv("NEO4J_PASSWORD","jarvis-local-password")

OLLAMA_BASE_URL=os.getenv("OLLAMA_BASE_URL","http://127.0.0.1:11434/v1")
GRAPHITI_LLM_MODEL=os.getenv("GRAPHITI_LLM_MODEL","qwen3.5:9b")
GRAPHITI_EMBED_MODEL=os.getenv("GRAPHITI_EMBED_MODEL","nomic-embed-text")
GRAPHITI_EMBED_DIM=int(os.getenv("GRAPHITI_EMBED_DIM","768"))
STRUCTURED_OUTPUT_MODE=os.getenv("GRAPHITI_STRUCTURED_OUTPUT_MODE","json_schema")

graphiti: Graphiti | None = None

class EpisodeIn(BaseModel):
    name:str
    body:str
    sourceDescription:str="jarvis interaction"
    groupId:str|None="jarvis-primary"
    referenceTime:str|None=None

@asynccontextmanager
async def lifespan(app:FastAPI):
    global graphiti
    llm_config=LLMConfig(
        api_key="ollama",
        model=GRAPHITI_LLM_MODEL,
        small_model=GRAPHITI_LLM_MODEL,
        base_url=OLLAMA_BASE_URL,
    )
    llm_client=OpenAIGenericClient(
        config=llm_config,
        structured_output_mode=STRUCTURED_OUTPUT_MODE,
    )
    graphiti=Graphiti(
        NEO4J_URI,
        NEO4J_USER,
        NEO4J_PASSWORD,
        llm_client=llm_client,
        embedder=OpenAIEmbedder(
            config=OpenAIEmbedderConfig(
                api_key="ollama",
                embedding_model=GRAPHITI_EMBED_MODEL,
                embedding_dim=GRAPHITI_EMBED_DIM,
                base_url=OLLAMA_BASE_URL,
            )
        ),
        cross_encoder=OpenAIRerankerClient(client=llm_client,config=llm_config),
    )
    await graphiti.build_indices_and_constraints()
    yield
    await graphiti.close()

app=FastAPI(title="JARVIS X2 Graphiti Memory",version="0.1.0",lifespan=lifespan)

@app.get("/health")
async def health():
    return {"ok":graphiti is not None,"backend":"graphiti","mode":"local"}

@app.post("/episodes")
async def add_episode(item:EpisodeIn):
    assert graphiti is not None
    rt=datetime.now(timezone.utc)
    if item.referenceTime:
        rt=datetime.fromisoformat(item.referenceTime.replace("Z","+00:00"))
    await graphiti.add_episode(
        name=item.name,
        episode_body=item.body,
        source=EpisodeType.text,
        source_description=item.sourceDescription,
        reference_time=rt,
        group_id=item.groupId,
    )
    return {"ok":True}

@app.get("/search")
async def search(q:str=Query(min_length=1),group_id:str|None=None,limit:int=8):
    assert graphiti is not None
    rows=await graphiti.search(q,group_ids=[group_id] if group_id else None,num_results=limit)
    return [
        {
            "uuid":getattr(r,"uuid",None),
            "fact":getattr(r,"fact",str(r)),
            "validAt":getattr(r,"valid_at",None),
            "invalidAt":getattr(r,"invalid_at",None),
            "sourceNodeUuid":getattr(r,"source_node_uuid",None),
            "targetNodeUuid":getattr(r,"target_node_uuid",None),
        }
        for r in rows
    ]
