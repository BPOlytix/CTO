import { spawnSync } from 'child_process';

/**
 * Executes a SQL query using the team-db CLI.
 * Supports parameterized queries by replacing '?' with escaped values.
 */
export function query(sql: string, params: any[] = []): any {
  let i = 0;
  const formattedSql = sql.replace(/\?/g, () => {
    const param = params[i++];
    if (param === null || param === undefined) return 'NULL';
    if (typeof param === 'number') return param.toString();
    if (typeof param === 'boolean') return param ? '1' : '0';
    if (typeof param === 'string') return `'${param.replace(/'/g, "''")}'`;
    if (param instanceof Date) return `'${param.toISOString()}'`;
    if (typeof param === 'object') return `'${JSON.stringify(param).replace(/'/g, "''")}'`;
    return param.toString();
  });

  const { stdout, stderr, status } = spawnSync('team-db', [formattedSql]);
  const result = stdout?.toString();

  if (status !== 0) {
    console.error(`team-db error: ${stderr?.toString()}`);
  }

  if (!result) return [];

  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}
