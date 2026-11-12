import {gardenSummaryEdits} from './garden-summaries.js?v=1';

import {transferReceipt} from './receipt-transfer.js?v=1';
import {createTicketImage} from './ticket-image.js?v=166';
import {ticketContents,ticketDate,ticketDescription} from './ticket.js?v=6';
import {reviewState,reviewsReady as validReviews} from './review-validation.js?v=1';
import {stepGarden,AUTO_PANEL_MS,PANEL_HOLD_MS} from './garden-motion.js?v=94';
const creatorMode=new URLSearchParams(location.search).get('mode')==='create';document.body.classList.add(creatorMode?'creator-mode':'projection-mode');
import {bloom} from './bloom.js?v=6';
import {flowerAsset} from './flower-assets.js?v=44-approved-color-1';
import {scatterGarden} from './garden-layout.js?v=65';
import {generateRecord,MOODS,GENERATOR_VERSION} from './generator-adapter.js?v=44-approved-color-1';
import {explainPalette} from './genre-palette.js?v=67';
import {samples} from './sample-records.js?v=35';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let confirmUnknown=false;
let records=[],locations=[],nodes=new Map(),cache=new Map(),position=0,velocity=0,target=null,worldWidth=0,active=null,drag=null,suppressUntil=0,lastTime=0,clock=0,paused=false,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches,hideTimer,lastFocus,sessionId=null,busy=false;
let pendingFlower=null,openingFlower=false,bloomIntent=0;let pendingBirth=null;const birthPlacements=new Map();
const reviewEdited=[false,false,false];const selectedMovies=[null,null,null];let questionList=[];const max=()=>Math.max(0,worldWidth-innerWidth),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function recordName(r){if(r.kind==='provided')return r.displayName;return r.profile.title?.trim()||'감상에서 피어난 꽃';}
function toast(s){$('#notice').textContent=s;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#notice').textContent='',4500)}
function rng(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}}
const layoutSeed=1248;
function layout(){const scattered=scatterGarden(records,innerWidth,innerHeight,layoutSeed);worldWidth=creatorMode?scattered.worldWidth:Math.max(scattered.worldWidth,innerWidth);locations=scattered.locations;if(!creatorMode)locations.forEach(p=>p.x*=worldWidth/scattered.worldWidth);if(!creatorMode){locations.forEach(p=>{const radius=p.size*.34;p.x=clamp(worldWidth/2+(p.x-worldWidth/2),radius+18,worldWidth-radius-18)})}birthPlacements.forEach((p,id)=>{const i=records.findIndex(r=>r.id===id);if(i>=0)Object.assign(locations[i],p)});position=clamp(position,0,max());nodes.forEach(n=>n.remove());nodes.clear();active=null;lastDrawPosition=null;draw();wake()}

let previewQueue=Promise.resolve(),lastDrawPosition=null,initialGalleryLoad=null,initialGalleryReady=false;
function releaseAsset(id){const a=cache.get(id);a?.dispose?.();cache.delete(id)}
function asset(r){if(cache.has(r.id)){const a=cache.get(r.id);cache.delete(r.id);cache.set(r.id,a);return a}const a=flowerAsset(r,'f-'+r.id.replace(/[^a-zA-Z0-9-]/g,''),task=>previewQueue=previewQueue.catch(()=>{}).then(task));cache.set(r.id,a);return a}
function trimAssets(){if(cache.size<=40)return;const visible=new Set([...nodes.keys()].map(i=>records[i]?.id));for(const id of cache.keys()){if(cache.size<=40)break;if(!visible.has(id))releaseAsset(id)}}

function previewPoster(m){return m.poster?`<img data-src="${esc(m.poster)}" alt="${esc(m.title)}" draggable="false" decoding="async">`:`<span>${esc(m.title)}</span>`}
function makeNode(i){const r=records[i],p=locations[i],a=asset(r),el=document.createElement('div');el.className='bloom'+(pendingBirth===i?' awaiting-birth':'');el.dataset.index=i;el.style.cssText=`--flower-x:${p.x}px;--flower-y:${p.y}px;width:${p.size}px;height:${p.size}px`;el.innerHTML=`<div class="floating"><button class="flower" aria-label="${esc(r.displayName&&r.kind!=='provided'?r.displayName+' · '+recordName(r):recordName(r))}${r.reviewSource==='tmdb'?' · '+esc(r.reviewAuthor)+'의 공개 리뷰':r.kind==='example'?' · 시연 예시':''}" aria-expanded="false"><img class="idle-art" alt="" draggable="false"></button>${r.movies.map((m,j)=>`<button class="orbit" data-film="${j}" tabindex="-1" aria-hidden="true" aria-label="${esc(m.title)} 감상 보기">${previewPoster(m)}</button>`).join('')}</div>`;el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!drag)expand(i)});el.addEventListener('pointerleave',()=>{hideTimer=setTimeout(()=>{if(!el.contains(document.activeElement))collapse(i)},260)});el.addEventListener('focusin',()=>expand(i));el.addEventListener('focusout',()=>{hideTimer=setTimeout(()=>{if(!el.contains(document.activeElement)&&!el.matches(':hover'))collapse(i)},260)});el.querySelector('.flower').onclick=e=>{if(performance.now()<suppressUntil)return;if(e.pointerType==='touch'&&active!==i){expand(i);return}openBloomDetail(i)};el.querySelectorAll('.orbit').forEach((b,j)=>{b.onclick=()=>{if(performance.now()<suppressUntil)return;openBloomDetail(i,j)}});el.querySelectorAll('img').forEach(img=>img.onerror=()=>{if(img.closest('.orbit'))img.replaceWith(Object.assign(document.createElement('span'),{textContent:img.alt}))});const floating=el.querySelector('.floating');floating.style.cssText=`--dx:${p.dx}px;--dy:${p.dy}px;--rot:${p.rotation*p.sign}deg;animation-duration:${p.period}s;animation-delay:${-p.phase*p.period}s`;a.preview.then(url=>{if(el.isConnected&&url){if(!creatorMode&&!initialGalleryReady)el.dataset.readyArt=url;else el.querySelector('.idle-art').src=url}}).catch(()=>{if(el.isConnected){el.querySelector('.idle-art').src=a.url;}});$('#world').append(el);nodes.set(i,el);return el}
function placeNewFlower(index){const p=locations[index],radius=p.size*.34,candidates=[];for(let n=0;n<150;n++){const x=radius+50+Math.random()*Math.max(1,worldWidth-2*radius-100),y=radius+65+Math.random()*Math.max(1,innerHeight-2*radius-160);let cost=0;locations.forEach((other,j)=>{if(j===index)return;const reach=(other.size+p.size)*.32,d=Math.hypot(x-other.x,y-other.y);cost+=Math.pow(Math.max(0,1-d/reach),2)});candidates.push({x,y,cost})}candidates.sort((a,b)=>a.cost-b.cost);const chosen=candidates[Math.floor(Math.random()*Math.min(8,candidates.length))];p.x=chosen.x;p.y=chosen.y;birthPlacements.set(records[index].id,{x:p.x,y:p.y});nodes.get(index)?.remove();nodes.delete(index);
 // A relocated flower needs a fresh node even when the wall cannot scroll.
 lastDrawPosition=null;
}
async function arriveAtFlower(node,color){
 const rect=node.getBoundingClientRect();
 const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
 const radius=Math.min(52,rect.width*.23),bottom=innerHeight+18;
 const start=Math.max(18,Math.min(innerWidth-18,x+(Math.random()-.5)*innerWidth*.6));
 const orb=document.createElement('i');orb.className='planting-orb';orb.setAttribute('aria-hidden','true');
 orb.style.setProperty('--orb-color',color);document.body.append(orb);
 const frames=Array.from({length:101},(_,i)=>{
   const t=i/100;let px,py;
   if(t<.55){
     const u=t/.55,k=u*u*(3-2*u);
     px=start+(x+radius-start)*k+16*Math.sin(u*3*Math.PI)*Math.sin(u*Math.PI);
     py=bottom+(y-bottom)*k;
   }else if(t<.9){
     const u=(t-.55)/.35,angle=2*Math.PI*u;
     px=x+radius*Math.cos(angle);py=y+radius*.72*Math.sin(angle);
   }else{
     const u=(t-.9)/.1;px=x+radius*(1-u);py=y;
   }
   return {transform:`translate3d(${px-8}px,${py-8}px,0) scale(${t>.9?1-(t-.9)*7:1})`,opacity:Math.min(1,t*12,(1-t)*22)};
 });
 try{await orb.animate(frames,{duration:2450,easing:'linear',fill:'both'}).finished}finally{orb.remove()}
}
async function bloomNewFlower(index,arriving=false){
 const el=nodes.get(index);if(!el)return;
 const flower=asset(records[index]),button=el.querySelector('.flower');
 if(arriving&&!reduced&&!paused)await arriveAtFlower(el,MOODS[records[index].profile.mood]?.hex||'#e6caff');
 el.classList.remove('awaiting-birth');
 if(reduced)return;
 const holder=document.createElement('span');holder.className='birth-art';holder.innerHTML=flower.svg;
 el.classList.add('being-born');button.append(holder);
 try{
   await bloom(holder,{delay:0});
   const idle=button.querySelector('.idle-art');
   idle.src=await flower.preview||flower.url;
   await idle.decode();
 }finally{holder.remove();el.classList.remove('being-born')}
}
let posterPreviewIndex=null;
async function openBloomDetail(i,film){
 if(openingFlower||!nodes.has(i))return;
 openingFlower=true;
 const intent=++bloomIntent,source=nodes.get(i);
 posterPreviewIndex=i;
 try{
  expand(i);
  if(source.querySelector('.orbit'))await new Promise(resolve=>setTimeout(resolve,reduced?700:1250));
  if(intent!==bloomIntent||nodes.get(i)!==source)return;
  const opening=bloomNewFlower(i).catch(()=>{});
  if(!reduced)await new Promise(resolve=>setTimeout(resolve,800));
  if(intent===bloomIntent&&nodes.get(i)===source)openDetail(i,film,true);
  await opening;
 }finally{
  posterPreviewIndex=null;
  openingFlower=false;
  if(!$('#detail').open&&!source.matches(':hover')&&!source.contains(document.activeElement))collapse(i);
 }
}


