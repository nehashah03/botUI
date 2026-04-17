"""
Mock pipeline for the dummy Python backend.
 
Mirrors the contract documented for the old Node demo and the same sequence as
`src/services/websocket.js` (initializing → steps → tokens → tools → sources → complete).
 
Wire format: each WebSocket outbound message is one JSON object (UTF-8 text):
  { "event": "runPhase", "messageId": "...", "phase": "initializing" | "steps" | "streaming" }
  { "event": "pipeline", "messageId": "...", "percent": number }
  { "event": "step", "messageId": "...", "step": {...}, "allSteps": [...] }
  { "event": "progress", "messageId": "...", "stage": "...", "detail": "..." }
  { "event": "message", "type": "activity"|"token"|"stream_meta"|"tool_output"|"sources", ... }
  { "event": "complete", "messageId": "..." }
  { "event": "error", "error": "..." }
"""
 
from __future__ import annotations
 
import asyncio
import json
from typing import Awaitable, Callable, Dict, List
 
# --- Static mock payloads (keep in sync with `src/services/websocket.js`) ---
MOCK_RESPONSE = """## Analysis Complete
 
Here's what I found in the uploaded documents:
 
### Key Findings
 
1. **Memory leak detected** in the authentication service — RSS growing ~50MB/hour [1]
2. **Slow queries** on the `user_sessions` table — P99 latency at 2.3s [2]
3. **Connection pool exhaustion** — max connections hit 47 times in the last 24h [3]
4. **Disk saturation** on primary nodes during peak [4]
 
### Metrics Summary
 
| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| CPU Usage | 78% | 85% | ⚠️ Warning |
 
> See pool and disk notes [3][4].
 
Let me know if you'd like me to dig deeper."""
 
MOCK_SOURCES = [
    {
        "name": "Evolution_of_the_Internet_Detailed.pdf",
        "url": "https://example-bucket.s3.amazonaws.com/docs/Evolution_of_the_Internet_Detailed.pdf",
        "snippet": "Authentication service RSS memory growing...",
    },
    {
        "name": "performance_metrics_report.docx",
        "url": "https://example-bucket.s3.amazonaws.com/docs/performance_metrics_report.docx",
        "snippet": "P99 latency for user_sessions…",
    },
    {
        "name": "connection_pool_audit.json",
        "url": "https://example-bucket.s3.amazonaws.com/docs/connection_pool_audit.json",
        "snippet": "pool_max=100 reached 47×/24h…",
    },
    {
        "name": "node_disk_io_timeseries.csv",
        "url": "https://example-bucket.s3.amazonaws.com/docs/node_disk_io_timeseries.csv",
        "snippet": "sda util >90% during peak…",
    },
]
 
MOCK_CITATIONS = [
    {
        "index": 1,
        "text": "Memory leak detected",
        "source": "Evolution_of_the_Internet_Detailed.pdf",
        "chunk": "…RSS for `auth-service` grew ~50MB/hr; heap dump shows retained char[] from logging buffer …",
    },
    {
        "index": 2,
        "text": "Slow queries",
        "source": "performance_metrics_report.docx",
        "chunk": "…`user_sessions` query scanned 4.1M rows; missing index on (tenant_id, updated_at) …",
    },
    {
        "index": 3,
        "text": "Pool exhaustion",
        "source": "connection_pool_audit.json",
        "chunk": "…`pool.acquire()` timeouts 02:10–02:22 UTC; active=100 idle=0 …",
    },
    {
        "index": 4,
        "text": "Disk saturation",
        "source": "node_disk_io_timeseries.csv",
        "chunk": "…`/dev/sda` avgqu-sz 42; iowait 31% with LSM compaction …",
    },
]
 
