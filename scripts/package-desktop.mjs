#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, readdir, rename, stat } from 'node:fs/promises'
import { createConnection } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LOCAL_PROXY = 'http://127.0.0.1:7890'

function usage() {
  return `Usage: node scripts/package-desktop.mjs [options]

Options:
  --mode <development|production>  Build channel (default: development)
  --platform <current|darwin|win32> Target platform (default: current)
  --arch <current|arm64|x64>        Target architecture (default: current)
  --network <auto|inherit|direct>  Auto-detect the local proxy, inherit env, or go direct
  --skip-build                     Reuse the current out/ and prepared runtime
  --install                        Install the packaged macOS app with a recoverable backup
  --launch                         Launch the app after --install
  --dry-run                        Print the resolved plan without running it
  --publish <never>                Explicit safety setting; only "never" is accepted
  --help                           Show this help

Environment:
  DSH_PACKAGE_PROXY                Override the auto-detected proxy URL
  ELECTRON_MIRROR                  Override the Electron download mirror
  ELECTRON_BUILDER_BINARIES_MIRROR Override the electron-builder binary mirror`
}

function takeValue(args, index, option) {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${option} requires a value`)
  return value
}

export function parsePackageOptions(args, runtime = process) {
  const options = {
    mode: 'development',
    platform: runtime.platform,
    arch: runtime.arch,
    network: 'auto',
    publish: 'never',
    skipBuild: false,
    install: false,
    launch: false,
    dryRun: false,
    help: false
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--skip-build') options.skipBuild = true
    else if (argument === '--install') options.install = true
    else if (argument === '--launch') options.launch = true
    else if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--help' || argument === '-h') options.help = true
    else if (argument === '--mode') options.mode = takeValue(args, index++, argument)
    else if (argument === '--platform') options.platform = takeValue(args, index++, argument)
    else if (argument === '--arch') options.arch = takeValue(args, index++, argument)
    else if (argument === '--network') options.network = takeValue(args, index++, argument)
    else if (argument === '--publish') options.publish = takeValue(args, index++, argument)
    else throw new Error(`Unknown option: ${argument}`)
  }

  if (options.platform === 'current') options.platform = runtime.platform
  if (options.arch === 'current') options.arch = runtime.arch
  if (!['development', 'production'].includes(options.mode)) {
    throw new Error(`Unsupported mode: ${options.mode}`)
  }
  if (!['darwin', 'win32'].includes(options.platform)) {
    throw new Error(`Unsupported platform: ${options.platform}`)
  }
  if (!['arm64', 'x64'].includes(options.arch)) {
    throw new Error(`Unsupported architecture: ${options.arch}`)
  }
  if (options.platform === 'win32' && options.arch !== 'x64') {
    throw new Error('Windows packaging currently supports x64 only')
  }
  if (!['auto', 'inherit', 'direct'].includes(options.network)) {
    throw new Error(`Unsupported network mode: ${options.network}`)
  }
  if (options.publish !== 'never') {
    throw new Error('Local packaging must use --publish never')
  }
  if (options.launch && !options.install) {
    throw new Error('--launch requires --install')
  }
  if (options.install && options.platform !== 'darwin') {
    throw new Error('--install currently supports macOS only')
  }

  return options
}

function nodeStep(label, script, args = []) {
  return { label, command: process.execPath, args: [join(root, script), ...args] }
}

export function createPackagePlan(options) {
  const steps = [
    nodeStep('verify target', 'scripts/verify-target.mjs', [options.platform, options.arch])
  ]
  if (!options.skipBuild) {
    steps.push({
      label: 'build application',
      command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
      args: ['run', 'build']
    })
  }

  const builderArgs = options.platform === 'darwin'
    ? ['--mac', `--${options.arch}`, '--publish', 'never']
    : ['--win', '--x64', '--publish', 'never']
  if (options.mode === 'development') {
    builderArgs.push('--config', 'electron-builder.dev.cjs')
  }
  steps.push(
    options.platform === 'win32'
      ? nodeStep('package application', 'scripts/electron-builder-windows.mjs', builderArgs)
      : nodeStep('package application', 'node_modules/electron-builder/cli.js', builderArgs)
  )
  return steps
}

function canConnect(hostname, port, timeoutMs = 250) {
  return new Promise((resolveReady) => {
    const socket = createConnection({ host: hostname, port })
    let settled = false
    const finish = (ready) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolveReady(ready)
    }
    socket.setTimeout(timeoutMs, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })
}

function appendNoProxy(current) {
  const entries = new Set((current ?? '').split(',').map((entry) => entry.trim()).filter(Boolean))
  entries.add('127.0.0.1')
  entries.add('localhost')
  return [...entries].join(',')
}

export async function createPackageEnvironment(options, environment = process.env) {
  const env = { ...environment }
  if (options.mode === 'development' && env.CSC_IDENTITY_AUTO_DISCOVERY === undefined) {
    env.CSC_IDENTITY_AUTO_DISCOVERY = 'false'
  }
  if (options.network === 'direct') {
    for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) {
      delete env[name]
    }
    return { env, networkLabel: 'direct' }
  }
  if (options.network === 'inherit') return { env, networkLabel: 'inherited environment' }

  const configuredProxy = env.DSH_PACKAGE_PROXY
  const inheritedProxy = env.HTTPS_PROXY ?? env.HTTP_PROXY ?? env.https_proxy ?? env.http_proxy
  let proxy = configuredProxy ?? inheritedProxy
  if (!proxy) {
    const localProxy = new URL(LOCAL_PROXY)
    if (await canConnect(localProxy.hostname, Number(localProxy.port))) proxy = LOCAL_PROXY
  }
  if (!proxy) return { env, networkLabel: 'direct (local proxy unavailable)' }

  new URL(proxy)
  env.NODE_USE_ENV_PROXY = '1'
  env.HTTP_PROXY = proxy
  env.HTTPS_PROXY = proxy
  env.ALL_PROXY = proxy
  env.NO_PROXY = appendNoProxy(env.NO_PROXY)
  env.no_proxy = appendNoProxy(env.no_proxy)
  env.ELECTRON_MIRROR ??= 'https://npmmirror.com/mirrors/electron/'
  env.ELECTRON_BUILDER_BINARIES_MIRROR ??= 'https://npmmirror.com/mirrors/electron-builder-binaries/'
  return { env, networkLabel: `proxy ${proxy}` }
}

function quote(value) {
  return /[\s"']/u.test(value) ? JSON.stringify(value) : value
}

function printStep(step) {
  console.log(`\n[package] ${step.label}`)
  console.log(`$ ${[step.command, ...step.args].map(quote).join(' ')}`)
}

async function runStep(step, env, dryRun) {
  printStep(step)
  if (dryRun) return
  await new Promise((resolveDone, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: root,
      env,
      stdio: 'inherit',
      windowsHide: true
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolveDone()
      else reject(new Error(`${step.label} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`))
    })
  })
}

async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

function outputDirectory(options) {
  return join(root, options.mode === 'development' ? 'dist-dev' : 'dist')
}

export async function findPackagedMacApp(options) {
  const output = outputDirectory(options)
  const candidateDirectories = options.arch === 'arm64' ? ['mac-arm64', 'mac'] : ['mac', 'mac-x64']
  for (const directory of candidateDirectories) {
    const app = join(output, directory, 'king-dsh.app')
    if (await exists(app)) return app
  }
  throw new Error(`Packaged macOS app was not found under ${output}`)
}

function timestamp(date = new Date()) {
  const part = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}-${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`
}

