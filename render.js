(function (global) {
  'use strict';
  const CM = global.CM = global.CM || {};
  const TAU = Math.PI * 2;
  const palettes = {
    forest: {top:'#06151e', bottom:'#193d43', mist:'#409e91', back:'#102f38', mid:'#103038', bark:'#102932', stone:'#263f46', edge:'#59827a', grass:'#64b398', glow:'#80f8d1', accent:'#d4ac66'},
    ruins: {top:'#0a101f', bottom:'#2a344b', mist:'#657fb4', back:'#192637', mid:'#1e2f43', bark:'#142230', stone:'#343f55', edge:'#737e99', grass:'#8496a5', glow:'#b0baff', accent:'#e5b771'},
    forge: {top:'#190f1e', bottom:'#472832', mist:'#a7675e', back:'#2a1b2a', mid:'#3a2532', bark:'#271923', stone:'#4e3b45', edge:'#947875', grass:'#c3916a', glow:'#ffc28a', accent:'#ffbb67'},
    crystal: {top:'#101c35', bottom:'#365267', mist:'#8da5d7', back:'#223851', mid:'#304960', bark:'#193449', stone:'#3b6675', edge:'#95bfbd', grass:'#b0d9cf', glow:'#c6eaff', accent:'#dfc5ee'},
    depths: {top:'#110f20', bottom:'#473d35', mist:'#a49154', back:'#25242b', mid:'#302d30', bark:'#201e28', stone:'#514c43', edge:'#948573', grass:'#b6a87a', glow:'#ffd194', accent:'#c99f5d'},
    astral: {top:'#090f2a', bottom:'#343454', mist:'#9f8bc9', back:'#1b2542', mid:'#263053', bark:'#161d38', stone:'#53566f', edge:'#aeb4cd', grass:'#c5c5df', glow:'#e0d6ff', accent:'#dac4a1'}
  };
  const noise = n => {const f = Math.sin(n * 127.1 + 311.7) * 43758.5453; return f - Math.floor(f);};
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

  class Renderer {
    constructor(canvas) {
      this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.t=0;
      this.width=1280; this.height=720; this.shake=0; this.lastHP=null;
      this.palette=palettes.forest;
    }
    path(points,fill,stroke,width=1) {
      const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
      if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
    }
    line(points,color,width=1) {
      const c=this.ctx;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.strokeStyle=color;c.lineWidth=width;c.stroke();
    }
    ellipse(x,y,rx,ry,color) { const c=this.ctx;c.beginPath();c.ellipse(x,y,Math.max(0.01,rx),Math.max(0.01,ry),0,0,TAU);c.fillStyle=color;c.fill(); }
    glow(x,y,r,color,alpha=.3) {
      const c=this.ctx;c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
    }
    begin() {
      const c=this.ctx;c.setTransform(this.canvas.width/1280,0,0,this.canvas.height/720,0,0);c.clearRect(0,0,1280,720);c.lineCap='round';c.lineJoin='round';
    }
    background(room,camera) {
      const c=this.ctx,p=this.palette,t=this.t,cam=camera.x||0;
      let g=c.createLinearGradient(0,0,0,720);g.addColorStop(0,p.top);g.addColorStop(1,p.bottom);c.fillStyle=g;c.fillRect(0,0,1280,720);
      this.glow(890-cam*.025,160,350,p.mist,.28);
      c.save();c.globalAlpha=.36;
      for(let i=0;i<(room.theme==='depths'?9:47);i++){
        const x=((noise(i*7)*1700-cam*.045)%1440+1440)%1440-80, y=40+noise(i*11)*405;
        this.ellipse(x,y,noise(i*13)>.92?1.7:.8,noise(i*13)>.92?1.7:.8,'#b8e6d9');
      }
      c.restore();
      // A fractured moon through the canopy.
      const mx=985-cam*.035,my=room.theme==='depths'?-160:135;
      this.glow(mx,my,150,p.glow,.13);
      this.ellipse(mx,my,50,50,room.theme==='forge'?'#ad7068':'#97c4ba');
      this.ellipse(mx-22,my-10,49,50,p.top);
      c.save();c.globalAlpha=.15;c.strokeStyle=p.glow;c.lineWidth=1;c.beginPath();c.arc(mx,my,62,-2,1.25);c.stroke();c.restore();
      // Distant mountains, spires, and old cities.
      for(let layer=0;layer<2;layer++){
        c.save();c.globalAlpha=layer?.75:.38;
        const scroll=cam*(layer?.13:.06),step=190;
        for(let i=-2;i<11;i++){
          const k=i+Math.floor(scroll/step),x=i*step-scroll%step,y=345+noise(k+20)*145;
          const h=120+noise(k+80)*190;
          this.path([[x,660],[x+30,y+70],[x+62,y+50],[x+82,y-h*.3],[x+105,y+20],[x+128,y+40],[x+155,y+5],[x+205,660]],layer?p.mid:p.back);
          if(noise(k+90)>.46){c.fillStyle=layer?p.mid:p.back;c.fillRect(x+70,y-h,34,h+100);this.path([[x+64,y-h],[x+86,y-h-34],[x+110,y-h]],layer?p.mid:p.back);}
        }
        c.restore();
      }
      // Fine light shafts retain definition without hiding the platforms.
      c.save();c.globalCompositeOperation='screen';
      for(let i=0;i<4;i++){
        const x=200+i*330-cam*.09;
        g=c.createLinearGradient(x,0,x-140,620);g.addColorStop(0,'#62988b18');g.addColorStop(.75,'#62988b06');g.addColorStop(1,'#62988b00');
        this.path([[x,0],[x+42,0],[x-155,650],[x-290,650]],g);
      }
      c.restore();
      // Repeating foreground-background architecture in three depth planes.
      if(['crystal','depths','astral'].includes(room.theme))this.regionScenery(room.theme,cam);
      else{
        const stride=520,scroll=cam*.3;
        for(let i=-1;i<5;i++){
          const k=i+Math.floor(scroll/stride),x=i*stride-scroll%stride;
          if(room.theme==='forest') this.tree(x,650,1.05+noise(k)*.5,p.bark,k);
          else this.ruinedArch(x,600,1.1+noise(k)*.3,.3);
        }
        c.save();c.globalAlpha=.15;
        for(let i=0;i<4;i++){
          const x=i*410-(cam*.4)%410;
          this.ruinedArch(x,580,.9,.8);
        }
        c.restore();
      }
      // Floating particles, deliberately slow and sparse.
      for(let i=0;i<35;i++){
        const x=((noise(i+301)*1500-cam*.18+Math.sin(t*.18+i)*18)%1420+1420)%1420-70;
        const y=((noise(i+602)*700-t*(3+noise(i)*5))%740+740)%740;
        const a=.16+(Math.sin(t*1.4+i)*.5+.5)*.45;
        c.save();c.globalAlpha=a;this.ellipse(x,y,noise(i+99)*1.6+.5,noise(i+99)*1.6+.5,p.glow);c.restore();
        if(i%9===0)this.glow(x,y,17,p.glow,.11);
      }
      g=c.createLinearGradient(0,460,0,720);g.addColorStop(0,'transparent');g.addColorStop(1,p.top+'a6');c.fillStyle=g;c.fillRect(0,460,1280,260);
    }
    crystal(x,y,h,w,alpha=1) {
      const c=this.ctx;c.save();c.globalAlpha*=alpha;
      this.path([[x,y],[x-w*.5,y-h*.74],[x-w*.1,y-h],[x+w*.48,y-h*.7],[x+w*.36,y]],'#496e895c','#a4d7e27d',1);
      this.path([[x-w*.1,y-h],[x+w*.13,y-h*.64],[x+w*.36,y],[x,y]],'#91d2e84d');
      this.line([[x-w*.1,y-h],[x+w*.13,y-h*.64],[x,y]],'#ddf5f88a',1);
      c.restore();
    }
    regionScenery(theme,cam) {
      const c=this.ctx,p=this.palette;
      if(theme==='crystal'){
        // Glass gardens grow at three depths, catching cold lavender light.
        for(let layer=0;layer<2;layer++){
          const stride=layer?360:240,scroll=cam*(layer?.35:.17);
          for(let i=-1;i<7;i++){
            const key=i+Math.floor(scroll/stride),x=i*stride-scroll%stride;
            this.crystal(x,layer?660:595,120+noise(key+70)*270,55+noise(key+9)*75,layer?.6:.25);
            this.crystal(x+45,layer?668:609,90+noise(key+81)*120,45,layer?.4:.15);
            if(layer){
              this.line([[x+110,-10],[x+103,65],[x+113,117],[x+100,171]],'#598598',2);
              this.ellipse(x+112,106,15,4,'#76a4b3');this.ellipse(x+104,145,13,3,'#7497aa');
              this.crystal(x+99,202,31,18,.8);this.glow(x+99,185,28,'#c5dffc',.12);
            }
          }
        }
        c.save();c.globalAlpha=.26;
        const x=880-cam*.08;
        this.line([[x-200,515],[x-120,350],[x,278],[x+120,350],[x+200,515]],'#aed0de',2);
        this.line([[x-120,350],[x,515],[x+120,350]],'#aed0de',1);
        this.path([[x-201,515],[x-194,400],[x-167,347],[x-158,430],[x-166,515]],'#6696a6');
        this.path([[x+167,515],[x+158,430],[x+167,347],[x+194,400],[x+201,515]],'#6696a6');c.restore();
      }else if(theme==='depths'){
        // A continuous cavern ceiling, amber pockets and ancient rib fossils.
        for(let layer=0;layer<2;layer++){
          const stride=layer?225:350,scroll=cam*(layer?.31:.13);
          for(let i=-1;i<8;i++){
            const key=i+Math.floor(scroll/stride),x=i*stride-scroll%stride,h=65+noise(key+10)*210;
            this.path([[x-20,-20],[x+stride+30,-20],[x+stride,35],[x+stride*.7,47],[x+stride*.55,h*.58],[x+stride*.42,h],[x+stride*.29,h*.47],[x+20,69]],layer?'#1f202a':'#323235');
            this.line([[x+stride*.42,30],[x+stride*.42,h]],layer?'#39373b':'#48443c',1);
            if(key%3===0){this.glow(x+70,h*.6,58,'#e5ad63',.11);this.path([[x+56,h*.6],[x+69,h*.6-23],[x+82,h*.6],[x+72,h*.6+29]],'#957b527d','#d8b98066',1);}
            if(!layer){
              this.path([[x-30,690],[x+18,480],[x+57,445],[x+98,519],[x+130,690]],'#2e3034');
              c.save();c.globalAlpha=.23;c.strokeStyle='#d3bc94';c.lineWidth=7;
              for(let j=0;j<5;j++){c.beginPath();c.ellipse(x+195,548+j*13,78-j*8,32-j*2,-.37,.1,Math.PI*1.8);c.stroke();}
              this.line([[x+136,527],[x+209,619]],'#d3bc94',7);c.restore();
            }
          }
        }
        for(let i=0;i<5;i++){
          const x=i*330-(cam*.22)%330+65;this.glow(x,566,75,'#d4b474',.10);
          this.path([[x-16,629],[x-10,566],[x+6,531],[x+14,581],[x+16,629]],'#5f59488a','#af9c7066',1);
        }
      }else{
        // Armillary spheres and broken mirror gates of a forgotten observatory.
        const ox=835-cam*.065,oy=285;
        c.save();c.globalAlpha=.25;c.strokeStyle='#bdb5d8';c.lineWidth=1.5;
        for(let i=0;i<3;i++){c.beginPath();c.ellipse(ox,oy,175+i*14,175-i*42,i*.63,0,TAU);c.stroke();}
        c.beginPath();c.arc(ox,oy,214,-1.5,1.1);c.stroke();
        for(let i=0;i<12;i++){const a=i*TAU/12+this.t*.015;this.line([[ox+Math.cos(a)*206,oy+Math.sin(a)*206],[ox+Math.cos(a)*219,oy+Math.sin(a)*219]],'#ddd1e7',1);}
        this.line([[ox-225,oy],[ox+226,oy]],'#a6a3c8',.8);this.line([[ox,oy-225],[ox,oy+225]],'#a6a3c8',.8);c.restore();
        for(let i=-1;i<6;i++){
          const scroll=cam*.3,key=i+Math.floor(scroll/310),x=i*310-scroll%310;
          const y=460+noise(key+12)*90;
          c.save();c.globalAlpha=.38;
          this.path([[x-40,690],[x-40,y-180],[x-17,y-204],[x+9,y-180],[x+8,690]],'#3d4162','#797896',1);
          this.line([[x-29,y-169],[x-29,642]],'#85829a',2);
          this.path([[x+82,y-182],[x+123,y-278],[x+164,y-182],[x+121,y-88]],'#76799933','#aaa2cf',1);
          this.line([[x+123,y-278],[x+121,y-88]],'#8f89b9',.8);
          this.line([[x+82,y-182],[x+164,y-182]],'#8f89b9',.8);c.restore();
          if(key%2===0){const fy=y-185+Math.sin(this.t*.5+key)*7;this.glow(x+123,fy,55,'#d4c4fc',.12);}
        }
        c.save();c.globalAlpha=.35;
        const stars=[[145,137],[207,91],[280,159],[351,133],[393,224]];
        this.line(stars.map(q=>[q[0]-cam*.04,q[1]]),'#aca3d4',.7);
        for(const q of stars)this.ellipse(q[0]-cam*.04,q[1],2,2,'#e4d7ff');c.restore();
      }
    }
    tree(x,bottom,s,color,seed=0) {
      const c=this.ctx;c.save();c.translate(x,bottom);c.scale(s,s);
      this.path([[-48,70],[-10,-20],[-7,-170],[-29,-330],[-35,-500],[-12,-675],[17,-680],[4,-485],[23,-319],[23,-165],[44,45],[79,70]],color);
      this.line([[4,-300],[-80,-405],[-140,-430],[-188,-490]],color,19);
      this.line([[2,-485],[92,-535],[148,-615]],color,18);
      this.line([[-77,-402],[-110,-500]],color,9);
      this.line([[19,-190],[105,-289],[183,-322]],color,15);
      this.line([[101,-288],[123,-399]],color,7);
      if(seed%2===0){c.save();c.globalAlpha=.18;this.line([[15,-498],[45,-422],[38,-348],[60,-259]],this.palette.grass,2);c.restore();}
      c.restore();
    }
    ruinedArch(x,bottom,s,alpha=1) {
      const c=this.ctx,p=this.palette;c.save();c.translate(x,bottom);c.scale(s,s);c.globalAlpha*=alpha;
      c.fillStyle=p.mid;c.fillRect(-102,-300,34,330);c.fillRect(88,-265,34,295);
      c.beginPath();c.arc(10,-294,95,Math.PI,TAU);c.arc(10,-294,62,TAU,Math.PI,true);c.closePath();c.fill();
      this.path([[-111,-300],[-65,-300],[-57,-318],[-116,-318]],p.mid);
      this.path([[80,-264],[134,-264],[139,-282],[76,-282]],p.mid);
      c.strokeStyle=p.edge;c.lineWidth=1;c.globalAlpha*=.35;c.beginPath();c.arc(10,-294,79,Math.PI,TAU);c.stroke();
      this.line([[-86,-282],[-86,-65]],p.edge,1);this.line([[105,-248],[105,-70]],p.edge,1);c.restore();
    }
    platform(pf,idx=0) {
      const c=this.ctx,p=this.palette,{x,y,w,h}=pf;
      const isGround=h>=70;
      const g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,p.stone);g.addColorStop(1,p.top);
      c.fillStyle=g;c.fillRect(x,y,w,h);
      // Natural chipped ledge contour.
      this.path([[x,y+5],[x+7,y-2],[x+w*.18,y+1],[x+w*.38,y-3],[x+w*.58,y],[x+w-10,y-2],[x+w,y+5],[x+w,y+12],[x,y+12]],p.edge);
      c.fillStyle=p.stone;c.fillRect(x+4,y+10,Math.max(0,w-8),4);
      const blocks=Math.ceil(w/62);
      c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
      for(let i=0;i<blocks;i++){
        let bx=x+i*62;
        this.line([[bx+4,y+18],[bx+4,y+38],[bx+18,y+47]],p.top+'80',2);
        this.line([[bx+6,y+37],[bx+57,y+37]],p.top+'75',2);
        if(i%3===0)this.line([[bx+20,y+5],[bx+25,y+21],[bx+18,y+26]],p.top+'80',1.3);
        if(!isGround){this.path([[bx+7,y+h-2],[bx+20,y+h+11],[bx+27,y+h-3]],p.top);}
        if(h>70){this.line([[bx+33,y+44],[bx+33,y+75],[bx+46,y+88]],p.top+'65',2);}
      }
      c.restore();
      // Thin grass catches the light along the collision surface.
      for(let i=0;i<w/15;i++){
        let bx=x+i*15+noise(i+idx*73)*10,hh=4+noise(i+idx*41)*11;
        this.line([[bx,y],[bx-3,y-hh],[bx+2,y-3],[bx+5,y-hh*.65]],i%4===0?p.grass:p.edge,1.3);
      }
      if(!isGround){
        for(let i=0;i<Math.min(3,w/70);i++){
          const vx=x+20+i*76,len=24+noise(idx+i)*44;
          this.line([[vx,y+13],[vx-4,y+len*.5],[vx+1,y+len]],p.grass+'65',1.5);
          this.ellipse(vx-5,y+len*.5,5,2,p.grass+'70');
        }
      }
    }
    hazard(hz) {
      const p=this.palette,c=this.ctx,{x,y,w,h}=hz;
      this.glow(x+w/2,y+10,Math.max(w*.7,35),'#ff655c',.13);
      for(let i=0;i<w;i+=19){
        this.path([[x+i,y+h],[x+i+7,y-6],[x+i+17,y+h]],'#7b5364','#d49295',1);
        this.line([[x+i+7,y-6],[x+i+9,y+h-3]],'#e7b5aa',1);
      }
      c.fillStyle=p.top;c.fillRect(x,y+h-5,w,5);
    }
    checkpoint(point,active) {
      const c=this.ctx,p=this.palette,x=point.x+(point.w||0)/2,y=point.y;
      c.save();c.translate(x,y);
      this.glow(0,-30,100,p.glow,active?.26:.12);
      this.ellipse(0,8,32,7,'#050d1690');
      this.path([[-23,4],[-17,-2],[17,-2],[23,4],[23,10],[-23,10]],p.stone,p.edge,1);
      this.path([[-11,0],[-13,-48],[0,-64],[13,-48],[11,0]],'#27464d',p.edge,1.5);
      this.path([[0,-58],[-7,-45],[0,-24],[7,-45]],p.glow);
      this.line([[0,-22],[0,-4]],p.glow,1.5);
      c.save();c.globalAlpha=.35+.15*Math.sin(this.t*2);c.strokeStyle=p.glow;c.lineWidth=1;c.beginPath();c.ellipse(0,-40,24,12,-.25,0,TAU);c.stroke();c.restore();
      for(let i=0;i<3;i++){const a=this.t*.6+i*TAU/3;this.ellipse(Math.cos(a)*22,-42+Math.sin(a)*11,2,2,p.glow);}
      c.restore();
    }
    doorway(x,left,locked) {
      const c=this.ctx,p=this.palette;c.save();c.translate(x,650);c.scale(left?-1:1,1);
      this.glow(0,-75,105,locked?'#bc806d':p.glow,locked?.08:.14);
      c.save();c.globalAlpha=.65;
      this.path([[-31,0],[-32,-127],[-20,-158],[-8,-174],[11,-177],[25,-164],[33,-141],[33,0],[22,0],[22,-134],[12,-153],[1,-158],[-12,-145],[-20,-125],[-20,0]],p.stone,p.edge,1);
      this.line([[-22,-18],[-23,-119],[-11,-147]],p.edge,1);
      c.restore();
      const glow=c.createLinearGradient(0,-145,0,0);glow.addColorStop(0,locked?'#ba77570a':'#9bebcf1c');glow.addColorStop(1,locked?'#ba775725':'#9bebcf06');
      this.path([[-18,0],[-19,-122],[-10,-144],[1,-155],[12,-144],[20,-124],[20,0]],glow);
      c.globalAlpha=.55+Math.sin(this.t*2)*.12;
      this.line([[-6,-83],[3,-74],[-6,-65]],locked?'#dba77e':p.glow,2);
      c.restore();
    }
    weapon(kind,x,y,angle=0,scale=1,bright=false) {
      const c=this.ctx;c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
      const metal=bright?'#fff6c5':'#dbe8d9',edge='#ffffff',gold='#d4ad6e';
      if(kind==='axe'){
        this.line([[0,10],[0,-44]],'#ae7c55',5);
        this.path([[0,-47],[17,-53],[26,-46],[20,-25],[7,-24],[1,-30]],metal,gold,1);
        this.path([[1,-45],[-11,-51],[-17,-45],[-12,-32],[0,-31]],'#8baba9',gold,1);
        this.line([[20,-47],[16,-29]],edge,1.5);
      } else if(kind==='spear'){
        this.line([[0,25],[0,-54]],'#b58f60',3);
        this.path([[0,-76],[-6,-54],[0,-46],[6,-54]],metal,gold,1);
        this.line([[0,-75],[0,-51]],edge,1);
        this.path([[2,-49],[15,-40],[13,-29],[5,-38]],'#d98a69');
      } else {
        this.path([[0,-59],[-5,-44],[-4,-10],[4,-10],[5,-44]],metal,gold,1);
        this.line([[0,-55],[0,-13]],edge,1);
        this.line([[-10,-9],[0,-12],[10,-9]],gold,3);
        this.line([[0,-7],[0,7]],'#83573f',4);
        this.ellipse(0,9,3,3,gold);
      }
      c.restore();
    }
    hero(pl,scale=1,showcase=false) {
      const c=this.ctx,p=this.palette,t=this.t;
      const w=pl.w||30,h=pl.h||52,x=pl.x+w/2,y=pl.y+h;
      const speed=Math.abs(pl.vx||0),moving=speed>12,air=!pl.grounded&&!showcase;
      const gait=moving?Math.sin(t*17):Math.sin(t*2)*.14;
      const bob=air?-2:moving?Math.abs(Math.sin(t*17))*2:Math.sin(t*2)*.8;
      const face=pl.facing||1;
      let attack=pl.attackTime>0 ? 1-clamp(pl.attackTime/(pl.attackDuration||.35),0,1):null;
      c.save();c.translate(x,y);c.scale(scale,scale);
      this.ellipse(0,1,w*.77,4,'#030b1580');
      if(pl.dashTime>0){
        for(let i=4;i>0;i--){c.save();c.globalAlpha=(5-i)*.055;c.translate(-face*i*19,-2);this.path([[-14,0],[-17,-42],[1,-55],[15,-42],[12,0]],'#9bf9e2');c.restore();}
      }
      c.scale(face,1);c.translate(0,bob);
      if(pl.invulnerable>0&&Math.sin(t*50)>0)c.globalAlpha=.56;
      // Long weathered scarf and split cloak form the readable silhouette.
      const wind=Math.sin(t*5)*3+(moving?8:0)+(pl.dashTime>0?20:0);
      this.path([[-8,-40],[-23-wind,-25],[-28-wind,-3],[-16,-8],[-5,1],[7,-7],[12,-31],[7,-43]],pl.color||'#346d6d','#75b5a3',.8);
      this.path([[-9,-39],[-12,-15],[-25-wind,-4],[-14,-9],[-5,1],[0,-18]],'#1e454e');
      this.path([[0,-41],[-21-wind,-42],[-38-wind,-32],[-27-wind,-31],[-37-wind,-24],[-11,-31]],'#c68f55');
      this.line([[-15-wind,-38],[-30-wind,-31]],'#edc182',1);
      const leg1=air?-4:gait*5,leg2=air?5:-gait*5;
      this.line([[-5,-17],[-7+leg1,-6],[-5+leg1,-1]],'#1a2a35',6);
      this.line([[5,-17],[6+leg2,-6],[8+leg2,-1]],'#263947',6);
      this.line([[-8+leg1,-1],[-2+leg1,-1]],'#a2b5ae',3);
      this.line([[5+leg2,-1],[12+leg2,-1]],'#bec4b0',3);
      this.path([[-9,-39],[-10,-23],[-6,-15],[8,-16],[12,-28],[8,-40]],'#475b61','#9ba99a',1);
      this.path([[-7,-37],[1,-40],[9,-36],[6,-24],[-5,-23]],'#667771');
      this.line([[-8,-19],[8,-19]],'#c7a56a',3);
      this.ellipse(1,-19,2,3,'#f0d394');
      // Rounded hornless helmet, bright visor, small crown-like crest.
      this.path([[-10,-41],[-12,-51],[-7,-59],[3,-62],[12,-55],[14,-44],[7,-39]],'#d0d9c2','#eff0cf',1);
      this.path([[-10,-48],[-8,-55],[3,-59],[11,-53],[12,-47]],'#ebecd0');
      this.path([[0,-51],[13,-50],[13,-45],[1,-44]],'#13353e');
      this.line([[4,-48],[10,-48]],'#94ffe1',1.8);
      this.path([[-6,-58],[-5,-66],[0,-62],[4,-67],[6,-59]],'#d1ab69');
      this.path([[-11,-44],[-9,-37],[1,-35],[8,-40]],'#bf935d');
      this.line([[0,-35],[5,-34]],'#f3ca7d',1);
      if(pl.block){
        this.line([[8,-32],[17,-28],[21,-36]],'#738e89',5);
        const parry=pl.parryTime>0;
        this.path([[24,-46],[13,-42],[15,-22],[24,-13],[33,-24],[34,-42]],parry?'#b9fff2':'#44676b',parry?'#f1ffe2':'#9ec8b3',2);
        this.path([[24,-40],[20,-29],[24,-21],[28,-30]],'#d9c281');
        if(parry){this.glow(26,-31,47,'#97ffe8',.35);c.strokeStyle='#c8ffe8';c.lineWidth=2;c.beginPath();c.arc(15,-31,33,-1.15,1.15);c.stroke();}
        this.weapon(pl.weapon||'sword',-8,-25,-.5,.7);
      } else if(attack!==null&&pl.attackDown){
        this.line([[7,-32],[13,-20],[6,-11]],'#a1b1a3',5);
        this.weapon(pl.weapon||'sword',4,-12,Math.PI,1.15,true);
        c.save();c.globalAlpha=Math.sin(attack*Math.PI)*.75;
        this.path([[-15,-2],[-7,42],[4,65],[17,40],[20,-3],[8,38],[4,46],[0,36]],'#f3e7ad');
        this.line([[4,0],[4,54]],'#fff8cb',2);c.restore();
      } else if(attack!==null){
        const angle=pl.weapon==='spear'?Math.PI/2:-1.1+attack*3;
        this.line([[7,-32],[17,-30],[23,-34]],'#a1b1a3',5);
        this.weapon(pl.weapon||'sword',20+(pl.weapon==='spear'?24*Math.sin(attack*Math.PI):0),-32,angle,pl.weapon==='spear'?1.2:pl.weapon==='axe'?1.2:1,true);
        c.save();c.translate(12,-30);c.rotate(angle-.7);c.globalAlpha=Math.sin(attack*Math.PI)*.7;
        c.beginPath();c.arc(0,0,pl.weapon==='spear'?83:65,-1.5,.65);c.arc(0,0,pl.weapon==='spear'?73:42,.65,-1.5,true);c.closePath();
        const ag=c.createRadialGradient(0,0,35,0,0,80);ag.addColorStop(0,'#e3c57a00');ag.addColorStop(1,'#fff6bd');c.fillStyle=ag;c.fill();c.restore();
      } else {
        this.line([[8,-34],[15,-26],[16,-22]],'#a8b4a5',5);
        this.weapon(pl.weapon||'sword',16,-23,showcase?.42:.6+(moving?gait*.1:0),showcase?1.1:.88);
      }
      c.restore();
    }
    enemy(e) {
      if(e.hp<=0)return;
      const c=this.ctx,t=this.t,x=e.x+e.w/2,y=e.y+e.h,face=e.facing||-1;
      if(e.type==='boss'){this.boss(e);return;}
      c.save();c.translate(x,y);
      this.ellipse(0,2,e.w*.6,4,'#03091480');
      c.scale(face,1);
      const hurt=e.hitFlash>0||e.hurtTime>0||e.flash>0,wind=e.state==='windup',stun=e.state==='stunned';
      const base=hurt?'#fff4d4':wind?'#ae6259':e.type==='flyer'?'#556879':'#566e72';
      const edge=wind?'#ffc68d':'#a0a697';
      if(e.type==='spitter'){
        this.path([[-17,-4],[-20,-20],[-13,-38],[3,-46],[17,-32],[21,-10],[13,-1]],base,edge,1.2);
        this.path([[-16,-31],[-19,-41],[-9,-39],[-4,-50],[3,-43],[12,-46],[14,-36]],'#76958e',edge,1);
        this.ellipse(1,-19,15,14,'#324c59');
        this.path([[5,-25],[23,-26],[29,-20],[24,-12],[6,-12]],'#839892',edge,1);
        this.ellipse(23,-19,5,7,wind?'#ffd28c':'#203544');
        this.ellipse(1,-33,3,3,'#e3d79b');
        if(wind)this.glow(25,-19,22,'#ffd291',.35);
        for(let i=0;i<3;i++)this.line([[-13+i*12,-4],[-20+i*15,0]],'#839b8a',3);
      }else if(e.type==='hopper'){
        const air=Math.abs(e.vy||0)>10,bend=air?12:0;
        this.line([[-9,-10],[-24,-24-bend],[-31,-7],[-19,-1]],'#84948d',4);
        this.line([[10,-9],[23,-21-bend],[29,-7],[19,-1]],'#8ea28f',4);
        this.ellipse(0,-15,17,12,base);
        this.path([[-16,-18],[-12,-29],[1,-35],[14,-28],[19,-14]],'#647d81',edge,1);
        this.ellipse(11,-20,6,7,'#273f4a');this.ellipse(13,-21,3,3,'#ffe2a0');
        this.line([[-2,-29],[-6,-42],[-13,-45]],'#9cb5a0',1.5);
        this.line([[7,-30],[14,-40],[22,-42]],'#9cb5a0',1.5);
        this.line([[-10,-21],[2,-25],[9,-19]],'#abc5ad',1.5);
      }else if(e.type==='flyer'){
        const flap=Math.sin(t*13)*13;
        this.path([[-2,-16],[-22,-36-flap],[-34,-28-flap],[-29,-17],[-14,-11],[-4,-5]],'#314c62',edge,.8);
        this.path([[2,-16],[21,-36-flap],[32,-28-flap],[29,-17],[14,-11],[4,-5]],base,edge,.8);
        this.ellipse(0,-14,10,13,base);
        this.path([[-8,-22],[-9,-35],[-1,-27],[7,-32],[9,-19]],base,edge,1);
        this.line([[-5,-18],[-1,-17]],'#f4ba79',2);this.line([[3,-17],[7,-18]],'#f4ba79',2);
        this.path([[-3,-6],[0,0],[4,-6]],'#a4b0a3');
      } else if(e.type==='knight'){
        const s=e.h/59;c.scale(s,s);
        this.path([[-15,-45],[-19,-9],[-11,-3],[4,-6],[15,0],[14,-43]],'#423e56');
        this.line([[-7,-17],[-9,-3]],'#8a8582',7);this.line([[7,-17],[10,-3]],'#8a8582',7);
        this.path([[-16,-42],[-10,-22],[11,-22],[17,-43],[7,-50],[-7,-50]],base,edge,1.5);
        this.path([[-10,-49],[-10,-59],[-3,-64],[9,-61],[13,-50],[8,-42],[-6,-43]],'#6a747b',edge,1);
        this.path([[-9,-58],[-17,-65],[-13,-50],[-7,-48]],'#a6a893');
        this.line([[3,-53],[10,-53]],'#ffb173',2.5);
        this.weapon('axe',17,-26,wind?-1.1:e.state==='attack'?1.6:.6,.85);
        this.path([[-19,-39],[-27,-35],[-27,-18],[-20,-10],[-13,-20],[-13,-35]],'#394655',edge,1);
      } else {
        const bob=Math.sin(t*9+e.x*.1)*2;
        this.line([[-14,-8],[-22+Math.sin(t*10)*3,-1]],'#71898a',3);this.line([[14,-8],[22-Math.sin(t*10)*3,-1]],'#71898a',3);
        this.ellipse(0,-14+bob,e.w*.48,e.h*.36,base);
        this.path([[-e.w*.5,-14],[-14,-29],[-5,-34],[4,-29],[12,-32],[e.w*.5,-17]],base,edge,1.2);
        this.line([[-12,-23],[-6,-15],[5,-16],[12,-24]],'#273f4b',2);
        this.ellipse(13,-16,5,7,'#243b43');this.line([[13,-19],[17,-19]],'#ffc779',2);
        this.path([[17,-13],[24,-17],[21,-7],[14,-8]],'#b1b5a0');
      }
      c.restore();
      if(wind){this.glow(x,y-e.h*.65,40,'#ff9b6b',.18);this.alert(x,y-e.h-19);}
      if(stun)this.stunned(x,y-e.h-7);
      if(e.hp<e.maxHp){const width=Math.min(50,e.w+8);c.fillStyle='#08121bc9';c.fillRect(x-width/2,e.y-12,width,3);c.fillStyle='#d2a16b';c.fillRect(x-width/2,e.y-12,width*clamp(e.hp/e.maxHp,0,1),3);}
    }
    alert(x,y) {
      const c=this.ctx;c.save();c.translate(x,y);this.path([[0,-7],[7,0],[0,7],[-7,0]],'#ffb773');this.line([[0,-3],[0,1]],'#603540',2);this.ellipse(0,4,.9,.9,'#603540');c.restore();
    }
    stunned(x,y) {for(let i=0;i<3;i++){const a=this.t*4+i*TAU/3;this.ellipse(x+Math.cos(a)*14,y+Math.sin(a)*4,2,2,'#a0ffdf');}}
    livingWeakpoint(e,style) {
      const z=e.weakpoint;if(!z)return;
      const c=this.ctx,cx=z.x+z.w/2,cy=z.y+z.h/2,open=z.active;
      const color=style==='worm'?'#ffdd98':style==='duelist'?'#dfcdff':'#d0fcf5';
      if(style!=='duelist'){
        const rx=z.w*.43,ry=z.h*.43;
        if(open)this.glow(cx,cy,Math.max(z.w,z.h)*.85,color,.22);
        this.ellipse(cx,cy,rx,ry,open?color:style==='worm'?'#80624b':'#526e8b');
        c.save();c.strokeStyle=open?'#f4ffe5':'#89949b';c.lineWidth=1.5;c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,TAU);c.stroke();c.restore();
        if(open){
          this.path([[cx,z.y+7],[cx+z.w*.16,cy],[cx,z.y+z.h-7],[cx-z.w*.16,cy]],'#fffde3');
          for(let i=0;i<3;i++){const yy=z.y+z.h*(.25+i*.25);this.line([[cx-z.w*.3,yy],[cx+z.w*.3,yy]],style==='worm'?'#cc9e67':'#99c7c4',1);}
        }else{
          for(let i=0;i<3;i++){
            const yy=z.y+z.h*(.3+i*.2);this.line([[cx-z.w*.32,yy],[cx+z.w*.32,yy+5]],style==='worm'?'#4d4440':'#263e56',4);
          }
        }
      }
      if(open){
        c.save();c.strokeStyle=color;c.lineWidth=1.5;c.globalAlpha=.65;
        for(const sx of [-1,1])for(const sy of [-1,1]){
          const bx=cx+sx*(z.w/2+4),by=cy+sy*(z.h/2+4);
          this.line([[bx-sx*8,by],[bx,by],[bx,by-sy*8]],color,1.5);
        }
        c.globalAlpha=1;c.font='700 10px system-ui, sans-serif';c.textAlign='center';c.fillStyle=color;c.shadowColor='#091528';c.shadowBlur=6;
        c.fillText(style==='worm'?'GORGE EXPOSÉE':style==='duelist'?'OUVERTURE':'CŒUR EXPOSÉ',cx,z.y-13);c.restore();
      }
    }
    moth(e) {
      const c=this.ctx,t=this.t,phase=e.phase||1,x=e.x+e.w/2,y=e.y+e.h/2;
      const open=!!e.weakpoint?.active,flap=open?.92:.63+Math.abs(Math.sin(t*(phase===3?9:7)))*.37;
      const wing=phase===3?'#7279aa':phase===2?'#6f8eaa':'#6996a6',edge='#b5e5e2';
      this.ellipse(x,648,150,8,'#05142645');
      this.glow(x,y,170,'#b3d3ef',.09);
      c.save();c.translate(x,y);
      for(const side of [-1,1]){
        c.save();c.scale(side*flap,1);c.rotate(open?side*.03:Math.sin(t*7)*.035);
        // Large stained-glass wings: the membranes have veins, eyespots and torn tails.
        this.path([[12,-23],[71,-93],[163,-125],[225,-105],[214,-61],[186,-18],[216,4],[191,40],[140,48],[107,27],[88,50],[70,102],[40,122],[43,63],[18,25]],wing,edge,1.5);
        this.path([[22,-22],[87,-71],[166,-101],[205,-92],[167,-36],[98,-13],[39,13]],'#acd2cb69');
        this.path([[33,12],[103,-4],[178,-9],[188,21],[134,34],[95,18],[69,72],[50,100]],'#b6c5d849');
        this.line([[23,-17],[102,-55],[177,-81]],'#d0e9df',1.5);
        this.line([[102,-55],[126,-109]],'#b1d9d5',1.2);
        this.line([[102,-55],[175,-24],[194,-6]],'#b1d9d5',1.2);
        this.line([[21,14],[95,8],[159,20]],'#a7d1d2',1.2);
        this.line([[95,8],[65,70]],'#b1d9d5',1.2);
        this.ellipse(139,-56,24,19,'#233f5d');this.ellipse(140,-57,16,12,phase===3?'#c8a2cb':'#c5d6a8');this.ellipse(140,-57,7,9,'#45577b');
        this.path([[193,-94],[203,-90],[188,-70],[179,-70]],'#def3e1');
        if(phase>=2){
          this.path([[217,-55],[187,-22],[201,-22],[185,-7],[206,-3]],'#1b304c');
          this.line([[83,-68],[74,-39],[88,-20],[81,3]],phase===3?'#e7b6db':'#d5e5e0',1.5);
        }
        c.restore();
      }
      // Velvet body and long antennae keep the creature legible against its wings.
      this.path([[-23,-47],[-33,-17],[-26,27],[-12,64],[0,79],[13,64],[29,23],[31,-15],[22,-47]],'#425a78','#b1c8d6',1.5);
      for(let i=0;i<4;i++)this.line([[-19+i*2,13+i*11],[18-i*2,16+i*11]],'#7893aa',2);
      this.ellipse(0,-39,29,22,'#bdd2cb');
      this.path([[-25,-40],[-17,-58],[-8,-51],[0,-66],[9,-52],[21,-57],[27,-39]],'#dde3c7');
      this.ellipse(-13,-39,7,9,'#1a344e');this.ellipse(13,-39,7,9,'#1a344e');
      this.ellipse(-14,-42,2,3,'#e8fcdd');this.ellipse(12,-42,2,3,'#e8fcdd');
      this.line([[-14,-54],[-34,-86],[-61,-88],[-70,-75]],'#cce8d6',2);
      this.line([[14,-54],[34,-86],[61,-88],[70,-75]],'#cce8d6',2);
      for(let i=0;i<3;i++){
        this.line([[-23,1+i*11],[-48,13+i*11],[-55,29+i*11]],'#9ab0c1',2);
        this.line([[23,1+i*11],[48,13+i*11],[55,29+i*11]],'#9ab0c1',2);
      }
      c.restore();
      this.livingWeakpoint(e,'moth');
      if(this.showAttackZones!==false&&e.state==='windup'&&e.attackKind==='dive'&&Number.isFinite(e.targetX)){
        c.save();c.globalAlpha=.7;c.setLineDash([5,9]);this.line([[x,y],[e.targetX,510+e.h/2]],'#e2d2f3',2);c.setLineDash([]);c.restore();
      }
      if(e.state==='attack'&&e.attackKind==='dive'){
        c.save();c.globalAlpha=.65;c.strokeStyle='#e5ddff';c.lineWidth=2;c.beginPath();c.ellipse(x,y,e.w/2,e.h/2,0,0,TAU);c.stroke();
        this.line([[x-e.w/2,y-20],[x-e.w/2-22,y-37]],'#c9c9f4',1.5);this.line([[x+e.w/2,y-20],[x+e.w/2+22,y-37]],'#c9c9f4',1.5);c.restore();
      }
      if(e.state==='windup')this.bossTelegraph(e);
      if(e.state==='stunned')this.stunned(x,e.y-25);
      for(let i=0;i<9;i++){
        const px=x+Math.sin(t*.7+i*7)*180,py=y+Math.cos(t*.4+i*5)*95;
        c.save();c.globalAlpha=.18+noise(i)*.24;this.ellipse(px,py,1.5,2.5,'#c5e3e9');c.restore();
      }
    }
    worm(e) {
      const c=this.ctx,t=this.t,x=e.x+e.w/2,floor=650,phase=e.phase||1;
      const open=!!e.weakpoint?.active,buried=!!e.buried;
      const amber=phase===3?'#efaf70':'#d9bd85';
      if(buried){
        if(this.showAttackZones!==false){
          const target=Number.isFinite(e.targetX)?e.targetX:x;
          for(let i=0;i<3;i++){
            c.save();c.globalAlpha=.35-i*.08;c.strokeStyle=amber;c.lineWidth=2;c.beginPath();c.ellipse(target,646,35+i*35+Math.sin(t*8+i)*4,4+i*3,0,0,TAU);c.stroke();c.restore();
          }
          for(let i=0;i<10;i++){const px=target-95+i*21;this.path([[px,650],[px+5,643-noise(i)*8],[px+13,650]],'#84735b');}
        }
        if(e.state==='windup')this.bossTelegraph(e);return;
      }
      this.ellipse(x,floor+1,200,13,'#070d1aa6');
      // Eight interlocking segments climb out of a long, curved subterranean coil.
      for(let i=0;i<8;i++){
        const q=i/7,bx=x-179+q*182,by=floor-9-Math.sin(q*Math.PI*.68)*74;
        const rx=27+q*10,ry=23+q*18;
        c.save();c.translate(bx,by);c.rotate(-.15-q*.55);
        this.ellipse(0,0,rx,ry,'#5b615a');
        this.path([[-rx+2,7],[-rx,-8],[-rx*.6,-ry],[rx*.45,-ry+2],[rx,-8],[rx-2,10],[0,ry]],i%2?'#77796b':'#666c65',amber,1.3);
        this.line([[-rx+7,-ry*.4],[-2,-ry*.6],[rx-7,-ry*.2]],'#a99e7b',2);
        this.path([[-10,-ry+3],[-1,-ry-19-phase*3],[9,-ry+3]],'#9a9779',amber,1);
        c.restore();
      }
      const y=e.y;
      this.path([[x-69,y+145],[x-81,y+106],[x-79,y+66],[x-54,y+31],[x+45,y+24],[x+82,y+59],[x+77,y+112],[x+58,y+163],[x-24,y+168]],'#6a7367',amber,2);
      // Wide jaws split visibly around the exposed throat.
      const jaw=open?19:3;
      this.path([[x-70,y+63],[x-91-jaw,y+32],[x-84-jaw,y+3],[x-58,y-10],[x-34,y+7],[x-28,y+44],[x-51,y+85]],'#929580',amber,2);
      this.path([[x+64,y+64],[x+91+jaw,y+35],[x+84+jaw,y+3],[x+54,y-10],[x+30,y+7],[x+24,y+43],[x+50,y+85]],'#858b78',amber,2);
      for(const side of [-1,1]){
        for(let i=0;i<4;i++)this.path([[x+side*(49+i*8+jaw*.3),y+14+i*15],[x+side*(31+i*8+jaw*.3),y+24+i*15],[x+side*(53+i*8+jaw*.3),y+31+i*15]],'#e0d3a5');
        this.line([[x+side*42,y+7],[x+side*43,y-25],[x+side*65,y-39]],'#a0a18b',3);
        this.ellipse(x+side*48,y+23,8,6,'#28373e');this.ellipse(x+side*48,y+23,4,3,'#ffe3a2');
      }
      this.path([[x-32,y+23],[x,y+8],[x+29,y+23],[x+37,y+56],[x,y+75],[x-36,y+55]],'#4b5b56',amber,1.5);
      for(let i=0;i<3;i++)this.line([[x-20,y+31+i*11],[x+20,y+31+i*11]],'#93a087',2);
      if(phase>=2)for(let i=0;i<4;i++)this.line([[x-63+i*38,y+65],[x-58+i*36,y+84],[x-66+i*35,y+100]],phase===3?'#e6ae6e':'#a7b092',1.5);
      this.livingWeakpoint(e,'worm');
      if(e.state==='windup')this.bossTelegraph(e);
      for(let i=0;i<7;i++){
        const px=x-140+i*44;this.path([[px,650],[px+7,638-noise(i)*10],[px+18,644],[px+24,650]],'#8a7c62');
      }
    }
    eclipseBody(e,alpha=1,offsetX=0,offsetY=0,ghost=false) {
      const c=this.ctx,t=this.t,face=e.facing||-1,x=e.x+e.w/2+offsetX,y=e.y+e.h+offsetY;
      const phase=e.phase||1,open=!!e.weakpoint?.active;
      c.save();c.globalAlpha*=alpha;c.translate(x,y);c.scale(face,1);
      const speed=Math.abs(e.vx||0),motion=Math.sin(t*14)*Math.min(1,speed/180),air=Math.abs(e.vy||0)>20;
      const cloth='#493d6a',edge='#c6bbd3',armor=ghost?'#8e91db':e.hitFlash>0?'#e7e5d9':'#969bae';
      const tail=20+Math.min(40,speed*.1);
      this.path([[-12,-77],[-35-tail,-66+Math.sin(t*7)*6],[-22-tail,-47],[-42-tail,-25],[-13-tail,-22],[-20,2],[2,-12],[17,-48],[11,-75]],cloth,ghost?'#b4b0ee':'#8a79ad',1);
      this.line([[-17,-65],[-27-tail,-40],[-20,-17]],'#9481b5',1.3);
      this.line([[-9,-32],[-15+(air?-5:motion*8),-14],[-13+(air?-9:motion*8),-2]],'#32354d',9);
      this.line([[10,-32],[15+(air?6:-motion*8),-15],[16+(air?9:-motion*8),-2]],'#53576d',9);
      this.line([[-18+motion*8,-2],[-6+motion*8,-2]],'#b6bdc4',4);
      this.line([[10-motion*8,-2],[24-motion*8,-2]],'#c8c5cb',4);
      this.path([[-18,-72],[-21,-56],[-12,-30],[13,-29],[23,-54],[17,-75],[0,-84]],armor,edge,1.5);
      this.path([[-12,-70],[0,-77],[14,-67],[8,-49],[0,-43],[-9,-52]],'#5e647b','#c1bdce',1);
      this.line([[-12,-35],[14,-35]],'#ccb899',3);
      this.path([[-16,-76],[-17,-93],[-7,-104],[7,-105],[19,-95],[20,-80],[10,-71],[-5,-71]],armor,edge,1.5);
      this.path([[-13,-89],[18,-89],[17,-82],[-12,-82]],'#202c47');
      this.line([[1,-85],[14,-85]],phase===3?'#f4c1dd':'#d0daff',2);
      this.path([[-14,-94],[-25,-113],[-22,-85],[-12,-76]],'#68708c',edge,1);
      this.path([[13,-97],[19,-119],[26,-100],[18,-80]],'#a3a5b7',edge,1);
      this.line([[18,-67],[27,-58],[22,-43]],armor,7);
      const attack=e.state==='attack',angle=attack?1.7:e.state==='windup'?-.8:open?.45:.8;
      this.weapon('sword',22,-42,angle,.85,attack);
      if(attack){
        c.save();c.globalAlpha*=.6;c.translate(12,-49);c.strokeStyle='#e5d9ff';c.lineWidth=4;c.beginPath();c.arc(0,0,59,-1.1,1.15);c.stroke();c.restore();
      }
      if(phase>=2)this.line([[-11,-62],[-1,-55],[-7,-46],[3,-36]],'#d1b8df',1.3);
      if(phase===3){
        this.path([[-6,-104],[-17,-126],[-4,-118],[2,-137],[8,-117],[20,-125],[11,-101]],'#d6bfe282');
      }
      c.restore();
    }
    duelist(e) {
      const x=e.x+e.w/2,fast=Math.abs(e.vx||0)>200||e.state==='attack';
      this.ellipse(x,648,45,6,'#06102880');
      if(fast){const side=e.facing||1;for(let i=3;i>0;i--)this.eclipseBody(e,.06+(4-i)*.025,-side*i*24,0,true);}
      this.eclipseBody(e);
      this.livingWeakpoint(e,'duelist');
      if(e.state==='windup')this.bossTelegraph(e);
      if(e.state==='stunned')this.stunned(x,e.y-15);
    }
    stoneJoint(x,y,r,king,open) {
      const edge=king?'#b3a082':'#a0b3a3',stone=king?'#574753':'#4b6468';
      this.ellipse(x,y,r,r,stone);this.ellipse(x,y,r*.63,r*.63,'#172b34');
      const c=this.ctx;c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.arc(x,y,r-3,.2,5.5);c.stroke();
      for(let i=0;i<4;i++){const a=i*Math.PI/2+.4;this.ellipse(x+Math.cos(a)*r*.78,y+Math.sin(a)*r*.78,2.5,2.5,edge);}
      if(open)this.ellipse(x,y,4,4,'#bcead5');
    }
    bossLedge(pf,king,active,index) {
      const c=this.ctx,x=pf.x,y=pf.y,w=pf.w;
      const edge=active?'#bce8cf':king?'#9b8277':'#758f87';
      this.path([[x,y],[x+w,y],[x+w-5,y+19],[x+w-19,y+33],[x+18,y+33],[x+4,y+21]],king?'#6e595d':'#586e70',edge,1.5);
      this.path([[x+4,y+5],[x+w-5,y+5],[x+w-12,y+16],[x+10,y+16]],king?'#8b7467':'#748b80');
      for(let i=1;i<4;i++)this.line([[x+i*w/4,y+9],[x+i*w/4-4,y+27]],'#203139',2);
      if(active){
        this.line([[x+3,y],[x+w-3,y]],'#baf4db',3);
        this.glow(x+w/2,y,50,'#98edcb',.10);
        c.save();c.globalAlpha=.55+.25*Math.sin(this.t*3+index);const mx=x+w/2;
        this.line([[mx-5,y-13],[mx,y-18],[mx+5,y-13]],'#dcffe7',1.5);c.restore();
      }
    }
    bossSeal(seal,king) {
      const c=this.ctx,x=seal.x,y=seal.y,w=seal.w||38,h=seal.h||50,alive=seal.hp>0,active=seal.active!==false&&alive;
      const edge=active?'#ffd38f':alive?'#9d8b77':'#526768';
      if(active)this.glow(x+w/2,y+h/2,39,'#ffc97e',.22);
      this.path([[x+7,y],[x+w-7,y],[x+w,y+9],[x+w-3,y+h-4],[x+w/2,y+h],[x+3,y+h-4],[x,y+9]],alive?'#3c3d43':'#23343c',edge,2);
      if(alive){
        const mx=x+w/2,my=y+h/2;
        this.path([[mx,my-16],[mx+9,my-3],[mx+6,my+10],[mx,my+16],[mx-6,my+10],[mx-9,my-3]],active?'#e0ae68':'#7d7970',edge,1);
        this.line([[mx,my-11],[mx,my+11]],active?'#fff1b5':'#a29b84',2);
        if(seal.hp<seal.maxHp)this.line([[x+7,y+3],[x+18,y+17],[x+12,y+28],[x+28,y+43]],'#182a35',3);
        for(let i=0;i<(seal.maxHp||2);i++){
          c.fillStyle=i<seal.hp?'#ffdb9b':'#52656b';c.fillRect(mx-8+i*10,y-8,6,3);
        }
      }else{
        this.line([[x+3,y+8],[x+w-9,y+19],[x+8,y+31],[x+w-4,y+h-4]],'#10272f',4);
        this.path([[x+9,y+13],[x+20,y+20],[x+12,y+29]],'#c08f61');
      }
    }
    bossCore(e,king) {
      const wp=e.weakpoint;if(!wp)return;
      const c=this.ctx,x=wp.x,y=wp.y,w=wp.w,h=wp.h,cx=x+w/2,cy=y+h/2;
      const open=!!wp.active,edge=open?'#d5ffe4':king?'#c4ad82':'#9db8aa';
      this.path([[x-9,y+10],[cx,y-14],[x+w+9,y+10],[x+w+9,y+h-9],[cx,y+h+14],[x-9,y+h-9]],king?'#73675e':'#617d75',edge,2);
      this.path([[x,y+9],[cx,y-4],[x+w,y+9],[x+w,y+h-8],[cx,y+h+4],[x,y+h-8]],'#0a252f');
      if(open){
        this.glow(cx,cy,75,'#91f5c2',.25+.08*Math.sin(this.t*7));
        // The luminous gem stays inside the exact damageable rectangle.
        this.path([[cx,y+2],[x+w-4,cy-6],[cx+12,y+h-4],[cx,y+h-1],[cx-12,y+h-4],[x+4,cy-6]],'#a1e7bf','#edffe0',2);
        this.path([[cx,y+5],[cx+8,cy],[cx,y+h-6],[cx-8,cy]],'#f0ffde');
        c.save();c.globalAlpha=.68;c.strokeStyle='#c7ffda';c.lineWidth=2;c.beginPath();
        c.arc(cx,cy,Math.max(w,h)*.72,-Math.PI/2,-Math.PI/2+TAU*clamp((e.vulnerabilityTimer||0)/6.5,0,1));c.stroke();c.restore();
        for(let i=0;i<5;i++){const a=this.t*.9+i*TAU/5;this.ellipse(cx+Math.cos(a)*42,cy+Math.sin(a)*45,1.4,1.4,'#dcffe7');}
        c.save();c.font='700 11px system-ui, sans-serif';c.textAlign='center';c.fillStyle='#d9ffe5';c.shadowColor='#05131f';c.shadowBlur=6;
        c.fillText(king?'COURONNE OUVERTE':'CŒUR OUVERT',cx,y-28);c.restore();
      }else{
        // Closed shutters are deliberately matte, never a false glowing target.
        this.path([[x+2,y+10],[cx-2,y],[cx-2,y+h],[x+2,y+h-9]],king?'#625552':'#486265','#7d928a',1);
        this.path([[cx+2,y],[x+w-2,y+10],[x+w-2,y+h-9],[cx+2,y+h]],king?'#514752':'#3b555f','#7d928a',1);
        this.line([[cx-10,cy],[cx+10,cy]],'#a79c7c',3);this.ellipse(cx,cy,5,5,'#747765');
      }
    }
    boss(e) {
      if(e.bossType==='moth'){this.moth(e);return;}
      if(e.bossType==='worm'){this.worm(e);return;}
      if(e.bossType==='duelist'){this.duelist(e);return;}
      const c=this.ctx,t=this.t,king=e.bossType==='king',phase=e.phase||1;
      const x=e.x+e.w/2,floor=e.y+e.h,open=e.weakpoint?.active||e.state==='exposed';
      const wind=e.state==='windup',progress=e.attackProgress||0;
      const edge=king?'#b9a283':'#a0b6a6',stone=e.hitFlash>0?'#d4d8c0':king?'#64575f':'#59757a';
      const dark=king?'#352e40':'#263f4a',mid=king?'#7c6c68':'#7e9687';
      this.ellipse(x,floor+2,king?245:220,19,'#030d1cc9');
      // Huge articulated arm chains connect to the actual walkable hand ledges.
      const hands=(e.platforms||[]).slice(0,2),elbows=(e.platforms||[]).slice(2,4);
      for(let side=0;side<2;side++){
        const dir=side===0?-1:1,shoulder={x:x+dir*(king?111:100),y:e.y+(king?140:85)};
        const pf=hands[side],ep=elbows[side];
        const elbow=open&&ep?{x:ep.x+ep.w/2,y:ep.y+22}:{x:x+dir*(king?145:134),y:floor-171};
        const hand=open&&pf?{x:pf.x+pf.w/2,y:pf.y+20}:{x:x+dir*(king?164:149),y:floor-65};
        this.line([[shoulder.x,shoulder.y],[elbow.x,elbow.y]],dark,59);
        this.line([[shoulder.x-6,shoulder.y],[elbow.x-6,elbow.y]],stone,43);
        this.line([[elbow.x,elbow.y],[hand.x,hand.y]],dark,48);
        this.line([[elbow.x-5,elbow.y],[hand.x-5,hand.y]],mid,31);
        this.stoneJoint(shoulder.x,shoulder.y,34,king,open);this.stoneJoint(elbow.x,elbow.y,27,king,open);
        if(!open){
          this.path([[hand.x-38,hand.y-30],[hand.x+27,hand.y-33],[hand.x+43,hand.y-9],[hand.x+29,hand.y+34],[hand.x-29,hand.y+33],[hand.x-45,hand.y+6]],stone,edge,2);
          for(let i=0;i<3;i++)this.line([[hand.x-21+i*19,hand.y+9],[hand.x-23+i*20,hand.y+29]],dark,3);
        }
      }
      c.save();c.translate(x,floor);
      // Feet and huge column legs align with the breakable ankle seals.
      const seals=e.seals||[];
      for(let i=0;i<2;i++){
        const sx=seals[i]?seals[i].x+(seals[i].w||38)/2-x:(i?105:-105),dir=i?1:-1;
        this.path([[sx-36,0],[sx-46,-16],[sx-39,-96],[sx-24,-135],[sx+28,-130],[sx+42,-92],[sx+44,-15],[sx+36,0]],stone,edge,2);
        this.path([[sx-37,-6],[sx-48,-3],[sx-56,0],[sx+56,0],[sx+48,-16],[sx-32,-17]],mid,edge,1);
        this.path([[sx-33,-86],[sx-27,-112],[sx+27,-110],[sx+34,-85],[sx+18,-65],[sx-15,-64]],mid,edge,2);
        this.line([[sx+dir*22,-60],[sx+dir*27,-29]],dark,4);
        for(let k=0;k<3;k++)this.line([[sx-29+k*25,-13],[sx-32+k*25,0]],dark,2);
      }
      if(king){
        // An architectural titan: a tall reliquary body and a crown that is a fortress.
        this.path([[-112,-310],[-156,-287],[-155,-80],[-126,-15],[-92,-28],[-63,-12],[-30,-36],[16,-20],[53,-39],[93,-18],[128,-30],[159,-7],[155,-283],[108,-317]],'#412f48','#795a68',2);
        this.path([[-132,-269],[-131,-91],[-105,-52],[-86,-69],[-101,-263]],'#29283e');
        this.path([[112,-269],[124,-86],[105,-60],[84,-78],[88,-270]],'#67444e');
        this.path([[-109,-317],[-123,-286],[-105,-207],[-75,-120],[-40,-105],[43,-105],[78,-124],[113,-218],[118,-290],[100,-317],[0,-340]],stone,edge,2.5);
        this.path([[-89,-288],[-63,-316],[-17,-298],[0,-267],[23,-298],[67,-314],[92,-282],[73,-211],[0,-185],[-75,-210]],mid,edge,2);
        // Recessed lancet windows make the scale read as a walking cathedral.
        for(let i=-1;i<=1;i++){
          const wx=i*43;this.path([[wx-12,-240],[wx-12,-274],[wx,-291],[wx+12,-274],[wx+12,-240]],'#252e3e','#a28b79',1.5);
          this.line([[wx,-278],[wx,-248]],'#b59063',1);
        }
        this.path([[-68,-198],[0,-179],[73,-201],[57,-161],[0,-147],[-58,-164]],'#8d7770',edge,1.5);
        this.line([[-56,-139],[56,-139]],'#b39a77',5);
        for(let i=-2;i<=2;i++)this.path([[i*22,-165],[i*22+8,-154],[i*22,-143],[i*22-8,-154]],'#4b414f','#a99070',1);
        // Face under the crown, with a narrow slit instead of another false weakpoint.
        this.path([[-64,-310],[-70,-352],[-52,-375],[49,-375],[70,-351],[62,-313],[31,-289],[-33,-290]],'#989683',edge,2);
        this.path([[-49,-342],[49,-342],[39,-331],[-43,-329]],'#203344');
        this.line([[-32,-337],[-12,-337]],'#d6ac79',2);this.line([[13,-337],[34,-337]],'#d6ac79',2);
        this.path([[-18,-328],[0,-337],[18,-327],[8,-307],[-8,-307]],'#68666b','#c0aa8d',1);
        this.path([[-80,-371],[-90,-425],[-56,-399],[-35,-441],[-12,-409],[8,-446],[31,-409],[59,-435],[77,-399],[96,-423],[85,-369]],'#8e7866',edge,2);
        this.path([[-78,-380],[-72,-368],[74,-368],[84,-382],[58,-385],[-53,-385]],'#b5a086','#d3bd8d',1.5);
        if(phase>=2){
          for(let i=0;i<7;i++){
            const fx=-74+i*25,fy=-398+Math.sin(i*1.6)*12,flame=12+phase*6+Math.sin(t*7+i)*6;
            this.path([[fx-8,fy],[fx-10,fy-13],[fx,fy-flame],[fx+4,fy-12],[fx+10,fy]],i%2?'#ce755d':'#e9ae72');
          }
        }
      }else{
        // The Veilleur is squat, broad and built from staggered megaliths.
        this.path([[-125,-265],[-139,-223],[-112,-147],[-69,-105],[66,-103],[116,-151],[139,-228],[120,-272],[42,-310],[-39,-309]],stone,edge,2.5);
        this.path([[-112,-254],[-79,-284],[-29,-269],[-36,-220],[-82,-193],[-113,-211]],mid,edge,1.5);
        this.path([[105,-253],[78,-286],[29,-268],[36,-216],[80,-191],[113,-214]],'#6e8a7d',edge,1.5);
        this.path([[-78,-191],[-38,-177],[38,-179],[84,-194],[61,-145],[15,-128],[-29,-130],[-63,-149]],'#758a7c',edge,2);
        this.line([[-80,-122],[82,-122]],'#97aa91',7);
        for(let i=-2;i<=2;i++)this.path([[i*27,-139],[i*27+10,-124],[i*27,-110],[i*27-10,-124]],'#3b5c60','#95ac96',1);
        // Head formed by a bell tower and a stone mask, much wider than the player.
        this.path([[-72,-286],[-78,-315],[-61,-344],[-22,-354],[33,-350],[69,-328],[77,-297],[53,-270],[-49,-270]],'#849c8d',edge,2);
        this.path([[-58,-319],[56,-319],[48,-302],[-51,-303]],'#203d4a');
        this.line([[-45,-310],[-15,-310]],'#bdcfac',3);this.line([[16,-310],[43,-310]],'#bdcfac',3);
        this.path([[-16,-305],[0,-316],[17,-303],[11,-282],[-10,-282]],'#9eb1a0','#c1cbb1',1.5);
        this.path([[-66,-337],[-91,-369],[-88,-325],[-65,-301]],'#697e74',edge,2);
        this.path([[63,-333],[84,-363],[90,-327],[68,-304]],'#98a68e',edge,2);
        for(let i=0;i<9;i++){
          const gx=-90+i*22,gy=-270-Math.abs(gx)*.13;
          this.line([[gx,gy],[gx-7,gy-16-noise(i)*14],[gx+3,gy-6]],'#8eae8a',2);
        }
        // Tiny tree growing from the shoulder gives a strong human-to-giant scale cue.
        this.line([[-105,-262],[-114,-294],[-105,-318],[-115,-334]],'#263f45',6);
        this.line([[-112,-296],[-136,-308]],'#263f45',4);
        for(let i=0;i<5;i++)this.ellipse(-122+noise(i+17)*36,-328+noise(i+31)*28,18,7,'#597f70');
      }
      // Fractures spread each phase; their narrow light never resembles a target.
      for(let i=0;i<(phase-1)*4;i++){
        const cx=-85+noise(i+94)*170,cy=-139-noise(i+33)*(king?154:111);
        const points=[[cx,cy],[cx+11,cy+13],[cx+5,cy+28],[cx+18,cy+39]];
        this.line(points,'#1a2d36',4);this.line(points,king?'#d6906a':'#91c3a3',1);
      }
      if(phase===3){
        this.path([[73,-205],[104,-215],[95,-184],[79,-174]],'#142d37');
        this.path([[-74,-170],[-94,-185],[-106,-164],[-81,-142]],'#142d37');
      }
      c.restore();
      // These are the collision rectangles, not decorative approximation ledges.
      if(open)for(let i=0;i<(e.platforms||[]).length;i++)this.bossLedge(e.platforms[i],king,e.platforms[i].active!==false,i);
      for(const seal of e.seals||[])this.bossSeal(seal,king);
      this.bossCore(e,king);
      if(wind)this.bossTelegraph(e);
      if(e.state==='stunned')this.stunned(x,e.y-17);
      if(e.state==='attack'&&['slam','eruption','rain'].includes(e.attackKind)){
        for(let i=0;i<14;i++){
          const a=noise(i+e.sequence*31),dx=(a-.5)*440;
          this.ellipse(x+dx,floor-5-noise(i+91)*18,9+noise(i)*14,3+noise(i+3)*7,'#b3aaa044');
        }
      }
    }
    bossTelegraph(e) {
      const c=this.ctx,x=e.x+e.w/2,floor=e.y+e.h,progress=e.attackProgress||0,kind=e.attackKind;
      const markerY=Math.max(130,e.y-34);
      c.save();c.globalAlpha=.27+progress*.28;
      if(this.showAttackZones!==false){
      if((e.telegraphs||[]).length){
        for(const zone of e.telegraphs){
          const color=zone.parryable?'#ffd78d':'#ff9a79';
          const baseAlpha=c.globalAlpha;
          if(zone.w*zone.h>60000)c.globalAlpha=.1+progress*.1;
          c.fillStyle=color;c.fillRect(zone.x,zone.y,zone.w,zone.h);c.globalAlpha=baseAlpha;
          c.strokeStyle=color;c.lineWidth=2;c.setLineDash([8,6]);c.strokeRect(zone.x,zone.y,zone.w,zone.h);c.setLineDash([]);
          if(zone.kind==='rain'){
            this.line([[zone.x+zone.w/2,zone.y-40],[zone.x+zone.w/2,zone.y-12]],color,2);
            this.line([[zone.x+zone.w/2-5,zone.y-20],[zone.x+zone.w/2,zone.y-12],[zone.x+zone.w/2+5,zone.y-20]],color,2);
          }
        }
      }else if(kind==='slam'||kind==='stomp'||kind==='eruption'){
        const tx=Number.isFinite(e.targetX)?e.targetX:x;
        this.ellipse(tx,floor-2,100+progress*60,12,'#ef9a75');
        c.setLineDash([8,8]);c.strokeStyle='#ffd194';c.lineWidth=2;c.beginPath();c.ellipse(tx,floor-2,155,14,0,0,TAU);c.stroke();c.setLineDash([]);
        for(let i=-1;i<=1;i++)this.line([[tx+i*90-6,floor-29],[tx+i*90,floor-38],[tx+i*90+6,floor-29]],'#ffdfb1',2);
      }else if(kind!=='volley'){
        const direction=e.facing||-1,length=kind==='charge'?470:290;
        this.path([[x,floor-4],[x+direction*length,floor-4],[x+direction*(length-20),floor+5],[x,floor+5]],'#ffbe88');
      }
      if(e.telegraph){const z=e.telegraph;c.fillStyle='#ffad6d';c.fillRect(z.x,z.y,z.w,z.h);}
      }
      if(kind==='volley')for(let i=0;i<3;i++)this.glow(x-125+i*125,e.y+115,24+progress*10,'#ffcd8f',.5);
      c.globalAlpha=1;this.alert(x,markerY);
      c.strokeStyle='#ffdb9d';c.lineWidth=2;c.beginPath();c.arc(x,markerY,14,-Math.PI/2,-Math.PI/2+TAU*progress);c.stroke();
      c.font='700 11px system-ui, sans-serif';c.textAlign='center';c.fillStyle='#ffe0b7';
      const texts={slam:'ONDE · SAUTEZ',stomp:'ONDE · SAUTEZ',eruption:'VAGUES · SAUTEZ',volley:'ORBES · PAREZ',rain:'CHUTE · BOUGEZ',doubleSweep:'DOUBLE BALAYAGE',feathers:'PLUMES · PAREZ',tempest:'TEMPÊTE · ESQUIVEZ',dive:'PLONGÉE · ÉCARTEZ-VOUS',gust:'RAFALE · SAUTEZ',burrow:'ÉMERGENCE · BOUGEZ',twinburrow:'DOUBLE ÉMERGENCE',bite:'MORSURE · PAREZ',dashSlash:'RUÉE · PAREZ',combo:'DEUX RUÉES',crescent:'LAME D’ÉCLIPSE'};
      const text=texts[kind]||'BALAYAGE · ESQUIVEZ';
      c.fillText(text,x,markerY-23);c.restore();
    }
    secretWall(wall) {
      const c=this.ctx,p=this.palette,x=wall.x,y=wall.y,w=wall.w,h=wall.h;
      if(wall.broken){
        for(let i=0;i<4;i++){const bx=x+7+i*13;this.path([[bx,y+h],[bx+3,y+h-5-noise(i)*8],[bx+11,y+h]],p.stone,p.edge,.7);}
        return;
      }
      this.path([[x+4,y],[x+w-5,y],[x+w,y+8],[x+w-2,y+h],[x,y+h],[x,y+7]],p.stone,p.edge,1.5);
      this.line([[x+5,y+6],[x+w-6,y+6]],p.edge,2);
      const ratio=wall.hp/(wall.maxHp||3),cx=x+w/2,cy=y+h/2;
      this.path([[cx,cy-15],[cx+10,cy],[cx,cy+15],[cx-10,cy]],'#20353f',p.grass,1);
      this.line([[cx-3,cy-8],[cx+3,cy],[cx-3,cy+8]],p.glow+'a8',1.5);
      this.line([[x+w*.37,y],[x+w*.5,y+13],[x+w*.41,y+29],[x+w*.63,y+41],[x+w*.48,y+h]],p.top,ratio<.5?4:2);
      if(ratio<.9)this.line([[x+w*.46,y+25],[x+9,y+32],[x+3,y+46]],p.top,3);
      if(ratio<.5)this.line([[x+w*.6,y+40],[x+w-7,y+27],[x+w,y+26]],p.top,3);
      for(let i=0;i<3;i++)this.ellipse(x+11+i*18,y+h+2,3,2,p.edge);
      this.glow(cx,cy,25,p.glow,.07+.04*Math.sin(this.t*1.5));
    }
    pickup(it) {
      if(it.collected)return;
      const c=this.ctx,p=this.palette,x=it.x+(it.w||20)/2,y=it.y+(it.h||20)/2+Math.sin(this.t*3+it.x*.04)*4;
      const charm=(CM.CHARMS||[]).find(ch=>ch.id===it.charm);
      const col=it.type==='health'?'#e9a2b2':it.type==='shard'?'#e4c98d':charm?.color||p.glow;
      this.glow(x,y,it.type==='shard'?26:57,col,it.type==='shard'?.16:.22);
      c.save();c.translate(x,y);
      if(it.type==='shard'){
        this.path([[0,-11],[6,-2],[3,7],[-4,10],[-7,0]],'#e6c77e','#ffe8b2',1);
        this.line([[0,-9],[-1,6]],'#fff2c5',1);
      }else if(it.type==='health'){
        this.path([[0,-9],[7,-14],[14,-8],[13,0],[0,13],[-13,0],[-14,-8],[-7,-14]],'#c887a1','#f3b7c5',1);
        this.line([[-5,-4],[5,-4]],'#ffe3df',2);this.line([[0,-9],[0,2]],'#ffe3df',2);
      }else if(it.type==='charm'){
        this.ellipse(0,0,18,21,'#173141');
        c.strokeStyle=col;c.lineWidth=1.5;c.beginPath();c.ellipse(0,0,18,21,0,0,TAU);c.stroke();
        this.ellipse(0,-23,3,4,col);
        if(it.charm==='heart')this.path([[0,12],[-11,1],[-11,-7],[-5,-10],[0,-5],[5,-10],[11,-7],[11,1]],col);
        else if(it.charm==='wind'){
          this.path([[-9,12],[-7,-7],[7,-14],[11,-5],[6,6]],col);this.line([[-10,15],[7,-10]],'#e7ffe9',1.5);
          this.line([[-4,5],[5,5]],'#2d666d',1);this.line([[0,-1],[8,-1]],'#2d666d',1);
        }else if(it.charm==='fang')this.path([[-9,-11],[10,-11],[9,-2],[2,12],[-5,15],[-1,4],[-7,1]],col,'#f9e7bb',1);
        else if(it.charm==='magnet')this.path([[0,-14],[4,-4],[13,0],[4,4],[0,15],[-4,4],[-13,0],[-4,-4]],col,'#eee2ff',1);
        else if(it.charm==='moss'){
          this.line([[0,14],[0,-9]],col,2);this.ellipse(-6,-2,6,3,col);this.ellipse(6,4,6,3,col);this.ellipse(3,-8,5,3,col);
        }else{
          this.path([[0,-14],[10,-5],[10,7],[0,15],[-10,7],[-10,-5]],'#678aab',col,1.5);
          this.line([[-5,5],[5,-6]],'#e7ffff',2);this.line([[0,9],[6,2]],'#c7ecf4',1);
        }
      }else if(it.type==='weapon'){
        c.rotate(-.4);this.weapon(it.weapon||'axe',0,20,0,.72,true);
      }else if(it.type==='doubleJump'){
        this.path([[0,11],[-14,1],[-25,-21],[-10,-14],[-5,-24],[0,-6],[5,-24],[10,-14],[25,-21],[14,1]],'#7ee3cf','#cefff0',1.5);
        this.path([[0,13],[-5,3],[0,-7],[5,3]],'#f3dba1');
      }else{
        c.rotate(this.t*.35);this.path([[0,-17],[13,-10],[17,4],[0,19],[-17,4],[-13,-10]],'#375c62',p.glow,1.5);
        this.path([[0,-10],[7,0],[0,11],[-7,0]],'#f0d69b');
      }
      if(it.type!=='shard'&&it.type!=='health'){
        c.strokeStyle=col;c.globalAlpha=.35;c.lineWidth=1;c.beginPath();c.arc(0,0,32,this.t,-.5+this.t+TAU);c.stroke();
      }
      c.restore();
    }
    effect(f) {
      const c=this.ctx,ratio=clamp(f.life/(f.maxLife||f.life||1),0,1),col=f.color||this.palette.glow;
      c.save();c.globalAlpha=ratio;
      if(f.type==='text'){
        c.font='600 17px system-ui, sans-serif';c.textAlign='center';c.shadowBlur=8;c.shadowColor='#06121d';c.fillStyle=col;c.fillText(f.text||'',f.x,f.y);
      }else if(f.type==='ring'){
        c.strokeStyle=col;c.lineWidth=2+ratio*3;c.beginPath();c.arc(f.x,f.y,12+(1-ratio)*55,0,TAU);c.stroke();
      }else if(f.type==='slash'){
        c.translate(f.x,f.y);if(f.down)c.rotate(Math.PI/2);else if(f.facing===-1)c.scale(-1,1);c.strokeStyle=col;c.lineWidth=2+ratio*5;c.beginPath();c.arc(0,0,30+(1-ratio)*25,-1.1,1.1);c.stroke();
        if(f.weapon==='spear')this.line([[15,0],[f.range||136,0]],col,2+ratio*3);
      }else{
        this.ellipse(f.x,f.y,2+ratio*2,2+ratio*2,col);
        this.line([[f.x-4*ratio,f.y],[f.x+4*ratio,f.y]],col,1);
      }
      c.restore();
    }
    attackVolume(e,a) {
      if((a.delay||0)>0||(a.life!=null&&a.life<=0))return;
      const c=this.ctx,x=a.x,y=a.y,w=a.w,h=a.h,kind=a.kind||e.attackKind;
      c.save();c.globalAlpha=.65;
      if(kind==='rain'){
        const g=c.createLinearGradient(x,y,x,y+h);g.addColorStop(0,'#f7c48b10');g.addColorStop(.65,'#f7c48b50');g.addColorStop(1,'#e7bc91d9');
        this.path([[x+8,y],[x+w-8,y],[x+w,y+h-18],[x+w-10,y+h],[x+6,y+h],[x,y+h-12]],g,'#e9c59e',1.5);
        this.line([[x+w*.4,y+h*.4],[x+w*.5,y+h*.72],[x+w*.33,y+h]],'#65565b',3);
        this.glow(x+w/2,y+h-8,w,'#f0c593',.4);
      }else if(kind==='bite'){
        const jaw=8+Math.sin(this.t*28)*4;
        this.path([[x,y],[x+w,y],[x+w-15,y+jaw],[x+15,y+jaw]],'#efdcad');
        this.path([[x,y+h],[x+w,y+h],[x+w-15,y+h-jaw],[x+15,y+h-jaw]],'#efdcad');
        for(let i=0;i<8;i++){
          const px=x+12+i*(w-24)/8;
          this.path([[px,y+jaw],[px+12,y+h*.35],[px+24,y+jaw]],'#dccca7');
          this.path([[px,y+h-jaw],[px+12,y+h*.65],[px+24,y+h-jaw]],'#dccca7');
        }
      }else if(kind==='burrow'){
        for(let i=0;i<5;i++){
          const px=x+i*w/5;
          this.path([[px,y+h],[px+7,y+18+noise(i)*h*.2],[px+w/5-3,y+noise(i+1)*h*.35],[px+w/5,y+h]],'#d0b47c66','#dfc997',1);
        }
      }else{
        // A spectral arm sweep fills exactly the damaging horizontal band.
        const cy=y+h/2;
        this.path([[x,cy],[x+w*.12,y+4],[x+w*.75,y],[x+w,cy],[x+w*.78,y+h],[x+w*.1,y+h-6]],'#eacdab39');
        this.line([[x+3,cy],[x+w*.23,y+10],[x+w*.72,y+8],[x+w-3,cy]],'#fff0c5',3);
        this.line([[x+w*.08,cy+8],[x+w*.38,y+h-9],[x+w*.85,y+h-12]],'#d8b7cf',1.5);
      }
      c.restore();
    }
    projectile(o) {
      const c=this.ctx,x=o.x+(o.w||8)/2,y=o.y+(o.h||8)/2,color=o.color||'#ffc68a';
      this.glow(x,y,35,color,.25);
      if(o.kind==='gust'){
        c.save();c.translate(x,y);c.scale(Math.sign(o.vx)||1,1);c.strokeStyle='#c4e8ee';c.lineWidth=2;
        for(let i=0;i<3;i++){c.beginPath();c.ellipse(0,-7+i*7,25-i*3,9+i*2,-.2,-2.6,2.2);c.stroke();}
        this.line([[-28,-12],[-12,-12]],'#b5d9e8',1.5);this.line([[-31,9],[-14,9]],'#b5d9e8',1.5);c.restore();return;
      }
      if(o.kind==='crescent'){
        c.save();c.translate(x,y);c.scale(Math.sign(o.vx)||1,1);
        this.path([[-12,-29],[8,-16],[14,0],[8,16],[-12,29],[-1,11],[3,0],[-1,-11]],'#e0d2fa','#f5ebff',1);
        c.restore();return;
      }
      if(o.kind==='feather'){
        c.save();c.translate(x,y);c.rotate(Math.atan2(o.vy||0,o.vx||1));
        this.path([[-10,-1],[-7,-7],[2,-10],[11,0],[0,7],[-8,5]],'#bfdfe8','#e6f7ec',1);
        this.line([[-12,0],[9,0]],'#647ca2',1);c.restore();return;
      }
      if(o.kind==='spore'){
        this.ellipse(x,y,(o.w||22)*.42,(o.h||22)*.42,'#9ebc8b');
        for(let i=0;i<5;i++){const a=i*TAU/5+this.t*2;this.ellipse(x+Math.cos(a)*7,y+Math.sin(a)*7,2.3,2.3,'#deecb9');}
        return;
      }
      if(o.groundWave){
        c.save();c.translate(x,y);c.scale(Math.sign(o.vx)||1,1);
        this.path([[-25,13],[-19,0],[-7,5],[0,-18],[8,-6],[18,-12],[21,13]],'#cf655b',color,1.5);
        this.path([[-11,13],[0,-8],[7,5],[13,1],[16,13]],'#ffd4a0');
        c.restore();return;
      }
      c.save();c.translate(x,y);c.rotate(Math.atan2(o.vy||0,o.vx||1));
      this.path([[-18,-2],[0,-6],[9,0],[0,6],[-18,2]],color);this.line([[-12,0],[5,0]],'#fff0bf',2);c.restore();
    }
    foreground(camera) {
      const c=this.ctx,p=this.palette; c.save();c.globalAlpha=.75;
      for(let i=0;i<9;i++){
        const x=i*190-((camera.x||0)*1.12)%190,y=750;
        for(let k=0;k<5;k++){
          const dx=(k-2)*15,hh=30+noise(i*7+k)*55;
          this.path([[x,y],[x+dx,y-hh],[x+dx*.2+6,y]],p.top);
        }
      }
      c.restore();
      const g=c.createRadialGradient(640,345,300,640,345,760);g.addColorStop(0,'transparent');g.addColorStop(1,'#02071183');c.fillStyle=g;c.fillRect(0,0,1280,720);
    }
    draw(engine,dt=.016) {
      this.t+=Math.min(dt,.05);this.begin();
      this.showAttackZones=engine.showAttackZones!==false;
      const c=this.ctx,room=engine.room||{theme:'forest',platforms:[],hazards:[],width:1280},camera=engine.camera||{x:0,y:0};
      this.palette=palettes[room.theme]||palettes.forest;
      this.background(room,camera);
      if(engine.player){
        if(this.lastHP!==null&&engine.player.hp<this.lastHP)this.shake=6;
        if(this.lastHP!==null&&engine.player.hp>this.lastHP)this.healAura=.8;
        this.lastHP=engine.player.hp;
      }
      this.healAura=Math.max(0,(this.healAura||0)-dt);
      for(const boss of engine.enemies||[])if(boss.type==='boss'&&boss.state==='attack'&&['slam','eruption'].includes(boss.attackKind)){
        const key=boss.id+':'+boss.sequence;
        if(this.lastImpact!==key){this.lastImpact=key;this.shake=9;}
      }
      this.shake=Math.max(0,this.shake-dt*25);
      c.save();c.translate(-(camera.x||0)+Math.sin(this.t*120)*this.shake,-(camera.y||0)+Math.cos(this.t*95)*this.shake*.55);
      const min=(camera.x||0)-180,max=(camera.x||0)+1460;
      // Wayfinding glints along exits.
      if(room.width>0){
        if(engine.roomIndex!==(CM.ROOMS?.length||12)-1)this.doorway(room.width-20,false,engine.arenaLocked||(engine.roomIndex===1&&!engine.player?.doubleJump));
        if(engine.roomIndex>0)this.doorway(20,true,engine.arenaLocked);
      }
      (room.platforms||[]).forEach((pf,i)=>{if(pf.x+pf.w>min&&pf.x<max)this.platform(pf,i);});
      (room.hazards||[]).forEach(hz=>{if(hz.x+hz.w>min&&hz.x<max)this.hazard(hz);});
      if(engine.arenaLocked&&room.bossGate){
        for(const x of [room.bossGate.x,room.width-50]){
          this.glow(x,480,105,'#eaad75',.12);
          c.save();c.globalAlpha=.45+.08*Math.sin(this.t*4);
          for(let i=0;i<3;i++)this.line([[x-5+i*5,650],[x-7+i*6,480],[x+i*3,300]],'#ffc78b',1.5);
          this.path([[x,540],[x-6,532],[x,524],[x+6,532]],'#ffdcaa');c.restore();
        }
      }
      let points=room.checkpoints||[];
      if(room.checkpoint)points=points.concat([room.checkpoint]);
      if(!points.length&&room.shrine)points=[room.shrine];
      points.forEach(pt=>{
        this.checkpoint(pt,!!engine.checkpointLit);
        if(engine.player&&!engine.arenaLocked&&Math.abs(engine.player.x-pt.x)<100){
          c.save();c.font='500 12px system-ui, sans-serif';c.textAlign='center';c.fillStyle='#c1ded0';c.fillText('E · Se reposer',pt.x,pt.y-87);c.restore();
        }
      });
      (engine.pickups||[]).forEach(p=>{if(p.x>min&&p.x<max)this.pickup(p);});
      (engine.secretWalls||[]).forEach(w=>{if(w.x+w.w>min&&w.x<max)this.secretWall(w);});
      (engine.enemies||[]).forEach(e=>{if(e.x+e.w>min&&e.x<max)this.enemy(e);});
      (engine.enemies||[]).forEach(e=>{if(e.state==='attack')for(const a of e.attackVolumes||[])this.attackVolume(e,a);});
      (engine.projectiles||[]).forEach(o=>this.projectile(o));
      if(engine.player)this.hero(engine.player);
      if(engine.player&&this.healAura>0){
        const h=engine.player,hx=h.x+h.w/2,hy=h.y+h.h/2,a=this.healAura/.8;
        c.save();c.globalAlpha=a;this.glow(hx,hy,55,'#a6f4c1',.35);
        c.strokeStyle='#bdffcf';c.lineWidth=1.5;c.beginPath();c.ellipse(hx,hy,19+(1-a)*20,34+(1-a)*20,0,0,TAU);c.stroke();
        for(let i=0;i<4;i++){const px=hx+Math.sin(i*2.3)*24,py=hy+25-(1-a)*70+i*6;this.line([[px-3,py],[px+3,py]],'#d3ffdc',1.5);this.line([[px,py-3],[px,py+3]],'#d3ffdc',1.5);}c.restore();
      }
      (engine.effects||[]).forEach(f=>this.effect(f));
      c.restore();this.foreground(camera);
    }
    drawTitle(time) {
      this.t=typeof time==='number'?time:this.t+.016;this.begin();this.palette=palettes.forest;
      const c=this.ctx;
      this.background({theme:'forest'},{x:150+Math.sin(this.t*.06)*60,y:0});
      // Monument to the sleeping kingdom.
      c.save();c.translate(970,595);this.glow(0,-165,220,'#80edd1',.18);
      this.ruinedArch(-15,0,1.06,1);
      c.save();c.globalAlpha=.26;
      const beam=c.createLinearGradient(0,-370,0,0);beam.addColorStop(0,'#aaffdb90');beam.addColorStop(1,'#aaffdb00');this.path([[-32,-390],[35,-390],[78,4],[-65,4]],beam);c.restore();
      for(let i=0;i<8;i++){const a=i*TAU/8+this.t*.04;this.path([[Math.cos(a)*130,Math.sin(a)*130-210],[Math.cos(a)*130+2,Math.sin(a)*130-205],[Math.cos(a)*130+5,Math.sin(a)*130-210]],'#8accb080');}
      c.restore();
      this.platform({x:710,y:614,w:530,h:130},33);
      this.platform({x:730,y:581,w:380,h:43},9);
      this.hero({x:925,y:529,w:30,h:52,vx:0,vy:0,facing:1,grounded:true,weapon:'sword',hp:100},2.45,true);
      this.checkpoint({x:1119,y:582},true);
      this.glow(966,488,110,'#e8d7a4',.1);
      // Left-hand quiet field is intentionally reserved for the game title.
      let g=c.createLinearGradient(0,0,970,0);g.addColorStop(0,'#05111be8');g.addColorStop(.45,'#05111bc4');g.addColorStop(1,'#05111b00');c.fillStyle=g;c.fillRect(0,0,1280,720);
      this.foreground({x:80});
    }
  }
  CM.Renderer=Renderer;
})(typeof window!=='undefined'?window:globalThis);
