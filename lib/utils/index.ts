export function cn(...v: Array<string | false | null | undefined>) { return v.filter(Boolean).join(" "); }
export function timeAgo(value: string) { const d=(Date.now()-new Date(value).getTime())/1000; if(d<60)return "agora"; if(d<3600)return `${Math.floor(d/60)} min`; if(d<86400)return `${Math.floor(d/3600)} h`; return `${Math.floor(d/86400)} d`; }
export function safeHttpUrl(value: string) { try { const u=new URL(value); return u.protocol === "https:" || u.protocol === "http:" ? u : null; } catch { return null; } }
export function extractSharedUrl(text: string) { return text.match(/https?:\/\/[^\s]+/)?.[0] ?? ""; }
