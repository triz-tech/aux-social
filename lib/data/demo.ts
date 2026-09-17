import type { Post, Profile, Track, ActivityItem } from "@/types";
const imgs=[
"https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1000&q=85",
"https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1000&q=85",
"https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1000&q=85",
"https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85",
"https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?auto=format&fit=crop&w=1000&q=85",
"https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85"
];
export const demoProfiles:Profile[]=[
{id:"demo-bia",username:"bia",display_name:"bia",bio:"música, memória e opiniões excessivamente específicas.",avatar_url:imgs[0]},
{id:"demo-lu",username:"lu",display_name:"Lu",bio:"ouvindo primeiro, pensando depois.",avatar_url:imgs[1]},
{id:"demo-duda",username:"duda",display_name:"Duda",bio:"essa merece replay.",avatar_url:imgs[2]}
];
const tracks:Track[]=[
{id:"t1",provider:"spotify",provider_track_id:"demo1",title:"Pink + White",artist:"Frank Ocean",album:"Blonde",artwork_url:imgs[3],source_url:"https://open.spotify.com/",spotify_url:"https://open.spotify.com/"},
{id:"t2",provider:"apple",provider_track_id:"demo2",title:"Eyes on Fire",artist:"Blue Foundation",album:"Life of a Ghost",artwork_url:imgs[4],source_url:"https://music.apple.com/",apple_music_url:"https://music.apple.com/"},
{id:"t3",provider:"deezer",provider_track_id:"demo3",title:"All Night",artist:"Beyoncé",album:"Lemonade",artwork_url:imgs[5],source_url:"https://deezer.com/",deezer_url:"https://deezer.com/"}
];
function media(id:string,url:string,pos:number){return {id,storage_path:url,public_url:url,position:pos,width:1200,height:1500,aspect_ratio:.8}}
export const demoPosts:Post[]=[
{id:"p1",type:"review",body:"Essa música parece existir naquele segundo em que você percebe que não superou absolutamente nada — mas a produção é tão bonita que tudo bem.",rating:4.5,trend:"late night",created_at:new Date(Date.now()-15*60e3).toISOString(),author:demoProfiles[0],track:tracks[0],media:[],counts:{likes:24,comments:6,reposts:2}},
{id:"p2",type:"memory",body:"essa foi a melhor música da noite. ninguém sabia a letra inteira e isso não impediu absolutamente ninguém.",rating:null,trend:null,created_at:new Date(Date.now()-2*3600e3).toISOString(),author:demoProfiles[1],track:tracks[1],media:[media("m1",imgs[2],0),media("m2",imgs[0],1),media("m3",imgs[1],2)],counts:{likes:41,comments:9,reposts:4}},
{id:"p3",type:"review",body:"O tipo de faixa que cresce toda vez que volta. Hoje: cinco estrelas sem discussão.",rating:5,trend:"replay",created_at:new Date(Date.now()-22*3600e3).toISOString(),author:demoProfiles[2],track:tracks[2],media:[],counts:{likes:17,comments:3,reposts:1}}
];
export const demoActivity:ActivityItem[]=[
{id:"a1",type:"like",created_at:new Date(Date.now()-8*60e3).toISOString(),actor:demoProfiles[1],post_id:"p1"},
{id:"a2",type:"comment",created_at:new Date(Date.now()-50*60e3).toISOString(),actor:demoProfiles[2],post_id:"p1"},
{id:"a3",type:"follow",created_at:new Date(Date.now()-3*3600e3).toISOString(),actor:demoProfiles[1]}
];
