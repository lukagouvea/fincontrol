/**
 * Leitura de extratos no navegador (o arquivo não sai do aparelho).
 * OFX: SGML (sem tags de fechamento) e XML. CSV: separador, cabeçalho,
 * datas e números no formato brasileiro ou internacional.
 */

/** Lançamento como veio do arquivo: valor com o sinal do banco. */
export type RawItem = { date: string; description: string; amount: number };

export class ImportError extends Error {}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Conteúdo do arquivo; FileReader quando `File.arrayBuffer` não existe (navegadores antigos). */
export function readFileBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/** UTF-8; se aparecer caractere inválido, tenta Windows-1252 (comum em bancos). */
export function decode(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8.replace(/^﻿/, "");
  return new TextDecoder("windows-1252").decode(buffer);
}

/** "1.234,56", "-1234.56", "R$ 1.234,56", "(12,30)", "12,30 D" → número com sinal. */
export function parseAmount(raw: string): number | null {
  let text = raw.trim();
  if (!text) return null;
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  // "123,45 D" (débito) / "123,45 C" (crédito)
  const suffix = text.match(/^(.*\d)\s*([DC])$/i);
  if (suffix) {
    if (suffix[2].toUpperCase() === "D") negative = true;
    text = suffix[1];
  }
  text = text.replace(/R\$|\s/g, "");
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.endsWith("-")) {
    negative = !negative;
    text = text.slice(0, -1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  }
  if (!/^[\d.,]+$/.test(text)) return null;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  let normalized: string;
  if (lastComma > lastDot) normalized = text.replace(/\./g, "").replace(",", ".");
  else if (lastDot > lastComma) {
    // "1.234" sem vírgula pode ser milhar brasileiro: 3 dígitos depois do ponto.
    const decimals = text.length - lastDot - 1;
    normalized = lastComma === -1 && decimals === 3 && /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, "") : text.replace(/,/g, "");
  } else normalized = text;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return negative ? -value : value;
}