PROCESSING_STEPS: List[dict] = [
    {"id": "step-1", "label": "Analyzing your query", "description": "Determining next steps"},
    {"id": "step-2", "label": "Searching your documents", "description": "Looking up relevant context"},
    {"id": "step-3", "label": "Extracting key details", "description": "Processing document content"},
    {
        "id": "step-4",
        "label": "Creating answer from fetched data",
        "description": "Composing the response from retrieved sources",
    },
]
 
TOOL_OUTPUTS = [
    {"id": "tool-1", "name": "log_analyzer", "content": "Scanned 14,232 log entries.", "type": "text"},
]
 
# --- Sub-steps under each main step (`substeps` on active step); ~1s between lines, ~3.4s between main steps.
STEP_SUBSTEPS: Dict[str, List[str]] = {
    "step-1": [
        "Inferring task type from phrasing…",
        "Binding workspace + retention policy…",
        "Selecting retrieval tools (BM25 + dense)…",
    ],
    "step-2": [
        "Tokenizing query for hybrid search…",
        "Scanning chunk n-grams in vector index…",
        "Reranking passages with cross-encoder…",
    ],
    "step-3": [
        "Extracting entities & numeric claims…",
        "Grounding spans to source offsets…",
        "Building evidence table for answer…",
    ],
    "step-4": [
        "Drafting markdown with citation placeholders…",
        "Running consistency pass on facts…",
        "Handoff to token stream…",
    ],
}
 
 
def _map_steps_with_substeps(active_index: int, substeps_for_active: List[str]) -> List[dict]:
    out: List[dict] = []
    for j, s in enumerate(PROCESSING_STEPS):
        status = "complete" if j < active_index else "active" if j == active_index else "pending"
        full = STEP_SUBSTEPS.get(s["id"], [])
        if j == active_index:
            subs: List[str] = list(substeps_for_active)
        elif j < active_index:
            subs = list(full)
        else:
            subs = []
        row = {**s, "status": status, "substeps": subs}
        out.append(row)
    return out
 
 
def _stage_for_step(step_id: str) -> str:
    if step_id == "step-1":
        return "analyzing"
    if step_id == "step-2":
        return "searching"
    if step_id == "step-3":
        return "extracting"
    return "generating"
 
 
