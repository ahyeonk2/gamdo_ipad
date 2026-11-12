import {approvedColors} from './approved-colors.js?v=1';
import {MOODS} from './generator-adapter.js?v=44-approved-color-1';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ends=[['절제','강렬'],['잔잔','격렬'],['관찰','동일시'],['분리','연결'],['거리','몰입'],['명료함','열린 해석']];
export function ticketDate(value){if(!value)return '';const date=new Date(value);if(!Number.isFinite(+date))return '';const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('.');}
// Keep original analysis wording, selecting complete sentences rather than axis labels.
export function ticketDescription(profile){
 const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
 if(clean(profile.description))return clean(profile.description);
 const sections=profile.sections||{},keys=['sensory','emotional','character','relationship','narrative','values'];
 const axisIndex={sensory:0,emotional:1,character:2,relationship:3,narrative:5};
 const sentences=[];
 for(const key of keys){
  const axis=profile.axes?.[axisIndex[key]];
  if(axis&&(axis.status==='unknown'||axis.level==='부족'))continue;
  const text=clean(sections[key]);
  const sentence=text.match(/^.*?[.!?](?:[”’"]|$|\s)/)?.[0]?.trim()||text;
  if(!sentence||/근거.{0,12}부족|단서.{0,12}부족|아직.*드러나지|판단.{0,8}어려/.test(sentence))continue;
  sentences.push(sentence);
  if(sentences.join(' ').length>=170||sentences.length>=4)break;
 }
 return sentences.length>=2?sentences.join(' '):clean(profile.description);
}
export function ticketAxes(record){return record.profile.axes.map((axis,index)=>{const unknown=axis.level==='부족'||axis.status==='unknown',value=unknown?50:Math.max(0,Math.min(100,Number(axis.value)||0));const label=unknown?'중간값':axis.status==='mixed'?'함께 선호':value===50?'중간값':ends[index][value<50?0:1];return {name:axis.name,value,unknown,label};});}
export function ticketContents(input){
 const r=approvedColors(input),p=r.profile,palette=p.palette?.length?p.palette:[{mood:p.mood||'pink',weight:100}];
 const description=ticketDescription(p);
 const axes=ticketAxes(r).map(axis=>`<div class="ticket-axis" data-value="${axis.value}"><b>${escape(axis.name)}</b><div class="ticket-axis-track" role="img" aria-label="${escape(axis.name)} · ${axis.value} · ${axis.label}"><span style="width:${axis.value}%"></span></div><strong>${escape(axis.label)}</strong></div>`).join('');
 return `<h2 class="ticket-title">${escape(p.title)}</h2><div class="ticket-films">${r.movies.map(movie=>`<div><h3>${escape(movie.title)}</h3><p>${escape(movie.year||'연도 미상')}</p></div>`).join('')}</div>${description?`<p class="ticket-description">${escape(description)}</p>`:''}<section class="ticket-analysis" aria-label="6가지 영역"><div class="ticket-section-heading"><span>6가지 영역</span><i aria-hidden="true"></i></div><div class="ticket-axes">${axes}</div></section><section class="ticket-color" aria-label="컬러"><div class="ticket-section-heading"><span>컬러</span><i aria-hidden="true"></i></div><div class="ticket-color-names">${palette.map(color=>`<span>${escape(MOODS[color.mood]?.name||color.mood)}</span>`).join('')}</div></section>`;
}