$('#detail').addEventListener('close',()=>{clearTimeout(panelCloseTimer);selectedIndex=-1;$('#detailLink').hidden=true;document.querySelectorAll('.panel-orbs').forEach(el=>el.remove());document.querySelectorAll('.selection-outline').forEach(el=>el.remove());document.querySelectorAll('.bloom.selected').forEach(el=>el.classList.remove('selected'));++bloomIntent;$('#selected').replaceChildren();document.querySelectorAll('.opening-source').forEach(el=>el.classList.remove('opening-source'));$('#detail').classList.remove('bloom-dialog');openingFlower=false});

function draw(){if(lastDrawPosition===position&&nodes.size)return;lastDrawPosition=position;const margin=150;for(let i=0;i<records.length;i++){const p=locations[i],on=p.x-position>-margin&&p.x-position<innerWidth+margin;if(on&&!nodes.has(i))makeNode(i);else if(!on&&nodes.has(i)&&i!==selectedIndex){nodes.get(i).remove();nodes.delete(i);if(active===i)active=null}}trimAssets();$('#world').style.transform=`translate3d(${-position.toFixed(2)}px,0,0)`;nodes.forEach((el,i)=>{const p=locations[i];el.querySelector('.flower').tabIndex=p.x-position>0&&p.x-position<innerWidth?0:-1});if(!creatorMode&&!initialGalleryLoad&&nodes.size){initialGalleryLoad=Promise.allSettled([...nodes.keys()].map(i=>asset(records[i]).preview)).then(()=>{initialGalleryReady=true;nodes.forEach(el=>{if(el.dataset.readyArt){el.querySelector('.idle-art').src=el.dataset.readyArt;delete el.dataset.readyArt}})})}}
function expand(i){if(posterPreviewIndex!==null&&posterPreviewIndex!==i)return;clearTimeout(hideTimer);if(drag||performance.now()<suppressUntil)return;if(active!==null&&active!==i)collapse(active);const el=nodes.get(i);if(!el)return;if(active===i)return;active=i;el.classList.add('open');el.querySelector('.flower').setAttribute('aria-expanded','true');const rect=el.getBoundingClientRect(),radius=locations[i].size*.6;el.querySelectorAll('.orbit img[data-src]').forEach(img=>{img.src=img.dataset.src;delete img.dataset.src});el.querySelectorAll('.orbit').forEach((b,j)=>{const angle=-Math.PI/2+j*2*Math.PI/3;const x=clamp(rect.left+rect.width/2+Math.cos(angle)*radius,65,innerWidth-65)-(rect.left+rect.width/2),y=clamp(rect.top+rect.height/2+Math.sin(angle)*radius,90,innerHeight-95)-(rect.top+rect.height/2);b.style.setProperty('--ox',x+'px');b.style.setProperty('--oy',y+'px');b.tabIndex=0;b.setAttribute('aria-hidden','false')});}
function collapse(i){if(posterPreviewIndex===i)return;const el=nodes.get(i);if(!el)return;el.classList.remove('open');el.querySelector('.flower').setAttribute('aria-expanded','false');el.querySelectorAll('.orbit').forEach(b=>{b.tabIndex=-1;b.setAttribute('aria-hidden','true')});if(active===i)active=null}
let frameRaf=0;function wake(){if(!frameRaf&&!document.hidden)frameRaf=requestAnimationFrame(frame)}
function frame(t){frameRaf=0;const dt=Math.min(.04,(t-lastTime)/1000||0);lastTime=t;if(!document.hidden&&!$('dialog[open]')){if(!paused&&!reduced)clock+=dt;if(target!==null){position+=(target-position)*(reduced?1:Math.min(1,dt*7));if(Math.abs(target-position)<.5){position=target;target=null}}else if(!drag){position=clamp(position+velocity*dt,0,max());velocity*=Math.exp(-5*dt);if(position===0||position===max())velocity=0}draw();document.body.classList.toggle('garden-moving',!!drag?.moved||target!==null||(!drag&&Math.abs(velocity)>.5));if(pendingBirth!==null&&target===null&&nodes.has(pendingBirth)){const index=pendingBirth;pendingBirth=null;bloomNewFlower(index,!creatorMode).finally(()=>{birthFinished?.();birthFinished=null})}}if(!document.hidden&&!$('dialog[open]')&&(target!==null||(!drag&&Math.abs(velocity)>.5)||pendingBirth!==null))wake();else if(Math.abs(velocity)<=.5)velocity=0}
$('#garden').onpointerdown=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,last:e.clientX,time:performance.now(),moved:false};velocity=0;target=null};$('#garden').onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){drag.moved=true;$('#garden').setPointerCapture(e.pointerId);$('#garden').classList.add('dragging');if(active!==null)collapse(active)}if(drag.moved){const now=performance.now(),delta=e.clientX-drag.last;position=clamp(position-delta,0,max());velocity=-delta/Math.max(10,now-drag.time)*1000;drag.last=e.clientX;drag.time=now;e.preventDefault()}};
function finish(){wake();if(drag?.moved)suppressUntil=performance.now()+400;drag=null;$('#garden').classList.remove('dragging')};$('#garden').onpointerup=finish;$('#garden').onpointercancel=finish;$('#garden').addEventListener('wheel',e=>{const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey;if(!horizontal)return;e.preventDefault();target=null;const delta=e.shiftKey?e.deltaY:e.deltaX;position=clamp(position+delta,0,max());velocity=delta*10;if(active!==null)collapse(active)},{passive:false});$('#garden').onclick=e=>{if(e.target===$('#garden')||e.target===$('#world'))if(active!==null)collapse(active)};
$('#left').onclick=()=>target=clamp(position-innerWidth*.65,0,max());$('#right').onclick=()=>target=clamp(position+innerWidth*.65,0,max());$('#pause').onclick=()=>{paused=!paused;document.body.classList.toggle('paused',paused);$('#pause').textContent=paused?'▷':'Ⅱ';$('#pause').setAttribute('aria-label',paused?'움직임 재생':'움직임 일시정지');$('#pause').setAttribute('aria-pressed',String(paused))};function reduce(){document.body.classList.toggle('reduced',reduced);$('#reduce').setAttribute('aria-pressed',String(reduced))}$('#reduce').onclick=()=>{reduced=!reduced;reduce()};reduce();matchMedia('(prefers-reduced-motion:reduce)').onchange=e=>{reduced=e.matches;reduce()};document.addEventListener('keydown',e=>{if($('dialog[open]')||/INPUT|TEXTAREA/.test(e.target.tagName))return;if(e.key==='ArrowRight'){$('#right').click();e.preventDefault()}if(e.key==='ArrowLeft'){$('#left').click();e.preventDefault()}if(e.key==='Escape'&&active!==null)collapse(active)});
$('#garden').addEventListener('pointermove',()=>{if(drag)wake()});$('#garden').addEventListener('wheel',wake,{passive:true});$('#left').addEventListener('click',wake);$('#right').addEventListener('click',wake);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frameRaf);frameRaf=0}else wake()});
const sectionNames={sensory:'감각적 선호',emotional:'정서적 선호',character:'인물 선호',relationship:'관계 선호',narrative:'서사 선호',values:'가치관',avoidance:'회피 요소',recommendation:'추천 방향'};
function openDialog(id){if(id!=='detail'&&$('#detail').open)$('#detail').close();lastFocus=document.activeElement;$('#'+id).showModal()}document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());document.querySelectorAll('dialog').forEach(d=>d.addEventListener('close',()=>{lastFocus?.focus();wake()}));
function positionTastePanel(i){const panel=$('#detail'),source=nodes.get(i);if(!source)return;const rect=source.getBoundingClientRect(),width=panel.offsetWidth,height=panel.offsetHeight,centerX=rect.left+rect.width/2,centerY=rect.top+rect.height/2,gap=12;let left=centerX+rect.width*.32+gap,side=1;if(left+width>innerWidth-20){left=centerX-rect.width*.32-gap-width;side=-1}if(left<20){left=centerX<innerWidth/2?innerWidth-width-20:20;side=left>centerX?1:-1}left=clamp(left,14,Math.max(14,innerWidth-width-14));const top=clamp(centerY-height*.48,22,Math.max(22,innerHeight-height-22));panel.style.left=left+'px';panel.style.top=top+'px';panel.style.setProperty('--panel-from',side*14+'px');panel.style.transformOrigin=(centerX-left)+'px '+(centerY-top)+'px';panel.style.setProperty('--bloom-x',(centerX-left)+'px');panel.style.setProperty('--bloom-y',(centerY-top)+'px');const link=$('#detailLink'),endX=side>0?left:left+width,endY=clamp(centerY,top+28,top+height-28),startX=centerX+side*rect.width*.25;link.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);link.querySelector('path').setAttribute('d',`M ${startX} ${centerY} L ${(startX+endX)/2} ${centerY} L ${endX} ${endY}`);link.querySelector('circle').setAttribute('cx',startX);link.querySelector('circle').setAttribute('cy',centerY);link.hidden=innerWidth<640;}
const inputDateFormat=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'});
function receiptColor(palette){
 const meanings={pink:'설렘과 다정함',red:'열기와 긴장',blue:'고요와 사색',green:'회복과 생기',purple:'낯선 상상과 신비',yellow:'경쾌한 리듬과 활기'};
 const names={pink:'핑크',red:'레드',blue:'블루',green:'연두',purple:'퍼플',yellow:'옐로'};
 return palette.map(({mood},i)=>names[mood]+(i===0?'에 담은 ':'에 더한 ')+meanings[mood]).join('\n');

}
function tasteReceipt(r,film,compact=false){
 const date=new Date(r.createdAt||NaN);
 const label=[r.reviewSource==='synthetic'?'시연 기록':'',Number.isFinite(date.getTime())?inputDateFormat.format(date):''].filter(Boolean).join(' · ');
 const p=r.profile,palette=p.palette||[{mood:p.mood,weight:100}],gradient=palette.map(c=>MOODS[c.mood]?.hex).filter(Boolean).join(',');
 return `<span class="panel-source">${esc(label)}</span><h2 id="taste-title">${esc(p.title)}</h2><p class="taste-summary">${esc((gardenSummaryEdits[r.id]||p.summary||(p.description||'').match(/[^.!?]+[.!?]?/)?.[0]||'').replace(/\s*\n+\s*/g,' '))}</p><div class="panel-films">${r.movies.map((m,j)=>`<div class="panel-film"${film===j?' data-highlight="true"':''}>${m.poster?`<img src="${esc(m.poster)}" alt="${esc(m.title)}" decoding="async">`:`<div class="panel-poster-fallback">${esc(m.title)}</div>`}<h3>${esc(m.title)}</h3><span>${esc(m.year||'연도 미상')}</span></div>`).join('')}</div><div class="panel-axes">${p.axes.map(a=>`<div class="panel-axis"><div><b>${esc(a.name)}</b><span>${(a.level==='부족'||a.status==='unknown')?'중간값':esc(a.direction)}</span><em>${(a.level==='부족'||a.status==='unknown')?50:a.value}</em></div><div class="panel-axis-track"><i style="width:${(a.level==='부족'||a.status==='unknown')?50:a.value}%;opacity:1"></i></div></div>`).join('')}</div><div class="panel-color"><i style="background:${palette.length>1?'linear-gradient(135deg,'+gradient+')':MOODS[p.mood]?.hex}"></i><div><b>${palette.map(c=>esc(MOODS[c.mood]?.name||c.mood)).join(' · ')}</b><p>${esc(compact?explainPalette(palette,p.reviewPalette||palette,r.movies,p.colorMethod?.sources||[]):receiptColor(palette))}</p></div></div>`;
}
function openDetail(i,film,keepBirth=false){selectedIndex=i;clearTimeout(panelCloseTimer);panelCloseTimer=setTimeout(closeDetailSmooth,PANEL_HOLD_MS);++bloomIntent;if(!keepBirth){document.querySelectorAll('.birth-art').forEach(el=>el.remove());document.querySelectorAll('.being-born').forEach(el=>el.classList.remove('being-born'));}document.querySelectorAll('.bloom.selected').forEach(el=>el.classList.remove('selected'));nodes.get(i)?.classList.add('selected');const r=records[i],p=r.profile,palette=p.palette||[{mood:p.mood,weight:100}],gradient=palette.map(c=>MOODS[c.mood]?.hex).filter(Boolean).join(',');$('#profile').style.setProperty('--flower-accent',MOODS[p.mood]?.hex||'#a7b898');$('#profile').innerHTML=tasteReceipt(r,film);lastFocus=nodes.get(i)?.querySelector('.flower')||document.activeElement;const panel=$('#detail');if(!panel.open)panel.show();positionTastePanel(i);floatPanelOrbs(i,MOODS[p.mood]?.hex||'#d9c5ec');showSelectionOutline(i,MOODS[p.mood]?.hex||'#d9c5ec');panel.classList.remove('bloom-dialog');void panel.offsetWidth;if(!reduced)panel.classList.add('bloom-dialog');panel.tabIndex=-1;panel.focus({preventScroll:true});}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#detail').open){$('#detail').close();e.preventDefault()}});document.addEventListener('pointerdown',e=>{if($('#detail').open&&!e.target.closest('#detail,.bloom'))$('#detail').close()});

