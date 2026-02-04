#!/usr/bin/env node
// Quick agent grind - register one agent and do lots of exploring
const BASE_URL = 'https://www.cavernsandclawds.com';

async function api(e, o={}, k=null) {
  const h = {'Content-Type':'application/json'};
  if(k) h['X-API-Key']=k;
  return (await fetch(BASE_URL+e,{...o,headers:h})).json();
}

async function main() {
  // Register
  const r = await api('/api/register',{method:'POST',body:JSON.stringify({name:'Grinder_'+Date.now().toString(36),type:'agent'})});
  if(r.error){console.log('Reg fail:',r.error);return;}
  const k = r.api_key;
  
  // Create char
  const c = await api('/api/character/create',{method:'POST',body:JSON.stringify({
    name:'Grinder',race:'american',class:'fighter',statMethod:'pointbuy',
    stats:{str:15,dex:14,con:13,int:12,wis:10,cha:8},skills:['athletics','intimidation']
  })},k);
  if(c.error){console.log('Char fail:',c.error);return;}
  console.log('✅ Agent ready');
  
  // Go to kelp forest
  await api('/api/world/move',{method:'POST',body:JSON.stringify({direction:'west'})},k);
  await api('/api/world/move',{method:'POST',body:JSON.stringify({direction:'kelp_forest'})},k);
  
  let wins=0,mats=0,deaths=0;
  for(let i=0;i<20;i++){
    const e = await api('/api/zone/explore',{method:'POST'},k);
    if(e.encounter){
      for(let r=0;r<20;r++){
        await api('/api/zone/combat/action',{method:'POST',body:JSON.stringify({action:'wait'})},k);
        const x = await api('/api/zone/combat/action',{method:'POST',body:JSON.stringify({action:'attack'})},k);
        if(x.combatEnded){
          if(x.victory||x.result==='victory'){wins++;if(x.drops?.materials)mats+=x.drops.materials.length;}
          else deaths++;
          break;
        }
      }
    }else if(e.discovery)mats++;
    process.stdout.write('.');
  }
  console.log(`\n📊 ${wins} wins, ${deaths} deaths, ${mats} materials`);
  
  // Try to sell if we have materials
  const inv = await api('/api/economy/inventory',{},k);
  if(inv.inventory?.length){
    const m = inv.inventory[0];
    console.log(`💰 Selling ${m.material_id}...`);
    const s = await api('/api/economy/sell',{method:'POST',body:JSON.stringify({
      npcId:'npc_old_shellworth',materialId:m.material_id,quantity:1
    })},k);
    console.log(s.success?'✅ Sold!':'❌ '+s.error);
  }
}
main();
