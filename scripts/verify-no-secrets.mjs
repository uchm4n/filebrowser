/**
 * Fails the build if any VITE_ value from .env survives into dist/.
 *
 * The `import.meta.env.DEV` guard in src/config/env.ts only works because Vite
 * folds it to `false` in production, letting dead-code elimination drop the
 * credential strings. Removing that guard leaks the password silently — the
 * build still succeeds and every test still passes. This is the only thing that
 * catches it.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const envPath = fileURLToPath(new URL('../.env', import.meta.url))
const distDir = fileURLToPath(new URL('../dist/', import.meta.url))

// Values below this are skipped: a 1-character username matches every minified
// file and turns the check into noise. Short values are not secrets.
const MIN_SECRET_LENGTH = 4

if (!existsSync(envPath)) {
  console.log('No .env file — nothing to check.')
  process.exit(0)
}

if (!existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build-only` first.')
  process.exit(1)
}

const values = readFileSync(envPath, 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.startsWith('VITE_') && line.includes('='))
  .map((line) => line.slice(line.indexOf('=') + 1).trim())
  .filter(Boolean)

/**
 * dotenv unescapes values as it parses, so `Pa\$\$w0rd` in .env is inlined as
 * `Pa$$w0rd`. Searching for the raw .env text alone gives a false negative on
 * exactly the secret this exists to catch, so check both spellings.
 */
const needles = values
  .filter((value) => value.length >= MIN_SECRET_LENGTH)
  .flatMap((value) => [...new Set([value, value.replace(/\\(.)/g, '$1')])])

if (needles.length === 0) {
  console.log('No VITE_ value long enough to be a secret — nothing to check.')
  process.exit(0)
}

function* filesIn(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* filesIn(path)
    else yield path
  }
}

let leaked = false
for (const file of filesIn(distDir)) {
  const content = readFileSync(file, 'utf8')
  for (const needle of needles) {
    if (content.includes(needle)) {
      console.error(`LEAK: a .env value appears in ${file}`)
      leaked = true
    }
  }
}

if (leaked) {
  console.error('Restore the import.meta.env.DEV guard in src/config/env.ts.')
  process.exit(1)
}

const skipped = values.filter((v) => v.length < MIN_SECRET_LENGTH).length
const note = skipped > 0 ? ` (${skipped} short value(s) skipped)` : ''
const checked = values.length - skipped
console.log(`OK: none of the ${checked} .env value(s) appear in dist/${note}`)