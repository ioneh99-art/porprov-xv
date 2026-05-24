// src/app/api/download/manual-book/route.ts
// Support PDF dan DOCX — cari yang tersedia

import { NextResponse } from 'next/server'
import { readFile, access } from 'fs/promises'
import path from 'path'

export async function GET() {
  // Coba PDF dulu, lalu DOCX
  const candidates = [
    {
      file: 'ManualBook_Dashboard_KabBogor_PORPROV_XV.pdf',
      mime: 'application/pdf',
      name: 'ManualBook_KabBogor_PORPROV_XV.pdf',
    },
    {
      file: 'ManualBook_Dashboard_KabBogor_PORPROV_XV.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      name: 'ManualBook_KabBogor_PORPROV_XV.docx',
    },
  ]

  for (const candidate of candidates) {
    try {
      const filePath = path.join(process.cwd(), 'public', 'docs', candidate.file)
      await access(filePath)
      const fileBuffer = await readFile(filePath)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': candidate.mime,
          'Content-Disposition': `attachment; filename="${candidate.name}"`,
          'Content-Length': String(fileBuffer.length),
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch {
      // coba kandidat berikutnya
      continue
    }
  }

  return NextResponse.json(
    { error: 'File manual book tidak ditemukan di public/docs/. Hubungi admin.' },
    { status: 404 }
  )
}