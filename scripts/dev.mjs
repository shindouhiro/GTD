import { spawn } from 'node:child_process'

const processes = [
  spawn('pnpm', ['dev:client'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn('pnpm', ['dev:server'], { stdio: 'inherit', shell: process.platform === 'win32' }),
]

let shuttingDown = false

function stopAll(code = 0) {
  if (shuttingDown)
    return

  shuttingDown = true
  for (const child of processes) {
    if (!child.killed)
      child.kill()
  }
  process.exit(code)
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown)
      stopAll(code ?? 1)
  })
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
