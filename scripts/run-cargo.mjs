import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('缺少 cargo 参数')
  process.exit(1)
}

const homeDir = process.platform === 'win32'
  ? process.env.USERPROFILE
  : process.env.HOME

const cargoBinDir = homeDir ? path.join(homeDir, '.cargo', 'bin') : null
const pathDelimiter = process.platform === 'win32' ? ';' : ':'
const envPath = process.env.PATH || ''

const env = {
  ...process.env,
  PATH: cargoBinDir ? `${cargoBinDir}${pathDelimiter}${envPath}` : envPath,
}

const result = spawnSync('cargo', args, {
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
})

if (typeof result.status === 'number')
  process.exit(result.status)

process.exit(1)
