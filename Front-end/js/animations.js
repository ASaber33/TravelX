const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

export function initLandingMotion(){
 const root=document.documentElement;
 root.classList.add('motion-ready');
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}
 }),{threshold:.12,rootMargin:'0px 0px -5% 0px'});
 document.querySelectorAll('.reveal,.number-cell').forEach(el=>observer.observe(el));

 const counterAnimations=new Map();
 const counters=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const node=entry.target.querySelector('[data-count]'),target=Number(node?.dataset.count||0);
  if(node){
   if(reduceMotion.matches){node.textContent=target}
   else{
    const start=performance.now(),duration=1500,animation={frame:0,node,target};
    const tick=now=>{
     const p=Math.min((now-start)/duration,1),ease=1-Math.pow(1-p,4);
     node.textContent=Math.round(target*ease);
     if(p<1)animation.frame=requestAnimationFrame(tick);
     else counterAnimations.delete(entry.target);
    };
    animation.frame=requestAnimationFrame(tick);
    counterAnimations.set(entry.target,animation);
   }
  }
  counters.unobserve(entry.target)
 }),{threshold:.5});document.querySelectorAll('.number-cell').forEach(el=>counters.observe(el));
 reduceMotion.addEventListener('change',event=>{
  if(!event.matches)return;
  counterAnimations.forEach(({frame,node,target})=>{
   cancelAnimationFrame(frame);
   node.textContent=target;
  });
  counterAnimations.clear();
  document.querySelectorAll('.magnetic').forEach(button=>button.style.transform='');
 });

 const nav=document.querySelector('.landing-nav');let scrollQueued=false;
 const scrollUpdate=()=>{nav?.classList.toggle('is-scrolled',window.scrollY>35);scrollQueued=false};
 window.addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(scrollUpdate)}},{passive:true});scrollUpdate();

 if(matchMedia('(hover:hover) and (pointer:fine)').matches){document.querySelectorAll('.magnetic').forEach(button=>{button.addEventListener('pointermove',event=>{if(reduceMotion.matches)return;const r=button.getBoundingClientRect(),dx=event.clientX-r.left-r.width/2,dy=event.clientY-r.top-r.height/2;button.style.transform=`translate(${dx*.07}px,${dy*.1}px)`});button.addEventListener('pointerleave',()=>button.style.transform='')})}

 const sectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('.landing-nav .nav-links a').forEach(a=>a.classList.toggle('current',a.getAttribute('href')===`#${entry.target.id}`))}}),{rootMargin:'-35% 0px -55% 0px'});document.querySelectorAll('main section[id]').forEach(section=>sectionObserver.observe(section));
}
