import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const source = resolve(root, 'node_modules', '@spotify', 'basic-pitch', 'model')
const destination = resolve(root, 'public', 'basic-pitch-model')

if (!existsSync(source)) {
  console.warn('Basic Pitch model folder not found. Skipping copy.')
  process.exit(0)
}

mkdirSync(resolve(root, 'public'), { recursive: true })
cpSync(source, destination, { recursive: true, force: true })
