#!/usr/bin/env node
/**
 * Sincroniza a versão do @otp-vault/core para todos os apps e manifest.json
 * 
 * Uso:
 *   node scripts/sync-version.mjs          # sincroniza com versão atual do core
 *   node scripts/sync-version.mjs 1.2.0    # define versão específica
 *   node scripts/sync-version.mjs patch    # incrementa patch (1.1.0 → 1.1.1)
 *   node scripts/sync-version.mjs minor    # incrementa minor (1.1.0 → 1.2.0)
 *   node scripts/sync-version.mjs major    # incrementa major (1.1.0 → 2.0.0)
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const files = [
  'packages/core/package.json',
  'apps/web/package.json',
  'apps/extension/package.json',
  'apps/extension/public/manifest.json',
]

function readJSON(path) {
  return JSON.parse(readFileSync(resolve(root, path), 'utf-8'))
}

function writeJSON(path, data) {
  writeFileSync(resolve(root, path), JSON.stringify(data, null, 2) + '\n')
}

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split('.').map(Number)
  switch (type) {
    case 'major': return `${major + 1}.0.0`
    case 'minor': return `${major}.${minor + 1}.0`
    case 'patch': return `${major}.${minor}.${patch + 1}`
    default: return current
  }
}

// Ler versão atual do core
const corePkg = readJSON('packages/core/package.json')
let newVersion = corePkg.version

// Processar argumento
const arg = process.argv[2]
if (arg) {
  if (['patch', 'minor', 'major'].includes(arg)) {
    newVersion = bumpVersion(corePkg.version, arg)
  } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
    newVersion = arg
  } else {
    console.error('❌ Uso: node scripts/sync-version.mjs [patch|minor|major|X.Y.Z]')
    process.exit(1)
  }
}

console.log(`\n📦 Sincronizando versão: ${corePkg.version} → ${newVersion}\n`)

// Atualizar todos os arquivos
for (const file of files) {
  const data = readJSON(file)
  const oldVersion = data.version
  data.version = newVersion
  writeJSON(file, data)
  console.log(`   ✓ ${file}: ${oldVersion} → ${newVersion}`)
}

console.log(`\n✅ Versão ${newVersion} aplicada em ${files.length} arquivos!\n`)
