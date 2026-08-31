document.addEventListener('DOMContentLoaded',()=>{
 const items=[...document.querySelectorAll('.faq article')];
 items.forEach(item=>item.querySelector('button').addEventListener('click',()=>{
  const opening=!item.classList.contains('open');
  items.forEach(other=>{other.classList.remove('open');other.querySelector('button').setAttribute('aria-expanded','false')});
  if(opening){item.classList.add('open');item.querySelector('button').setAttribute('aria-expanded','true')}
 }));
 const reveal=[...document.querySelectorAll('.reveal')];
 if(!('IntersectionObserver'in window)){reveal.forEach(item=>item.classList.add('visible'));return}
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
 reveal.forEach(item=>observer.observe(item));
});
