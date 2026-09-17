import { spotifyTrack } from "./normalize";
let tokenCache:{token:string;expires:number}|null=null;
async function token(){
  if(tokenCache && tokenCache.expires>Date.now()+30_000) return tokenCache.token;
  const id=process.env.SPOTIFY_CLIENT_ID, secret=process.env.SPOTIFY_CLIENT_SECRET;
  if(!id||!secret) throw new Error("Spotify não configurado: adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET.");
  const r=await fetch("https://accounts.spotify.com/api/token",{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
  if(!r.ok) throw new Error("Não foi possível autenticar no Spotify."); const j=await r.json(); tokenCache={token:j.access_token,expires:Date.now()+j.expires_in*1000}; return tokenCache.token;
}
export function spotifyId(url:string){ const u=new URL(url); if(!["open.spotify.com","spotify.link"].includes(u.hostname)) return null; const m=u.pathname.match(/\/track\/([A-Za-z0-9]+)/); return m?.[1] ?? null; }
export async function resolveSpotify(url:string){ let id=spotifyId(url); if(!id && new URL(url).hostname==="spotify.link"){ const r=await fetch(url,{redirect:"follow"}); id=spotifyId(r.url); } if(!id) throw new Error("Esse link do Spotify não parece ser de uma música."); const t=await token(); const r=await fetch(`https://api.spotify.com/v1/tracks/${id}?market=BR`,{headers:{Authorization:`Bearer ${t}`},signal:AbortSignal.timeout(7000)}); if(!r.ok) throw new Error(r.status===429?"Spotify pediu para tentar novamente em instantes.":"Não encontrei essa música no Spotify."); return spotifyTrack(await r.json()); }
export async function searchSpotify(q:string){ const t=await token(); const r=await fetch(`https://api.spotify.com/v1/search?type=track&limit=8&market=BR&q=${encodeURIComponent(q)}`,{headers:{Authorization:`Bearer ${t}`},signal:AbortSignal.timeout(7000)}); if(!r.ok) throw new Error("A busca do Spotify falhou."); const j=await r.json(); return (j.tracks?.items??[]).map(spotifyTrack); }
