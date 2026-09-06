// Local-only SDK acceptance test. Never forwards requests to PostHog.
import http from 'node:http';
import {appendFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const server=http.createServer(async(req,res)=>{
 res.setHeader('Access-Control-Allow-Origin','http://localhost:3000');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
 if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
 if(req.method==='POST'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);let body=Buffer.concat(chunks);const url=new URL(req.url,'http://localhost:4318');
  try{if(req.headers['content-encoding']==='gzip'||url.searchParams.get('compression')==='gzip')body=gunzipSync(body);let raw=body.toString();if(raw.startsWith('data=')){const p=new URLSearchParams(raw);raw=Buffer.from(p.get('data'),'base64').toString();}const payload=JSON.parse(raw);for(const e of Array.isArray(payload)?payload:payload.batch??[payload]){if(e.event)appendFileSync('/private/tmp/abc-posthog-acceptance.jsonl',JSON.stringify(e)+'\n');}}
  catch(error){console.error('Could not decode test request:',String(error));res.writeHead(400);res.end('decode failed');return;}
 }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.url.includes('/flags')?{featureFlags:{},errorsWhileComputingFlags:false}:req.url.includes('config')?{autocapture_opt_out:false}:{status:1}));
});
server.listen(4318,'127.0.0.1',()=>console.log('Local analytics test collector on http://127.0.0.1:4318'));