async def run_mock_stream(
    send_text: Callable[[str], Awaitable[None]],
    message: str,
    message_id: str,
    session_id: str,
) -> None:
    """
    Run the full mock stream. Caller should cancel the asyncio Task to abort
    (same idea as the browser AbortController).
    --- `session_id` (added): every outbound frame includes it so one WebSocket can multiplex chats.
    """
 
    async def emit(payload: dict) -> None:
        # --- Tag all frames with the conversation id so the SPA routes updates to the right session.
        payload = {**payload, "sessionId": session_id}
        await send_text(json.dumps(payload))
 
    async def emit_activity(line: str) -> None:
        await emit({"event": "message", "type": "activity", "messageId": message_id, "line": line})
 
    await emit({"event": "runPhase", "messageId": message_id, "phase": "initializing"})
    await emit({"event": "pipeline", "messageId": message_id, "percent": 0})
    await asyncio.sleep(3.2)
 
    await emit({"event": "runPhase", "messageId": message_id, "phase": "steps"})
 
    # This is the time which is used as mock wait time - in b/w processing steps
    between_main = 3.4
 
    for i, step in enumerate(PROCESSING_STEPS):
        templates = STEP_SUBSTEPS.get(step["id"], ["Working…", "Refining context…", "Finishing slice…"])
 
        await emit(
            {
                "event": "step",
                "messageId": message_id,
                "step": {**step, "status": "active", "substeps": []},
                "allSteps": _map_steps_with_substeps(i, []),
            }
        )
        await emit(
            {
                "event": "progress",
                "messageId": message_id,
                "stage": _stage_for_step(step["id"]),
                "detail": step["label"],
            }
        )
 
        if step["id"] == "step-1":
            await emit_activity("Analyzing your query — classifying intent and required tools.")
        if step["id"] == "step-2":
            await emit(
                {
                    "event": "message",
                    "type": "stream_meta",
                    "messageId": message_id,
                    "meta": {"searchQuery": message.strip() or "Q"},
                }
            )
            await emit_activity("Searching your knowledge base and uploaded documents…")
        if step["id"] == "step-3":
            await emit_activity("Extracting key details and grounding facts from retrieved passages.")
        if step["id"] == "step-4":
            await emit_activity("Creating the answer from fetched passages and tool results.")
 
        for k in range(len(templates)):
            await asyncio.sleep(1.0)
            sl = templates[: k + 1]
            await emit(
                {
                    "event": "step",
                    "messageId": message_id,
                    "step": {**step, "status": "active", "substeps": sl},
                    "allSteps": _map_steps_with_substeps(i, sl),
                }
            )
            if step["id"] == "step-2" and k == 0:
                await emit(
                    {
                        "event": "progress",
                        "messageId": message_id,
                        "stage": "searching",
                        "detail": (message.strip() or "Q")[:80],
                    }
                )
            if step["id"] == "step-2" and k == len(templates) - 1:
                await emit(
                    {
                        "event": "message",
                        "type": "stream_meta",
                        "messageId": message_id,
                        "meta": {
                            "foundSummary": f"Found {len(MOCK_SOURCES)} document(s)",
                            "documents": [s["name"] for s in MOCK_SOURCES],
                        },
                    }
                )
                await emit_activity(f"Found passages from {len(MOCK_SOURCES)} documents.")
            if step["id"] == "step-3" and k == len(templates) - 1:
                await emit(
                    {
                        "event": "progress",
                        "messageId": message_id,
                        "stage": "extracting",
                        "detail": "Structuring evidence for the answer",
                    }
                )
            if step["id"] == "step-4" and k == len(templates) - 1:
                await emit(
                    {
                        "event": "progress",
                        "messageId": message_id,
                        "stage": "generating",
                        "detail": "Composing markdown and citations from sources",
                    }
                )
                await emit_activity("Draft complete — streaming the final response to the client…")
 
        await asyncio.sleep(0.4)
 
        await emit(
            {
                "event": "step",
                "messageId": message_id,
                "step": {**step, "status": "complete", "substeps": list(templates)},
                "allSteps": [
                    {
                        **s,
                        "status": "complete" if j <= i else "pending",
                        "substeps": list(STEP_SUBSTEPS.get(s["id"], [])) if j <= i else [],
                    }
                    for j, s in enumerate(PROCESSING_STEPS)
                ],
            }
        )
        await emit({"event": "pipeline", "messageId": message_id, "percent": (i + 1) * 25})
        if i < len(PROCESSING_STEPS) - 1:
            await asyncio.sleep(between_main)
 
    # --- Pipeline hits 100% before answer streaming; UI collapses the “Processing” block on `streaming`.
    await emit({"event": "pipeline", "messageId": message_id, "percent": 100})
    await asyncio.sleep(0.12)
    await emit({"event": "runPhase", "messageId": message_id, "phase": "streaming"})
    await emit(
        {"event": "progress", "messageId": message_id, "stage": "generating", "detail": "Streaming answer"}
    )
 
    tokens = list(MOCK_RESPONSE)
    buffer = ""
    for i, ch in enumerate(tokens):
        buffer += ch
        if len(buffer) >= 3 or i == len(tokens) - 1:
            await emit({"event": "message", "type": "token", "messageId": message_id, "token": buffer})
            buffer = ""
            await asyncio.sleep(0.008)
 
    for tool in TOOL_OUTPUTS:
        await emit({"event": "message", "type": "tool_output", "messageId": message_id, "output": tool})
        await asyncio.sleep(0.15)
 
    await emit(
        {
            "event": "message",
            "type": "sources",
            "messageId": message_id,
            "sources": MOCK_SOURCES,
            "citations": MOCK_CITATIONS,
        }
    )
    await emit({"event": "complete", "messageId": message_id})