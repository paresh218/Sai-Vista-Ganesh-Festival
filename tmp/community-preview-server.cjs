const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=process.cwd();
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.mp4':'video/mp4'};
http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const p=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(p,(e,b)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');res.end(b);});}).listen(8911,'127.0.0.1');
