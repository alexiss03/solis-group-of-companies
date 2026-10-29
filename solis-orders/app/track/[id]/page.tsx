import { TrackingPage } from '../../portal';
import { notFound } from 'next/navigation';
export default async function TrackPage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[a-f0-9-]{36}$/.test(id))notFound();return <TrackingPage id={id}/>;}