async function exec(command, args, { allowFailure = false } = {}) {
  return await new Promise((resolveDone, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'ignore', windowsHide: true })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0 || allowFailure) resolveDone(code ?? 1)
      else reject(new Error(`${command} exited with code ${code}`))
    })
  })
}

async function installedAppRunning() {
  return (await exec('pgrep', ['-f', '^/Applications/king-dsh\\.app/Contents/MacOS/king-dsh$'], { allowFailure: true })) === 0
}

async function stopInstalledApp() {
  if (!await installedAppRunning()) return
  await exec('osascript', ['-e', 'tell application "king-dsh" to quit'])
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (!await installedAppRunning()) return
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250))
  }
  throw new Error('king-dsh did not quit within 15 seconds; installation was not changed')
}

export async function installPackagedMacApp(sourceApp, { launch = false } = {}) {
  const destination = '/Applications/king-dsh.app'
  await stopInstalledApp()

  let backup
  if (await exists(destination)) {
    backup = `${destination}.backup-${timestamp()}`
    if (await exists(backup)) throw new Error(`Backup path already exists: ${backup}`)
    await rename(destination, backup)
    console.log(`[package] Previous app moved to ${backup}`)
  }

  try {
    await exec('ditto', [sourceApp, destination])
  } catch (error) {
    if (backup) {
      if (await exists(destination)) {
        const failedDestination = `${destination}.failed-${timestamp()}`
        await rename(destination, failedDestination)
        console.error(`[package] Incomplete app preserved at ${failedDestination}`)
      }
      await rename(backup, destination)
      console.error(`[package] Restored previous app from ${backup}`)
    }
    throw error
  }
  console.log(`[package] Installed ${destination}`)
  if (launch) {
    await exec('open', ['-n', destination])
    console.log('[package] Launched king-dsh')
  }
  return { destination, backup }
}

function formatBytes(bytes) {
  const units = ['B', 'KiB', 'MiB', 'GiB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

async function reportArtifacts(options) {
  const output = outputDirectory(options)
  const entries = await readdir(output, { withFileTypes: true })
  const files = []
  const expectedExtensions = options.platform === 'darwin' ? ['.dmg', '.zip'] : ['.exe']
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.includes(options.arch)) continue
    if (!expectedExtensions.some((extension) => entry.name.endsWith(extension))) continue
    const path = join(output, entry.name)
    files.push({ path, size: (await stat(path)).size })
  }
  for (const extension of expectedExtensions) {
    if (!files.some((file) => file.path.endsWith(extension))) {
      throw new Error(`No ${options.platform}/${options.arch} ${extension} artifact was found in ${output}`)
    }
  }
  console.log('\n[package] Artifacts')
  for (const file of files) console.log(`- ${file.path} (${formatBytes(file.size)})`)
}

export async function main(args = process.argv.slice(2)) {
  const options = parsePackageOptions(args)
  if (options.help) {
    console.log(usage())
    return
  }
  const { env, networkLabel } = await createPackageEnvironment(options)
  console.log(`[package] ${options.mode} ${options.platform}/${options.arch}; network: ${networkLabel}`)
  const plan = createPackagePlan(options)
  for (const step of plan) await runStep(step, env, options.dryRun)
  if (options.dryRun) {
    if (options.install) console.log('\n[package] Would install /Applications/king-dsh.app with a timestamped backup')
    return
  }
  await reportArtifacts(options)
  if (options.install) {
    const sourceApp = await findPackagedMacApp(options)
    await installPackagedMacApp(sourceApp, { launch: options.launch })
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[package] ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
