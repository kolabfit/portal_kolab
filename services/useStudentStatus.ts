import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { StudentMemberOverview } from '../types';
export function useStudentStatus(identity: string | null) {
 const [state,setState]=useState<{identity:string|null;data:StudentMemberOverview|null;loading:boolean;error:boolean}>({identity:null,data:null,loading:true,error:false});
 const [revision,setRevision]=useState(0);
 const retry=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{
  const controller=new AbortController();
  setState({identity,data:null,loading:Boolean(identity),error:false});
  if(identity) api.getStudentStatus(controller.signal).then(data=>{
   if(!controller.signal.aborted) setState({identity,data,loading:false,error:false});
  }).catch(()=>{if(!controller.signal.aborted) setState({identity,data:null,loading:false,error:true});});
  return ()=>controller.abort();
 },[identity,revision]);
 return {...(state.identity===identity?state:{data:null,loading:true,error:false}),retry};
}
export type StudentStatusState=ReturnType<typeof useStudentStatus>;
