---
name: scrumaidev-skill-creator
description: "Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, benchmark skill performance with variance analysis, or optimize a skill's description for better triggering accuracy."
---

# ScrumAIDev specialist skill — skill-creator

Thin Claude Code facade for the canonical ScrumAIDev specialist skill `skill-creator`.

1. Read `.agents/skills/skill-creator/SKILL.md` completely and follow it as the canonical skill definition; do not replace it with this facade.
2. Resolve any relative path mentioned by the canonical skill against `.agents/skills/skill-creator/`.
3. Follow the project `AGENTS.md` chain and `.scrumaidev/AGENTS.md` as the ScrumAIDev operating contract.
4. Preserve the model already selected in the current Claude Code session. This skill does not select or override a model.
5. Never auto-approve a human review/approval gate; stop and ask for the required decision.

Canonical skill: `.agents/skills/skill-creator/SKILL.md`

User arguments: $ARGUMENTS
