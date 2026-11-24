import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// Handwritten 5 by 7 alphabet; all typesetting is drawn into the pixel buffer.
const glyphs: Record<string,string> = {
 A:'01110/10001/10001/11111/10001/10001/10001',B:'11110/10001/10001/11110/10001/10001/11110',C:'01111/10000/10000/10000/10000/10000/01111',D:'11110/10001/10001/10001/10001/10001/11110',E:'11111/10000/10000/11110/10000/10000/11111',F:'11111/10000/10000/11110/10000/10000/10000',G:'01111/10000/10000/10111/10001/10001/01111',H:'10001/10001/10001/11111/10001/10001/10001',I:'11111/00100/00100/00100/00100/00100/11111',J:'00111/00010/00010/00010/10010/10010/01100',K:'10001/10010/10100/11000/10100/10010/10001',L:'10000/10000/10000/10000/10000/10000/11111',M:'10001/11011/10101/10101/10001/10001/10001',N:'10001/11001/10101/10011/10001/10001/10001',O:'01110/10001/10001/10001/10001/10001/01110',P:'11110/10001/10001/11110/10000/10000/10000',Q:'01110/10001/10001/10001/10101/10010/01101',R:'11110/10001/10001/11110/10100/10010/10001',S:'01111/10000/10000/01110/00001/00001/11110',T:'11111/00100/00100/00100/00100/00100/00100',U:'10001/10001/10001/10001/10001/10001/01110',V:'10001/10001/10001/10001/10001/01010/00100',W:'10001/10001/10001/10101/10101/10101/01010',X:'10001/10001/01010/00100/01010/10001/10001',Y:'10001/10001/01010/00100/00100/00100/00100',Z:'11111/00001/00010/00100/01000/10000/11111',
 '0':'01110/10001/10011/10101/11001/10001/01110','1':'00100/01100/00100/00100/00100/00100/01110','2':'01110/10001/00001/00010/00100/01000/11111','3':'11110/00001/00001/01110/00001/00001/11110','4':'00010/00110/01010/10010/11111/00010/00010','5':'11111/10000/10000/11110/00001/00001/11110','6':'01110/10000/10000/11110/10001/10001/01110','7':'11111/00001/00010/00100/01000/01000/01000','8':'01110/10001/10001/01110/10001/10001/01110','9':'01110/10001/10001/01111/00001/00001/01110',
 ' ':'00000/00000/00000/00000/00000/00000/00000','-':'00000/00000/00000/11111/00000/00000/00000','.':'00000/00000/00000/00000/00000/00110/00110',',':'00000/00000/00000/00000/00110/00110/00100','$':'00100/01111/10100/01110/00101/11110/00100',
};
const W=1024,H=1024;
const paper=[248,245,234], ink=[25,25,23], red=[126,33,32], pale=[224,219,202];
const pixels=Buffer.alloc(W*H*3);
function rect(x:number,y:number,w:number,h:number,c=ink) {
 for(let j=Math.max(0,Math.floor(y));j<Math.min(H,y+h);j++) for(let i=Math.max(0,Math.floor(x));i<Math.min(W,x+w);i++) {const p=(j*W+i)*3; pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];}
}
function line(x:number,y:number,X:number,Y:number,c=ink,t=2) {const n=Math.max(Math.abs(X-x),Math.abs(Y-y));for(let i=0;i<=n;i++)rect(Math.round(x+(X-x)*i/(n||1)),Math.round(y+(Y-y)*i/(n||1)),t,t,c);}
function circle(x:number,y:number,r:number,c=ink) {for(let j=-r;j<=r;j++)for(let i=-r;i<=r;i++)if(i*i+j*j<=r*r)rect(x+i,y+j,1,1,c);}
function poly(points:number[][],c=ink) {const min=Math.min(...points.map(p=>p[1])),max=Math.max(...points.map(p=>p[1]));for(let y=min;y<=max;y++){const xs:number[]=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let k=0;k+1<xs.length;k+=2)rect(Math.ceil(xs[k]),y,Math.floor(xs[k+1])-Math.ceil(xs[k])+1,1,c);}}
function text(s:string,x:number,y:number,sx=1,sy=2,c=ink) {for(const ch of s.toUpperCase()){const g=glyphs[ch];if(!g)throw Error('Missing glyph '+ch);g.split('/').forEach((row,j)=>[...row].forEach((v,i)=>{if(v==='1')rect(x+i*sx,y+j*sy,sx,sy,c);}));x+=6*sx;}}
function centered(s:string,y:number,sx:number,sy:number,c=ink){text(s,Math.round((W-(s.length*6-1)*sx)/2),y,sx,sy,c);}
function wrap(s:string,cols:number){const result:string[]=[];let row='';for(const word of s.split(' ')){if(row.length+word.length+1>cols){result.push(row);row=word;}else row+=(row?' ':'')+word;}if(row)result.push(row);return result;}
function paragraph(s:string,x:number,y:number,width:number){const rows=wrap(s,Math.floor((width+1)/6));if(rows.length>3)throw Error('Body exceeds three lines');rows.forEach((r,i)=>text(r,x,y+i*21,1,2));}
function waves(x:number,y:number){for(let n=0;n<3;n++)for(let i=0;i<6;i++)line(x+i*12,y+n*7+(i%2)*3,x+(i+1)*12,y+n*7+((i+1)%2)*3,ink,1);}
function ship(x:number,y:number){poly([[x,y],[x+66,y],[x+55,y+13],[x+12,y+13]]);rect(x+18,y-12,31,12);rect(x+31,y-25,3,17);line(x+33,y-19,x+51,y-14);}
function icon(kind:number,x:number,y:number){
 if(kind===0){ship(x+1,y+35);waves(x,y+51);line(x+20,y+3,x+54,y+3);line(x+37,y-3,x+37,y+10);circle(x+18,y+3,4);circle(x+56,y+3,4);}
 if(kind===1){poly([[x+3,y+14],[x+35,y-1],[x+67,y+14]]);rect(x+4,y+17,62,3);for(let i=0;i<4;i++)rect(x+10+i*15,y+23,6,22);rect(x+3,y+47,65,4);text('$',x+29,y+22,2,2,paper);ship(x+5,y+52);}
 if(kind===2){poly([[x+4,y+31],[x+4,y+15],[x+23,y+26],[x+23,y+15],[x+43,y+26],[x+43,y+7],[x+51,y+7],[x+51,y+57],[x+4,y+57]]);for(let i=0;i<3;i++)rect(x+11+i*12,y+36,6,9,paper);poly([[x+53,y+34],[x+46,y+22],[x+57,y+25],[x+61,y+8],[x+72,y+28],[x+67,y+43]],red);circle(x+56,y+57,10);rect(x+42,y+61,28,4);}
 if(kind===3){circle(x+18,y+49,15);circle(x+18,y+49,12,paper);text('$',x+13,y+42,2,2);circle(x+48,y+56,13);circle(x+48,y+56,10,paper);line(x+2,y+4,x+25,y+18,red,4);line(x+25,y+18,x+39,y+10,red,4);line(x+39,y+10,x+67,y+36,red,4);poly([[x+53,y+35],[x+70,y+40],[x+68,y+21]],red);}
 if(kind===4){rect(x+3,y+34,66,27);for(let i=0;i<6;i++)rect(x+9+i*10,y+39,4,18,paper);circle(x+35,y+27,16);rect(x+18,y+27,35,8);rect(x+33,y+3,3,10);line(x+35,y+3,x+48,y+7);rect(x+51,y+46,23,20,paper);rect(x+53,y+48,19,16);line(x+56,y+54,x+67,y+54,paper);poly([[x+58,y+51],[x+60,y+41],[x+69,y+44],[x+66,y+52]],pale);}
 if(kind===5){circle(x+52,y+16,14,pale);poly([[x,y+47],[x+23,y+9],[x+42,y+36],[x+53,y+21],[x+76,y+49]]);poly([[x+15,y+22],[x+23,y+9],[x+32,y+25],[x+24,y+22],[x+21,y+26]],paper);poly([[x+2,y+60],[x+20,y+49],[x+39,y+51],[x+44,y+55],[x+61,y+47],[x+71,y+50],[x+48,y+66],[x+19,y+67]],red);}
}
rect(0,0,W,H,paper);
centered('THE WORLD TODAY',30,8,8);
rect(32,103,960,5,red);
centered('MONDAY 23 NOVEMBER 2026',122,2,2);
line(32,153,992,153,ink,1);
text('CLIMATE',32,172,1,2,red);
text('CLIMATE TALKS COLLAPSE AS DEAL FAILS',32,199,4,4);
// A rising sun, fractured globe and a small conference gavel.
circle(118,296,51,pale);rect(49,298,140,54,paper);circle(112,301,43);circle(112,301,40,paper);
poly([[85,275],[102,264],[116,273],[108,288],[119,298],[102,306],[96,323],[86,310]],pale);
poly([[127,278],[143,288],[145,310],[130,328],[124,310],[115,304]],pale);
line(113,260,104,283,red,3);line(104,283,119,299,red,3);line(119,299,108,319,red,3);line(108,319,116,339,red,3);
line(154,318,182,340,ink,5);line(159,306,144,325,ink,8);rect(162,344,29,5);
paragraph('The COP31 climate summit ends without a deal after the European Union and other countries reject a final text silent on fossil fuels, closing the longest climate summit on record with no agreement on moving away from fossil fuels.',222,278,762);
const stories=[
 {label:'UKRAINE',title:['UKRAINE SINKS RUSSIAN','WARSHIP OFF LIBYA'],body:'Ukraine says its naval drones sank the Russian corvette Merkury off Libya, and NATO holds an emergency meeting over Russian objects that came down in Poland last week.'},
 {label:'IRAN',title:['US HITS IRAN SHADOW','BANKING WITH SANCTIONS'],body:'The United States imposes new sanctions on more than two dozen Iranian exchange houses and front companies, as Iran vows to use every means to counter a US blockade of the Strait of Hormuz.'},
 {label:'INDONESIA',title:['24 KILLED IN INDONESIA','FACTORY FIRE'],body:'At least 24 people are killed in a fire that tears through a factory in Indonesia, as rescuers search for dozens of missing workers.'},
 {label:'MARKETS',title:['BITCOIN SINKS','AS STOCKS SLIDE'],body:'Bitcoin falls to about $55,100, its lowest since September 2024, before recovering to around $61,000, while Nvidia drops about 23 percent in its worst week since 2008 and the S and P 500 closes in correction territory.'},
 {label:'USA',title:['DEMOCRATS REACH','258 HOUSE SEATS'],body:'Democrats reach 258 seats in the House of Representatives, their largest majority since 1992.'},
 {label:'NEPAL',title:['INDIA GIVES NEPAL',' $1.62BN FLOOD AID'.trim()],body:'India will give Nepal an economic package worth 240 billion Nepalese rupees, about $1.62 billion, to help rebuild after deadly August floods.'}
];
for(let i=0;i<6;i++){const x=32+(i%2)*496,y=370+Math.floor(i/2)*194;line(x,y,x+464,y,ink,1);text(stories[i].label,x,y+15,1,2,red);stories[i].title.forEach((s,j)=>text(s,x,y+42+j*27,2,3));icon(i,x+386,y+29);paragraph(stories[i].body,x,y+109,464);}
line(512,383,512,937,ink,1);
rect(32,960,960,3,ink);
centered('SEVEN STORIES FROM ONE DAY - 23 NOVEMBER 2026',983,2,2);
// PNG chunks use explicit CRC-32; scanlines are RGB with filter type zero.
function crc32(b:Buffer){let c=0xffffffff;for(const v of b){c^=v;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(name:string,data:Buffer){const n=Buffer.from(name),len=Buffer.alloc(4),crc=Buffer.alloc(4);len.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([n,data])));return Buffer.concat([len,n,data,crc]);}
const header=Buffer.alloc(13);header.writeUInt32BE(W,0);header.writeUInt32BE(H,4);header[8]=8;header[9]=2;
const raw=Buffer.alloc((W*3+1)*H);for(let y=0;y<H;y++)pixels.copy(raw,y*(W*3+1)+1,y*W*3,(y+1)*W*3);
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
if(png.length>1048576)throw Error('PNG exceeds size limit');
const output=process.env.MAKEFUN_OUTPUT_DIR||'./out';mkdirSync(output,{recursive:true});writeFileSync(join(output,'entry.png'),png);
