// Temporary, signature-authorized publishing tool; removed after publication.
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
export default {async fetch(req,env){try {
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const encoded=req.headers.get('X-AiueOS-Ticket')||'',sig=req.headers.get('X-AiueOS-Signature')||'';
 if(encoded.length>16384||sig.length!==88)return new Response('Unauthorized',{status:403});
 const ticketBytes=decode(encoded),t=JSON.parse(new TextDecoder().decode(ticketBytes));
 const key=await crypto.subtle.importKey('raw',decode(env.PUBLIC_KEY),'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,decode(sig),ticketBytes)||t.schema!=='aiueos.upload.v1'||!Number.isSafeInteger(t.expiresAt)||t.expiresAt<Date.now()||t.expiresAt>Date.now()+600000||!JSON.parse(env.ALLOWED_KEYS).includes(t.key))return new Response('Unauthorized',{status:403});
 if(!['create','part','complete','abort'].includes(t.op))throw Error('invalid operation');
 const body=await req.arrayBuffer();if(body.byteLength>33554432||body.byteLength!==t.bytes||hex(await crypto.subtle.digest('SHA-256',body))!==t.bodySha256)throw Error('body mismatch');
 let result;
 if(t.op==='create'){const upload=await env.RELEASES.createMultipartUpload(t.key);result={uploadId:upload.uploadId};}
 else {if(typeof t.uploadId!=='string'||t.uploadId.length>1024)throw Error('invalid upload');const upload=env.RELEASES.resumeMultipartUpload(t.key,t.uploadId);
  if(t.op==='part'){if(!Number.isSafeInteger(t.partNumber)||t.partNumber<1||t.partNumber>10000)throw Error('invalid part');result=await upload.uploadPart(t.partNumber,body);}
  if(t.op==='complete'){const parts=JSON.parse(new TextDecoder().decode(body));if(!Array.isArray(parts)||parts.length>10000||parts.some((p,i)=>p.partNumber!==i+1||typeof p.etag!=='string'))throw Error('invalid parts');const o=await upload.complete(parts);result={key:o.key,size:o.size,etag:o.etag};}
  if(t.op==='abort'){await upload.abort();result={aborted:true};}
 }
 return Response.json(result);
 }catch(e){return Response.json({error:e.message},{status:400});}}};
