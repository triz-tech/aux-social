import { Suspense } from "react"; import MusicComposer from "@/components/composer/MusicComposer";
export default function NewPage(){return <Suspense fallback={<div className="shell"><p>abrindo…</p></div>}><MusicComposer/></Suspense>}
