import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

let repoRoot = process.cwd()

while (!existsSync(path.join(repoRoot, 'package.json'))) {
  const parent = path.dirname(repoRoot)
  if (parent === repoRoot)
    throw new Error('repo root not found')

  repoRoot = parent
}

const result = spawnSync('pnpm', ['--dir', repoRoot, 'dev:client'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

process.exit(result.status ?? 1)
