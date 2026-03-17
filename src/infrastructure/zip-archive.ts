const CRC32_TABLE = buildCrc32Table();

export interface ZipArchiveEntry {
  path: string;
  content?: string;
  directory?: boolean;
}

interface NormalizedZipEntry {
  path: string;
  nameBytes: Buffer;
  data: Buffer;
  crc32: number;
  isDirectory: boolean;
}

export function createZipArchive(entries: ZipArchiveEntry[]): Buffer {
  const normalized = normalizeEntries(entries);
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of normalized) {
    const localHeader = createLocalFileHeader(entry);
    localParts.push(localHeader, entry.data);

    const centralHeader = createCentralDirectoryHeader(entry, offset);
    centralParts.push(centralHeader);
    offset += localHeader.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = createEndOfCentralDirectoryRecord(normalized.length, centralDirectory.length, offset);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function normalizeEntries(entries: ZipArchiveEntry[]): NormalizedZipEntry[] {
  return entries.map((entry) => {
    const normalizedPath = normalizePath(entry.path, Boolean(entry.directory));
    const nameBytes = Buffer.from(normalizedPath, "utf8");
    const data = entry.directory ? Buffer.alloc(0) : Buffer.from(entry.content ?? "", "utf8");

    return {
      path: normalizedPath,
      nameBytes,
      data,
      crc32: entry.directory ? 0 : crc32(data),
      isDirectory: Boolean(entry.directory)
    } satisfies NormalizedZipEntry;
  });
}

function normalizePath(value: string, directory: boolean): string {
  const sanitized = value
    .replace(/\\+/g, "/")
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/[^a-zA-Z0-9._-]+/g, "-"))
    .join("/");

  if (!sanitized) {
    throw new Error("ZIP entry path cannot be empty.");
  }

  return directory && !sanitized.endsWith("/") ? `${sanitized}/` : sanitized;
}

function createLocalFileHeader(entry: NormalizedZipEntry): Buffer {
  const header = Buffer.alloc(30 + entry.nameBytes.length);
  let cursor = 0;

  cursor = writeUInt32(header, 0x04034b50, cursor);
  cursor = writeUInt16(header, 20, cursor);
  cursor = writeUInt16(header, 0x0800, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt16(header, dosTime(), cursor);
  cursor = writeUInt16(header, dosDate(), cursor);
  cursor = writeUInt32(header, entry.crc32, cursor);
  cursor = writeUInt32(header, entry.data.length, cursor);
  cursor = writeUInt32(header, entry.data.length, cursor);
  cursor = writeUInt16(header, entry.nameBytes.length, cursor);
  cursor = writeUInt16(header, 0, cursor);
  entry.nameBytes.copy(header, cursor);
  return header;
}

function createCentralDirectoryHeader(entry: NormalizedZipEntry, localHeaderOffset: number): Buffer {
  const header = Buffer.alloc(46 + entry.nameBytes.length);
  let cursor = 0;

  cursor = writeUInt32(header, 0x02014b50, cursor);
  cursor = writeUInt16(header, 20, cursor);
  cursor = writeUInt16(header, 20, cursor);
  cursor = writeUInt16(header, 0x0800, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt16(header, dosTime(), cursor);
  cursor = writeUInt16(header, dosDate(), cursor);
  cursor = writeUInt32(header, entry.crc32, cursor);
  cursor = writeUInt32(header, entry.data.length, cursor);
  cursor = writeUInt32(header, entry.data.length, cursor);
  cursor = writeUInt16(header, entry.nameBytes.length, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt16(header, 0, cursor);
  cursor = writeUInt32(header, entry.isDirectory ? 0x10 : 0, cursor);
  cursor = writeUInt32(header, localHeaderOffset, cursor);
  entry.nameBytes.copy(header, cursor);
  return header;
}

function createEndOfCentralDirectoryRecord(entryCount: number, centralDirectorySize: number, centralDirectoryOffset: number): Buffer {
  const record = Buffer.alloc(22);
  let cursor = 0;

  cursor = writeUInt32(record, 0x06054b50, cursor);
  cursor = writeUInt16(record, 0, cursor);
  cursor = writeUInt16(record, 0, cursor);
  cursor = writeUInt16(record, entryCount, cursor);
  cursor = writeUInt16(record, entryCount, cursor);
  cursor = writeUInt32(record, centralDirectorySize, cursor);
  cursor = writeUInt32(record, centralDirectoryOffset, cursor);
  writeUInt16(record, 0, cursor);
  return record;
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDate(date = new Date()): number {
  const year = Math.max(1980, date.getFullYear());
  return ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
}

function dosTime(date = new Date()): number {
  return (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
}

function writeUInt16(buffer: Buffer, value: number, offset: number): number {
  buffer.writeUInt16LE(value & 0xffff, offset);
  return offset + 2;
}

function writeUInt32(buffer: Buffer, value: number, offset: number): number {
  buffer.writeUInt32LE(value >>> 0, offset);
  return offset + 4;
}
