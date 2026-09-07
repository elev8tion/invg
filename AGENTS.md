<!-- vnodes-pi:begin (generated — do not edit inside this block) -->
# Pi agent — vnodes

This project is indexed by vnodes. When **pi** is used here, treat vnodes as the
first context step. Do not start with raw `ls` / grep / whole-file reads.

Pi talks to vnodes through the MCP adapter (`mcp`, `mcpScript`, `mcp__vnodes`).
If those tools are not in the session, fall back to the `vnodes` CLI from this
directory.

## Every coding task

1. Orient once with a pipeline (do not under-budget it):

```js
mcp({
  tool: "vnodes_run_pipeline",
  args: { task: "<user task>", max_tokens: 50000 },
  server: "vnodes",
})
```

2. Before editing a file or symbol, get impact:

```js
mcp({
  tool: "vnodes_get_impact_graph",
  args: { target: "<file-or-symbol>", depth: 3 },
  server: "vnodes",
})
```

3. After a change you are keeping, save a durable observation:

```js
mcp({
  tool: "vnodes_save_observation",
  args: { summary: "<what you learned>", file: "<path>" },
  server: "vnodes",
})
```

4. Keep the index current: `vnodes index`. `vnodes check` fails when
   `.vnodes/manifest.json` does not match the tree.

CLI fallback (same rules):

```bash
vnodes pipeline "<user task>" --max-tokens 50000
vnodes impact <file-or-symbol> --depth 3
vnodes memory save "<durable observation>" --file <path>
vnodes index
vnodes check
```

## Rules

- One `run_pipeline` per task. If the capsule is too narrow, follow up with
  `get_skeleton`, `get_impact_graph`, `search_logic_flow`, or `search_memory`
  — do not rerun a tiny pipeline.
- Prefer skeletons over reading whole files.
- Do not index `$HOME` unless the user passes `--force`.
- If this directory is already a knowledge base, do not call
  `create_knowledge_base` unless `vnodes doctor` says there is none.
<!-- vnodes-pi:end -->

<!-- vnodes:begin (generated — do not edit inside this block) -->
## vnodes context engine

This project is indexed by vnodes (local code-graph context engine). Prefer its
MCP tools over raw file exploration.

Every task:
1. If there is no knowledge base yet, call `create_knowledge_base` — that indexes the tree and seeds the first durable finding.
2. Call `run_pipeline` once at the start with the task.
3. Before changing a file or symbol, call `get_impact_graph` on it.
4. After a change you are keeping, `save_observation` what you learned (link the file).
5. Keep the index current with kept changes: `vnodes index`. `vnodes check` fails when `.vnodes/manifest.json` does not match the tree (older than HEAD in practice). Install `vnodes hook install` so pre-commit reindexes and stages the manifest, or run `vnodes check` in CI.

- `run_pipeline` — ONE call per task for orientation: pivot files in full, supporting skeletons, and prior-session memories with rationale, inside a token budget. Call it first, once, per task.
- `get_context_capsule` — Assemble a context capsule for a task without intent narration — same engine as run_pipeline.
- `get_impact_graph` — who depends on a file/symbol before you change it. Call this before editing a file.
- `search_logic_flow` — Shortest dependency path between two files or symbols.
- `export_dependency_graph` — Export the complete intra-repo dependency edge list (and ranked hubs) of a knowledge base as JSON — for external consumers like codenodes, not for reading into context.
- `get_skeleton` — signatures-only view instead of reading a whole file.
- `get_session_context` — Recent observations from this and previous sessions (stale ones flagged, never dropped).
- `search_memory` — recall findings from previous sessions (pass findings_only for the diary).
- `save_observation` — record a durable insight (link a file for staleness tracking).
- `forget_observation` — delete a manual finding by id when it is wrong or no longer true.
- `update_observation` — edit a manual finding by id.
- `index_status` — index health when a result looks stale or wrong.
- `create_knowledge_base` — Make this directory a knowledge base and index it. First call seeds a durable foundation finding from the graph.
- `list_knowledge_bases` — list registry ids/paths/states before forget or hide.
- `forget_knowledge_base` — remove a knowledge base from the registry by id (does not delete .vnodes).
- `hide_knowledge_base` — hide a knowledge base from the picker.
- `show_knowledge_base` — unhide a knowledge base.
- `workspace_setup` — Define a multi-repo workspace ({name|workspace_id, repos:[{alias,path}]}) and write parent pointers into secondary repos.
- `forget_workspace` — remove workspace.json and parent pointers; indexes stay.
- `forget_activity` — delete auto-captured tool-call rows; manual findings stay.

Avoid re-sending full context every turn; one pipeline orientation call per
task keeps session cost bounded.
<!-- vnodes:end -->
