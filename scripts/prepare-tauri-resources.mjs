import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

const RESOURCES_DIR = path.join(repoRoot, 'src-tauri', 'resources')
const SERVER_RESOURCE_DIR = path.join(RESOURCES_DIR, 'server')
const CLIENT_RESOURCE_DIR = path.join(RESOURCES_DIR, 'client')
const RUNTIME_RESOURCE_DIR = path.join(RESOURCES_DIR, 'runtime')
const API_BASE_URL = 'http://127.0.0.1:3001/api'

function run(cmd, cwd = repoRoot, env = process.env) {
  console.log(`Running: ${cmd} in ${cwd}`)
  execSync(cmd, {
    cwd,
    env,
    stdio: 'inherit',
  })
}

// 清理旧资源
rmSync(RESOURCES_DIR, { recursive: true, force: true })
mkdirSync(SERVER_RESOURCE_DIR, { recursive: true })
mkdirSync(CLIENT_RESOURCE_DIR, { recursive: true })
mkdirSync(RUNTIME_RESOURCE_DIR, { recursive: true })

// 1. 构建并准备 Server 资源
console.log('Building server...')
run('pnpm --filter @todo-app/server build')

// 准备导出的 package.json
console.log('Preparing server resources (resolving catalogs)...')
const serverPkgPath = path.join(repoRoot, 'packages', 'server', 'package.json')
const serverPkg = JSON.parse(readFileSync(serverPkgPath, 'utf8'))
const workspaceYaml = readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8')

// 解析 catalog 版本
const resolveVersion = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^\\s+["']?${escapedName}["']?:\\s+["']?(.+?)["']?\\s*$`, 'm')
  const match = workspaceYaml.match(regex)
  if (match) return match[1]
  
  // 尝试全局备选方案
  console.warn(`Warning: Could not find ${name} in catalogs, checking dependencies...`)
  return null
}

const resolveDeps = (deps) => {
  if (!deps) return
  for (const [name, version] of Object.entries(deps)) {
    if (version.startsWith('catalog:')) {
      const resolved = resolveVersion(name)
      if (resolved) deps[name] = resolved
      else console.error(`Error: Failed to resolve catalog version for ${name}`)
    }
  }
}

resolveDeps(serverPkg.dependencies)

const serverProdPkg = {
  name: serverPkg.name,
  version: serverPkg.version,
  private: serverPkg.private,
  type: serverPkg.type,
  dependencies: serverPkg.dependencies || {},
}

const serverPkgTarget = path.join(SERVER_RESOURCE_DIR, 'package.json')
writeFileSync(serverPkgTarget, JSON.stringify(serverProdPkg, null, 2))
console.log(`Created: ${serverPkgTarget}`)

cpSync(path.join(repoRoot, 'packages', 'server', 'dist'), path.join(SERVER_RESOURCE_DIR, 'dist'), { recursive: true })

// 安装生产依赖
console.log('Installing server dependencies in isolation...')
writeFileSync(path.join(SERVER_RESOURCE_DIR, 'pnpm-workspace.yaml'), 'packages: []\n')
writeFileSync(
  path.join(SERVER_RESOURCE_DIR, '.npmrc'),
  [
    'recursive=false',
    'node-linker=hoisted',
    'only-built-dependencies[]=bcrypt',
    'only-built-dependencies[]=better-sqlite3',
  ].join('\n') + '\n',
)

run('pnpm install --prod --no-frozen-lockfile', SERVER_RESOURCE_DIR)

rmSync(path.join(SERVER_RESOURCE_DIR, 'pnpm-workspace.yaml'))
rmSync(path.join(SERVER_RESOURCE_DIR, '.npmrc'))

// 2. 构建并准备 Client 资源
console.log('Building client...')
run('pnpm --filter @todo-app/client build', repoRoot, {
  ...process.env,
  VITE_API_URL: API_BASE_URL,
})

cpSync(path.join(repoRoot, 'packages', 'client', 'dist'), path.join(CLIENT_RESOURCE_DIR, 'dist'), {
  recursive: true,
  force: true,
})

// 3. 准备 Node 运行时
console.log('Preparing runtime...')
const nodeBinaryName = process.platform === 'win32' ? 'node.exe' : 'node'
const nodeTargetPath = path.join(RUNTIME_RESOURCE_DIR, nodeBinaryName)

console.log(`Copying node from ${process.execPath} to ${nodeTargetPath}`)
copyFileSync(process.execPath, nodeTargetPath)

if (process.platform !== 'win32') {
  chmodSync(nodeTargetPath, 0o755)
}

// 最终校验
if (!existsSync(nodeTargetPath)) {
  console.error('Fatal: Node binary missing after copy!')
  process.exit(1)
}
if (!existsSync(serverPkgTarget)) {
  console.error('Fatal: Server package.json missing!')
  process.exit(1)
}

console.log('Tauri resources prepared successfully!')
