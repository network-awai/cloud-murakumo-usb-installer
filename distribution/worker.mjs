// Transport only: Nodes independently verify signatures and complete closure hashes.
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const path=url.pathname;
 if(!/^\/(stable|canary)\/manifest\.json$/.test(path)&&!/^\/[a-f0-9]{64}\.(nar-export|iso)$/.test(path))return new Response('Not found',{status:404});
 const key=path.slice(1),isManifest=key.endsWith('manifest.json');
 const object=await env.RELEASES.get(key,{range:request.headers});
 if(!object)return new Response('Not found',{status:404});
 const headers=new Headers();object.writeHttpMetadata(headers);
 headers.set('Content-Type',isManifest?'application/json':'application/octet-stream');
 headers.set('Cache-Control',isManifest?'no-store':'public, max-age=31536000, immutable');
 headers.set('X-Content-Type-Options','nosniff');headers.set('Accept-Ranges','bytes');headers.set('ETag',object.httpEtag);
 let status=200;
 if(object.range){const {offset=0,length}=object.range;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(object.size));
 return new Response(request.method==='HEAD'?null:object.body,{status,headers});
}};
