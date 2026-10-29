'use strict';
{
const root=typeof window!=='undefined'?window:globalThis;
  'use strict';
  const CM = root.CM = root.CM || {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
  const copy = value => JSON.parse(JSON.stringify(value));
  const platform = (x,y,w,h=24) => ({x,y,w,h});
  const enemy = (id,type,x,y,extra={}) => ({id,type,x,y,...extra});
  const pickup = (id,type,x,y,label,extra={}) => ({id,type,x,y,w:26,h:30,label,...extra});
  const WEAPONS = CM.WEAPONS = {
    sword:{id:'sword',name:'Épée d’aurore',shortName:'Épée',description:'Vive, équilibrée. Le troisième coup frappe plus fort.',damage:1,range:80,duration:.31,windup:.07,cost:6,color:'#fff0b0'},
    axe:{id:'axe',name:'Hache du veilleur',shortName:'Hache',description:'Lente et puissante. Brise la garde des sentinelles.',damage:1.65,range:90,duration:.53,windup:.18,cost:11,color:'#ffb76b'},
    spear:{id:'spear',name:'Lance astrale',shortName:'Lance',description:'Une longue portée pour garder les monstres à distance.',damage:.9,range:136,duration:.38,windup:.10,cost:8,color:'#89edff'}
  };
  const SKILLS = CM.SKILLS = [
    {id:'vigor',name:'Cœur vaillant',description:'+30 points de vie. Soigne à l’acquisition.',cost:1},
    {id:'edge',name:'Lame éveillée',description:'+25 % de dégâts avec toutes les armes.',cost:1},
    {id:'flow',name:'Souffle du vent',description:'Endurance +30, récupération plus rapide.',cost:1},
    {id:'riposte',name:'Contre-éclat',description:'Après une parade parfaite, le prochain coup inflige le double de dégâts.',cost:2,requires:'edge'},
    {id:'aegis',name:'Garde de cristal',description:'Le blocage absorbe tous les dégâts si votre endurance suffit.',cost:2,requires:'vigor'},
    {id:'longdash',name:'Pas fantôme',description:'Esquive plus longue, coût réduit et recharge accélérée.',cost:2,requires:'flow'},
    {id:'pogo',name:'Étoile plongeante',description:'+50 % de dégâts avec les attaques aériennes vers le bas.',cost:2,requires:'edge'},
    {id:'afterdash',name:'Éclair tranchant',description:'Le prochain coup dans les 1,2 s après une esquive inflige +50 % de dégâts.',cost:2,requires:'flow'},
    {id:'parryheal',name:'Écho de vie',description:'Chaque parade parfaite rend 8 points de vie.',cost:2,requires:'vigor'},
    {id:'reserve',name:'Seconde fiole',description:'Portez deux fioles. Les sanctuaires les remplissent.',cost:1,requires:'vigor'},
    {id:'restoration',name:'Source pure',description:'Chaque fiole soigne 75 points de vie au lieu de 50.',cost:2,requires:'reserve'},
    {id:'economy',name:'Geste juste',description:'Les attaques consomment 25 % d’endurance en moins.',cost:1,requires:'flow'}
  ];
  const CHARMS=CM.CHARMS=[
    {id:'heart',name:'Cœur de jade',description:'+25 points de vie maximale.',symbol:'♥',color:'#8be9b3'},
    {id:'wind',name:'Plume du zéphyr',description:'+10 % de vitesse de course.',symbol:'↗',color:'#9fdfff'},
    {id:'fang',name:'Croc solaire',description:'+12 % de dégâts avec toutes les attaques.',symbol:'✦',color:'#ffcf86'},
    {id:'magnet',name:'Étoile aimantée',description:'Attire les objets proches à distance.',symbol:'✧',color:'#d0acff'},
    {id:'moss',name:'Mousse vivante',description:'Vaincre un monstre ordinaire rend 5 points de vie.',symbol:'❋',color:'#99e2bc'},
    {id:'mirror',name:'Miroir de l’aube',description:'La fenêtre de parade parfaite dure 45 ms de plus.',symbol:'◇',color:'#b9f7ff'}
  ];
  const BOSSES=CM.BOSSES=[
    {id:'warden',name:'Le Veilleur de pierre',subtitle:'Un cœur sous la roche',tip:'Brisez les sceaux ou parez, puis grimpez sur ses bras.',roomIndex:2,weakpointLabel:'Cœur de pierre',openingLabel:'Sceaux ou parade'},
    {id:'king',name:'Le Roi des cendres',subtitle:'La couronne oubliée',tip:'Ouvrez son armure, escaladez les épaules et frappez sa couronne.',roomIndex:5,weakpointLabel:'Couronne',openingLabel:'Sceaux ou parade'},
    {id:'moth',name:'Sylphe, aile d’orage',subtitle:'La tempête prend son envol',tip:'Évitez ses plumes. Frappez son cœur quand elle se pose, ou parez une plume.',roomIndex:7,weakpointLabel:'Cœur d’orage',openingLabel:'Atterrissage ou parade'},
    {id:'worm',name:'Nacre, gueule des profondeurs',subtitle:'Écoutez le sol trembler',tip:'Quittez la marque au sol. Après sa morsure, son cœur reste exposé.',roomIndex:9,weakpointLabel:'Cœur de nacre',openingLabel:'Morsure ou parade'},
    {id:'duelist',name:'Le Chevalier de l’Éclipse',subtitle:'Une dernière danse',tip:'Parez sa ruée ou esquivez sa combinaison, puis ripostez.',roomIndex:11,weakpointLabel:'Garde ouverte',openingLabel:'Récupération ou parade'}
  ];
  CM.ARCHETYPES = [
    {id:'scout',name:'Éclaireur',subtitle:'La vitesse est une armure.',stats:{speed:6,power:3,vitality:3},weapon:'sword'},
    {id:'warden',name:'Gardien',subtitle:'Solide, patient, implacable.',stats:{speed:2,power:4,vitality:6},weapon:'axe'},
    {id:'duelist',name:'Duelliste',subtitle:'La précision fait la différence.',stats:{speed:4,power:5,vitality:3},weapon:'spear'}
  ];
  const ROOMS = CM.ROOMS = [
    {id:'glade',name:'La Clairière des lucioles',subtitle:'Une étincelle suffit à réveiller le monde.',theme:'forest',width:2200,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,1130,80),platform(1310,650,890,80),platform(520,536,230),platform(830,440,180),platform(1070,542,300),platform(1550,528,170),platform(1790,402,190),platform(1990,220,180)],hazards:[{x:1130,y:667,w:180,h:53}],enemies:[enemy('g1','crawler',650,614),enemy('g2','crawler',1480,614),enemy('g3','flyer',1850,500)],pickups:[pickup('g-sh1','shard',610,498,'Éclat d’aurore'),pickup('g-sh2','shard',885,400,'Éclat d’aurore'),pickup('g-sh3','shard',1160,502,'Éclat d’aurore'),pickup('g-sh4','shard',1870,362,'Éclat d’aurore'),pickup('g-secret','relic',2055,180,'Cœur des cimes',{bonus:'vitality'})],hint:'Flèches ou Q/D : courir · Espace : sauter · J : attaquer'},
    {id:'roots',name:'Le Cloître des racines',subtitle:'L’air se souvient de ceux qui savaient voler.',theme:'forest',width:2300,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,760,80),platform(960,650,1340,80),platform(460,536,180),platform(690,458,210),platform(880,540,220),platform(1210,540,180),platform(1460,425,220),platform(1750,330,210),platform(2070,420,170)],hazards:[{x:760,y:665,w:200,h:55}],enemies:[enemy('r1','crawler',510,614),enemy('r2','knight',1160,590),enemy('r3','flyer',1860,515)],pickups:[pickup('r-sh1','shard',740,418,'Éclat d’aurore'),pickup('r-sh2','shard',1260,500,'Éclat d’aurore'),pickup('wings','doubleJump',1550,385,'Ailes d’aurore'),pickup('r-sh3','shard',1840,290,'Éclat d’aurore'),pickup('r-sh4','shard',2120,380,'Éclat d’aurore')],hint:'Maintenir K bloque. Appuyer au dernier instant déclenche une parade parfaite.'},
    {id:'warden',name:'Le Pont du Veilleur',subtitle:'L’acier a une mémoire. Apprenez son rythme.',theme:'ruins',width:1780,height:720,checkpoint:{x:135,y:650},bossGate:{x:310},platforms:[platform(0,650,1780,80),platform(480,480,180),platform(1210,480,180)],hazards:[],enemies:[enemy('boss-warden','boss',1170,514,{bossType:'warden',name:'LE VEILLEUR DE PIERRE'})],pickups:[pickup('w-sh1','shard',540,440,'Éclat d’aurore'),pickup('w-sh2','shard',1260,440,'Éclat d’aurore')],hint:'Le Veilleur annonce chaque coup. Sa charge se pare ; son onde de choc se saute.'},
    {id:'aqueduct',name:'L’Aqueduc oublié',subtitle:'Au-dessus du vide, une autre voie s’ouvre.',theme:'ruins',width:2500,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,630,80),platform(930,650,380,80),platform(1660,650,840,80),platform(440,525,170),platform(720,420,190),platform(1020,315,220),platform(1320,410,170),platform(1550,510,210),platform(1900,510,180),platform(2140,355,210)],hazards:[{x:630,y:675,w:300,h:45},{x:1310,y:675,w:350,h:45}],enemies:[enemy('a1','flyer',770,360),enemy('a2','knight',1120,590),enemy('a3','flyer',1500,375),enemy('a4','crawler',1850,614)],pickups:[pickup('a-sh1','shard',770,380,'Éclat d’aurore'),pickup('a-secret','relic',1110,275,'Fer stellaire',{bonus:'power'}),pickup('a-sh2','shard',1370,370,'Éclat d’aurore'),pickup('a-sh3','shard',1940,470,'Éclat d’aurore'),pickup('a-sh4','shard',2220,315,'Éclat d’aurore')],hint:'Le double saut et l’esquive aérienne permettent de franchir les grandes brèches.'},
    {id:'forge',name:'Les Forges du crépuscule',subtitle:'Le cœur du royaume bat encore sous la cendre.',theme:'forge',width:2380,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,980,80),platform(1200,650,1180,80),platform(420,520,210),platform(720,380,200),platform(980,500,270),platform(1470,515,210),platform(1800,355,220),platform(2100,480,170)],hazards:[{x:980,y:668,w:220,h:52}],enemies:[enemy('f1','knight',540,590),enemy('f2','flyer',830,315),enemy('f3','crawler',1310,614),enemy('f4','knight',1720,590),enemy('f5','flyer',2050,380)],pickups:[pickup('f-sh1','shard',500,480,'Éclat d’aurore'),pickup('f-secret','relic',795,340,'Braise éternelle',{bonus:'vitality'}),pickup('f-sh2','shard',1090,460,'Éclat d’aurore'),pickup('f-sh3','shard',1570,475,'Éclat d’aurore'),pickup('f-sh4','shard',1880,315,'Éclat d’aurore'),pickup('f-health','health',2190,610,'Source de vie')],hint:'Trois armes, trois rythmes : 1 épée · 2 hache · 3 lance. Tab ouvre les talents.'},
    {id:'crown',name:'La Couronne d’Aurore',subtitle:'Charles, rallume la dernière étoile.',theme:'forge',width:1900,height:720,checkpoint:{x:140,y:650},bossGate:{x:330},platforms:[platform(0,650,1900,80),platform(510,468,195),platform(1390,468,195)],hazards:[],enemies:[enemy('boss-king','boss',1300,496,{bossType:'king',name:'LE ROI DES CENDRES'})],pickups:[],hint:'Les orbes se parent. L’onde de feu se saute. Quand le Roi s’épuise, frappez.'}
  ];
  ROOMS.push(
    {id:'crystal',name:'Les Jardins de cristal',subtitle:'Au-delà de la couronne, les étoiles refleurissent.',theme:'crystal',width:2440,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,790,80),platform(1030,650,670,80),platform(1940,650,500,80),platform(420,535,210),platform(730,410,210),platform(990,520,200),platform(1320,520,180),platform(1570,370,210),platform(1800,510,210),platform(2140,460,180)],hazards:[{x:790,y:675,w:240,h:45},{x:1700,y:675,w:240,h:45}],enemies:[enemy('c1','spitter',550,602),enemy('c2','hopper',1130,616),enemy('c3','flyer',1550,430),enemy('c4','spitter',2090,602)],pickups:[pickup('c-sh1','shard',480,495,'Éclat d’aurore'),pickup('c-sh2','shard',800,370,'Éclat d’aurore'),pickup('c-sh3','shard',1390,480,'Éclat d’aurore'),pickup('c-charm','charm',1660,330,'Étoile aimantée',{charm:'magnet'}),pickup('c-sh4','shard',2190,420,'Éclat d’aurore')],hint:'Les talismans offrent des bonus différents. Deux peuvent être équipés à la fois.'},
    {id:'storm',name:'Le Nid des orages',subtitle:'Le ciel lui-même a des ailes.',theme:'crystal',width:1920,height:720,checkpoint:{x:140,y:650},bossGate:{x:330},platforms:[platform(0,650,1920,80),{...platform(700,500,210),oneWay:true},{...platform(1270,500,210),oneWay:true}],hazards:[],enemies:[enemy('boss-moth','boss',1160,280,{bossType:'moth',name:'SYLPHE, AILE D’ORAGE'})],pickups:[],hint:'Les plumes se parent. Après son attaque, Sylphe se pose : approchez et frappez !'},
    {id:'depths',name:'Les Racines de nacre',subtitle:'Sous le cristal, un ancien monde respire.',theme:'depths',width:2500,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,900,80),platform(1150,650,610,80),platform(2010,650,490,80),platform(450,520,200),platform(730,390,210),platform(970,520,220),platform(1400,500,230),platform(1660,355,180),platform(1870,495,220),platform(2220,440,180)],hazards:[{x:900,y:676,w:250,h:44},{x:1760,y:676,w:250,h:44}],enemies:[enemy('d1','hopper',520,616),enemy('d2','spitter',830,602),enemy('d3','hopper',1280,616),enemy('d4','spitter',1570,602),enemy('d5','flyer',2130,430)],pickups:[pickup('d-sh1','shard',500,480,'Éclat d’aurore'),pickup('d-sh2','shard',800,350,'Éclat d’aurore'),pickup('d-charm','charm',1710,315,'Mousse vivante',{charm:'moss'}),pickup('d-sh3','shard',1940,455,'Éclat d’aurore'),pickup('d-relic','relic',2280,400,'Perle des profondeurs',{bonus:'vitality'})],hint:'Les sauteurs se prêtent aux rebonds : bas + attaque en plein vol.'},
    {id:'burrow',name:'La Gueule du monde',subtitle:'Chaque vibration annonce sa venue.',theme:'depths',width:1900,height:720,checkpoint:{x:140,y:650},bossGate:{x:330},platforms:[platform(0,650,1900,80),{...platform(720,500,190),oneWay:true},{...platform(1320,500,190),oneWay:true}],hazards:[],enemies:[enemy('boss-worm','boss',1190,480,{bossType:'worm',name:'NACRE, GUEULE DES PROFONDEURS'})],pickups:[],hint:'Quittez la marque avant l’émergence. Parez la morsure ou attendez son épuisement.'},
    {id:'astral',name:'Les Marches célestes',subtitle:'L’aube attend au bout du chemin.',theme:'astral',width:2680,height:720,checkpoint:{x:140,y:650},platforms:[platform(0,650,760,80),platform(1020,650,660,80),platform(1940,650,740,80),platform(420,525,210),platform(730,390,190),platform(940,510,200),platform(1260,490,190),platform(1520,345,200),platform(1760,500,200),platform(2070,510,180),platform(2320,365,220)],hazards:[{x:760,y:675,w:260,h:45},{x:1680,y:675,w:260,h:45}],enemies:[enemy('s1','knight',540,590),enemy('s2','spitter',1120,602),enemy('s3','hopper',1460,616),enemy('s4','flyer',1840,420),enemy('s5','knight',2190,590)],pickups:[pickup('s-sh1','shard',475,485,'Éclat d’aurore'),pickup('s-sh2','shard',790,350,'Éclat d’aurore'),pickup('s-charm','charm',1600,305,'Miroir de l’aube',{charm:'mirror'}),pickup('s-sh3','shard',1810,460,'Éclat d’aurore'),pickup('s-relic','relic',2410,325,'Lame d’étoile',{bonus:'power'})],hint:'Une fiole se remplit à chaque sanctuaire. Gardez-la pour le bon moment.'},
    {id:'eclipse',name:'Le Seuil de l’Éclipse',subtitle:'Charles, la dernière lumière est entre tes mains.',theme:'astral',width:1980,height:720,checkpoint:{x:140,y:650},bossGate:{x:330},platforms:[platform(0,650,1980,80),{...platform(730,480,170),oneWay:true},{...platform(1430,480,170),oneWay:true}],hazards:[],enemies:[enemy('boss-duelist','boss',1320,558,{bossType:'duelist',name:'LE CHEVALIER DE L’ÉCLIPSE'})],pickups:[],hint:'Sa ruée se pare. Esquivez sa combinaison puis frappez pendant sa récupération.'}
  );
  ROOMS[0].pickups.push(pickup('charm-heart','charm',795,610,'Cœur de jade',{charm:'heart'}));
  ROOMS[1].pickups.push(pickup('charm-wind','charm',1900,290,'Plume du zéphyr',{charm:'wind'}));
  ROOMS[3].pickups.push(pickup('charm-fang','charm',2010,470,'Croc solaire',{charm:'fang'}));
  ROOMS[0].secretWalls=[{id:'seal-glade',x:2040,y:160,w:58,h:60,rewardId:'g-secret',label:'Sceau des cimes'}];
  ROOMS[3].secretWalls=[{id:'seal-aqueduct',x:1093,y:255,w:58,h:60,rewardId:'a-secret',label:'Sceau stellaire'}];
  ROOMS[4].secretWalls=[{id:'seal-forge',x:778,y:320,w:58,h:60,rewardId:'f-secret',label:'Sceau des braises'}];
  ROOMS[2].enemies[0].x=1080;ROOMS[2].enemies[0].y=310;
  ROOMS[5].enemies[0].x=1150;ROOMS[5].enemies[0].y=220;
  ROOMS[2].hint='Brisez les deux sceaux aux chevilles, ou parez un coup. Grimpez sur les bras et frappez le cœur !';
  ROOMS[5].hint='Deux sceaux ouvrent la couronne. Grimpez sur les mains et les épaules pendant que le Roi est vulnérable.';
  for(const i of [2,5])for(const s of ROOMS[i].platforms)if(s.y<650)s.oneWay=true;
  const BOSS_GEOMETRY={
    warden:{w:300,h:340,hp:480,weakpoint:{x:1200,y:385,w:60,h:65},platforms:[[990,550,150,'avant-bras'],[1320,550,150,'avant-bras'],[1090,450,150,'main'],[1240,450,150,'main'],[1175,350,180,'épaule']],seals:[[1088,590],[1320,590]]},
    king:{w:340,h:430,hp:600,weakpoint:{x:1290,y:238,w:60,h:60},platforms:[[1050,550,150,'main'],[1470,550,150,'main'],[1150,450,160,'avant-bras'],[1360,450,160,'avant-bras'],[1240,350,180,'épaule'],[1290,260,180,'couronne']],seals:[[1158,590],[1444,590]]},
    moth:{w:180,h:120,hp:360,weakpoint:{x:1215,y:310,w:70,h:80},platforms:[],seals:[]},
    worm:{w:190,h:170,hp:420,weakpoint:{x:1245,y:550,w:80,h:90},platforms:[],seals:[]},
    duelist:{w:54,h:92,hp:330,weakpoint:{x:1320,y:558,w:54,h:92},platforms:[],seals:[]}
  };
  class Engine {
    constructor(config={}, saved=null) {
      const difficulty=['explorer','adventurer','master'].includes(config.difficulty)?config.difficulty:config.assist?'explorer':'adventurer';
      this.config={name:config.name||'Charles',weapon:WEAPONS[config.weapon]?config.weapon:'sword',difficulty,assist:difficulty==='explorer',stats:{speed:clamp(Number(config.stats?.speed)||4,1,7),power:clamp(Number(config.stats?.power)||4,1,7),vitality:clamp(Number(config.stats?.vitality)||4,1,7)}};
      this.showAttackZones=typeof config.showAttackZones==='boolean'?config.showAttackZones:difficulty!=='master';
      this.player={x:140,y:598,w:30,h:52,vx:0,vy:0,facing:1,hp:0,maxHp:0,stamina:100,maxStamina:100,grounded:false,attackTime:0,attackDuration:.31,block:false,parryTime:0,dashTime:0,invulnerable:0,weapon:this.config.weapon,stats:copy(this.config.stats),skills:{},doubleJump:false,jumps:0,bonusPower:0,bonusVitality:0,combo:0,flasks:1,maxFlasks:1};
      this.ownedCharms=[];this.equippedCharms=[];this.afterdashTime=0;this.healCooldown=0;
      this.roomIndex=0;this.camera={x:0,y:0};this.shards=0;this.skillPoints=0;this.kills=0;this.deaths=0;this.time=0;this.won=false;this.dead=false;this.checkpoint={roomIndex:0,x:140,y:598};this.message={text:'',timer:0};this.roomsVisited=[];this.bossesDefeated=[];this.collected=[];this.defeated=[];this.destroyedWalls=[];this.events=[];this.effects=[];this.projectiles=[];this.secretWalls=[];this.arenaLocked=false;this.previousInput={};this.coyote=0;this.jumpBuffer=0;this.dashCooldown=0;this.parryCooldown=0;this.attackCooldown=0;this.comboTimer=0;this.staminaDelay=0;this.riposteTime=0;this.checkpointLit=false;this.lastSafe={x:140,y:598};this.roomTime=0;this.trial=false;
      if(saved && saved.version===1) this.restore(saved);
      else {this.recalculate();this.player.hp=this.player.maxHp;this.loadRoom(0,140,598);this.say('Les éclats d’Aurore','Explorez, trouvez les ailes et rendez la lumière au royaume.',6);}
    }
    recalculate() {
      const p=this.player;p.maxHp=70+p.stats.vitality*15+p.bonusVitality*20+(p.skills.vigor?30:0)+(this.config.assist?40:0)+(this.hasCharm('heart')?25:0);p.maxStamina=100+(p.skills.flow?30:0);p.maxFlasks=p.skills.reserve?2:1;p.flasks=clamp(p.flasks,0,p.maxFlasks);p.hp=Math.min(p.hp,p.maxHp);p.stamina=Math.min(p.stamina,p.maxStamina);
    }
    hasCharm(id) {return this.equippedCharms.includes(id);}
    equipCharm(id) {
      if(this.dead||!this.ownedCharms.includes(id)||!CHARMS.some(c=>c.id===id))return false;
      if(this.equippedCharms.includes(id))this.equippedCharms=this.equippedCharms.filter(c=>c!==id);
      else {if(this.equippedCharms.length>=2)return false;this.equippedCharms.push(id);}
      this.recalculate();this.emit('save');return true;
    }
    heal() {
      const p=this.player;if(this.dead||this.won||p.hp>=p.maxHp||p.flasks<=0||this.healCooldown>0)return false;
      p.flasks--;const amount=p.skills.restoration?75:50;p.hp=Math.min(p.maxHp,p.hp+amount);this.healCooldown=.65;this.effect('ring',p.x+15,p.y+26,{color:'#9dffc9',life:.8,maxLife:.8});this.effect('text',p.x,p.y-15,{text:'+'+amount,color:'#9dffc9',life:.8,maxLife:.8});this.emit('heal');this.emit('save');return true;
    }
    say(text,subtext='',timer=4) {this.message={text,subtext,timer};}
    emit(type,extra={}) {this.events.push({type,...extra});}
    effect(type,x,y,extra={}) {this.effects.push({type,x,y,life:.5,maxLife:.5,color:'#ffdc91',...extra});}
    makeEnemy(data) {
      const geometry=BOSS_GEOMETRY[data.bossType];
      const values=data.type==='boss'?{w:geometry.w,h:geometry.h,hp:geometry.hp,speed:0,damage:23}:data.type==='knight'?{w:42,h:60,hp:78,speed:68,damage:18}:data.type==='flyer'?{w:42,h:34,hp:39,speed:102,damage:12}:data.type==='spitter'?{w:42,h:48,hp:62,speed:0,damage:13}:data.type==='hopper'?{w:40,h:34,hp:54,speed:165,damage:14}:{w:42,h:36,hp:48,speed:90,damage:13};
      const result={...values,...copy(data),maxHp:values.hp,vx:0,vy:0,facing:-1,state:'idle',timer:1,attackProgress:0,attackKind:'sweep',sequence:0,stun:0,hitFlash:0,originX:data.x,originY:data.y,active:false,hitPlayer:false,windupDuration:.7,phase:1};
      if(data.type==='boss')Object.assign(result,{armored:true,vulnerabilityTimer:0,cycleDamage:0,cycles:0,armorFlash:0,weakpoint:{...geometry.weakpoint,active:false},platforms:geometry.platforms.map((a,i)=>({id:data.id+'-step-'+i,x:a[0],y:a[1],w:a[2],h:14,label:a[3],oneWay:true,active:false})),seals:geometry.seals.map((a,i)=>({id:data.id+'-seal-'+i,x:a[0],y:a[1],w:38,h:50,hp:2,maxHp:2,active:true})),actionHint:'Brisez les deux sceaux ou réussissez une parade parfaite.',telegraphs:[],pendingAttacks:[]});
      if(data.type==='boss'&&!['warden','king'].includes(data.bossType))Object.assign(result,{mobile:true,buried:false,attackVolumes:[],poise:0,maxPoise:this.config.difficulty==='master'?3:2,attackCount:0,actionHint:BOSSES.find(b=>b.id===data.bossType).tip});
      return result;
    }
    loadRoom(index,x,y) {
      this.roomIndex=clamp(index,0,ROOMS.length-1);this.room=copy(ROOMS[this.roomIndex]);this.enemies=this.room.enemies.filter(e=>!this.defeated.includes(e.id)&&!this.bossesDefeated.includes(e.id)).map(e=>this.makeEnemy(e));this.pickups=this.room.pickups.filter(p=>!this.collected.includes(p.id));this.secretWalls=(this.room.secretWalls||[]).map(w=>({...w,hp:this.destroyedWalls.includes(w.id)||this.collected.includes(w.rewardId)?0:3,maxHp:3,broken:this.destroyedWalls.includes(w.id)||this.collected.includes(w.rewardId),hitFlash:0}));this.effects=[];this.projectiles=[];this.roomTime=0;this.arenaLocked=false;this.checkpointLit=false;
      const p=this.player;p.x=x;p.y=y;p.vx=0;p.vy=0;p.grounded=false;p.block=false;p.attackTime=0;p.dashTime=0;p.parryTime=0;p.jumps=0;this.camera.x=clamp(x-440,0,Math.max(0,this.room.width-1280));this.lastSafe={x,y};
      if(!this.roomsVisited.includes(this.roomIndex))this.roomsVisited.push(this.roomIndex);
      this.say(this.room.name,this.room.hint,5);this.emit('save');
    }
    snapshot() {
      return {version:1,revision:3,config:copy(this.config),showAttackZones:this.showAttackZones,player:{stats:copy(this.player.stats),skills:copy(this.player.skills),weapon:this.player.weapon,doubleJump:this.player.doubleJump,bonusPower:this.player.bonusPower,bonusVitality:this.player.bonusVitality,hp:this.player.hp,stamina:this.player.stamina,flasks:this.player.flasks,x:this.player.x,y:this.player.y},roomIndex:this.roomIndex,shards:this.shards,skillPoints:this.skillPoints,kills:this.kills,deaths:this.deaths,time:this.time,won:this.won,dead:this.dead,checkpoint:copy(this.checkpoint),roomsVisited:[...this.roomsVisited],bossesDefeated:[...this.bossesDefeated],collected:[...this.collected],defeated:[...this.defeated],destroyedWalls:[...this.destroyedWalls],ownedCharms:[...this.ownedCharms],equippedCharms:[...this.equippedCharms]};
    }
    restore(s) {
      this.config=copy(s.config||this.config);if(!['explorer','adventurer','master'].includes(this.config.difficulty))this.config.difficulty=this.config.assist?'explorer':'adventurer';this.config.assist=this.config.difficulty==='explorer';const sp=s.player||{};this.player.stats=copy(sp.stats||this.config.stats);this.player.skills=copy(sp.skills||{});this.player.weapon=WEAPONS[sp.weapon]?sp.weapon:'sword';this.player.doubleJump=!!sp.doubleJump;this.player.bonusPower=Number(sp.bonusPower)||0;this.player.bonusVitality=Number(sp.bonusVitality)||0;
      this.showAttackZones=typeof s.showAttackZones==='boolean'?s.showAttackZones:this.config.difficulty!=='master';
      for(const k of ['shards','skillPoints','kills','deaths','time'])this[k]=Math.max(0,Number(s[k])||0);
      for(const k of ['roomsVisited','bossesDefeated','collected','defeated','destroyedWalls'])this[k]=Array.isArray(s[k])?[...s[k]]:[];
      this.ownedCharms=[...new Set(s.ownedCharms||[])].filter(id=>CHARMS.some(c=>c.id===id));this.equippedCharms=[...new Set(s.equippedCharms||[])].filter(id=>this.ownedCharms.includes(id)).slice(0,2);
      this.checkpoint=s.checkpoint&&Number.isFinite(s.checkpoint.x)?copy(s.checkpoint):this.checkpoint;this.won=!!s.won;this.recalculate();this.player.hp=clamp(Number(sp.hp)||this.player.maxHp,1,this.player.maxHp);this.player.stamina=this.player.maxStamina;
      if(s.dead){this.loadRoom(this.checkpoint.roomIndex,this.checkpoint.x,this.checkpoint.y);this.player.hp=this.player.maxHp;}
      else {const i=clamp(Number(s.roomIndex)||0,0,ROOMS.length-1);this.loadRoom(i,clamp(Number(sp.x)||140,20,ROOMS[i].width-50),clamp(Number(sp.y)||598,0,640));}
      this.player.flasks=s.dead?this.player.maxFlasks:Number.isFinite(sp.flasks)?clamp(sp.flasks,0,this.player.maxFlasks):this.player.maxFlasks;
      const newChapter=(Number(s.revision)||0)<3&&s.won&&!this.bossesDefeated.includes('boss-duelist');
      if(newChapter){this.won=false;this.player.doubleJump=true;this.loadRoom(6,140,598);this.checkpoint={roomIndex:6,x:140,y:598};this.player.hp=this.player.maxHp;this.player.flasks=this.player.maxFlasks;}
      this.player.invulnerable=1;this.say('L’aventure reprend',this.room.name,3);
      if(newChapter)this.say('Les Royaumes oubliés','Une nouvelle route s’ouvre après la Couronne d’Aurore.',6);
    }
    respawn() {
      this.dead=false;this.won=false;this.loadRoom(this.checkpoint.roomIndex,this.checkpoint.x,this.checkpoint.y);this.recalculate();this.player.hp=this.player.maxHp;this.player.stamina=this.player.maxStamina;this.player.flasks=this.player.maxFlasks;this.player.invulnerable=1.4;this.previousInput={};this.dashCooldown=0;this.attackCooldown=0;this.parryCooldown=0;this.riposteTime=0;this.afterdashTime=0;this.healCooldown=0;this.emit('save');this.say('La lumière vous relève','Vos éclats et vos talents sont conservés.',3);
    }
    buySkill(id) {
      const skill=SKILLS.find(s=>s.id===id),p=this.player;
      if(!skill||p.skills[id]||this.skillPoints<skill.cost||(skill.requires&&!p.skills[skill.requires]))return false;
      p.skills[id]=true;this.skillPoints-=skill.cost;this.recalculate();if(id==='vigor')p.hp=p.maxHp;if(id==='flow')p.stamina=p.maxStamina;this.emit('pickup');this.emit('save');this.say(skill.name,skill.description,4);return true;
    }
    setWeapon(id) {if(!WEAPONS[id]||this.player.attackTime>0||this.dead)return false;this.player.weapon=id;this.player.combo=0;this.emit('save');return true;}
    atSanctuary() {
      const cp=this.room.checkpoint,p=this.player;
      return !!cp&&!this.dead&&!this.won&&!this.trial&&!this.arenaLocked&&Math.abs(p.x-cp.x)<110&&Math.abs(p.y+p.h-cp.y)<90;
    }
    travelTo(index) {
      if(!Number.isInteger(index)||!this.roomsVisited.includes(index)||!ROOMS[index]||!this.atSanctuary())return false;
      const cp=ROOMS[index].checkpoint;if(!cp)return false;
      this.loadRoom(index,cp.x,cp.y-this.player.h);this.checkpoint={roomIndex:index,x:cp.x,y:cp.y-this.player.h};this.player.hp=this.player.maxHp;this.player.stamina=this.player.maxStamina;this.player.flasks=this.player.maxFlasks;this.player.invulnerable=.8;this.checkpointLit=true;this.previousInput={};this.emit('save');this.say('Voyage par la lumière',this.room.name,3);return true;
    }
    startTrial(type) {
      if(!BOSS_GEOMETRY[type])return false;
      this.trial=type;this.trialBossType=type;this.won=false;this.dead=false;this.bossesDefeated=[];this.defeated=[];this.collected=[];this.destroyedWalls=[];this.roomsVisited=[];this.shards=0;this.skillPoints=0;this.kills=0;this.deaths=0;this.time=0;this.player.doubleJump=true;this.recalculate();this.player.hp=this.player.maxHp;this.player.stamina=this.player.maxStamina;this.player.flasks=this.player.maxFlasks;const meta=BOSSES.find(b=>b.id===type),roomIndex=meta.roomIndex;this.loadRoom(roomIndex,780,598);this.checkpoint={roomIndex,x:780,y:598};this.previousInput={};this.player.invulnerable=1;this.say(meta.name,meta.tip,6);return true;
    }
    interact() {
      if(this.dead||this.won)return false;
      const cp=this.room.checkpoint,p=this.player;
      if(cp&&Math.abs(p.x-cp.x)<110&&Math.abs(p.y+p.h-cp.y)<90&&!this.arenaLocked){this.checkpoint={roomIndex:this.roomIndex,x:cp.x,y:cp.y-p.h};p.hp=p.maxHp;p.stamina=p.maxStamina;p.flasks=p.maxFlasks;this.checkpointLit=true;this.emit('save');this.emit('pickup');this.effect('ring',cp.x,cp.y-35,{color:'#80f4dd',life:1,maxLife:1});this.say('Sanctuaire ravivé','Vie, endurance et fioles restaurées. Progression sauvegardée.',3);return true;}return false;
    }
    attack(down=false) {
      const p=this.player,w=WEAPONS[p.weapon],cost=w.cost*(p.skills.economy? .75:1);if(p.attackTime>0||this.attackCooldown>0||p.dashTime>0||p.block||p.stamina<cost)return false;
      p.stamina-=cost;this.staminaDelay=.32;p.attackTime=w.duration;p.attackDuration=w.duration;p.combo=this.comboTimer>0?(p.combo%3)+1:1;this.comboTimer=.85;p.attackVictims=[];p.attackDown=!!down&&!p.grounded;p.pogoBounced=false;p.attackCharged=this.riposteTime>0;p.attackAfterdash=this.afterdashTime>0;if(p.attackCharged)this.riposteTime=0;if(p.attackAfterdash)this.afterdashTime=0;this.emit('attack',{weapon:p.weapon,combo:p.combo,down:p.attackDown});return true;
    }
    exposeBoss(e) {
      if(!e||e.hp<=0||e.type!=='boss'||e.vulnerabilityTimer>0)return false;
      if(e.mobile)return this.openMobileBoss(e);
      e.state='exposed';e.vulnerabilityTimer=this.config.assist?8:this.config.difficulty==='master'?5.2:6.5;e.timer=e.vulnerabilityTimer;e.cycleDamage=0;e.cycles++;e.armored=false;e.weakpoint.active=true;e.telegraphs=[];e.pendingAttacks=[];e.vx=0;for(const s of e.seals){s.hp=0;s.active=false;}for(const s of e.platforms)s.active=true;this.projectiles=this.projectiles.filter(p=>p.owner!==e.id);e.actionHint=e.bossType==='king'?'Grimpez sur les mains et les épaules. Frappez la couronne !':'Grimpez sur les bras. Frappez le cœur lumineux !';this.say('Le colosse est vulnérable !',e.actionHint,4);this.effect('ring',e.weakpoint.x+30,e.weakpoint.y+30,{life:1,maxLife:1,color:'#9bfff0'});this.emit('expose',{boss:e.id});return true;
    }
    parryBoss(e) {
      if(!e.mobile)return this.exposeBoss(e);
      if(e.weakpoint.active)return false;
      e.poise++;this.effect('text',e.x,e.y-25,{text:'PRESSION '+e.poise+'/'+e.maxPoise,color:'#b6fff0',life:.8,maxLife:.8});
      if(e.poise>=e.maxPoise)return this.openMobileBoss(e);
      e.state='recover';e.timer=.85;e.vx=0;e.telegraphs=[];e.pendingAttacks=[];e.attackVolumes=[];this.projectiles=this.projectiles.filter(a=>a.owner!==e.id);e.actionHint='Parade réussie : '+e.poise+'/'+e.maxPoise+'. Maintenez la pression !';this.say('Sa garde se fissure',e.actionHint,2);return false;
    }
    closeBoss(e) {
      if(e.mobile){e.landing=null;e.vulnerabilityTimer=0;e.weakpoint.active=false;e.armored=true;e.state='recover';e.timer=.85;e.telegraphs=[];e.pendingAttacks=[];e.attackVolumes=[];e.vx=0;e.buried=e.bossType==='worm';e.actionHint=BOSSES.find(b=>b.id===e.bossType).tip;return;}
      e.vulnerabilityTimer=0;e.armored=true;e.weakpoint.active=false;e.state='recover';e.timer=1.1;for(const s of e.platforms)s.active=false;for(const s of e.seals){s.hp=s.maxHp;s.active=true;}e.actionHint='Son armure se referme. Brisez les sceaux ou parez un coup.';e.telegraphs=[];e.pendingAttacks=[];
    }
    pogoBounce() {
      const p=this.player;if(!p.attackDown||p.pogoBounced)return;p.pogoBounced=true;p.vy=-520;p.grounded=false;p.jumps=Math.min(1,p.jumps);p.invulnerable=Math.max(p.invulnerable,.12);this.effect('ring',p.x+p.w/2,p.y+p.h,{color:'#b8fff4',life:.3,maxLife:.3});this.emit('pogo');
    }
    hitBoss(e,box,damage) {
      if(e.buried)return;
      const p=this.player;
      if(e.weakpoint.active&&overlap(box,e.weakpoint)&&!p.attackVictims.includes(e.id+'-weakpoint')){p.attackVictims.push(e.id+'-weakpoint');this.damageEnemy(e,damage*(e.mobile?1.5:2.8),0,{weakpoint:true});this.pogoBounce();return;}
      let sealHit=false;
      for(const s of e.seals)if(s.active&&s.hp>0&&overlap(box,s)&&!p.attackVictims.includes(s.id)){p.attackVictims.push(s.id);s.hp--;sealHit=true;this.effect('spark',s.x+19,s.y+25,{color:'#a8fff0'});this.effect('text',s.x,s.y-10,{text:s.hp?'FISSURE':'SCEAU BRISÉ',color:'#a8fff0',life:.65,maxLife:.65});this.pogoBounce();this.emit('block');}
      if(sealHit&&e.seals.every(s=>s.hp===0)){this.exposeBoss(e);return;}
      if(!sealHit&&overlap(box,e)&&!p.attackVictims.includes(e.id+'-armor')){p.attackVictims.push(e.id+'-armor');e.armorFlash=.18;this.effect('spark',clamp(p.x+15,e.x,e.x+e.w),clamp(p.y+26,e.y,e.y+e.h),{color:'#b9c8d0'});this.effect('text',p.x,p.y-14,{text:'ARMURE',color:'#acbac6',life:.45,maxLife:.45});if(p.y+p.h<=e.y+20)this.pogoBounce();this.emit('armor');}
    }
    hitWall(w) {
      if(w.broken)return;w.hp--;w.hitFlash=.2;this.effect('spark',w.x+w.w/2,w.y+w.h/2,{color:'#c2adff'});this.emit('armor');if(w.hp<=0){w.broken=true;this.destroyedWalls.push(w.id);this.effect('ring',w.x+w.w/2,w.y+w.h/2,{color:'#c2adff',life:.7,maxLife:.7});this.say('Un secret se révèle',w.label,3);this.emit('break');this.emit('save');}
    }
    damageEnemy(e,amount,stun=.12,hit={}) {
      if(e.hp<=0)return false;
      if(e.type==='boss'){if(!e.weakpoint.active||!hit.weakpoint){e.armorFlash=.15;return false;}amount=Math.min(amount,e.maxHp*(e.mobile? .22:.34)-e.cycleDamage);if(amount<=0)return false;e.cycleDamage+=amount;}
      e.hp=Math.max(0,e.hp-amount);e.hitFlash=.15;e.vx=this.player.facing*(e.type==='boss'?0:120);if(e.type!=='boss'&&stun>0){e.state='stunned';e.timer=stun;}
      const hitX=e.type==='boss'?e.weakpoint.x+e.weakpoint.w/2:e.x+e.w/2,hitY=e.type==='boss'?e.weakpoint.y:e.y;
      this.effect('spark',hitX,hitY+20,{color:e.type==='boss'?'#ffc083':'#8cffe0'});this.effect('text',hitX,hitY-8,{text:String(Math.round(amount)),life:.7,maxLife:.7,color:'#fff0b0'});
      if(e.hp<=0){this.kills++;this.effect('ring',e.x+e.w/2,e.y+e.h/2,{life:.7,maxLife:.7});
        if(e.type==='boss'){this.bossesDefeated.push(e.id);this.arenaLocked=false;this.skillPoints+=3;this.player.hp=this.player.maxHp;this.player.stamina=this.player.maxStamina;this.projectiles=[];e.weakpoint.active=false;e.telegraphs=[];for(const s of e.platforms)s.active=false;this.emit('boss',{defeated:true});if(e.bossType==='duelist'||this.trial){this.won=true;this.say(this.trial?'Défi remporté !':'L’aurore se lève, Charles.',this.trial?'Le colosse s’incline.':'Le royaume a retrouvé sa lumière.',20);this.emit('win');}else this.say(e.bossType==='king'?'Les royaumes s’ouvrent':'Le gardien s’incline','3 points de talent · Poursuivez votre route vers la droite.',6);this.emit('save');}
        else {this.defeated.push(e.id);this.shards++;if(this.shards%5===0){this.skillPoints++;this.say('Un nouveau talent vous attend','Tab : ouvrir les talents',3);}if(this.kills%3===0)this.player.hp=Math.min(this.player.maxHp,this.player.hp+9);if(this.hasCharm('moss'))this.player.hp=Math.min(this.player.maxHp,this.player.hp+5);this.emit('pickup');}
      }else if(e.type==='boss'&&e.cycleDamage>=e.maxHp*(e.mobile? .22:.34)-.001)this.closeBoss(e);
      return true;
    }
    hurt(amount,source,unblockable=false) {
      const p=this.player;if(this.dead||p.invulnerable>0||p.dashTime>0)return false;
      const sx=source?source.x+(source.w||0)/2:p.x-p.facing*20;const inFront=(sx-(p.x+p.w/2))*p.facing>=-12;
      if(!unblockable&&p.block&&inFront){
        if(p.parryTime>0){p.parryTime=0;p.invulnerable=.32;p.stamina=Math.min(p.maxStamina,p.stamina+24);this.riposteTime=p.skills.riposte?3:0;if(p.skills.parryheal)p.hp=Math.min(p.maxHp,p.hp+8);this.effect('ring',p.x+p.w/2,p.y+20,{color:'#fff7bc',life:.5,maxLife:.5});this.effect('text',p.x,p.y-35,{text:'PARADE !',color:'#fff7bc',life:.8,maxLife:.8});if(source?.type&&source.hp>0){if(source.type==='boss')this.parryBoss(source);else {source.state='stunned';source.timer=1.5;source.vx=0;this.damageEnemy(source,5,0);}}else if(source?.owner){const boss=this.enemies.find(e=>e.id===source.owner&&e.type==='boss');if(boss)this.parryBoss(boss);}this.emit('parry');return false;}
        if(p.stamina>=amount*1.25){p.stamina-=amount*1.25;this.staminaDelay=.6;amount=p.skills.aegis?0:Math.ceil(amount*.15);p.invulnerable=.23;this.effect('spark',p.x+p.facing*20,p.y+20,{color:'#9cddff'});this.emit('block');if(amount===0)return false;}
        else {p.stamina=0;p.block=false;this.parryCooldown=.7;this.say('Garde brisée','Esquivez, puis laissez revenir votre endurance.',2);}
      }
      const damage=this.config.assist?Math.ceil(amount*.55):this.config.difficulty==='master'?Math.ceil(amount*1.35):amount;p.hp=Math.max(0,p.hp-damage);p.invulnerable=.85;p.vx=(sx<p.x?1:-1)*210;p.vy=-155;p.block=false;this.effect('text',p.x,p.y-15,{text:'−'+damage,color:'#ff8c8c',life:.8,maxLife:.8});this.emit('hurt',{damage});if(p.hp<=0){this.dead=true;p.vx=0;p.vy=0;this.deaths++;this.emit('death');this.emit('save');}return true;
    }
    update(dt,input={}) {
      dt=clamp(Number(dt)||0,0,.04);if(this.dead||this.won){this.updateEffects(dt);return;}this.time+=dt;this.roomTime+=dt;const p=this.player;
      for(const k of ['dashCooldown','parryCooldown','attackCooldown','comboTimer','staminaDelay','riposteTime','coyote','jumpBuffer','afterdashTime','healCooldown'])this[k]=Math.max(0,this[k]-dt);
      for(const k of ['invulnerable','parryTime'])p[k]=Math.max(0,p[k]-dt);this.message.timer=Math.max(0,this.message.timer-dt);
      const edge=k=>!!input[k]&&!this.previousInput[k];if(edge('jump'))this.jumpBuffer=.14;
      if(edge('interact'))this.interact();if(edge('heal'))this.heal();
      if(edge('block')&&this.parryCooldown<=0&&p.stamina>=8&&p.dashTime<=0&&p.attackTime<=0){p.parryTime=(this.config.assist? .26:this.config.difficulty==='master'? .14:.18)+(this.hasCharm('mirror')? .045:0);this.parryCooldown=.38;}
      p.block=!!input.block&&p.stamina>0&&p.dashTime<=0&&p.attackTime<=0;
      if(edge('dash')&&this.dashCooldown<=0&&p.stamina>=(p.skills.longdash?18:26)){p.dashTime=p.skills.longdash? .25:.18;p.vy=0;p.block=false;p.parryTime=0;p.attackTime=0;p.stamina-=p.skills.longdash?18:26;this.staminaDelay=.45;this.dashCooldown=p.skills.longdash? .44:.65;this.afterdashTime=p.skills.afterdash?1.2:0;this.emit('dash');}
      if(input.attack)this.attack(input.down);
      if(p.grounded)this.coyote=.11;
      if(this.jumpBuffer>0&&p.dashTime<=0){const ground=p.grounded||this.coyote>0;const extra=p.doubleJump&&p.jumps<2;if(ground||extra){p.vy=-650;p.grounded=false;p.jumps=ground?1:2;this.coyote=0;this.jumpBuffer=0;this.emit('jump',{double:p.jumps===2});if(p.jumps===2)this.effect('ring',p.x+15,p.y+p.h,{color:'#80efff'});}}
      if(!input.jump&&this.previousInput.jump&&p.vy<-215)p.vy=-215;
      const move=(input.right?1:0)-(input.left?1:0);if(move&&p.dashTime<=0)p.facing=move;
      if(p.dashTime>0){p.dashTime=Math.max(0,p.dashTime-dt);p.vx=p.facing*780;p.vy=0;}
      else {const speed=(210+p.stats.speed*22)*(this.hasCharm('wind')?1.1:1)*(p.block? .38:1)*(p.attackTime>0&&p.weapon==='axe'? .6:1);const target=move*speed;const accel=p.grounded?2400:1550;p.vx+=clamp(target-p.vx,-accel*dt,accel*dt);p.vy=Math.min(p.vy+1550*dt,880);}
      this.moveBody(p,dt);if(p.grounded){p.jumps=0;if(!this.room.hazards.some(h=>p.x+p.w>h.x&&p.x<h.x+h.w))this.lastSafe={x:p.x,y:p.y};}
      if(p.y>790){this.hurt(22,null,true);if(!this.dead){p.x=this.lastSafe.x;p.y=this.lastSafe.y;p.vx=0;p.vy=0;p.invulnerable=1;}}
      for(const hazard of this.room.hazards)if(overlap(p,hazard)){this.hurt(22,null,true);if(!this.dead){p.x=this.lastSafe.x;p.y=this.lastSafe.y;p.vx=0;p.vy=0;p.invulnerable=1;}break;}
      if(p.attackTime>0){const w=WEAPONS[p.weapon],elapsed=p.attackDuration-p.attackTime;p.attackTime=Math.max(0,p.attackTime-dt);if(elapsed>=w.windup&&elapsed<w.windup+.14){const box=p.attackDown?{x:p.x-18,y:p.y+p.h-3,w:p.w+36,h:Math.max(48,w.range*.5)}:{x:p.facing===1?p.x+p.w-4:p.x-w.range+4,y:p.y-8,w:w.range,h:p.h+18};const combo=p.weapon==='sword'&&p.combo===3?1.5:1;const baseDamage=(11+p.stats.power*2.4+p.bonusPower*5)*w.damage*(p.skills.edge?1.25:1)*combo*(p.attackCharged?2:1)*(p.attackAfterdash?1.5:1)*(p.attackDown&&p.skills.pogo?1.5:1)*(this.hasCharm('fang')?1.12:1);
          for(const e of this.enemies){if(e.hp<=0)continue;if(e.type==='boss'){this.hitBoss(e,box,baseDamage);continue;}if(!p.attackVictims.includes(e.id)&&overlap(box,e)){p.attackVictims.push(e.id);let damage=baseDamage;if(e.type==='knight'&&e.state!=='stunned'&&p.weapon!=='axe'&&e.facing===-p.facing&&!p.attackDown)damage*=.65;this.damageEnemy(e,damage,p.weapon==='axe'? .4:.13);this.pogoBounce();}}
          for(const wall of this.secretWalls)if(!wall.broken&&!p.attackVictims.includes(wall.id)&&overlap(box,wall)){p.attackVictims.push(wall.id);this.hitWall(wall);this.pogoBounce();}
          if(!p.slashShown){this.effect('slash',p.x+p.w/2,p.attackDown?p.y+p.h:p.y+25,{facing:p.facing,down:p.attackDown,color:w.color,weapon:p.weapon,range:w.range,life:.18,maxLife:.18});p.slashShown=true;}}
        if(p.attackTime===0){this.attackCooldown=.065;p.slashShown=false;p.attackDown=false;}
      }else p.slashShown=false;
      if(this.staminaDelay<=0&&!p.block)p.stamina=Math.min(p.maxStamina,p.stamina+dt*(p.skills.flow?45:30));
      this.updateEnemies(dt);this.updateProjectiles(dt);this.updatePickups();this.updateEffects(dt);
      const cp=this.room.checkpoint;if(!this.checkpointLit&&cp&&Math.abs(p.x-cp.x)<75&&Math.abs(p.y+p.h-cp.y)<65)this.interact();
      if(this.room.bossGate&&this.enemies.some(e=>e.type==='boss'&&e.hp>0)){if(p.x>this.room.bossGate.x+50)this.arenaLocked=true;if(this.arenaLocked)p.x=clamp(p.x,this.room.bossGate.x,this.room.width-p.w-50);}
      if(!this.arenaLocked&&!this.trial){if(p.x>this.room.width-p.w&&this.roomIndex<ROOMS.length-1){if(this.roomIndex===1&&!p.doubleJump){p.x=this.room.width-p.w;this.say('Une aile manque encore','Trouvez les Ailes d’aurore sur la grande terrasse.',3);}else this.loadRoom(this.roomIndex+1,70,598);}else if(p.x<0&&this.roomIndex>0)this.loadRoom(this.roomIndex-1,ROOMS[this.roomIndex-1].width-80,598);else if(this.roomIndex===0&&p.x<0)p.x=0;else if(this.roomIndex===ROOMS.length-1)p.x=Math.min(p.x,this.room.width-p.w);}
      this.updateCamera(dt);this.previousInput={...input};
    }
    updateCamera(dt) {
      const p=this.player,boss=this.arenaLocked?this.enemies.find(e=>e.type==='boss'&&e.hp>0):null;
      let target=p.x+p.w/2-580+p.facing*65;
      if(boss){const left=Math.min(p.x,boss.x),right=Math.max(p.x+p.w,boss.x+boss.w);
        if(right-left<=1120)target=(left+right)/2-640;
        else {target=clamp(p.x+p.w/2-640,0,Math.max(0,this.room.width-1280))+Math.sign(boss.x+boss.w/2-p.x-p.w/2)*220;target=clamp(target,p.x+p.w-1200,p.x-80);}
      }
      target=clamp(target,0,Math.max(0,this.room.width-1280));this.camera.x+=(target-this.camera.x)*(1-Math.exp(-dt*7));
    }
    moveBody(body,dt) {
      const surfaces=[...this.room.platforms,...this.secretWalls.filter(w=>!w.broken),...this.enemies.filter(e=>e.type==='boss'&&e.hp>0).flatMap(e=>e.platforms.filter(p=>p.active))];
      body.x+=body.vx*dt;for(const s of surfaces)if(!s.oneWay&&overlap(body,s)){if(body.vx>0)body.x=s.x-body.w;else if(body.vx<0)body.x=s.x+s.w;body.vx=0;}
      const oldBottom=body.y+body.h;body.y+=body.vy*dt;body.grounded=false;
      for(const s of surfaces)if(overlap(body,s)){if(body.vy>=0&&oldBottom<=s.y+4){body.y=s.y-body.h;body.vy=0;body.grounded=true;}else if(body.vy<0&&!s.oneWay){body.y=s.y+s.h;body.vy=0;}}
    }
    updatePickups() {
      const p=this.player;for(const item of this.pickups){const near=overlap({x:p.x-8,y:p.y-7,w:p.w+16,h:p.h+14},item)||(this.hasCharm('magnet')&&Math.hypot(p.x+p.w/2-item.x-item.w/2,p.y+p.h/2-item.y-item.h/2)<=100);if(item.collected||this.secretWalls.some(w=>!w.broken&&w.rewardId===item.id)||!near)continue;item.collected=true;this.collected.push(item.id);this.effect('ring',item.x+13,item.y+15,{color:'#fff2a9',life:.7,maxLife:.7});this.emit('pickup');
        if(item.type==='shard'){this.shards++;if(this.shards%5===0){this.skillPoints++;this.say('L’aurore grandit','1 point de talent obtenu · Tab pour choisir.',4);}}
        if(item.type==='doubleJump'){p.doubleJump=true;this.skillPoints++;this.say('Ailes d’aurore','Double saut acquis ! Appuyez une seconde fois sur Espace en l’air.',7);}
        if(item.type==='health'){p.hp=Math.min(p.maxHp,p.hp+55);this.say('Une nouvelle étincelle','55 points de vie restaurés.',3);}
        if(item.type==='charm'){if(!this.ownedCharms.includes(item.charm))this.ownedCharms.push(item.charm);this.say(item.label,'Ouvrez les talismans avec I pour l’équiper.',5);}
        if(item.type==='relic'){if(item.bonus==='power')p.bonusPower++;else p.bonusVitality++;this.skillPoints++;this.recalculate();p.hp=p.maxHp;this.say(item.label,item.bonus==='power'?'Dégâts augmentés · 1 point de talent':'Vie maximale augmentée · 1 point de talent',5);}
        this.emit('save');}
      this.pickups=this.pickups.filter(x=>!x.collected);
    }
    startWindup(e,kind,duration) {e.state='windup';e.timer=duration;e.windupDuration=duration;e.attackKind=kind;e.attackProgress=0;e.vx=0;e.hitPlayer=false;e.facing=this.player.x+15>e.x+e.w/2?1:-1;}
    prepareBossAttack(e,kind) {
      const cx=e.x+e.w/2,px=this.player.x+15;
      this.startWindup(e,kind,kind==='rain'?1.15:kind==='doubleSweep'?1.05:1.05-e.phase*.08);
      e.telegraphs=[];e.attackVolumes=[];e.pendingAttacks=[];
      if(kind==='sweep'||kind==='doubleSweep'){
        e.telegraphs.push({x:cx-430,y:578,w:860,h:72,kind:'sweep',parryable:true});
        if(kind==='doubleSweep')e.telegraphs.push({x:cx-430,y:445,w:860,h:55,kind:'sweep',parryable:true,delay:.48});
        e.actionHint=kind==='doubleSweep'?'Deux balayages : parez le premier, ou sautez puis retombez.':'Le bras balaie le sol : sautez ou parez au dernier instant.';
      }else if(kind==='rain'){
        const offsets=e.phase===3?[-185,0,185]:[-100,100];
        for(const offset of offsets)e.telegraphs.push({x:clamp(px+offset-34,this.room.bossGate.x+15,this.room.width-85),y:100,w:68,h:550,kind:'rain',parryable:false});
        e.actionHint='Des colonnes vont tomber : quittez les marques lumineuses !';
      }else if(kind==='volley')e.actionHint='Orbes d’aurore : une parade parfaite ouvre la couronne.';
      else {e.telegraphs.push({x:this.room.bossGate.x,y:616,w:this.room.width-this.room.bossGate.x-20,h:34,kind:'slam',parryable:false});e.actionHint=kind==='eruption'?'Trois vagues de feu : gardez un double saut pour la suite.':'Le sol va trembler : sautez au-dessus de l’onde.';}
    }
    executeBossAttack(e) {
      const cx=e.x+e.w/2,kind=e.attackKind;e.state='attack';e.timer=kind==='eruption'?1.8:kind==='doubleSweep'?1:.5;e.attackVolumes=[];
      if(kind==='sweep'||kind==='doubleSweep')e.attackVolumes=e.telegraphs.map(t=>({...t,delay:t.delay||0,life:.22,hit:false}));
      if(kind==='rain')e.attackVolumes=e.telegraphs.map(t=>({...t,delay:0,life:.32,hit:false}));
      if(kind==='slam'||kind==='eruption'){
        const count=kind==='eruption'?3:1;for(let n=0;n<count;n++)e.pendingAttacks.push({delay:n*.58,type:'wave',speed:280+e.phase*25});
      }
      if(kind==='volley'){
        const count=e.phase===3?4:e.phase===2?3:2;
        for(let n=0;n<count;n++)e.pendingAttacks.push({delay:n*.2,type:'orb',speed:240+e.phase*20});e.timer=count*.2+.25;
      }
      this.effect('ring',cx,kind==='rain'?e.y+30:635,{color:'#ffb37e',life:.45,maxLife:.45});
    }
    updateBoss(e,dt) {
      if(e.mobile){this.updateMobileBoss(e,dt);return;}
      e.hitFlash=Math.max(0,e.hitFlash-dt);e.armorFlash=Math.max(0,e.armorFlash-dt);const phase=e.hp<=e.maxHp/3?3:e.hp<=e.maxHp*2/3?2:1;
      if(phase>e.phase){e.phase=phase;this.closeBoss(e);e.timer=1.35;this.projectiles=this.projectiles.filter(p=>p.owner!==e.id);this.say(phase===2?'Phase II — L’armure se fissure':'Phase III — Le dernier éclat',phase===2?'De nouvelles attaques se préparent. Surveillez les marques au sol.':'Le colosse déchaîne sa dernière force. Gardez le rythme.',3.5);this.effect('ring',e.x+e.w/2,e.y+e.h*.4,{color:phase===2?'#b5ebff':'#ffb680',life:1.2,maxLife:1.2});this.emit('phase',{phase,boss:e.id});}
      if(!this.arenaLocked){e.state='idle';return;}
      e.active=true;
      if(e.weakpoint.active){e.vulnerabilityTimer=Math.max(0,e.vulnerabilityTimer-dt);e.timer=e.vulnerabilityTimer;if(e.vulnerabilityTimer<=0)this.closeBoss(e);return;}
      e.timer-=dt;
      if(e.state==='windup'){e.attackProgress=clamp(1-e.timer/e.windupDuration,0,1);if(e.timer<=0)this.executeBossAttack(e);return;}
      if(e.state==='attack'){
        for(const pending of e.pendingAttacks){pending.delay-=dt;if(pending.delay>0||pending.fired)continue;pending.fired=true;const cx=e.x+e.w/2;
          if(pending.type==='wave'){this.spawnProjectile(e,cx-35,623,-pending.speed,0,true);this.spawnProjectile(e,cx+15,623,pending.speed,0,true);}
          else {const py=this.player.y+this.player.h*.45;const fromX=cx,fromY=clamp(py,360,605);const dx=this.player.x+15-fromX,dy=py-fromY,d=Math.max(1,Math.hypot(dx,dy));this.spawnProjectile(e,fromX,fromY,dx/d*pending.speed,dy/d*pending.speed,false);}
        }
        for(const volume of e.attackVolumes){volume.delay-=dt;if(volume.delay>0)continue;volume.life-=dt;if(volume.life<=0||volume.hit||!overlap(volume,this.player))continue;volume.hit=true;this.hurt(e.damage*(1+(e.phase-1)*.12),e,!volume.parryable);if(e.weakpoint.active)return;}
        if(e.timer<=0){e.state='recover';e.timer=e.phase===3? .6:.85;e.telegraphs=[];e.attackVolumes=[];e.pendingAttacks=[];}return;
      }
      if(e.timer>0)return;
      const sequences=e.bossType==='king'?[['sweep','volley','slam'],['volley','rain','slam','sweep'],['doubleSweep','rain','eruption','volley']]:[['sweep','slam'],['sweep','rain','slam'],['doubleSweep','rain','eruption']];
      const list=sequences[e.phase-1],kind=list[e.sequence%list.length];e.sequence++;this.prepareBossAttack(e,kind);
    }
    syncMobileWeakpoint(e) {
      const w=e.weakpoint;if(e.bossType==='moth'){w.x=e.x+55;w.y=e.y+30;}
      else if(e.bossType==='worm'){w.x=e.x+55;w.y=e.y+70;}
      else {w.x=e.x;w.y=e.y;}
    }
    openMobileBoss(e) {
      if(e.hp<=0||e.weakpoint.active)return false;
      e.state='exposed';e.vulnerabilityTimer=(e.bossType==='moth'?5.5:e.bossType==='worm'?4.5:3.5)+(this.config.assist?1:0);if(this.config.difficulty==='master')e.vulnerabilityTimer*=.8;e.timer=e.vulnerabilityTimer;e.weakpoint.active=true;e.armored=false;e.buried=false;e.cycleDamage=0;e.cycles++;e.poise=0;e.attackCount=0;e.vx=0;e.vy=0;e.telegraphs=[];e.pendingAttacks=[];e.attackVolumes=[];
      if(e.bossType==='moth'){e.landing={fromX:e.x,fromY:e.y,toX:clamp(this.player.x+this.player.facing*65-50,this.room.bossGate.x+35,this.room.width-e.w-60),toY:510,elapsed:0,duration:.4};e.state='landing';}
      if(e.bossType==='worm')e.y=480;
      if(e.bossType==='duelist')e.y=558;
      this.syncMobileWeakpoint(e);this.projectiles=this.projectiles.filter(p=>p.owner!==e.id);e.actionHint=e.bossType==='moth'?'Sylphe est posée. Frappez son cœur lumineux !':e.bossType==='worm'?'Le cœur est exposé. Approchez et frappez !':'Sa garde est ouverte. Ripostez maintenant !';this.say('Une ouverture !',e.actionHint,2.5);this.emit('expose',{boss:e.id});this.effect('ring',e.weakpoint.x+e.weakpoint.w/2,e.weakpoint.y+e.weakpoint.h/2,{color:'#a8ffed',life:.7,maxLife:.7});return true;
    }
    finishMobileSequence(e) {
      e.attackCount++;
      if(e.attackCount>=e.maxPoise)this.openMobileBoss(e);
      else {e.state='recover';e.timer=.85;e.vx=0;e.telegraphs=[];e.attackVolumes=[];e.pendingAttacks=[];e.buried=e.bossType==='worm';e.actionHint='Son souffle faiblit : '+e.attackCount+'/'+e.maxPoise+' échanges. Esquivez encore ou parez !';}
    }
    prepareMobileAttack(e,kind) {
      const p=this.player,cx=e.x+e.w/2;e.attackKind=kind;e.facing=p.x+15>cx?1:-1;e.state='windup';e.timer=kind==='burrow'||kind==='twinburrow'?1.05:kind==='bite'? .75:kind==='combo'? .75:.85;e.windupDuration=e.timer;e.attackProgress=0;e.hitPlayer=false;e.telegraphs=[];e.pendingAttacks=[];e.attackVolumes=[];e.targetX=clamp(p.x+15,this.room.bossGate.x+110,this.room.width-140);e.targetY=p.y+26;
      if(e.bossType==='moth'){
        e.actionHint=kind==='dive'?'Elle plonge : esquivez de côté ou parez !':kind==='gust'?'Une rafale approche : sautez au-dessus du vent.':'Les plumes se parent. Elle se posera après la salve.';
        if(kind==='dive')e.telegraphs=[{x:Math.min(e.x,e.targetX-e.w/2),y:e.y,w:Math.abs(e.x-(e.targetX-e.w/2))+e.w,h:650-e.y,kind:'dive',parryable:true}];
        if(kind==='gust')e.telegraphs=[{x:this.room.bossGate.x,y:574,w:this.room.width-this.room.bossGate.x-30,h:76,kind:'gust',parryable:false}];
      }else if(e.bossType==='worm'){
        if(kind==='bite'){e.actionHint='La mâchoire se referme : parez ou reculez !';e.telegraphs=[{x:e.x-90,y:540,w:e.w+180,h:110,kind:'bite',parryable:true}];}
        else {e.buried=true;e.actionHint=kind==='twinburrow'?'Deux émergences successives : continuez à bouger !':'Le sol tremble sous vos pieds : quittez la marque !';e.telegraphs=[{x:e.targetX-95,y:470,w:190,h:180,kind:'burrow',parryable:false}];}
      }else {
        e.actionHint=kind==='crescent'?'Une lame d’éclipse puis une ruée : parez ou sautez !':kind==='combo'?'Deux ruées : gardez une esquive pour la seconde.':'La lame s’allume : parez la ruée ou sautez.';
        const reach=(e.phase===3?590:520)*.48+45;e.telegraphs=[{x:e.facing>0?e.x:e.x-reach,y:558,w:e.w+reach,h:92,kind:'dashSlash',parryable:true}];
        if(kind==='crescent')e.telegraphs.push({x:this.room.bossGate.x,y:575,w:this.room.width-this.room.bossGate.x,h:60,kind:'crescent',parryable:true});
      }
    }
    executeMobileAttack(e) {
      const p=this.player,kind=e.attackKind;e.state='attack';e.timer=.7;e.attackProgress=1;e.hitPlayer=false;
      if(e.bossType==='moth'){
        if(kind==='dive'){e.startX=e.x;e.startY=e.y;e.timer=.5;}
        else {const count=kind==='tempest'?7:kind==='gust'?2:3+e.phase;e.timer=kind==='tempest'?1.35:.85;for(let n=0;n<count;n++)e.pendingAttacks.push({delay:n*.15,type:kind==='gust'?'gust':'feather',index:n,count});}
      }else if(e.bossType==='worm'){
        if(kind==='bite'){e.timer=.28;e.attackVolumes=e.telegraphs.map(t=>({...t,hit:false}));}
        else {e.buried=false;e.x=e.targetX-e.w/2;e.y=480;e.timer=.3;e.attackVolumes=e.telegraphs.map(t=>({...t,hit:false}));if(e.phase>=2){this.spawnProjectile(e,e.x,623,-260,0,true);this.spawnProjectile(e,e.x+e.w,623,260,0,true);}}
      }else {e.timer=.48;e.vx=e.facing*(e.phase===3?590:520);if(kind==='crescent'){this.spawnProjectile(e,e.x+e.w/2,575,e.facing*350,0,false);const a=this.projectiles[this.projectiles.length-1];a.kind='crescent';a.w=28;a.h=60;}e.remainingDashes=kind==='combo'?1:0;}
      this.syncMobileWeakpoint(e);
    }
    updateMobileBoss(e,dt) {
      e.hitFlash=Math.max(0,e.hitFlash-dt);e.armorFlash=Math.max(0,e.armorFlash-dt);const p=this.player,phase=e.hp<=e.maxHp/3?3:e.hp<=e.maxHp*2/3?2:1;
      if(phase>e.phase){e.phase=phase;this.closeBoss(e);e.timer=1.25;this.projectiles=this.projectiles.filter(a=>a.owner!==e.id);this.say('Phase '+(phase===2?'II':'III'),phase===2?'Son rythme change. Observez ses nouvelles attaques.':'Sa dernière force se réveille.',3);this.emit('phase',{phase,boss:e.id});this.effect('ring',e.x+e.w/2,e.y+e.h/2,{color:'#d5b8ff',life:1,maxLife:1});}
      if(!this.arenaLocked){this.syncMobileWeakpoint(e);return;}e.active=true;
      if(e.landing){const land=e.landing;land.elapsed+=dt;const t=clamp(land.elapsed/land.duration,0,1);e.x=land.fromX+(land.toX-land.fromX)*t;e.y=land.fromY+(land.toY-land.fromY)*t;this.syncMobileWeakpoint(e);if(t>=1){e.landing=null;e.state='exposed';}return;}
      if(e.weakpoint.active){e.vulnerabilityTimer=Math.max(0,e.vulnerabilityTimer-dt);e.timer=e.vulnerabilityTimer;if(e.timer<=0)this.closeBoss(e);this.syncMobileWeakpoint(e);return;}
      e.timer-=dt;
      if(e.state==='windup'){e.attackProgress=clamp(1-e.timer/e.windupDuration,0,1);if(e.timer<=0)this.executeMobileAttack(e);this.syncMobileWeakpoint(e);return;}
      if(e.state==='attack'){
        if(e.bossType==='moth'){
          if(e.attackKind==='dive'){const t=clamp(1-e.timer/.5,0,1);e.x=e.startX+(e.targetX-e.w/2-e.startX)*t;e.y=e.startY+(510-e.startY)*t;if(!e.hitPlayer&&overlap(e,p)){e.hitPlayer=true;this.hurt(22,e);if(e.weakpoint.active)return;}}
          else for(const a of e.pendingAttacks){a.delay-=dt;if(a.fired||a.delay>0)continue;a.fired=true;if(a.type==='gust'){const dir=p.x<e.x?-1:1;this.spawnProjectile(e,e.x+90,588,dir*300,0,true);const shot=this.projectiles[this.projectiles.length-1];shot.kind='gust';shot.w=60;shot.h=40;}
            else {const cx=e.x+90,cy=e.y+80,dx=e.targetX-cx,dy=e.targetY-cy,angle=Math.atan2(dy,dx)+(a.index-(a.count-1)/2)*.09;this.spawnProjectile(e,cx,cy,Math.cos(angle)*285,Math.sin(angle)*285,false);this.projectiles[this.projectiles.length-1].kind='feather';}}
        }else if(e.bossType==='worm'){
          for(const a of e.attackVolumes)if(!a.hit&&overlap(a,p)){a.hit=true;this.hurt(e.attackKind==='bite'?22:19,e,!a.parryable);if(e.weakpoint.active)return;}
        }else {
          e.x=clamp(e.x+e.vx*dt,this.room.bossGate.x+20,this.room.width-e.w-40);const box={x:e.facing>0?e.x:e.x-45,y:e.y,w:e.w+45,h:e.h};if(!e.hitPlayer&&overlap(box,p)){e.hitPlayer=true;this.hurt(22+e.phase*2,e);if(e.weakpoint.active)return;}
        }
        this.syncMobileWeakpoint(e);
        if(e.timer<=0){
          if(e.bossType==='worm'&&e.attackKind!=='bite'){if(e.attackKind==='twinburrow'&&!e.secondBurrow){e.secondBurrow=true;this.prepareMobileAttack(e,'twinburrow');e.timer=.8;e.windupDuration=.8;}else {e.secondBurrow=false;this.prepareMobileAttack(e,'bite');}}
          else if(e.bossType==='duelist'&&e.remainingDashes>0){e.remainingDashes=0;this.prepareMobileAttack(e,'dashSlash');e.timer=.5;e.windupDuration=.5;}
          else this.finishMobileSequence(e);
        }return;
      }
      if(e.bossType==='moth'){const targetX=1050+Math.sin(this.time*.9)*260;e.x+=(targetX-e.x)*Math.min(1,dt*2);e.y+=(275+Math.sin(this.time*2)*30-e.y)*Math.min(1,dt*3);}
      else if(e.bossType==='duelist'){const dx=p.x-e.x;if(Math.abs(dx)>170)e.x+=Math.sign(dx)*190*dt;e.y=558;e.facing=dx>0?1:-1;}
      this.syncMobileWeakpoint(e);if(e.timer>0)return;
      const sequences=e.bossType==='moth'?[['feathers','gust'],['dive','feathers','gust'],['tempest','dive','gust']]:e.bossType==='worm'?[['burrow'],['burrow'],['twinburrow','burrow']]:[['dashSlash'],['combo','dashSlash'],['crescent','combo']];const list=sequences[e.phase-1];this.prepareMobileAttack(e,list[e.sequence++%list.length]);
    }
    updateEnemies(dt) {
      const p=this.player;
      for(const e of this.enemies){if(e.hp<=0)continue;if(e.type==='boss'){this.updateBoss(e,dt);continue;}e.hitFlash=Math.max(0,e.hitFlash-dt);e.timer-=dt;const dx=p.x+p.w/2-(e.x+e.w/2),dy=p.y+p.h/2-(e.y+e.h/2),dist=Math.abs(dx);e.phase=1;
        if(e.state==='stunned'){e.vx=0;if(e.timer<=0){e.state='recover';e.timer=.25;}continue;}
        if(e.state==='windup'){e.attackProgress=clamp(1-e.timer/e.windupDuration,0,1);if(e.timer<=0){e.state='attack';e.timer=e.attackKind==='charge'? .65:e.attackKind==='volley'? .3:.24;e.attackProgress=1;
            if(e.attackKind==='spit'){const sx=e.x+e.w/2,sy=e.y+14,angle=Math.atan2(p.y+26-sy,p.x+15-sx);this.spawnProjectile(e,sx,sy,Math.cos(angle)*240,Math.sin(angle)*240,false);const a=this.projectiles[this.projectiles.length-1];a.damage=13;a.kind='spore';a.color='#b6e9b0';}
            if(e.attackKind==='hop'){e.vx=e.facing*165;e.vy=-430;e.timer=.85;e.hitPlayer=false;}
            if(e.attackKind==='slam'){const speed=e.bossType==='king'?360:300;this.spawnProjectile(e,e.x+e.w/2,623,-speed,0,true);this.spawnProjectile(e,e.x+e.w/2,623,speed,0,true);this.effect('ring',e.x+e.w/2,645,{color:'#ff996d',life:.5,maxLife:.5});}
            if(e.attackKind==='volley'){const count=e.phase===2?3:2;for(let n=0;n<count;n++){const start={x:e.x+e.w/2,y:e.y+48};const vx=e.facing*(260+n*28);const vy=clamp(dy*.55,-100,100)+(n-(count-1)/2)*65;this.spawnProjectile(e,start.x,start.y,vx,vy,false);}}
          }continue;}
        if(e.state==='attack'){
          if(e.attackKind==='hop'){e.vy=Math.min(880,e.vy+1550*dt);this.moveBody(e,dt);if(!e.hitPlayer&&overlap(e,p)){e.hitPlayer=true;this.hurt(e.damage,e);}if(e.grounded)e.timer=0;}
          if(e.attackKind==='charge'){e.vx=e.facing*(e.type==='boss'?470:280);this.moveBody(e,dt);e.x=clamp(e.x,this.room.bossGate?this.room.bossGate.x:10,this.room.width-e.w-20);}
          if(e.attackKind==='swing'||e.attackKind==='charge'){const range=e.type==='boss'?112:48;const inset=e.attackKind==='charge'?0:e.w*.25;const box={x:e.facing===1?e.x+inset:e.x-range,y:e.y-5,w:e.w-inset+range,h:e.h+10};if(!e.hitPlayer&&overlap(box,p)){e.hitPlayer=true;this.hurt(e.damage*(e.phase===2?1.1:1),e);}}
          if(e.timer<=0){e.state='recover';e.timer=e.type==='boss'?(e.phase===2? .55:.82):.7;e.vx=0;}continue;
        }
        if(e.state==='recover'){if(e.timer<=0){e.state='chase';e.timer=.3;}continue;}
        if(e.type==='spitter'||e.type==='hopper'){e.facing=dx>0?1:-1;e.vy=Math.min(880,e.vy+1550*dt);e.vx=0;this.moveBody(e,dt);if(dist<(e.type==='spitter'?680:420)&&Math.abs(dy)<230&&e.timer<=0&&e.grounded)this.startWindup(e,e.type==='spitter'?'spit':'hop',e.type==='spitter'? .7:.5);continue;}
        if(e.type==='flyer'){
          e.facing=dx>0?1:-1;if(dist<480&&Math.abs(dy)<350){e.state='chase';const length=Math.max(1,Math.hypot(dx,dy));e.x+=dx/length*e.speed*dt;e.y+=dy/length*e.speed*.7*dt;if(dist<75&&Math.abs(dy)<70)this.startWindup(e,'swing',.48);}else {e.state='idle';e.y=e.originY+Math.sin(this.time*2+e.originX)*12;e.x+=Math.sin(this.time+e.originX)*13*dt;}continue;
        }
        if(dist<560&&Math.abs(dy)<150){e.facing=dx>0?1:-1;e.state='chase';const reach=e.type==='knight'?96:70;if(dist<reach)this.startWindup(e,'swing',e.type==='knight'? .68:.46);else {e.vx=e.facing*e.speed;const front=e.x+(e.facing===1?e.w+14:-14);const ground=this.room.platforms.some(s=>front>=s.x&&front<s.x+s.w&&Math.abs(s.y-(e.y+e.h))<10);if(!ground&&e.grounded)e.vx=0;e.vy=Math.min(e.vy+1550*dt,800);this.moveBody(e,dt);}}
        else {e.state='idle';e.vx=0;e.vy=Math.min(e.vy+1550*dt,800);this.moveBody(e,dt);}
        if(e.y>800){e.hp=0;this.defeated.push(e.id);}
      }
    }
    spawnProjectile(e,x,y,vx,vy,groundWave) {this.projectiles.push({x,y,w:groundWave?40:22,h:groundWave?27:22,vx,vy,life:5,color:groundWave?'#ff946b':'#ffd5a0',groundWave,owner:e.id,damage:groundWave?22:18});}
    updateProjectiles(dt) {const p=this.player;for(const a of this.projectiles){a.x+=a.vx*dt;a.y+=a.vy*dt;a.life-=dt;if(overlap(a,p)){this.hurt(a.damage,a,a.groundWave);a.life=0;}if(a.x<-80||a.x>this.room.width+80)a.life=0;}this.projectiles=this.projectiles.filter(a=>a.life>0);}
    updateEffects(dt) {for(const f of this.effects){f.life-=dt;if(f.type==='text')f.y-=25*dt;}this.effects=this.effects.filter(f=>f.life>0);for(const w of this.secretWalls)w.hitFlash=Math.max(0,w.hitFlash-dt);}
  }
  CM.Engine=Engine;
  if(typeof module!=='undefined'&&module.exports)module.exports=CM;
}
