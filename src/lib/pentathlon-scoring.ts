/**
 * Backward compatibility shim.
 * 
 * lib/pentathlon-scoring.ts → re-exports dari sport-plugins/pentathlon
 * Sehingga import `from '@/lib/pentathlon-scoring'` di code lama tetap jalan.
 * 
 * Migrasi bertahap: code baru import dari '@/lib/sport-plugins'
 */

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
} from './sport-plugins/pentathlon'
