// Persondata laddas från data/people.js.

let round=0,score=0,streak=0,highScore=0,answered=false,lifelineUsed=false;
function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}return arr}
let deck=shuffle([...PEOPLE]);
const correctHistory=[];
const map=document.getElementById("map"), world=document.getElementById("mapWorld"), birthPin=document.getElementById("birthPin"), deathPin=document.getElementById("deathPin"), guessBox=document.querySelector(".guess-area");
function yearOnly(date){const m=date.match(/\d{1,4}/g);return m?m[m.length-1]:date}
function project([lat,lon]){const w=map.clientWidth,h=map.clientHeight;return{x:((lon+180)/360)*w,y:((85-lat)/145)*h}}
function setZoomAndCenter(a,d){
 const w=map.clientWidth,h=map.clientHeight;
 // Keep the two true geographic points visible with as much useful zoom as possible.
 // The map is transformed; the markers remain fixed-size overlays at the exact
 // projected coordinates, so zoom never changes their physical size or moves them.
 const padX=150,padY=110;
 const dx=Math.abs(d.x-a.x),dy=Math.abs(d.y-a.y);
 const maxScale=4.5;
 let scale=Math.min(maxScale,Math.max(1.0,Math.min((w-padX*2)/Math.max(dx,1),(h-padY*2)/Math.max(dy,1))));
 const distance=Math.hypot(dx,dy);
 // Very close locations deserve extra zoom so they are not visually collapsed.
 if(distance < 120) scale=Math.min(maxScale,Math.max(scale,3.2));
 if(distance < 45) scale=Math.min(maxScale,Math.max(scale,4.0));
 if(distance < 2) scale=maxScale;
 const cx=(a.x+d.x)/2,cy=(a.y+d.y)/2;
 let tx=w/2-cx*scale,ty=h/2-cy*scale;
 const minTx=w-w*scale,maxTx=0,minTy=h-h*scale,maxTy=0;
 tx=Math.max(minTx,Math.min(maxTx,tx));
 ty=Math.max(minTy,Math.min(maxTy,ty));
 world.style.transform=`translate(${tx}px,${ty}px) scale(${scale})`;
 return {scale,tx,ty};
}
function screenPoint(base,view){
 return {x:base.x*view.scale+view.tx,y:base.y*view.scale+view.ty};
}
function placePins(p){
 const a=project(p.b),d=project(p.d);
 const view=setZoomAndCenter(a,d);
 const exactBirth=screenPoint(a,view),exactDeath=screenPoint(d,view);
 const samePlace=Math.hypot(exactDeath.x-exactBirth.x,exactDeath.y-exactBirth.y)<2;

 // Markers are anchored directly to the real geographic coordinates.
 // There is no artificial positional offset anymore.
 birthPin.style.left=exactBirth.x+"px";
 birthPin.style.top=exactBirth.y+"px";
 deathPin.style.left=exactDeath.x+"px";
 deathPin.style.top=exactDeath.y+"px";
 birthPin.classList.toggle("same-location",samePlace);
 deathPin.classList.toggle("same-location",samePlace);

 document.getElementById("birthYear").textContent=yearOnly(p.birth);
 document.getElementById("deathYear").textContent=yearOnly(p.death);

 // The guess UI is positioned independently of the pins and chooses a safe
 // open area of the map rather than always sitting beside the death point.
 positionGuessBox(exactBirth,exactDeath);
}
function positionGuessBox(b,d){
 const pad=12;
 const w=guessBox.offsetWidth||270,h=guessBox.offsetHeight||64;
 const mw=map.clientWidth,mh=map.clientHeight;
 const candidates=[
   {x:mw-w-pad,y:mh-h-pad},
   {x:pad,y:mh-h-pad},
   {x:mw-w-pad,y:pad},
   {x:pad,y:pad},
   {x:(mw-w)/2,y:mh-h-pad},
   {x:(mw-w)/2,y:pad},
   {x:mw-w-pad,y:(mh-h)/2},
   {x:pad,y:(mh-h)/2}
 ];
 const pinSafe=34;
 const important=[b,d];
 function scoreCandidate(c){
   const cx=c.x+w/2,cy=c.y+h/2;
   let score=0;
   for(const q of important){
     const dx=Math.max(Math.abs(q.x-cx)-w/2,0);
     const dy=Math.max(Math.abs(q.y-cy)-h/2,0);
     const gap=Math.hypot(dx,dy);
     if(gap < pinSafe) score += 100000 + (pinSafe-gap)*1000;
     score += 1/(gap+12)*5000;
   }
   // Prefer lower/right placement when equally safe, while never forcing it.
   score += (mw-c.x)*0.01 + (mh-c.y)*0.005;
   return score;
 }
 candidates.forEach(c=>{
   c.x=Math.max(pad,Math.min(mw-w-pad,c.x));
   c.y=Math.max(pad,Math.min(mh-h-pad,c.y));
 });
 const best=candidates.sort((a,b)=>scoreCandidate(a)-scoreCandidate(b))[0];
 guessBox.style.left=best.x+"px";
 guessBox.style.top=best.y+"px";
}
function loadRound(){
 answered=false;document.getElementById("guess").value="";document.getElementById("guess").disabled=false;
 document.getElementById("result").className="result hidden";document.getElementById("nextBtn").className="next hidden";
 document.getElementById("runStatus").textContent="Pågående";
 const p=deck[round%deck.length];
 document.getElementById("runLabel").textContent=`Runda ${round+1}`;document.getElementById("highScore").textContent=highScore;
 document.getElementById("lifelineText").textContent=lifelineUsed?"Livlinan är använd":"1 livlina kvar";document.getElementById("lifelineBtn").disabled=lifelineUsed;
 requestAnimationFrame(()=>placePins(p));
}
function normalize(s){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim().replace(/\s+/g," ")}
function levenshtein(a,b){if(a===b)return 0;if(!a)return b.length;if(!b)return a.length;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur}return prev[b.length]}
function fuzzyMatch(answer,guess){
 if(!guess)return false;
 if(answer===guess)return true;
 // Never accept a partial name. Each alias is a complete acceptable form
 // (e.g. "curie", "da vinci", or "leonardo da vinci").
 const d=levenshtein(answer,guess),max=Math.max(answer.length,guess.length);
 const allowed=max<=5?1:max<=9?2:Math.max(2,Math.floor(max*.18));
 return d<=allowed;
}
document.getElementById("guessForm").addEventListener("submit",e=>{
 e.preventDefault();
 if(answered)return;
 answered=true;
 const p=deck[round%deck.length],guess=normalize(document.getElementById("guess").value),correct=p.aliases.some(a=>fuzzyMatch(normalize(a),guess)),r=document.getElementById("result");
 r.className="result "+(correct?"correct":"wrong");
 if(correct){
   score++;streak++;highScore=Math.max(highScore,score);
   document.getElementById("runStatus").textContent="Rätt!";
   r.innerHTML=`<h3>Rätt! ${p.name}</h3><p>Född ${p.birth}. Död ${p.death}.</p>`;
   correctHistory.push({round:round+1,name:p.name,birth:p.birth,death:p.death});
   renderHistory();
 }else{
   streak=0;
   // A wrong guess ends the current run. The next run must start at round 1.
   round=0;
   deck=shuffle([...PEOPLE]);
   document.getElementById("runLabel").textContent="Runda 1";
   document.getElementById("runStatus").textContent="Rundan är slut";
   r.innerHTML=`<h3>Fel gissning.</h3><p>Rätt svar var <strong>${p.name}</strong>. Född ${p.birth} i ${p.bp}; dog ${p.death} i ${p.dp}.</p><p><strong>Rundan är slut.</strong> Nästa gång börjar du om från noll.</p>`;
   document.getElementById("nextBtn").textContent="Ny runda →";
   document.getElementById("nextBtn").className="next";
 }
 document.getElementById("highScore").textContent=highScore;
 document.getElementById("guess").disabled=true;
 requestAnimationFrame(()=>placePins(p));
 if(correct){setTimeout(()=>{
   const previous=deck[round%deck.length];
   round++;
   if(round%deck.length===0){
     deck=shuffle([...PEOPLE]);
     if(deck.length>1 && deck[0]===previous){[deck[0],deck[1]]=[deck[1],deck[0]]}
   }
   loadRound();
 },850)}
});
function renderHistory(){
 const list=document.getElementById("historyList");
 if(!correctHistory.length){list.innerHTML='<div class="history-empty">Inga rätta gissningar ännu.</div>';return;}
 list.innerHTML=correctHistory.slice().reverse().map(x=>`<div class="history-item"><span class="history-round">${x.round}</span><span><strong>${x.name}</strong><small>${x.birth} → ${x.death}</small></span></div>`).join("");
}
document.getElementById("runLabel").addEventListener("click",()=>document.getElementById("historyPanel").classList.toggle("hidden"));
document.addEventListener("click",e=>{const panel=document.getElementById("historyPanel"),btn=document.getElementById("runLabel");if(!panel.contains(e.target)&&e.target!==btn)panel.classList.add("hidden")});
document.getElementById("lifelineBtn").addEventListener("click",()=>{if(lifelineUsed||answered)return;lifelineUsed=true;const p=deck[round%deck.length];document.getElementById("lifelineBtn").disabled=true;document.getElementById("lifelineText").textContent="Livlinan är använd";const r=document.getElementById("result");r.className="result";r.innerHTML=`<h3>Livlina</h3><p>En ledtråd: <strong>${p.hint}</strong>.</p>`;requestAnimationFrame(()=>placePins(p))});
document.getElementById("nextBtn").addEventListener("click",()=>{
 score=0;
 streak=0;
 lifelineUsed=false;
 deck=shuffle([...PEOPLE]);
 document.getElementById("nextBtn").textContent="Nästa →";
 loadRound();
});
window.addEventListener("resize",loadRound);loadRound();
