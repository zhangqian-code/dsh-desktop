import { describe, expect, it } from 'vitest'
import {
  createPackageEnvironment,
  createPackagePlan,
  parsePackageOptions
} from '../scripts/package-desktop.mjs'

describe('desktop packaging wrapper', () => {
  it('defaults to a development package for the current runtime', () => {
    expect(parsePackageOptions([], { platform: 'darwin', arch: 'arm64' })).toMatchObject({
      mode: 'development',
      platform: 'darwin',
      arch: 'arm64',
      network: 'auto',
      publish: 'never'
    })
  })

  it('creates the complete native macOS development plan', () => {
    const options = parsePackageOptions([
      '--mode', 'development',
      '--platform', 'darwin',
      '--arch', 'arm64',
      '--publish', 'never'
    ])
    const plan = createPackagePlan(options)

    expect(plan.map((step) => step.label)).toEqual([
      'verify target',
      'build application',
      'package application'
    ])
    expect(plan[0].args.slice(-2)).toEqual(['darwin', 'arm64'])
    expect(plan[2].args).toEqual(expect.arrayContaining([
      '--mac', '--arm64', '--publish', 'never', '--config', 'electron-builder.dev.cjs'
    ]))
  })

  it('routes Windows packaging through the staged-directory adapter', () => {
    const options = parsePackageOptions([
      '--mode', 'production',
      '--platform', 'win32',
      '--arch', 'x64'
    ])
    const packageStep = createPackagePlan(options).at(-1)

    expect(packageStep.args[0]).toMatch(/electron-builder-windows\.mjs$/u)
    expect(packageStep.args).toEqual(expect.arrayContaining(['--win', '--x64', '--publish', 'never']))
    expect(packageStep.args).not.toContain('electron-builder.dev.cjs')
  })

  it('rejects publishing and invalid install combinations', () => {
    expect(() => parsePackageOptions(['--publish', 'always'])).toThrow('must use --publish never')
    expect(() => parsePackageOptions(['--launch'])).toThrow('--launch requires --install')
    expect(() => parsePackageOptions([
      '--platform', 'win32', '--arch', 'x64', '--install'
    ])).toThrow('supports macOS only')
  })

  it('applies an explicit package proxy without changing global settings', async () => {
    const options = parsePackageOptions(['--network', 'auto'])
    const sourceEnvironment = { DSH_PACKAGE_PROXY: 'http://127.0.0.1:7890' }
    const { env, networkLabel } = await createPackageEnvironment(options, sourceEnvironment)

    expect(sourceEnvironment).toEqual({ DSH_PACKAGE_PROXY: 'http://127.0.0.1:7890' })
    expect(env).toMatchObject({
      HTTP_PROXY: 'http://127.0.0.1:7890',
      HTTPS_PROXY: 'http://127.0.0.1:7890',
      NODE_USE_ENV_PROXY: '1',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
      ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/'
    })
    expect(networkLabel).toBe('proxy http://127.0.0.1:7890')
  })
})
