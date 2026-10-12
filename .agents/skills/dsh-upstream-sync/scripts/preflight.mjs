#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import process from 'node:process'

function git(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8'
  })

  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    const detail = result.stderr.trim() || result.stdout.trim()
    throw new Error(`git ${args.join(' ')} failed: ${detail}`)
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  }
}

function lines(value) {
  return value ? value.split('\n').filter(Boolean) : []
}

function remoteUrl(name) {
  return git(['remote', 'get-url', name], { allowFailure: true }).stdout || null
}

function riskGroup(path) {
  if (path === 'package.json' || path === 'package-lock.json') return 'dependencies'
  if (path.startsWith('patches/')) return 'patches'
  if (path.startsWith('src/main/')) return 'electron-main'
  if (path.startsWith('src/preload/')) return 'preload-ipc'
  if (path.startsWith('src/shared/')) return 'shared-contracts'
  if (path.startsWith('packages/')) return 'host-plugins'
  if (path.startsWith('build/')) return 'packaging-inputs'
  if (path.startsWith('.github/') || path.startsWith('scripts/')) return 'build-release'
  if (path.startsWith('test/')) return 'tests'
  return 'other'
}

function groupPaths(paths) {
  return Object.fromEntries(
    [...new Set(paths.map(riskGroup))].sort().map((group) => [
      group,
      paths.filter((path) => riskGroup(path) === group).sort()
    ])
  )
}

const downstreamRef = process.argv[2] || 'HEAD'
const upstreamRef = process.argv[3] || 'upstream/main'
const repoRoot = git(['rev-parse', '--show-toplevel']).stdout
const branch = git(['branch', '--show-current']).stdout || null
const status = lines(git(['status', '--porcelain=v1']).stdout)
const downstreamSha = git(['rev-parse', downstreamRef]).stdout
const upstreamSha = git(['rev-parse', upstreamRef]).stdout
const mergeBase = git(['merge-base', downstreamRef, upstreamRef]).stdout
const [aheadText = '0', behindText = '0'] = git([
  'rev-list',
  '--left-right',
  '--count',
  `${downstreamRef}...${upstreamRef}`
]).stdout.split(/\s+/)
const upstreamCommits = lines(git([
  'log',
  '--format=%h %s',
  '--max-count=50',
  `${downstreamRef}..${upstreamRef}`
]).stdout)
const downstreamPaths = lines(git([
  'diff',
  '--name-only',
  `${mergeBase}..${downstreamRef}`
]).stdout)
const upstreamPaths = lines(git([
  'diff',
  '--name-only',
  `${mergeBase}..${upstreamRef}`
]).stdout)
const downstreamSet = new Set(downstreamPaths)
const overlappingPaths = upstreamPaths.filter((path) => downstreamSet.has(path))
const mergeTree = git(
  ['merge-tree', mergeBase, downstreamRef, upstreamRef],
  { allowFailure: true }
)
const conflictSignals = lines(mergeTree.stdout).filter((line) =>
  /^(changed|added|removed) in both$|^CONFLICT\b/.test(line.trim())
)

const report = {
  repoRoot,
  branch,
  worktreeClean: status.length === 0,
  status,
  remotes: {
    origin: remoteUrl('origin'),
    upstream: remoteUrl('upstream')
  },
  refs: {
    downstream: downstreamRef,
    downstreamSha,
    upstream: upstreamRef,
    upstreamSha,
    mergeBase
  },
  divergence: {
    ahead: Number.parseInt(aheadText, 10),
    behind: Number.parseInt(behindText, 10)
  },
  upstreamCommits,
  upstreamCommitListTruncated: Number.parseInt(behindText, 10) > upstreamCommits.length,
  upstreamChangedPaths: upstreamPaths,
  overlappingPaths,
  riskGroups: groupPaths([...new Set([...upstreamPaths, ...overlappingPaths])]),
  mergePreview: {
    hasConflictSignals: conflictSignals.length > 0,
    signals: conflictSignals.slice(0, 50),
    commandStatus: mergeTree.status
  }
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
