export type Row = {
  label: string;
  firstMs: number;
  secondMs: number;
  thirdMS: number;
  status1: number;
  status2: number;
  status3: number;
};

const pad = (str: string, length: number) =>
  str.length >= length ? str : str + ' '.repeat(length - str.length);

export const perfFormatTable = (rows: Row[]) => {
  const headers = Object.keys(rows[0]) as (keyof Row)[];

  // 컬럼 최대 길이 계산
  const colWidths = headers.map((header) =>
    Math.max(header.length, ...rows.map((row) => String(row[header]).length)),
  );

  // 헤더
  const headerLine = headers.map((h, i) => pad(h, colWidths[i])).join(' | ');

  const separator = colWidths.map((w) => '-'.repeat(w)).join('-|-');

  // 데이터
  const dataLines = rows.map((row) =>
    headers.map((h, i) => pad(String(row[h]), colWidths[i])).join(' | '),
  );

  return ['', headerLine, separator, ...dataLines, ''].join('\n');
};
