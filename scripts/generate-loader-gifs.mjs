import { execFileSync } from 'node:child_process'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const buildDirectory = path.join(projectRoot, 'build')

// Splash assets use the same authoritative transparent brand mark as the
// mobile and Harness surfaces. Keeping the historical GIF filenames avoids a
// loader protocol change while allowing the downstream brand to stay in sync.
const loaders = [
  { source: 'logo-light.png', destination: 'dsh-loader.gif' },
  { source: 'logo-dark.png', destination: 'dsh-loader-dark.gif' }
]

for (const loader of loaders) {
  const source = path.join(buildDirectory, loader.source)
  const destination = path.join(buildDirectory, loader.destination)
  execFileSync('sips', ['-z', '256', '256', '-s', 'format', 'gif', source, '--out', destination])
  const metadata = await stat(destination)
  console.log(`Wrote ${path.relative(projectRoot, destination)} (${metadata.size} bytes)`)
}
