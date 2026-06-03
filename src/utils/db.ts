import { execSync } from 'child_process';

export function query(sql: string): any {
  const result = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`).toString();
  try {
    return JSON.parse(result);
  } catch {
    return result;
  }
}
