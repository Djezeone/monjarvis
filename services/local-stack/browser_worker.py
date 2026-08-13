"""
Optional Browser Use worker boundary.

This service intentionally ships with a safe interface and a mock executor.
Claude Code should wire the current Browser Use API only after pinning/testing
the package version in the target environment.

Reason: browser-agent APIs evolve quickly; JARVIS must not silently gain
unbounded browser authority through a stale integration.
"""
import os, uuid, asyncio
from typing import Literal
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

TOKEN=os.getenv("JARVIS_BROWSER_WORKER_TOKEN","")
app=FastAPI(title="JARVIS X2 Browser Worker",version="0.1.0")
tasks={}

class TaskIn(BaseModel):
    task:str
    allowedDomains:list[str]|None=None
    maxSteps:int=20
    sessionId:str|None=None

def auth(authorization:str|None):
    if TOKEN and authorization != f"Bearer {TOKEN}":
        raise HTTPException(401,"Invalid browser worker token")

@app.get("/health")
async def health():
    return {"ok":True,"executor":"not-wired","safe":True}

@app.post("/tasks")
async def create_task(item:TaskIn,authorization:str|None=Header(None)):
    auth(authorization)
    task_id=str(uuid.uuid4())
    tasks[task_id]={
        "id":task_id,
        "status":"needs-executor",
        "task":item.task,
        "allowedDomains":item.allowedDomains,
        "maxSteps":min(max(item.maxSteps,1),50),
    }
    # Do not execute until Browser Use is pinned and policy-reviewed.
    return tasks[task_id]

@app.get("/tasks/{task_id}")
async def get_task(task_id:str,authorization:str|None=Header(None)):
    auth(authorization)
    if task_id not in tasks: raise HTTPException(404,"Task not found")
    return tasks[task_id]
