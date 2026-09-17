import type { Profile } from "@/types";
export default function Avatar({profile}:{profile:Profile}){return profile.avatar_url?<img className="avatar" src={profile.avatar_url} alt={`Foto de ${profile.display_name}`}/>:<div className="avatar" aria-label={`Avatar de ${profile.display_name}`}/>}
