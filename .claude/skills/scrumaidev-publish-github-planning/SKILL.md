---
name: scrumaidev-publish-github-planning
description: "ScrumAIDev workflow: publish-github-planning"
argument-hint: "[workflow input]"
disable-model-invocation: true
---

# ScrumAIDev — publish-github-planning

Execute the canonical ScrumAIDev workflow `publish-github-planning`.

1. Read `.agents/workflows/publish-github-planning.md` completely before acting.
2. Treat that workflow file as the canonical process definition; do not replace it with this skill facade.
3. Follow the project `AGENTS.md` chain and `.scrumaidev/AGENTS.md` as the ScrumAIDev operating contract.
4. Use the user arguments below and the current conversation as the workflow input; preserve any constraints already stated.
5. Preserve the model already selected in the current Claude Code session. This skill does not select or override a model.
6. If the canonical workflow requires an explicit human review/approval gate, stop at that gate and ask for the required decision instead of auto-approving it.
7. When the canonical workflow refers to another workflow as `/<workflow>`, the Claude Code invocation is `/scrumaidev-<workflow>`.

Canonical workflow: `.agents/workflows/publish-github-planning.md`

User arguments: $ARGUMENTS
