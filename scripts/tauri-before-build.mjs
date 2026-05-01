import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

let repoRoot = process.cwd()

while (!existsSync(path.join(repoRoot, 'scripts', 'prepare-tauri-resources.mjs'))) {
  const parent = path.dirname(repoRoot)
  if (parent === repoRoot)
    throw new Error('prepare script not found')

  repoRoot = parent
}

const result = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', 'prepare-tauri-resources.mjs')], {
  cwd: repoRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)
