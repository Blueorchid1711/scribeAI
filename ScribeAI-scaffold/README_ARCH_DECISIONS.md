
# Architecture decisions & prompts

- Use Socket.io for simplicity and compatibility with browsers (fallback HTTP long-polling if needed).
- Chunk size: 20-30s balances latency and network overhead.
- Gemini prompt template (example):
```
You are a meeting assistant. Given transcript segments with speaker tags, produce:
- concise summary (3-5 bullets)
- action items (who, what, due if stated)
- decisions
Provide JSON output with keys: summary, actionItems, decisions.
```
