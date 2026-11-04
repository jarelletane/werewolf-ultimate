export type Team='village'|'wolf'|'neutral';
export type RoleId='villager'|'werewolf'|'alpha'|'seer'|'doctor'|'witch'|'hunter'|'bodyguard'|'detective'|'priest'|'tough'|'silencer'|'serial'|'jester'|'apprentice'|'cupid';
export type Ability='kill'|'inspect'|'protect'|'heal'|'poison'|'silence'|'link'|'none';
export type Role={id:RoleId;name:string;team:Team;description:string;ability:Ability;night:boolean;unique?:boolean};
export const ROLES:Role[]=[
{id:'villager',name:'Villager',team:'village',description:'Find the wolves through discussion and voting.',ability:'none',night:false},
{id:'werewolf',name:'Werewolf',team:'wolf',description:'Wake with the pack and select a victim each night.',ability:'kill',night:true},
{id:'alpha',name:'Alpha Wolf',team:'wolf',description:'A wolf with a special title; votes with the pack.',ability:'kill',night:true,unique:true},
{id:'seer',name:'Seer',team:'village',description:'Inspect one player each night to learn whether they are wolf-aligned.',ability:'inspect',night:true,unique:true},
{id:'doctor',name:'Doctor',team:'village',description:'Protect one player each night from a wolf attack.',ability:'protect',night:true,unique:true},
{id:'witch',name:'Witch',team:'village',description:'Has one healing potion and one poison potion for the entire game.',ability:'heal',night:true,unique:true},
{id:'hunter',name:'Hunter',team:'village',description:'When eliminated, choose one living player to take down.',ability:'none',night:false,unique:true},
{id:'bodyguard',name:'Bodyguard',team:'village',description:'Protect one player from an attack each night.',ability:'protect',night:true,unique:true},
{id:'detective',name:'Detective',team:'village',description:'Inspect a player for their exact role each night.',ability:'inspect',night:true,unique:true},
{id:'priest',name:'Priest',team:'village',description:'A villager with no night action in this ruleset.',ability:'none',night:false,unique:true},
{id:'tough',name:'Tough Villager',team:'village',description:'Survives the first wolf attack against them.',ability:'none',night:false,unique:true},
{id:'silencer',name:'Silencer',team:'wolf',description:'Choose a player to silence during the next day.',ability:'silence',night:true,unique:true},
{id:'serial',name:'Serial Killer',team:'neutral',description:'Kills one player each night. Wins if the last survivor.',ability:'kill',night:true,unique:true},
{id:'jester',name:'Jester',team:'neutral',description:'Wins personally if eliminated by daytime vote.',ability:'none',night:false,unique:true},
{id:'apprentice',name:'Apprentice Seer',team:'village',description:'Takes over Seer investigations after the Seer dies.',ability:'none',night:false,unique:true},
{id:'cupid',name:'Cupid',team:'village',description:'On the first night, link two lovers; if one dies, the other dies.',ability:'link',night:true,unique:true}
];
export type Player={id:string;name:string;role:RoleId;alive:boolean;shieldUsed?:boolean};
export type Action={actor:string;type:Ability;target:string;secondary?:string};
export type Phase='setup'|'night'|'day'|'vote'|'ended';
export type Game={players:Player[];phase:Phase;round:number;step:number;actions:Action[];votes:Record<string,string>;history:string[];potions:{heal:boolean;poison:boolean};lovers:[string,string]|null;silenced:string[];winner:string|null;pendingHunter:string|null;nightResult:string[];settings:{discussion:number;night:number;vote:number;revealRoles:boolean}};
export const initialGame=():Game=>({players:[],phase:'setup',round:1,step:0,actions:[],votes:{},history:[],potions:{heal:true,poison:true},lovers:null,silenced:[],winner:null,pendingHunter:null,nightResult:[],settings:{discussion:300,night:45,vote:90,revealRoles:false}});
export const roleOf=(id:RoleId)=>ROLES.find(r=>r.id===id)!;
export const alive=(g:Game)=>g.players.filter(p=>p.alive);
export function nightSteps(g:Game):{key:string;name:string;ability:Ability;actors:Player[];prompt:string}[]{
 const active=alive(g);const wolves=active.filter(p=>roleOf(p.role).team==='wolf'&&p.role!=='silencer');
 const step=(key:string,name:string,ability:Ability,actors:Player[],prompt:string)=>({key,name,ability,actors,prompt});
 const items=[step('wolves','The Wolf Pack','kill',wolves,'Werewolves, open your eyes. Choose one soul to disappear before dawn.'),step('serial','The Serial Killer','kill',active.filter(p=>p.role==='serial'),'A lone shadow stalks the village. Choose your victim.'),step('seer','The Seer','inspect',active.filter(p=>p.role==='seer'||(p.role==='apprentice'&&!active.some(q=>q.role==='seer'))),'Seer, open your eyes. Whose secrets will you uncover?'),step('detective','The Detective','inspect',active.filter(p=>p.role==='detective'),'Detective, wake and choose a player whose identity you wish to uncover.'),step('doctor','The Doctor','protect',active.filter(p=>p.role==='doctor'),'Doctor, choose a soul to shelter from the darkness.'),step('bodyguard','The Bodyguard','protect',active.filter(p=>p.role==='bodyguard'),'Bodyguard, choose someone to protect tonight.'),step('witch','The Witch','heal',active.filter(p=>p.role==='witch'),'Witch, your potions await. Save one life, poison another, or do nothing.'),step('silencer','The Silencer','silence',active.filter(p=>p.role==='silencer'),'Silencer, choose whose voice shall be stolen at sunrise.'),step('cupid','Cupid','link',g.round===1?active.filter(p=>p.role==='cupid'):[],'Cupid, choose two souls whose fates will be forever entwined.')];
 return items.filter(s=>s.actors.length>0);
}
export function checkWinner(g:Game):string|null{
 const a=alive(g),wolves=a.filter(p=>roleOf(p.role).team==='wolf').length,village=a.filter(p=>roleOf(p.role).team==='village').length,serial=a.filter(p=>p.role==='serial').length;
 if(serial===1&&a.length===1)return 'Serial Killer';
 if(serial>0)return null;
 if(wolves===0)return 'Village';
 if(wolves>=village)return 'Werewolves';
 return null;
}
export function eliminate(g:Game,ids:string[],cause:string):Game{
 const dead=new Set(ids);let changed=true;
 while(changed){changed=false;if(g.lovers&&g.lovers.some(id=>dead.has(id))){for(const id of g.lovers)if(!dead.has(id)){dead.add(id);changed=true;}}}
 const fallen=g.players.filter(p=>dead.has(p.id)&&p.alive);const players=g.players.map(p=>dead.has(p.id)?{...p,alive:false}:p);
 const pendingHunter=fallen.find(p=>p.role==='hunter')?.id??g.pendingHunter;
 const next:Game={...g,players,history:[...g.history,`${cause}: ${fallen.map(p=>p.name).join(', ')||'Nobody'}`],pendingHunter};
 const winner=pendingHunter?null:checkWinner(next);return {...next,winner,phase:winner?'ended':next.phase};
}
export function resolveNight(g:Game):Game{
 const protection=new Set(g.actions.filter(a=>a.type==='protect').map(a=>a.target));
 const heals=new Set(g.actions.filter(a=>a.type==='heal').map(a=>a.target));
 const attacks=g.actions.filter(a=>a.type==='kill'||a.type==='poison');const dead=new Set<string>();let players=g.players.map(p=>({...p}));
 for(const a of attacks){const victim=players.find(p=>p.id===a.target&&p.alive);if(!victim)continue;
  if(a.type==='kill'&&(protection.has(a.target)||heals.has(a.target)))continue;
  if(a.type==='kill'&&victim.role==='tough'&&!victim.shieldUsed){victim.shieldUsed=true;continue;}
  dead.add(a.target);
 }
 let result={...g,players,nightResult:[] as string[],silenced:g.actions.filter(a=>a.type==='silence').map(a=>a.target),potions:{heal:g.potions.heal&&!g.actions.some(a=>a.type==='heal'),poison:g.potions.poison&&!g.actions.some(a=>a.type==='poison')}};
 const link=g.actions.find(a=>a.type==='link');if(link?.secondary)result={...result,lovers:[link.target,link.secondary]};
 result=eliminate(result,[...dead],'Night '+g.round);
 const fallen=result.players.filter(p=>!p.alive&&g.players.some(old=>old.id===p.id&&old.alive));
 return {...result,phase:result.winner?'ended':'day',step:0,actions:[],votes:{},nightResult:fallen.map(p=>p.name)};
}
export function resolveVote(g:Game):Game{
 const counts:Record<string,number>={};for(const [voter,target] of Object.entries(g.votes))if(g.players.some(p=>p.id===voter&&p.alive)&&g.players.some(p=>p.id===target&&p.alive))counts[target]=(counts[target]||0)+1;
 const max=Math.max(0,...Object.values(counts));const leaders=Object.keys(counts).filter(id=>counts[id]===max);if(max===0||leaders.length!==1)return {...g,history:[...g.history,'Day '+g.round+': vote tied or no votes; no elimination'],phase:'night',round:g.round+1,step:0,votes:{},actions:[],silenced:[]};
 const target=leaders[0],jester=g.players.find(p=>p.id===target)?.role==='jester';let next=eliminate(g,[target],'Day '+g.round+' vote');
 if(jester)next={...next,winner:'Jester',phase:'ended'};
 return {...next,phase:next.winner?'ended':next.pendingHunter?'vote':'night',round:next.winner||next.pendingHunter?g.round:g.round+1,step:0,votes:{},actions:[],silenced:[]};
}
export function randomRoles(names:string[],counts:Partial<Record<RoleId,number>>):Player[]{
 const roles=Object.entries(counts).flatMap(([role,n])=>Array(n).fill(role as RoleId)) as RoleId[];
 if(roles.length!==names.length)throw new Error('Role count must match player count');
 for(let i=roles.length-1;i>0;i--){const array=new Uint32Array(1);crypto.getRandomValues(array);const j=array[0]%(i+1);[roles[i],roles[j]]=[roles[j],roles[i]];}
 return names.map((name,i)=>({id:crypto.randomUUID(),name,role:roles[i],alive:true}));
}
