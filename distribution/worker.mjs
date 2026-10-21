// Transport only: Nodes independently verify signatures and complete closure hashes.
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const path=url.pathname;
 if(!/^\/(stable|canary)\/manifest\.json$/.test(path)&&!/^\/(?:stable\/|canary\/)?[a-f0-9]{64}\.(nar-export|iso)$/.test(path))return new Response('Not found',{status:404});
 // Nodes resolve archive URLs relative to the channel manifest directory.
 // Both aliases refer to the same globally content-addressed R2 object.
 const isManifest=path.endsWith('/manifest.json');
 const key=isManifest?path.slice(1):path.replace(/^\/(?:stable\/|canary\/)?/,'');
 const object=await env.RELEASES.get(key,{range:request.headers});
 if(!object)return new Response('Not found',{status:404});
 const headers=new Headers();object.writeHttpMetadata(headers);
 headers.set('Content-Type',isManifest?'application/json':'application/octet-stream');
 headers.set('Cache-Control',isManifest?'no-store':'public, max-age=31536000, immutable');
 headers.set('X-Content-Type-Options','nosniff');headers.set('Accept-Ranges','bytes');headers.set('ETag',object.httpEtag);
 let status=200;
 if(request.headers.has('range')&&object.range){const {offset=0,length}=object.range;headers.set('Content-Range',`bytes ${offset}-${offset+length-1}/${object.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(object.size));
 return new Response(request.method==='HEAD'?null:object.body,{status,headers});
}};
