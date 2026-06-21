import { promises as fs } from 'fs';
import path from 'path';

/**
 * Read a policy markdown file from /content.
 *
 * Returns the raw markdown string; rendering happens in <PolicyDoc> via
 * react-markdown. Swapping in the real legal text means editing the
 * content/*.md files only — no code change in this lib or the routes.
 */
export async function readPolicyContent(name: 'privacy' | 'terms'): Promise<string> {
  const file = path.join(process.cwd(), 'content', `${name}.md`);
  return fs.readFile(file, 'utf8');
}
