MEMORY_SEARCH={
  "name":"jarvis_memory_search",
  "description":"Search JARVIS X2 temporal long-term memory for relevant facts and historical context.",
  "parameters":{
    "type":"object",
    "properties":{
      "query":{"type":"string","description":"What context to recall."},
      "group_id":{"type":"string","description":"Optional memory scope/group."},
      "limit":{"type":"integer","minimum":1,"maximum":20,"default":8}
    },
    "required":["query"]
  }
}

MEMORY_REMEMBER={
  "name":"jarvis_memory_remember",
  "description":"Store an explicit episode in JARVIS X2 temporal memory. Use for durable facts, preferences, decisions, procedures and important events, not transient chatter.",
  "parameters":{
    "type":"object",
    "properties":{
      "name":{"type":"string","description":"Short episode title."},
      "body":{"type":"string","description":"The durable content to remember."},
      "source_description":{"type":"string","description":"Where the memory came from."},
      "group_id":{"type":"string","description":"Optional memory scope/group."},
      "reference_time":{"type":"string","description":"ISO-8601 time when this was true/observed."}
    },
    "required":["name","body"]
  }
}
