// src/lib/peta-ubin.ts
// Ubin peta latar untuk semua peta Leaflet di aplikasi.
//
// Sejak Oktober 2026 basemaps.cartocdn.com (CARTO) mengembalikan ubin
// bertuliskan "API KEY REQUIRED" bila diminta tanpa kunci, sehingga peta tampil
// rusak. Diganti layanan kanvas Esri yang masih terbuka tanpa kunci; tampilannya
// serupa (gelap/terang, abu-abu, tanpa warna mencolok). Atribusi wajib tampil.

import type * as Leaflet from 'leaflet'

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
export const UBIN = {
  gelap: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  terang: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
} as const
export const ATRIBUSI_UBIN = 'Peta © Esri'
/** Citra satelit Esri + lapis nama kota/batas wilayah (juga tanpa kunci). Kelas 'ubin-satelit' bisa digelapkan lewat CSS. */
const SATELIT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABEL_SATELIT = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const ATRIBUSI_SATELIT = 'Citra © Esri, Maxar, Earthstar Geographics'

/** Memasang ubin latar dan memastikan atribusinya terlihat, walau peta dibuat tanpa kontrol atribusi. */
export function pasangUbin(L: typeof Leaflet, map: Leaflet.Map, tema: keyof typeof UBIN | 'satelit') {
  let atribusi = ATRIBUSI_UBIN
  if (tema === 'satelit') {
    atribusi = ATRIBUSI_SATELIT
    L.tileLayer(SATELIT, { maxNativeZoom: 18, maxZoom: 19, attribution: atribusi, className: 'ubin-satelit' }).addTo(map)
    L.tileLayer(LABEL_SATELIT, { maxNativeZoom: 18, maxZoom: 19, className: 'ubin-label' }).addTo(map)
  } else {
    // Ubin kanvas Esri hanya tersedia sampai zoom 16; di atasnya Leaflet memperbesar ubin 16.
    L.tileLayer(UBIN[tema], { maxNativeZoom: 16, maxZoom: 19, attribution: atribusi }).addTo(map)
  }
  if (!map.attributionControl) {
    const kontrol = L.control.attribution({ prefix: false, position: 'bottomright' }).addTo(map)
    kontrol.addAttribution(atribusi)
    const el = kontrol.getContainer()
    if (el) el.style.cssText += tema !== 'terang'
      ? ';background:rgba(0,0,0,0.45);color:#9ca3af;font-size:9px'
      : ';font-size:9px'
  }
}
