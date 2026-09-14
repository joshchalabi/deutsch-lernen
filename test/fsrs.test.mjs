import { newCard, schedule, Rating, retrievability, previewIntervals } from '../.tmp-test/fsrs.mjs'
const DAY=86400000
let fail=0
const ok=(c,m)=>{ console.log((c?'  ✓ ':'  ✗ ')+m); if(!c) fail++ }

console.log('1) Yeni kart hep "Good" ile: aralıklar büyümeli')
let c=newCard(0), t=0, ivs=[]
for(let i=0;i<8;i++){ const r=schedule(c,Rating.Good,t); c=r.card; ivs.push(r.intervalDays); t=c.due }
console.log('   aralıklar (gün):', ivs.join(' → '))
ok(ivs.every((v,i)=>i===0||v>=ivs[i-1]), 'aralıklar monoton artıyor')
ok(ivs[7]>30, 'sekizinci tekrarda aralık 30 günü aşıyor')

console.log('\n2) "Again" cezası: dayanıklılık düşmeli, aralık sıfırlanmalı')
let c2=newCard(0); c2=schedule(c2,Rating.Good,0).card
c2=schedule(c2,Rating.Good,c2.due).card
const sBefore=c2.s
const after=schedule(c2,Rating.Again,c2.due)
ok(after.card.s<sBefore, `dayanıklılık düştü (${sBefore.toFixed(1)} → ${after.card.s.toFixed(1)})`)
ok(after.card.state==='relearning','durum relearning oldu')
ok(after.card.lapses===1,'lapses sayacı arttı')
ok(after.intervalDays===0,'aralık gün bazında sıfırlandı')

console.log('\n3) Zorluk sınırları 1..10 arasında kalmalı')
let c3=newCard(0), tt=0, minD=99, maxD=-99
for(let i=0;i<60;i++){ const rt=[1,2,3,4][i%4]; const r=schedule(c3,rt,tt); c3=r.card; tt=c3.due; minD=Math.min(minD,c3.d); maxD=Math.max(maxD,c3.d) }
console.log(`   zorluk aralığı: ${minD.toFixed(2)} .. ${maxD.toFixed(2)}`)
ok(minD>=1&&maxD<=10,'zorluk 1..10 sınırları içinde')
ok(Number.isFinite(c3.s)&&c3.s>0,'dayanıklılık sonlu ve pozitif')

console.log('\n4) Hatırlama olasılığı zamanla düşmeli')
let c4=newCard(0); c4=schedule(c4,Rating.Good,0).card
const r0=retrievability(c4,c4.last), r10=retrievability(c4,c4.last+10*DAY), r100=retrievability(c4,c4.last+100*DAY)
console.log(`   R: 0gün=${r0.toFixed(3)}  10gün=${r10.toFixed(3)}  100gün=${r100.toFixed(3)}`)
ok(r0>r10&&r10>r100,'R monoton azalıyor')
ok(r0>0.99,'tekrar anında R ≈ 1')

console.log('\n5) Hedef hatırlama oranı tutuyor mu? (aralık sonunda R ≈ 0.90)')
let c5=newCard(0); let time=0
for(let i=0;i<5;i++){ const r=schedule(c5,Rating.Good,time); c5=r.card; time=c5.due }
const rAtDue=retrievability(c5,c5.due)
console.log(`   planlanan tekrar anında R = ${rAtDue.toFixed(3)}`)
ok(Math.abs(rAtDue-0.90)<0.06,'R hedeflenen 0.90 civarında')

console.log('\n6) Easy > Good > Hard > Again sıralaması')
let c6=newCard(0); c6=schedule(c6,Rating.Good,0).card; c6=schedule(c6,Rating.Good,c6.due).card
const p=previewIntervals(c6,c6.due)
console.log(`   Again=${p[1]}g Hard=${p[2]}g Good=${p[3]}g Easy=${p[4]}g`)
ok(p[4]>=p[3]&&p[3]>=p[2],'Easy ≥ Good ≥ Hard')

console.log(fail===0?'\n✅ FSRS motoru tüm testleri geçti':`\n❌ ${fail} test başarısız`)
process.exit(fail?1:0)
