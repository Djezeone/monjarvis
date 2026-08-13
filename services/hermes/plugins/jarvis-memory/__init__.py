from . import schemas, tools

def register(ctx):
    ctx.register_tool(
        name="jarvis_memory_search",
        toolset="jarvis-memory",
        schema=schemas.MEMORY_SEARCH,
        handler=tools.memory_search,
    )
    ctx.register_tool(
        name="jarvis_memory_remember",
        toolset="jarvis-memory",
        schema=schemas.MEMORY_REMEMBER,
        handler=tools.memory_remember,
    )
