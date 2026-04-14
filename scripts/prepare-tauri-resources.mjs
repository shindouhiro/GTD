import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const RESOURCES_DIR = path.join(repoRoot, 'src-tauri', 'resources')
const SERVER_RESOURCE_DIR = path.join(RESOURCES_DIR, 'server')
const CLIENT_RESOURCE_DIR = path.join(RESOURCES_DIR, 'client')
const RUNTIME_RESOURCE_DIR = path.join(RESOURCES_DIR, 'runtime')
const API_BASE_URL = 'http://127.0.0.1:3001/api'

function run(cmd, env = process.env) {
  execSync(cmd, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  })
}

rmSync(SERVER_RESOURCE_DIR, { recursive: true, force: true })
rmSync(CLIENT_RESOURCE_DIR, { recursive: true, force: true })
rmSync(RUNTIME_RESOURCE_DIR, { recursive: true, force: true })

run('pnpm --filter @todo-app/server build')
run(`pnpm --filter @todo-app/server deploy --prod --legacy ${SERVER_RESOURCE_DIR}`)
rmSync(path.join(SERVER_RESOURCE_DIR, 'todo.db'), { force: true })
rmSync(path.join(SERVER_RESOURCE_DIR, 'todo.db.backup'), { force: true })

run('pnpm --filter @todo-app/client build', {
  ...process.env,
  VITE_API_URL: API_BASE_URL,
})

mkdirSync(CLIENT_RESOURCE_DIR, { recursive: true })
cpSync(path.join(repoRoot, 'packages', 'client', 'dist'), path.join(CLIENT_RESOURCE_DIR, 'dist'), {
  recursive: true,
  force: true,
})

mkdirSync(RUNTIME_RESOURCE_DIR, { recursive: true })
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node'
const nodeTargetPath = path.join(RUNTIME_RESOURCE_DIR, nodeBinaryName)
copyFileSync(process.execPath, nodeTargetPath)

if (process.platform !== 'win32')
  chmodSync(nodeTargetPath, 0o755)
