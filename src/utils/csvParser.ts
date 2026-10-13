import { ScheduleItem } from '../types';

/**
 * Robust RFC 4180 CSV Parser for schedU
 * - Strips UTF-8 BOM if present
 * - Handles commas inside quotes, escaped quotes (""), CRLF and LF
 * - Maps headers by name (Hari, Kelas, Kode_Mata_Kuliah, Mata_Kuliah, Mulai, Selesai, Ruangan, Dosen)
 * - PRESERVES exact column 'Ruangan' value verbatim: NO character replacement,
 *   NO case modifications, NO punctuation stripping, NO artificial fallbacks!
 */
export function parseCSV(rawText: string): ScheduleItem[] {
  if (!rawText || !rawText.trim()) {
    return [];
  }

  // 1. Remove UTF-8 BOM if present at start of stream
  let cleanText = rawText;
  if (cleanText.charCodeAt(0) === 0xFEFF) {
    cleanText = cleanText.slice(1);
  }

  // 2. Parse lines taking quotes into account
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentLine += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }

  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) {
    return [];
  }

  // 3. Parse header line to determine column mappings
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, '_'));

  function findColIndex(candidates: string[]): number {
    for (const cand of candidates) {
      const candNorm = cand.toLowerCase().replace(/[\s_-]+/g, '_');
      const idx = headers.indexOf(candNorm);
      if (idx !== -1) return idx;
    }
    for (const cand of candidates) {
      const candNorm = cand.toLowerCase().replace(/[\s_-]+/g, '_');
      const idx = headers.findIndex(h => h.includes(candNorm));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  const colHari = findColIndex(['hari', 'day']);
  const colKelas = findColIndex(['kelas', 'class']);
  const colKode = findColIndex(['kode_mata_kuliah', 'kode_mk', 'kode', 'code']);
  const colMK = findColIndex(['mata_kuliah', 'matakuliah', 'mata_kuliah_nama', 'course']);
  const colMulai = findColIndex(['mulai', 'jam_mulai', 'start', 'waktu_mulai']);
  const colSelesai = findColIndex(['selesai', 'jam_selesai', 'end', 'waktu_selesai']);
  const colRuangan = findColIndex(['ruangan', 'ruang', 'room']);
  const colDosen = findColIndex(['dosen', 'pengajar', 'lecturer']);

  const results: ScheduleItem[] = [];

  // 4. Process data rows
  for (let r = 1; r < lines.length; r++) {
    const rowValues = parseCSVLine(lines[r]);
    if (rowValues.length === 0 || rowValues.every(v => !v.trim())) {
      continue;
    }

    // Extract raw room name: MUST preserve EXACT casing, punctuation, dots, hyphens, and spaces
    const rawRuanganValue = colRuangan >= 0 && colRuangan < rowValues.length
      ? rowValues[colRuangan].trim()
      : '';

    // If there is no valid room name in this row, skip it (NEVER fabricate dummy names like 'R. Umum')
    if (!rawRuanganValue) {
      continue;
    }

    const rawHari = colHari >= 0 && colHari < rowValues.length ? rowValues[colHari].trim() : 'Senin';
    const rawKelas = colKelas >= 0 && colKelas < rowValues.length ? rowValues[colKelas].trim() : '-';
    const rawKode = colKode >= 0 && colKode < rowValues.length ? rowValues[colKode].trim() : '-';
    const rawMK = colMK >= 0 && colMK < rowValues.length ? rowValues[colMK].trim() : 'Mata Kuliah';
    const rawMulai = colMulai >= 0 && colMulai < rowValues.length ? rowValues[colMulai].trim() : '08:00';
    const rawSelesai = colSelesai >= 0 && colSelesai < rowValues.length ? rowValues[colSelesai].trim() : '10:00';
    const rawDosen = colDosen >= 0 && colDosen < rowValues.length ? rowValues[colDosen].trim() : '-';

    const normalizedHari = formatDayName(rawHari);
    const normalizedMulai = normalizeTimeString(rawMulai);
    const normalizedSelesai = normalizeTimeString(rawSelesai);

    results.push({
      id: `sched-r${r}-${encodeURIComponent(rawRuanganValue)}-${normalizedHari}-${normalizedMulai}`,
      Hari: normalizedHari,
      Kelas: rawKelas,
      Kode_Mata_Kuliah: rawKode,
      Mata_Kuliah: rawMK,
      Mulai: normalizedMulai,
      Selesai: normalizedSelesai,
      Ruangan: rawRuanganValue, // Exact string from CSV without any modification
      Dosen: rawDosen,
    });
  }

  return results;
}

export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Auto-detect delimiter: comma or semicolon
  const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(currentField.trim());
      currentField = '';
    } else {
      currentField += char;
    }
  }

  fields.push(currentField.trim());
  return fields;
}

export function normalizeTimeString(time: string): string {
  if (!time) return '08:00';
  let clean = time.trim().replace('.', ':');
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const h = match[1].padStart(2, '0');
    const m = match[2];
    return `${h}:${m}`;
  }
  return time;
}

export function formatDayName(day: string): string {
  if (!day) return 'Senin';
  const d = day.trim().toLowerCase();
  if (d.startsWith('sen')) return 'Senin';
  if (d.startsWith('sel')) return 'Selasa';
  if (d.startsWith('rab')) return 'Rabu';
  if (d.startsWith('kam')) return 'Kamis';
  if (d.startsWith('jum')) return 'Jumat';
  if (d.startsWith('sab')) return 'Sabtu';
  if (d.startsWith('min')) return 'Minggu';
  return day.charAt(0).toUpperCase() + day.slice(1);
}
