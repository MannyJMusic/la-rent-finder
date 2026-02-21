---
name: project-tracking
description: Manages Recaster project roadmap and milestone tracking. Use when discussing project status, milestones, tasks, or development planning.
allowed-tools: Read, Glob, Grep, Edit
---

# Recaster Project Tracking

This skill provides context for project management and milestone tracking.

## Quick Reference

### Current Milestone: v0.2.1-alpha - Foundation

**Target**: Week 4 (End of January 2026)
**Focus**: Get visible online, start collecting beta users

### Milestone Schedule

| Milestone | Target | Focus |
|-----------|--------|-------|
| v0.2.1-alpha | Week 4 | Foundation (landing page, beta signup) |
| v0.3.0-alpha | Week 10 | Monetization (Stripe, license delivery) |
| v0.4.0-alpha | Week 16 | Launch Ready (polish, tutorials) |
| v1.0.0 | Week 20 | Public Launch |
| v1.1.0 | Week 24+ | Cloud Credits |

### Priority Definitions

- **Critical**: Blocks milestone completion, must be done
- **High**: Important for milestone quality
- **Medium**: Should have, can defer if needed
- **Low**: Nice to have

### Component Labels

| Label | Directory | Description |
|-------|-----------|-------------|
| Core | dfl_desktop/core/ | Settings, licensing, events |
| UI | dfl_desktop/ui/ | User interface components |
| Services | dfl_desktop/services/ | Business logic |
| Remote | dfl_desktop/services/remote.py | Vast.ai integration |
| Training | dfl_desktop/services/training.py | Training services |
| Website | (external) | Landing page, marketing |
| Docs | docs/, CLAUDE.md | Documentation |

### Tracking File

The main tracking file is `ROADMAP.md` in the project root. This file contains:
- Current milestone and tasks
- Task status (Pending, In Progress, Completed)
- Session context for continuity
- Blockers and notes

### Workflow Commands

| Command | Description |
|---------|-------------|
| `/milestone` | Show current milestone status |
| `/tasks` | List tasks for current milestone |
| `/start-task <id>` | Begin work on a task (creates git branch, updates GitHub) |
| `/complete-task <id>` | Mark task complete (updates GitHub, offers PR creation) |
| `/update-progress <id>` | Update task stage in GitHub Project (Todo/In Progress/Done) |
| `/roadmap` | Show full project roadmap |
| `/sync-github` | Bidirectional sync with GitHub Issues and Project |
| `/pick-task` | Review critical tasks and choose one to work on |
| `/update-docs` | Update all documentation (CLAUDE.md, ROADMAP.md, README, etc.) |

### Task ID Format

Tasks use the format: `<Milestone>-<Number>`
- F-001 = Foundation milestone, task 1
- M-001 = Monetization milestone, task 1

### When to Update ROADMAP.md

Update the tracking file when:
1. Starting work on a task (change status to "In Progress")
2. Completing a task (change status to "Completed")
3. Discovering blockers (add to Blockers section)
4. Adding new tasks (add to task table)
5. Completing a milestone (move to Completed section)

### GitHub Integration

Tasks should correspond to GitHub Issues where possible:
- Reference issues in commits: "Closes #45"
- Use labels: tier:free, tier:studio, component:*, priority:*
- Link PRs to issues for automatic closing

### GitHub Project Board

**Project**: Recaster Development (ID: 6)
**Owner**: PixelMorphDev

| Stage | ROADMAP Status | Status ID |
|-------|----------------|-----------|
| Todo | Pending | `f75ad846` |
| In Progress | In Progress | `47fc9ee4` |
| Done | Completed | `98236657` |

### Branch Naming Convention

When starting a task, create a branch following this format:

```
task/<task-id>-<short-description>
```

Examples:
- `task/B-001-privacy-remediation`
- `task/B-002-landing-page`
- `task/M-001-stripe-integration`

The `/start-task` command automatically:
1. Stashes uncommitted changes (if any)
2. Switches to main and pulls latest
3. Creates the task branch
4. Updates ROADMAP.md and GitHub Project

### Session Context

The "Session Context" section of ROADMAP.md tracks:
- Current focus area
- In-progress work
- Next up tasks
- Recent changes

Update this section at the start and end of each development session.
