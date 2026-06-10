/**
 * Sport Plugin Registry
 * 
 * Central place untuk register & lookup semua sport plugins.
 * Bikin cabor baru → tambah import di registerAllPlugins().
 */

import type { SportPlugin, SportPluginManifest } from './types'

const REGISTRY = new Map<string, SportPlugin>()
const BY_CABOR_ID = new Map<number, SportPlugin>()

let registered = false

/**
 * Register a sport plugin
 */
export function registerPlugin(plugin: SportPlugin) {
  const kode = plugin.manifest.kode.toUpperCase()
  REGISTRY.set(kode, plugin)
  BY_CABOR_ID.set(plugin.manifest.cabor_id, plugin)
  console.log(`[SportPlugin] Registered: ${kode} (cabor_id=${plugin.manifest.cabor_id})`)
}

/**
 * Get plugin by kode (e.g. "PENTATHLON")
 */
export function getPlugin(kode: string): SportPlugin | undefined {
  ensureRegistered()
  return REGISTRY.get(kode.toUpperCase())
}

/**
 * Get plugin by cabor_id (most common lookup)
 */
export function getPluginByCaborId(cabor_id: number): SportPlugin | undefined {
  ensureRegistered()
  return BY_CABOR_ID.get(cabor_id)
}

/**
 * Get all registered plugins (for catalog page)
 */
export function getAllPlugins(): SportPlugin[] {
  ensureRegistered()
  return Array.from(REGISTRY.values())
}

/**
 * Get plugin manifests only (for sidebar/menu generation, no scoring logic)
 */
export function getAllManifests(): SportPluginManifest[] {
  return getAllPlugins().map(p => p.manifest)
}

/**
 * Auto-register on first access — lazy init pattern
 */
function ensureRegistered() {
  if (registered) return
  registered = true
  registerAllPlugins()
}

/**
 * Register all plugins here. Tambah cabor baru → tambah import + registerPlugin call.
 */
function registerAllPlugins() {
  try {
    // Import inside function to avoid circular dep at module init
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pentathlon = require('../pentathlon').default
    registerPlugin(pentathlon)
  } catch (e) {
    console.warn('[SportPlugin] Pentathlon plugin not loaded:', e)
  }

  // Future plugins (tambah di sini):
  // const senam = require('../senam').default
  // registerPlugin(senam)
  //
  // const loncatIndah = require('../loncat-indah').default
  // registerPlugin(loncatIndah)
}
