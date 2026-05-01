import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const resourcesDir = path.join(repoRoot, 'src-tauri', 'resources')
const clientResourceDir = path.join(resourcesDir, 'client')

function run(cmd, cwd = repoRoot, env = process.env) {
  console.log(`Running: ${cmd} in ${cwd}`)
  execSync(cmd, {
    cwd,
    env,
    stdio: 'inherit',
  })
}

rmSync(resourcesDir, { recursive: true, force: true })
mkdirSync(clientResourceDir, { recursive: true })

console.log('Building client for Tauri...')
run('pnpm --filter @todo-app/client build', repoRoot, {
  ...process.env,
  VITE_API_URL: 'http://127.0.0.1:3001/api',
})

const clientDist = path.join(repoRoot, 'packages', 'client', 'dist')
if (!existsSync(clientDist)) {
  console.error(`Fatal: client dist missing: ${clientDist}`)
  process.exit(1)
}

cpSync(clientDist, path.join(clientResourceDir, 'dist'), {
  recursive: true,
  force: true,
})

console.log('Tauri client resources prepared successfully!')