$('#inputs').innerHTML=[0,1,2].map(i=>`<article class="review-row"><div class="review-poster" id="reviewPoster${i}"></div><div class="review-writing"><div class="review-main"><div class="review-heading"><label for="review${i}"><strong id="reviewMovie${i}"></strong> <small id="reviewYear${i}"></small></label><small class="review-count" id="reviewCount${i}">0 / 1500</small></div><input id="title${i}" type="hidden"><div class="review-field"><textarea id="review${i}" name="review${i}" required minlength="40" maxlength="1500" aria-describedby="reviewHint${i} reviewCount${i}" placeholder=" "></textarea><p class="review-example" id="reviewHint${i}"><span class="review-minimum">40자 이상 감상평을 작성해 주세요<br>자세히 적을수록 개성있는 꽃이 태어날 수 있습니다</span><b>이렇게 시작해도 좋아요</b> “말없이 함께 걷는 장면이 기억나요. 대사가 적어서 인물의 표정을 더 보게 됐고, 서로를 기다려주는 태도가 따뜻하게 느껴졌어요.”</p></div></div></div></article>`).join('');

function reviewsReady(){return validReviews(draft().movies)}
function updateReviewSubmit(){$('#submit').disabled=busy||!reviewsReady()}
function updateReviewCount(i){const field=$('#review'+i),state=reviewState(field.value),el=$('#reviewCount'+i);el.textContent=state.length+' / 1500';el.classList.toggle('ready',state.valid);field.setAttribute('aria-invalid',String(state.length>0&&!state.valid));updateReviewSubmit()}
function draft(){return {movies:[0,1,2].map(i=>({...selectedMovies[i],title:$('#title'+i).value,review:$('#review'+i).value}))}}
function saveDraft(){try{sessionStorage.setItem('gamdo-review-draft',JSON.stringify(draft()))}catch{}}
try{const d=JSON.parse(sessionStorage.getItem('gamdo-review-draft')||'null');d?.movies.forEach((m,i)=>{selectedMovies[i]=m.title?m:null;$('#title'+i).value=m.title;$('#review'+i).value=m.review})}catch{}
$('#reviewForm').addEventListener('input',e=>{if(e.target.id.startsWith('review')){const i=+e.target.id.at(-1);updateReviewCount(i);}if(e.target.id.startsWith('title')){const i=+e.target.id.at(-1);selectedMovies[i]=null;$('#chosen'+i).textContent=''}if(e.target.closest('#inputs')&&!e.target.closest('.extra-question,.early-question')){sessionId=null;confirmUnknown=false;questionList=[];document.querySelectorAll('.extra-question').forEach(el=>el.remove());$('#followups').hidden=true;$('#skip').hidden=true}saveDraft()});
let entryStage=1,editingSlot=null,searchSequence=0,searchTimer;
function movieStage(stage){entryStage=stage;$('#entry').classList.toggle('choosing-movies',stage===1);$('#entry').classList.toggle('writing-reviews',stage===2);$('#movieStep').hidden=stage!==1;$('#reviewStep').hidden=stage!==2;$('#entry-title').textContent=stage===1?'최근 가장 좋았던 영화 3가지를 골라주세요':'그 영화를 좋아하게 된 이유는 무엇인가요?';updateReviewSubmit();if(stage===2){reviewEdited.fill(false);earlyQuestions.fill(null);document.querySelectorAll('.early-question').forEach(el=>el.remove());$('#review0').focus({preventScroll:true});$('#entry').scrollTop=0;}}
function renderMovieSlots(){const filled=selectedMovies.filter(Boolean).length;$('#movieNext').disabled=filled!==3;$('#movieNext').hidden=filled!==3;$('#movieSlots').hidden=filled===0;$('.movie-credit').hidden=filled===0;$('#movieSlots').innerHTML=selectedMovies.map((m,i)=>m?`<article class="movie-slot"><div class="poster-slot ${m?'has-movie':''}">${m?.poster?`<img src="${esc(m.poster)}" alt="${esc(m.title)}">`:`<span class="empty-label">${m?'포스터 없음':'영화를 골라주세요'}</span>`}</div>${m?`<button type="button" class="remove-movie" data-remove="${i}" aria-label="${esc(m.title)} 선택 취소">×</button><h2>${esc(m.title)}</h2><p>${esc(m.year||'개봉연도 미상')}</p><p>${esc(m.director||'감독 정보 없음')}</p>`:'<div class="empty-meta" aria-hidden="true"><i></i><i></i></div>'}</article>`:'').join('');$('#movieSlots').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const i=+b.dataset.remove;selectedMovies[i]=null;$('#title'+i).value='';sessionId=null;confirmUnknown=false;questionList=[];document.querySelectorAll('.extra-question').forEach(el=>el.remove());$('#followups').hidden=true;$('#skip').hidden=true;saveDraft();renderMovieSlots()});selectedMovies.forEach((m,i)=>{$('#reviewMovie'+i).textContent=m?.title||'선택한 영화';$('#reviewYear'+i).textContent=m?.year||'';$('#reviewPoster'+i).innerHTML=m?.poster?`<img src="${esc(m.poster)}" alt="">`:'포스터 없음';updateReviewCount(i)});}
async function chooseMovie(m){if(selectedMovies.some((s,i)=>i!==editingSlot&&s&&(s.id&&s.id===m.id||s.title===m.title))){$('#selectionStatus').textContent='이미 선택한 영화입니다. 다른 영화를 골라주세요.';return}const i=[0,1,2].find(index=>!selectedMovies[index])??-1;if(i<0){$('#selectionStatus').textContent='선택한 영화 하나를 취소한 뒤 다른 영화를 골라주세요.';return}const review=$('#review'+i),identity=String(m.id||m.title),previous=review.dataset.movieIdentity||$('#title'+i).value;if(previous&&previous!==identity&&previous!==m.title){review.value='';reviewEdited[i]=false;earlyQuestions[i]=null;review.closest('.review-writing').querySelector('.early-question')?.remove()}review.dataset.movieIdentity=identity;selectedMovies[i]=m;$('#title'+i).value=m.title;editingSlot=null;sessionId=null;confirmUnknown=false;questionList=[];document.querySelectorAll('.extra-question').forEach(el=>el.remove());$('#followups').hidden=true;$('#skip').hidden=true;++searchSequence;clearTimeout(searchTimer);$('#movieResults').replaceChildren();$('#movieQuery').setAttribute('aria-expanded','false');$('#movieQuery').value='';$('#selectionStatus').textContent='';renderMovieSlots();saveDraft();if(m.id){try{const res=await fetch('/api/movies/search?id='+encodeURIComponent(m.id));const data=await res.json();if(res.ok&&selectedMovies[i]===m){Object.assign(m,data.movie);renderMovieSlots();saveDraft()}}catch{}}}
async function searchMovies(){const q=$('#movieQuery').value.trim(),seq=++searchSequence;if(!q){$('#movieResults').replaceChildren();return}$('#movieQuery').setAttribute('aria-expanded','true');$('#movieResults').innerHTML='<span class="movie-search-loading">영화 찾는 중…</span>';try{const res=await fetch('/api/movies/search?q='+encodeURIComponent(q));const data=await res.json();if(seq!==searchSequence)return;if(!res.ok)throw Error(data.error);$('#movieResults').replaceChildren();for(const m of data.movies){const b=document.createElement('button');b.type='button';b.className='movie-result';b.innerHTML=(m.poster?`<img src="${esc(m.poster)}" alt="">`:'<span class="result-placeholder"></span>')+`<span><b>${esc(m.title)}</b><small>${[m.year||'개봉연도 미상',m.director,m.cast?.join(', ')].filter(Boolean).map(esc).join(' · ')}</small></span><span class="result-add">＋</span>`;b.onclick=()=>chooseMovie(m);$('#movieResults').append(b)}if(!data.movies.length)$('#movieResults').textContent='검색 결과가 없습니다. 다른 제목으로 찾아주세요.'}catch(e){if(seq===searchSequence)$('#movieResults').textContent=e.message}}
$('#movieQuery').oninput=()=>{++searchSequence;clearTimeout(searchTimer);if(!$('#movieQuery').value.trim()){$('#movieResults').replaceChildren();$('#movieQuery').setAttribute('aria-expanded','false');return}searchTimer=setTimeout(searchMovies,180)};$('#movieQuery').onkeydown=e=>{if(e.key==='ArrowDown'){$('#movieResults button')?.focus();e.preventDefault();return}if(e.key==='Escape'){$('#movieResults').replaceChildren();$('#movieQuery').setAttribute('aria-expanded','false');e.preventDefault();return}if(e.key==='Enter'){e.preventDefault();clearTimeout(searchTimer);searchMovies()}};$('#movieQuery').onfocus=()=>{if($('#movieQuery').value.trim())searchMovies()};$('#movieResults').onkeydown=e=>{const buttons=[...$('#movieResults').querySelectorAll('button')],at=buttons.indexOf(document.activeElement);if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[(at+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()}if(e.key==='Escape'){$('#movieResults').replaceChildren();$('#movieQuery').focus()}};$('#movieSearch').onclick=searchMovies;$('#movieNext').onclick=()=>{if(selectedMovies.every(Boolean))movieStage(2)};$('#movieBack').onclick=()=>movieStage(1);renderMovieSlots();
$('#create').onclick=()=>{if(pendingFlower){showFlowerPreview();return}movieStage(1);renderMovieSlots();openDialog('entry')};$('#about').onclick=()=>openDialog('info');
function fitReceiptFlower(){
 const svg=document.querySelector('#previewFlower svg');
 const contour=svg?.querySelector('[data-module="contour"]');
 if(!contour)return;
 const box=contour.getBBox(),matrix=contour.getCTM(),root=svg.getCTM();
 if(!box.width||!box.height||!matrix||!root)return;
 const toRoot=root.inverse().multiply(matrix);
 const center=new DOMPoint(box.x+box.width/2,box.y+box.height/2).matrixTransform(toRoot);
 const side=Math.max(box.width*Math.hypot(toRoot.a,toRoot.b),box.height*Math.hypot(toRoot.c,toRoot.d))*1.15;
 svg.setAttribute('viewBox',`${center.x-side/2} ${center.y-side/2} ${side} ${side}`);
}
let ticketRecord=null;
function showFlowerPreview(){
 const record=pendingFlower,dialog=$('#flowerPreview');ticketRecord=record;
 ++receiptImageVersion;receiptImagePromise=null;
 dialog.classList.remove('has-ticket-image','show-wall-tip');dialog.classList.add('live-result');
 $('#receiptImage').hidden=true;$('#receiptImage').removeAttribute('src');$('#receiptImageStatus').textContent='';
 dialog.querySelector('.ticket-sheet').innerHTML=`<header class="receipt-head"><h2>GAMDO</h2><time id="receiptDate"></time></header><div class="result-tab"><section class="result-visual" aria-label="나의 취향 꽃"><div id="previewFlower"></div></section><div class="result-content"><p id="previewName" hidden></p><article id="receipt"></article></div></div>`;
 const date=new Date(record.createdAt||NaN),stamp=$('#receiptDate');stamp.textContent=ticketDate(record.createdAt);if(Number.isFinite(+date))stamp.dateTime=date.toISOString();
 $('#previewFlower').innerHTML=generateRecord(record,'preview-'+record.id).svg;
 $('#previewName').textContent=record.profile.title;
 $('#receipt').innerHTML=tasteReceipt(record);
 const title=$('#receipt #taste-title');if(title)title.id='receipt-title';dialog.setAttribute('aria-labelledby','receipt-title');
 $('#receipt .taste-summary').textContent=ticketDescription(record.profile);
 $('#receipt').style.setProperty('--flower-accent',MOODS[record.profile.mood]?.hex||'#d98edb');
 $('#plantStatus').textContent='';$('#plantFlower').disabled=false;
 openDialog('flowerPreview');dialog.scrollTop=0;
}
$('#previewEdit').onclick=()=>{$('#flowerPreview').close();pendingFlower=null;sessionId=null;movieStage(2);openDialog('entry')};
let receiptImagePromise=null,receiptImageVersion=0;
function prepareTicketImage(){
 if(receiptImagePromise)return receiptImagePromise;
 const version=++receiptImageVersion,record=ticketRecord,image=$('#receiptImage');
 if(!record)return Promise.resolve(null);
 const axes=record.profile.axes.map(a=>({name:a.name,value:(a.status==='unknown'||a.level==='부족')?50:a.value,unknown:a.status==='unknown'||a.level==='부족',label:a.direction}));
 receiptImagePromise=createTicketImage({svg:$('#previewFlower svg'),date:ticketDate(record.createdAt),title:record.profile.title,movies:record.movies,description:ticketDescription(record.profile),axes,colors:(record.profile.palette||[{mood:record.profile.mood}]).map(c=>MOODS[c.mood]?.name||c.mood),accent:MOODS[record.profile.mood]?.hex}).then(url=>{if(version!==receiptImageVersion)return null;image.src=url;image.hidden=true;return url;}).catch(error=>{receiptImagePromise=null;throw error;});
 return receiptImagePromise;
}
async function printTicket(){const buttons=[$('#printReceipt'),$('#printReceiptPreview')];buttons.forEach(b=>b.disabled=true);try{if(!await prepareTicketImage())return;await $('#receiptImage').decode();window.print();}catch(error){$('#receiptImageStatus').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}}
$('#printReceipt').onclick=printTicket;$('#printReceiptPreview').onclick=printTicket;
$('#plantFlower').onclick=async()=>{
 if(!pendingFlower||$('#plantFlower').disabled)return;
 const id=pendingFlower.id,preview=$('#flowerPreview'),buttons=preview.querySelectorAll('button');
 buttons.forEach(button=>button.disabled=true);
 const hold=e=>e.preventDefault();preview.addEventListener('cancel',hold);
 $('#plantStatus').textContent='';
 let clearTransfer;
 try{
  clearTransfer=await transferReceipt(preview,preview.querySelector('.ticket-sheet'),MOODS[pendingFlower.profile.mood]?.hex);
  const res=await fetch('/api/taste/plant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:id,publishToGarden:true})});
  const data=await res.json();
  if(res.status===401&&creatorMode)showCreatorLogin();
  if(!res.ok||!data.publishedToGarden||data.record?.id!==id)throw Error(data.error||'정원 저장을 확인할 수 없어요.');
  pendingFlower=null;preview.close();$('#projectionDone').showModal();
 }catch(e){$('#plantStatus').textContent=e.message+' 다시 시도해 주세요.'}
 finally{clearTransfer?.();preview.removeEventListener('cancel',hold);buttons.forEach(button=>button.disabled=false)}
};

async function submit(){
 if(busy||!reviewsReady()||!$('#reviewForm').reportValidity())return;
 busy=true;$('#submit').disabled=true;$('#signin').hidden=true;saveDraft();
 const loading=$('#seedLoading');
 loading.showModal();startLoadingMessages();
 try{
 const questions=earlyQuestions.map((q,i)=>q?.key===reviewKey(i)?q:null);
 const answers=questions.flatMap((q,i)=>q?.id?[{questionId:q.id,answer:$('#earlyAnswer'+i)?.value||''}]:[]);
 const response=await fetch('/api/taste/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft(),sessionId,answers,reviewQuestions:questions.map(q=>q?.id||null),skipQuestions:true,confirmUnknown})});const data=await response.json();if(data.sessionId)sessionId=data.sessionId;if(!response.ok){if(data.code==='SIGN_IN'){if(creatorMode)showCreatorLogin();else $('#signin').hidden=false;}if(data.code==='SESSION_EXPIRED')sessionId=null;throw Error(data.error)}if(!data.complete){for(const q of data.questions||[]){const i=q.movieIndex??0;earlyQuestions[i]={key:reviewKey(i),id:q.id};renderReviewQuestion(i,q.question,true);}confirmUnknown=true;$('#status').textContent='아직 취향의 방향을 읽기 어려워요. 한 장면을 더 들려주셔도 좋고, 그대로 꽃을 피워도 괜찮아요.';$('#submit').textContent='이 감상으로 꽃 피우기';return;}$('#status').textContent='꽃 생성 중…';await new Promise(requestAnimationFrame);pendingFlower=data.record;$('#entry').close();showFlowerPreview();sessionId=null;confirmUnknown=false;questionList=[];document.querySelectorAll('.extra-question').forEach(el=>el.remove());$('#followups').hidden=true;$('#skip').hidden=true;$('#submit').textContent='다음';}catch(e){$('#status').textContent=(e.message||'연결에 실패했습니다.')+'\n입력 내용은 유지됩니다. 다시 시도할 수 있습니다.'}finally{stopLoadingMessages();loading.close();busy=false;$('#inputs').querySelectorAll('input,textarea,button').forEach(e=>e.disabled=false);updateReviewSubmit();$('#skip').disabled=!reviewsReady()}}
$('#reviewForm').onsubmit=e=>{e.preventDefault();if(entryStage===1){searchMovies();return}submit(false)};$('#skip').onclick=()=>submit(true);
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(layout,180)});
async function init(){try{const demos=await fetch('/demo-records.json?v=120').then(r=>r.json());records=samples(demos);
 if(['receipt','receipt-ipad'].includes(new URLSearchParams(location.search).get('preview'))&&records.length){
   pendingFlower=records[0];const tabletPreview=new URLSearchParams(location.search).get('preview')==='receipt-ipad';if(!tabletPreview)document.body.classList.add('receipt-demo');else{document.body.classList.add('creator-mode');document.body.classList.remove('projection-mode');}showFlowerPreview();if(!tabletPreview){$('#flowerPreview').close();$('#flowerPreview').setAttribute('open','');}$('#plantFlower').disabled=true;if(new URLSearchParams(location.search).get('motion')==='1'){$('#plantFlower').disabled=false;$('#plantFlower').onclick=async()=>{const button=$('#plantFlower');button.disabled=true;try{const clear=await transferReceipt($('#flowerPreview'),$('#receiptImage'),MOODS[pendingFlower.profile.mood]?.hex);clear();}finally{button.disabled=false;}};}return;
 }
 layout();wake();try{const r=await fetch(creatorMode?'/api/taste/flowers':'/api/taste/projection');if(r.ok){const data=await r.json();if(data.records.length){records.push(...data.records);layout()}}}catch{toast('나의 기록을 불러오지 못했습니다. 새로고침해 주세요.')}const s=await fetch('/api/taste/status').then(r=>r.json());$('#connection').textContent=`분석 키 ${s.analysisConfigured?'설정됨':'미설정'} · API 잔액은 분석 요청 시 확인 · 영화 검색 ${s.moviesConfigured?'설정됨':'미설정'}`;$('#tmdb-credit').hidden=!s.moviesConfigured}catch{toast('정원을 불러오지 못했습니다. 새로고침해 주세요.')}}init();

function emitPanelLight(i,color){document.querySelectorAll('.panel-bloom-light').forEach(el=>el.remove());if(reduced)return;const source=$('#detail');if(!source)return;const rect=source.getBoundingClientRect(),light=document.createElement('span');light.className='panel-bloom-light';light.setAttribute('aria-hidden','true');light.style.cssText=`left:${rect.left+rect.width/2}px;top:${rect.top+rect.height/2}px;--light-color:${color}`;document.body.append(light);light.addEventListener('animationend',()=>light.remove(),{once:true});}

async function showSelectionOutline(i,color){
 document.querySelectorAll('.selection-outline').forEach(el=>el.remove());
 const source=nodes.get(i),button=source?.querySelector('.flower');if(!button)return;
 const el=document.createElement('span');el.className='selection-outline';el.setAttribute('aria-hidden','true');button.append(el);
 try{
 const url=await asset(records[i]).preview;if(!el.isConnected||!source.classList.contains('selected'))return;
 const image=new Image();image.src=url;await image.decode();if(!el.isConnected)return;
 const size=384,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
 // Bake the alpha-edge once. No live SVG morphology or nested SVG is retained.
 for(let n=0;n<16;n++){const a=n*Math.PI/8;ctx.drawImage(image,Math.cos(a)*.8,Math.sin(a)*.8,size,size)}
 ctx.globalCompositeOperation='destination-out';ctx.drawImage(image,0,0,size,size);
 ctx.globalCompositeOperation='source-in';ctx.fillStyle=color;ctx.fillRect(0,0,size,size);
 const img=new Image();img.alt='';img.src=canvas.toDataURL('image/png');el.append(img);canvas.width=canvas.height=0;
 }catch{el.remove()}
}

let projectionSyncBusy=false,birthFinished=null;
async function syncProjection(){if(creatorMode||document.hidden||projectionSyncBusy)return;projectionSyncBusy=true;try{const res=await fetch('/api/taste/projection',{cache:'no-store'});if(!res.ok)return;const data=await res.json(),known=new Set(records.map(r=>r.id)),incoming=data.records.filter(r=>!known.has(r.id));if(!incoming.length)return;++bloomIntent;await closeDetailSmooth();const old=position;for(const record of incoming){records.push(record);layout();position=clamp(old,0,max());const index=records.length-1;placeNewFlower(index);pendingBirth=index;target=clamp(locations[index].x-innerWidth/2,0,max());await new Promise(resolve=>{birthFinished=resolve;wake()})}openDetail(records.length-1,undefined,true);nextAutoPanel=Date.now()+PANEL_HOLD_MS+AUTO_PANEL_MS;}catch{}finally{projectionSyncBusy=false}}
if(!creatorMode){setInterval(syncProjection,4000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncProjection()})}else{document.querySelector('.privacy').textContent+=' 정원에 심기를 누르면 꽃 그래픽이 벽의 공용 정원에 표시됩니다. 작성한 감상과 개인정보는 공개하지 않습니다.';document.querySelector('#entry .close').hidden=true;$('#create').click();$('#projectionAgain').onclick=()=>{$('#projectionDone').close();earlyQuestions.fill(null);document.querySelectorAll('.early-question').forEach(el=>el.remove());selectedMovies.fill(null);document.querySelectorAll('#inputs textarea,#inputs input').forEach(el=>el.value='');sessionId=null;confirmUnknown=false;questionList=[];document.querySelectorAll('.extra-question').forEach(el=>el.remove());$('#followups').hidden=true;$('#skip').hidden=true;sessionStorage.removeItem('gamdo-review-draft');$('#create').click()};}

function floatPanelOrbs(i,color){
 document.querySelectorAll('.panel-orbs').forEach(el=>el.remove());if(reduced)return;
 const source=nodes.get(i);if(!source)return;const panel=$('#detail');panel.getAnimations().forEach(a=>a.cancel());const r=source.getBoundingClientRect(),p=panel.getBoundingClientRect();
 const x=r.left+r.width/2,y=r.top+r.height/2,dx=p.left+p.width/2-x,dy=p.top+p.height/2-y;
 const group=document.createElement('div');group.className='panel-orbs';group.setAttribute('aria-hidden','true');group.style.cssText=`left:${x}px;top:${y}px;--orb-color:${color}`;

 [[-16,-20,3.5],[20,-30,5],[-10,18,7],[24,10,4.5]].forEach(([ox,oy,size],n)=>{
 const dot=document.createElement('i');dot.style.cssText=`width:${size}px;height:${size}px`;group.append(dot);
 // Continuous sine drift sampled once; browser composites transform/opacity.
 const frames=Array.from({length:121},(_,k)=>{const t=k/120,u=t*t*(3-2*t),spread=Math.sin(Math.PI*t),phase=n*1.7;
 const px=dx*u+ox*spread+Math.sin(t*Math.PI*2+phase)*10*spread;
 const py=dy*u+oy*spread+Math.sin(t*Math.PI*5+phase)*(10+n*2)*spread;
 const opacity=Math.min(1,t/.12)*Math.min(1,(1-t)/.30);
 return {offset:t,transform:`translate(calc(-50% + ${px}px),calc(-50% + ${py}px)) scale(${.6+.4*Math.min(1,t*6)})`,opacity};});
 dot.animate(frames,{duration:2400,delay:n*22,easing:'linear',fill:'both'});
 });

 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
 const paneFrames=Array.from({length:121},(_,k)=>{const t=k/120,u=smooth(t),grow=smooth((t-.43)/.57),scale=.014+.986*grow;
 return {offset:t,transform:`translate(${-dx*(1-u)}px,${-dy*(1-u)}px) scale(${scale})`,opacity:smooth((t-.38)/.32),borderRadius:`${50*(1-grow)+22/p.width*100*grow}% / ${50*(1-grow)+22/p.height*100*grow}%`,backgroundColor:`rgba(255,255,255,${.95-.30*grow})`};});
 panel.animate(paneFrames,{duration:2400,easing:'linear',fill:'none'});
 document.body.append(group);setTimeout(()=>group.remove(),2550);
}

let selectedIndex=-1,panelCloseTimer,closingDetail=null,ambientTime=0,ambientFrame=0,panDirection=1,nextAutoPanel=Date.now()+AUTO_PANEL_MS;
async function closeDetailSmooth(){
 clearTimeout(panelCloseTimer);if(closingDetail)return closingDetail;const panel=$('#detail');if(!panel.open)return;
 closingDetail=(async()=>{panel.getAnimations().forEach(a=>a.cancel());if(!reduced){const fade=panel.animate([{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.97)'}],{duration:650,easing:'ease-in',fill:'forwards'});await fade.finished.catch(()=>{});fade.cancel()}panel.close();closingDetail=null})();return closingDetail;
}
function ambientGarden(time){
 ambientFrame=0;if(document.hidden||creatorMode)return;
 const dt=Math.min(.08,(time-ambientTime)/1000||0);if(time-ambientTime<16){ambientFrame=requestAnimationFrame(ambientGarden);return}ambientTime=time;
 if(locations.length&&!paused&&!reduced&&!projectionSyncBusy&&pendingBirth===null&&!openingFlower&&!drag){
 stepGarden(locations,worldWidth,innerHeight,dt,selectedIndex);
 if(!$('#detail').open&&target===null&&Math.abs(velocity)<.5){position=clamp(position+panDirection*7*dt,0,max());if(position<=0)panDirection=1;if(position>=max())panDirection=-1}
 lastDrawPosition=null;draw();nodes.forEach((el,i)=>{const p=locations[i];el.style.setProperty('--flower-x',p.x+'px');el.style.setProperty('--flower-y',p.y+'px')});
 }
 if(Date.now()>=nextAutoPanel&&!$('dialog[open]')&&!drag&&performance.now()>=suppressUntil&&!openingFlower&&!projectionSyncBusy&&pendingBirth===null){
   const visible=[...nodes.keys()].filter(i=>locations[i].x-position>100&&locations[i].x-position<innerWidth-100);
   if(visible.length){
     nextAutoPanel=Date.now()+AUTO_PANEL_MS;
     openBloomDetail(visible[Math.floor(Math.random()*visible.length)]);
   }
 }
 ambientFrame=requestAnimationFrame(ambientGarden);
}
if(!creatorMode){ambientFrame=requestAnimationFrame(ambientGarden);document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(ambientFrame);ambientFrame=0}else{ambientTime=performance.now();if(!ambientFrame)ambientFrame=requestAnimationFrame(ambientGarden)}})}

function renderReviewQuestion(i,question,open=false){const parent=$('#review'+i).closest('.review-writing');
  parent.querySelector('.early-question')?.remove();
  parent.insertAdjacentHTML('beforeend',`<details class="early-question" ${open?'open':''}><summary title="${esc(question)}"><span class="question-symbol" aria-hidden="true">✳</span><span class="question-text">${esc(question.replace(/\s+/g,' '))}</span><svg class="question-chevron" aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></summary><textarea id="earlyAnswer${i}" aria-label="${esc(question)}" maxlength="1500" placeholder="답변은 선택이에요."></textarea></details>`);
}
const earlyQuestions=[null,null,null];
function reviewKey(i){return JSON.stringify([$('#title'+i).value,$('#review'+i).value])}
$('#inputs').addEventListener('input',e=>{
 if(!/^review[0-2]$/.test(e.target.id))return;
 const i=Number(e.target.id.at(-1));reviewEdited[i]=true;earlyQuestions[i]=null;e.target.closest('.review-writing').querySelector('.early-question')?.remove();
});
$('#inputs').addEventListener('focusout',async e=>{
 if(!/^review[0-2]$/.test(e.target.id)||busy)return;
 const i=Number(e.target.id.at(-1)),key=reviewKey(i),[title,review]=JSON.parse(key);
 if(!reviewEdited[i]||review.trim().length<40||earlyQuestions[i]?.key===key)return;
 const state={key};earlyQuestions[i]=state;
 const parent=e.target.closest('.review-writing');
 try{
  const res=await fetch('/api/taste/question',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,review})});
  const data=await res.json();if(!res.ok)throw Error(data.error);
  if(earlyQuestions[i]!==state||reviewKey(i)!==key||busy)return;
  if(data.needsQuestion===false){state.complete=true;parent.querySelector('.early-question')?.remove();return}
  if(!data.id||typeof data.question!=='string'||!data.question.trim()){earlyQuestions[i]=null;return}
  state.id=data.id;
  renderReviewQuestion(i,data.question);
 }catch{if(earlyQuestions[i]===state){earlyQuestions[i]=null;if(!busy)$('#status').textContent='추가 질문을 불러오지 못했어요. 작성한 감상으로 꽃을 피울 수 있어요.'}}
 finally{if(earlyQuestions[i]===state&&!state.id&&!state.complete)earlyQuestions[i]=null}
});

const CREATOR_IDLE_MS=90_000;
let idleDeadline=0,idleTimer,checkingCreatorSession=false,creatorStarted=false;

function checkCreatorIdle(){
 clearTimeout(idleTimer);
 if(!idleDeadline)return;
 const remaining=idleDeadline-Date.now();
 if(remaining>0){
  idleTimer=setTimeout(checkCreatorIdle,remaining);
  return;
 }
 idleDeadline=0;
 try{sessionStorage.removeItem('gamdo-review-draft')}catch{}
 location.replace('/create');
}

function trackCreatorActivity(){
 if(!creatorStarted)return;
 if(idleDeadline&&Date.now()>=idleDeadline){checkCreatorIdle();return}
 idleDeadline=Date.now()+CREATOR_IDLE_MS;
 checkCreatorIdle();
}

function showCreatorLogin(){
 const gate=$('#creatorGate');
 $('#creatorGateStatus').textContent='영화 취향을 담은 꽃을 만들려면 로그인해 주세요.';
 $('#creatorLogin').hidden=false;
 $('#creatorRetry').hidden=true;
 if(!gate.open)gate.showModal();
}

async function checkCreatorSession(){
 if(document.hidden||checkingCreatorSession)return;
 checkingCreatorSession=true;
 const gate=$('#creatorGate');
 try{
  const response=await fetch('/api/taste/status',{cache:'no-store'});
  if(!response.ok)throw Error('session status');
  const status=await response.json();
  if(!status.signedIn){showCreatorLogin();return}
  gate.close();
  if(!creatorStarted){
   creatorStarted=true;
   $('#create').click();
   if(selectedMovies.some(Boolean))trackCreatorActivity();
  }
 }catch{
  if(!creatorStarted){
   $('#creatorGateStatus').textContent='연결이 끊겼어요. 다시 확인해 주세요.';
   $('#creatorRetry').hidden=false;
  }
 }finally{checkingCreatorSession=false}
}

if(creatorMode){
 $('#creatorGate').addEventListener('cancel',e=>e.preventDefault());
 $('#creatorRetry').onclick=checkCreatorSession;
 $('#creatorGate').showModal();
 for(const event of ['pointerdown','keydown','input','wheel','click']){
  document.addEventListener(event,trackCreatorActivity,{capture:true,passive:true});
 }
 function resumeCreator(){
  if(document.hidden)return;
  if(idleDeadline&&Date.now()>=idleDeadline){checkCreatorIdle();return}
  checkCreatorSession();
 }
 document.addEventListener('visibilitychange',resumeCreator);
 window.addEventListener('pageshow',resumeCreator);
 setInterval(checkCreatorSession,60_000);
 checkCreatorSession();
}

const receiptBack=document.querySelector('#flowerPreview>.close');receiptBack.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';receiptBack.setAttribute('aria-label','처음으로 돌아가기');receiptBack.onclick=()=>{sessionStorage.removeItem('gamdo-review-draft');location.assign('/create')};

const loadingMessages=['감상 속 취향을 읽고 있어요','마음에 남은 장면을 모으는 중···','좋아했던 순간의 색을 찾는 중···','감상 사이에 숨어 있는 취향을 찾고 있어요','꽃이 피어날 준비 중이에요'];
let loadingMessageTimer=null,loadingMessageIndex=-1;
function changeLoadingMessage(){const choices=loadingMessages.map((_,i)=>i).filter(i=>i!==loadingMessageIndex);loadingMessageIndex=choices[Math.floor(Math.random()*choices.length)];document.querySelector('#seedLoading p[role="status"]').textContent=loadingMessages[loadingMessageIndex];}
function startLoadingMessages(){clearInterval(loadingMessageTimer);changeLoadingMessage();loadingMessageTimer=setInterval(changeLoadingMessage,3600);}
function stopLoadingMessages(){clearInterval(loadingMessageTimer);loadingMessageTimer=null;}
document.querySelector('#seedLoading').addEventListener('close',stopLoadingMessages);

