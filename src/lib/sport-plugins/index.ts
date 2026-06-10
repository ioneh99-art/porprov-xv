/**
 * Sport Plugin System — Main Entry Point
 * 
 * Import: 
 *   import { getPluginByCaborId, getAllManifests } from '@/lib/sport-plugins'
 *   const plugin = getPluginByCaborId(67) // Pentathlon
 */

export * from './_core/types'
export * from './_core/registry'

// Re-export specific plugin utilities (backward compat)
export {
  loadUIPMBaselines,
  saveUIPMBaselines,
  calculatePentathlonTotal,
  parseTime,
  formatTime,
  fencingToPoints,
  swimmingToPoints,
  obstacleToPoints,
  laserRunToPoints,
  DEFAULT_UIPM_BASELINES,
  UIPM_BASELINES,
  type PentathlonRawScore,
  type PentathlonPointsBreakdown,
  type UIPMBaselines,
} from './pentathlon'
