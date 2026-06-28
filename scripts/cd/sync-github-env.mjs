#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const devStandards = process.env.DEV_STANDARDS || resolve(homedir(), 'AgentProjects/dev-standards')
const result = spawnSync(
  process.execPath,
  [resolve(devStandards, 'scripts/env/sync-github-env.mjs'), '--project', 'xiaolin-docs', ...process.argv.slice(2)],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
