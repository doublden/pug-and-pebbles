(function(root){'use strict';
// Isolate the main figure within a grid cell; adjacent atlas tails remain separate islands.
function isolate(data,width,height){
 const size=width*height,seen=new Uint8Array(size),queue=new Int32Array(size);let largest=[];
 for(let p=0;p<size;p++){
  if(seen[p]||data[p*4+3]<12)continue;let head=0,tail=1;queue[0]=p;seen[p]=1;
  while(head<tail){const n=queue[head++],x=n%width,y=Math.floor(n/width);const visit=k=>{if(!seen[k]&&data[k*4+3]>=12){seen[k]=1;queue[tail++]=k;}};if(x)visit(n-1);if(x<width-1)visit(n+1);if(y)visit(n-width);if(y<height-1)visit(n+width);}
  if(tail>largest.length)largest=queue.slice(0,tail);
 }
 const keep=new Uint8Array(size);
 // Preserve the figure's soft antialiased fur, without reconnecting distant fragments.
 for(const n of largest){const x=n%width,y=Math.floor(n/width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<width&&ny>=0&&ny<height)keep[ny*width+nx]=1;}}
 let removed=0;for(let p=0;p<size;p++)if(!keep[p]&&data[p*4+3]){data[p*4+3]=0;removed++;}
 return {data,removed,mainPixels:largest.length};
}
const api={isolate};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PugSprites=api;
})(typeof window!=='undefined'?window:globalThis);