/** dd/mm/aaaa, dd/mm/aa, aaaa-mm-dd, dd-mm-aaaa, aaaammdd → 'YYYY-MM-DD'. */
export function parseDate(raw: string): string | null {
  const text = raw.trim();
  let year: number, month: number, day: number;
  let m: RegExpMatchArray | null;
  if ((m = text.match(/^(\d{4})-(\d{2})-(\d{2})/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) {
    day = Number(m[1]);
    month = Number(m[2]);
    year = Number(m[3]);
    if (year < 100) year += 2000;
  } else if ((m = text.match(/^(\d{4})(\d{2})(\d{2})/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const tagValue = (block: string, tag: string) => {
  const match = block.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
  return match ? match[1].trim() : "";
};

export function parseOfx(text: string): RawItem[] {
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((part) => part.split(/<\/STMTTRN>/i)[0]);
  if (!blocks.length) throw new ImportError("Não encontrei lançamentos neste OFX.");
  const items: RawItem[] = [];
  for (const block of blocks) {
    const date = parseDate(tagValue(block, "DTPOSTED"));
    const amount = parseAmount(tagValue(block, "TRNAMT").replace(",", "."));
    const description = (tagValue(block, "MEMO") || tagValue(block, "NAME")).replace(/\s+/g, " ");
    if (date && amount !== null && amount !== 0 && description) items.push({ date, description: decodeEntities(description), amount });
  }
  return items;
}

const decodeEntities = (text: string) =>
  text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** Divide uma linha CSV respeitando aspas ("a;b" e aspas duplicadas). */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function detectDelimiter(lines: string[]) {
  const candidates = [";", ",", "\t", "|"];
  let best = ",";
  let bestScore = -1;
  for (const candidate of candidates) {
    const counts = lines.slice(0, 10).map((line) => splitCsvLine(line, candidate).length);
    const consistent = counts.filter((count) => count === counts[0] && count > 1).length;
    const score = consistent * counts[0];
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

const HEADERS = {
  date: /^(data|date|dt|dia)\b|data (da )?(compra|transa|lan|mov)/i,
  description: /(descri|hist[oó]rico|estabelecimento|title|t[ií]tulo|lan[cç]amento|memo|nome|detalhe)/i,
  amount: /^(valor|amount|value|quantia|montante)\b|valor \(r\$\)|valor em r\$/i,
  credit: /(cr[eé]dito|entrada)/i,
  debit: /(d[eé]bito|sa[ií]da)/i,
};

/** Linhas de saldo/total que não são lançamentos. */
const SKIP = /^(saldo|total|saldo anterior|saldo do dia|s a l d o)\b/i;

export function parseCsv(text: string): RawItem[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 1) throw new ImportError("O arquivo está vazio.");
  const delimiter = detectDelimiter(lines);
  const rows = lines.map((line) => splitCsvLine(line, delimiter));

  // Cabeçalho: primeira linha (até a 10ª) com coluna de data e de valor/descrição.
  let headerIndex = -1;
  let columns: { date: number; description: number; amount: number; credit: number; debit: number } | null = null;
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const cells = rows[i];
    const find = (pattern: RegExp, exclude: number[] = []) => cells.findIndex((cell, j) => !exclude.includes(j) && pattern.test(cell));
    const date = find(HEADERS.date);
    if (date === -1) continue;
    const description = find(HEADERS.description, [date]);
    const amount = find(HEADERS.amount, [date, description]);
    const credit = find(HEADERS.credit, [date, description, amount]);
    const debit = find(HEADERS.debit, [date, description, amount, credit]);
    if (description !== -1 && (amount !== -1 || (credit !== -1 && debit !== -1))) {
      headerIndex = i;
      columns = { date, description, amount, credit, debit };
      break;
    }
  }

  // Sem cabeçalho: deduz pelas primeiras linhas (data, texto, número).
  if (!columns) {
    const sample = rows.slice(0, 20);
    const width = Math.max(...sample.map((row) => row.length));
    const share = (test: (cell: string) => boolean, j: number) => sample.filter((row) => row[j] && test(row[j])).length / sample.length;
    let date = -1, amount = -1, description = -1;
    for (let j = 0; j < width; j += 1) if (date === -1 && share((c) => parseDate(c) !== null, j) > 0.6) date = j;
    for (let j = width - 1; j >= 0; j -= 1) if (amount === -1 && j !== date && share((c) => parseAmount(c) !== null && /\d/.test(c), j) > 0.6) amount = j;
    let bestLength = 0;
    for (let j = 0; j < width; j += 1) {
      if (j === date || j === amount) continue;
      const length = sample.reduce((sum, row) => sum + (row[j]?.length ?? 0), 0);
      if (length > bestLength) {
        bestLength = length;
        description = j;
      }
    }
    if (date === -1 || amount === -1 || description === -1)
      throw new ImportError("Não reconheci as colunas de data, descrição e valor neste CSV.");
    columns = { date, description, amount, credit: -1, debit: -1 };
  }

  const items: RawItem[] = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const date = parseDate(row[columns.date] ?? "");
    const description = (row[columns.description] ?? "").replace(/\s+/g, " ").trim();
    let amount: number | null;
    if (columns.amount !== -1) amount = parseAmount(row[columns.amount] ?? "");
    else {
      const credit = parseAmount(row[columns.credit] ?? "") ?? 0;
      const debit = parseAmount(row[columns.debit] ?? "") ?? 0;
      amount = Math.abs(credit) - Math.abs(debit);
    }
    if (!date || amount === null || amount === 0 || !description || SKIP.test(description)) continue;
    items.push({ date, description, amount });
  }
  return items;
}

/** Lê o arquivo pelo conteúdo (OFX tem <OFX> ou <STMTTRN>), não só pela extensão. */
export function parseStatement(text: string): { items: RawItem[]; format: "ofx" | "csv" } {
  const format = /<OFX>|<STMTTRN>/i.test(text) ? "ofx" : "csv";
  const items = format === "ofx" ? parseOfx(text) : parseCsv(text);
  if (!items.length) throw new ImportError("Não encontrei lançamentos neste arquivo.");
  return { items, format };
}
