import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { OUTPUT } from './build.mjs';
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PORT must be an integer from 1024 to 65535.');
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.xml':'application/xml; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.svg':'image/svg+xml' };
const server = createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405, {'Allow':'GET, HEAD'}); return res.end(); }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end('Bad request'); }
  let path = resolve(OUTPUT, '.' + pathname);
  if (path !== OUTPUT && !path.startsWith(OUTPUT + sep)) { res.writeHead(403); return res.end('Forbidden'); }
  try {
    if ((await stat(path)).isDirectory()) {
      if (!pathname.endsWith('/')) { res.writeHead(301, {'Location': encodeURI(pathname + '/')}); return res.end(); }
      path = join(path,'index.html');
    }
    const data = await readFile(path);
    res.writeHead(200, {'Content-Type':types[extname(path)] || 'application/octet-stream'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(404, {'Content-Type':'text/html; charset=utf-8'});
    try { res.end(req.method === 'HEAD' ? undefined : await readFile(join(OUTPUT,'404.html'))); }
    catch { res.end('Run npm run build first.'); }
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${port}`));
