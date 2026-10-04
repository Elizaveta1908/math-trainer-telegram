exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: JSON.stringify({error:'Method not allowed'}) };
  try {
    const { kind, mime, data, remove } = JSON.parse(event.body || '{}');
    if (!['good','bad'].includes(kind)) return {statusCode:400, body:JSON.stringify({error:'Invalid kind'})};
    const base = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!base || !key) return {statusCode:500, body:JSON.stringify({error:'Supabase server variables are not configured'})};
    const path = `settings/${kind}.png`;
    const url = `${base}/storage/v1/object/${encodeURIComponent('trainer-cats')}/${path}`;
    const headers = { Authorization:`Bearer ${key}`, apikey:key };
    if (remove) {
      const r = await fetch(url,{method:'DELETE',headers});
      if (!r.ok && r.status!==404) throw new Error(await r.text());
      return {statusCode:200,body:JSON.stringify({ok:true})};
    }
    if (!data || !mime || !mime.startsWith('image/')) return {statusCode:400,body:JSON.stringify({error:'Image required'})};
    const buf = Buffer.from(data,'base64');
    if (buf.length > 2*1024*1024) return {statusCode:400,body:JSON.stringify({error:'File too large'})};
    const r = await fetch(url,{method:'PUT',headers:{...headers,'Content-Type':mime,'x-upsert':'true','cache-control':'0'},body:buf});
    if (!r.ok) throw new Error(await r.text());
    return {statusCode:200,body:JSON.stringify({ok:true,url:`${base}/storage/v1/object/public/trainer-cats/${path}`})};
  } catch (e) { return {statusCode:500,body:JSON.stringify({error:e.message||'Upload failed'})}; }
};
