'use strict';
{
  'use strict';
  const $ = id => document.getElementById(id);
  const SAVE_KEY = 'carlus-magnus:aurore:v1';
  const PREF_KEY = 'carlus-magnus:prefs:v1';
  const TRIAL_KEY = 'carlus-magnus:trials:v1';
  const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const heroes = [
    {id:'errant',name:'L’Errant',tag:'L’ÉQUILIBRE',line:'Une lame sûre. Un cœur sans peur.',color:'#a1d8cd',stats:{speed:4,power:4,vitality:4},weapon:'sword',desc:'Une voie équilibrée pour découvrir les ruines. Rapide, solide et à l’aise avec toutes les armes.'},
    {id:'sylve',name:'Sylve',tag:'LA VITESSE',line:'Insaisissable entre deux ombres.',color:'#7ad9ac',stats:{speed:6,power:2,vitality:4},weapon:'spear',desc:'Une aventurière vive qui choisit ses distances. Sa lance compense sa force modeste par une excellente portée.'},
    {id:'bastion',name:'Bastion',tag:'LA PUISSANCE',line:'Quand la montagne prend les armes.',color:'#e1af79',stats:{speed:2,power:5,vitality:5},weapon:'axe',desc:'Plus lent, plus robuste. Ses coups de hache font la différence, à condition de bien choisir le moment.'},
    {id:'custom',name:'Ton héros',tag:'LA LIBERTÉ',line:'Ta façon de faire la légende.',color:'#b4a3de',stats:{speed:4,power:4,vitality:4},weapon:'sword',desc:'Répartis 12 points entre vitesse, force et vitalité. Chaque caractéristique doit rester entre 1 et 7.'}
  ];
  let selected = 0, custom = {speed:4,power:4,vitality:4}, customName = 'Charles';
  let game = null, config = null, renderer = null, screen = 'title', modalMode = null;
  let elapsed = 0, lastTime = 0, saveClock = 0, hudClock = 0, saveTimer, previousFocus;
  let touchEnabled = matchMedia('(pointer:coarse)').matches;
  const keys = new Set(), touch = {}, gamepadEdges = {};
  const input = () => {
    const has = (...codes) => codes.some(c => keys.has(c));
    const out = {left:has('ArrowLeft','KeyA','KeyQ'),right:has('ArrowRight','KeyD'),down:has('ArrowDown','KeyS'),jump:has('Space','ArrowUp','KeyW','KeyZ'),attack:has('KeyJ','KeyX'),block:has('KeyK','KeyC'),dash:has('ShiftLeft','ShiftRight','KeyL'),interact:has('KeyE'),heal:has('KeyF')};
    Object.keys(touch).forEach(k => { if(touch[k]) out[k] = true; });
    if(touch.pogo){out.down=true;out.attack=true;}
    const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
    if(pad){
      const down = n => !!pad.buttons[n]?.pressed;
      out.left ||= pad.axes[0] < -.25 || down(14);out.right ||= pad.axes[0] > .25 || down(15);
      out.down ||= pad.axes[1] > .35 || down(13);
      out.jump ||= down(0);out.attack ||= down(2);out.dash ||= down(1)||down(7);out.block ||= down(4)||down(6);out.interact ||= down(3);out.heal ||= down(12);
      for(const [n,action] of [[9,'pause'],[8,'map'],[5,'weapon']]){
        if(down(n) && !gamepadEdges[n]){
          if(action==='pause') { if(modalMode==='pause') closeModal();else if(!modalMode) showPause(); }
          if(action==='map') { if(modalMode==='map') closeModal();else if(!modalMode) showMap(); }
          if(action==='weapon' && !modalMode) { const a=['sword','axe','spear'];game?.setWeapon(a[(a.indexOf(game.player.weapon)+1)%3]); }
        }
        gamepadEdges[n] = down(n);
      }
    }
    return out;
  };
  const clearInput = () => { keys.clear(); Object.keys(touch).forEach(k => touch[k]=false); };

  class Sound {
    constructor(){this.ctx=null;this.enabled=true;this.nextNote=0;try{this.enabled=JSON.parse(localStorage.getItem(PREF_KEY)||'{}').sound!==false;}catch{}}
    unlock(){try{this.ctx ||= new (window.AudioContext||window.webkitAudioContext)();if(this.ctx.state==='suspended')this.ctx.resume();}catch{}}
    tone(freq,duration=.1,type='sine',volume=.05,slide=0,delay=0){
      if(!this.enabled||!this.ctx||this.ctx.state!=='running')return;
      const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.02);
    }
    play(type){
      if(type==='attack'){this.tone(160,.12,'triangle',.055,-100);this.tone(600,.055,'sawtooth',.008,-500);}
      else if(type==='jump')this.tone(210,.14,'triangle',.025,220);
      else if(type==='dash')this.tone(340,.12,'triangle',.035,-290);
      else if(type==='parry'){this.tone(920,.35,'sine',.07,400);this.tone(1380,.4,'triangle',.035,0,.04);}
      else if(type==='block')this.tone(115,.13,'square',.025,-60);
      else if(type==='hurt'){this.tone(100,.18,'sawtooth',.04,-55);}
      else if(type==='pickup'){this.tone(660,.2,'sine',.04);this.tone(990,.3,'sine',.035,0,.08);}
      else if(type==='death'){this.tone(200,.8,'triangle',.05,-140);}
      else if(type==='boss'){this.tone(65,1.2,'triangle',.07);this.tone(98,1,'sine',.045,0,.2);}
      else if(type==='armor')this.tone(260,.08,'square',.018,-140);
      else if(type==='expose'){this.tone(220,.55,'triangle',.07);this.tone(660,.7,'sine',.035,0,.12);}
      else if(type==='phase'){this.tone(55,1.1,'sawtooth',.024);this.tone(82,.9,'triangle',.05,0,.15);}
      else if(type==='pogo')this.tone(170,.18,'triangle',.045,430);
      else if(type==='break')this.tone(85,.28,'sawtooth',.028,-45);
      else if(type==='heal'){this.tone(440,.45,'sine',.04,220);this.tone(880,.6,'sine',.025,0,.12);}
      else if(type==='win'){[0,4,7,12,16].forEach((v,i)=>this.tone(261.6*2**(v/12),1.5,'sine',.04,0,i*.18));}
    }
    ambient(t){if(t<this.nextNote)return;this.nextNote=t+3.8+Math.random()*2;const notes=[130.81,196,261.63,293.66,392];this.tone(notes[Math.floor(Math.random()*notes.length)],2.5,'sine',.011);}
    toggle(){this.enabled=!this.enabled;this.unlock();try{localStorage.setItem(PREF_KEY,JSON.stringify({sound:this.enabled}));}catch{};updateSoundButton();}
  }
  const sound = new Sound();
  function updateSoundButton(){$('sound-button').textContent=sound.enabled?'♫':'♪';$('sound-button').style.opacity=sound.enabled?'1':'.45';$('sound-button').setAttribute('aria-label',sound.enabled?'Couper le son':'Activer le son');$('sound-button').title=sound.enabled?'Son activé':'Son coupé';}
  function readSave(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));return s?.version===1&&s.config&&s.snapshot?s:null;}catch{return null;}}
  function saveGame(){if(!game||game.trial)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify({version:1,config,snapshot:game.snapshot(),savedAt:Date.now()}));$('save-indicator').classList.add('visible');clearTimeout(saveTimer);saveTimer=setTimeout(()=>$('save-indicator').classList.remove('visible'),1800);}catch{$('save-indicator').textContent='Sauvegarde indisponible dans ce navigateur';$('save-indicator').classList.add('visible');}}
  function showScreen(id){screen=id;['title','hero'].forEach(s=>$(s+'-screen').classList.toggle('hidden',s!==id));$('hud').classList.toggle('hidden',id!=='game');$('touch-controls').classList.toggle('hidden',id!=='game'||!touchEnabled);document.body.classList.toggle('playing',id==='game');document.body.classList.toggle('touch-on',touchEnabled);clearInput();}
  function title(){saveGame();closeModal();game=null;showScreen('title');$('continue-game').classList.toggle('hidden',!readSave());}
  function portrait(h){const heavy=h.id==='bastion',customHero=h.id==='custom';return `<svg viewBox="0 0 120 140" aria-hidden="true"><ellipse cx="60" cy="128" rx="32" ry="6" fill="#06171f" opacity=".6"/><path d="M28 127 35 62Q60 37 85 62L98 128 66 116 56 129Z" fill="${h.color}" opacity=".22"/><path d="M${heavy?'30':'39'} 116 41 64Q60 54 80 64L${heavy?'91':'82'} 116 61 102Z" fill="${h.color}"/><path d="M45 68 53 107 60 91 68 111 77 69" fill="#163a43"/><path d="m47 112-3 16h12l5-22 6 22h12l-6-16" fill="#0c2630"/><path d="M45 49Q44 25 60 22Q80 28 76 50L70 65 51 62Z" fill="#d3d4b9"/><path d="M42 46Q42 20 61 17Q80 21 80 47L68 39 50 42Z" fill="#275360"/><path d="m47 45 27-1-3 11-20 1Z" fill="#0d2731"/><path d="M51 47h6m8 0h6" stroke="${h.color}" stroke-width="3"/><path d="M43 61Q30 67 26 84L40 94 49 85 46 71M78 62l12 20-9 12-10-9" fill="${h.color}"/><path d="M84 113V${h.id==='sylve'?'29':'65'}" stroke="#ba9368" stroke-width="5"/>${heavy?'<path d="M83 66Q109 54 109 85L85 83Z" fill="#cadcd1"/>':h.id==='sylve'?'<path d="m84 12-8 23 8-4 7 4Z" fill="#d9eadd"/>':'<path d="m84 43-5 10 2 40h6l2-40Z" fill="#d9eadd"/><path d="M75 93h19" stroke="#e9c58c" stroke-width="4"/>'}${customHero?'<path d="m60 1 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e8c989"/>':''}</svg>`;}
  function renderHeroes(){
    $('hero-cards').innerHTML=heroes.map((h,i)=>`<button class="hero-card ${selected===i?'selected':''}" data-hero="${i}" aria-pressed="${selected===i}"><div class="hero-portrait">${portrait(h)}</div><small>${h.tag}</small><h3>${h.name}</h3><div class="tagline">${h.line}</div>${[['speed','VITESSE'],['power','FORCE'],['vitality','VITALITÉ']].map(([key,label])=>`<div class="mini-stat"><span>${label}</span><span class="stat-dots">${Array.from({length:7},(_,j)=>`<i class="${j<(i===3?custom[key]:h.stats[key])?'on':''}"></i>`).join('')}</span></div>`).join('')}</button>`).join('');
    $('hero-cards').querySelectorAll('[data-hero]').forEach(el=>el.onclick=()=>{selected=Number(el.dataset.hero);$('weapon-select').value=heroes[selected].weapon;renderHeroes();sound.tone(440,.08,'sine',.02);});
    const h=heroes[selected];$('hero-description').innerHTML=`<strong>${h.name} · ${h.tag.toLowerCase()}</strong>${h.desc}`;
    $('custom-controls').classList.toggle('hidden',selected!==3);
    const remaining=12-custom.speed-custom.power-custom.vitality;
    $('custom-controls').innerHTML=`<div class="points-left">${remaining} point${remaining>1?'s':''} à distribuer · 12 au total</div>${[['speed','Vitesse'],['power','Force'],['vitality','Vitalité']].map(([key,label])=>`<div class="custom-stat"><span>${label}</span><div><button data-stat="${key}" data-step="-1" aria-label="Réduire ${label}" ${custom[key]<=1?'disabled':''}>−</button><b>${custom[key]}</b><button data-stat="${key}" data-step="1" aria-label="Augmenter ${label}" ${remaining<=0||custom[key]>=7?'disabled':''}>+</button></div></div>`).join('')}`;
    $('custom-controls').insertAdjacentHTML('afterbegin',`<label class="custom-name-label" for="custom-name">NOM DU HÉROS <input id="custom-name" maxlength="24" value="${escapeHTML(customName)}" autocomplete="off"></label>`);
    $('custom-name').addEventListener('input',e=>customName=e.target.value);
    $('custom-controls').querySelectorAll('[data-stat]').forEach(el=>el.onclick=()=>{custom[el.dataset.stat]+=Number(el.dataset.step);renderHeroes();});
    $('begin-game').disabled=selected===3&&remaining!==0;
    $('allocation-note').textContent=selected===3&&remaining?'Distribue les 12 points pour commencer.':'Les trois armes restent disponibles pendant l’aventure.';
  }
  function selectHero(){saveGame();game=null;closeModal();showScreen('hero');renderHeroes();}
  function start(resume=false){
    sound.unlock();closeModal();const saved=resume?readSave():null;
    config=saved?.config||{name:selected===3?(customName.trim()||'Charles'):heroes[selected].name,stats:{...(selected===3?custom:heroes[selected].stats)},weapon:$('weapon-select').value,difficulty:$('difficulty-select').value,assist:$('difficulty-select').value==='explorer',color:heroes[selected].color};
    try{game=new CM.Engine(config,saved?.snapshot||null);}catch(error){console.error(error);$('fatal-error').classList.remove('hidden');$('fatal-error').textContent='L’aventure n’a pas pu démarrer. Recharge la page puis essaie une nouvelle aventure.';return;}
    game.player.color=config.color;showScreen('game');saveClock=0;hudClock=1;saveGame();updateHUD();$('world').focus();
  }

  function trialRecords(){try{return JSON.parse(localStorage.getItem(TRIAL_KEY)||'{}');}catch{return {};}}
  const timeLabel = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
  function showTrials(){
    if(game&&!game.trial)saveGame();
    game=null;showScreen('title');
    const records=trialRecords();
    openModal('trials',`<div class="eyebrow">LES ROYAUMES OUBLIÉS · ÉPREUVES LIBRES</div><h2>Cinq gardiens. Cinq façons de vaincre.</h2><p>Grimpe sur les colosses, guette un atterrissage, esquive un assaut.<br>Chaque combat est indépendant de ta sauvegarde d’aventure.</p><label class="trial-difficulty">LE NIVEAU DE DÉFI <select id="trial-difficulty"><option value="adventurer">Aventurier · le défi original</option><option value="explorer">Explorateur · plus tolérant</option><option value="master">Maître · précision et danger</option></select></label><div class="trial-cards">${CM.BOSSES.map((b,i)=>`<article class="trial-card"><div class="trial-art"><canvas id="preview-${b.id}" width="640" height="360" aria-label="${escapeHTML(b.name)}"></canvas><span>${['I','II','III','IV','V'][i]}</span></div><div class="trial-copy"><small>GARDIEN ${i+1} · TROIS PHASES</small><h3>${escapeHTML(b.name)}</h3><p>${escapeHTML(b.subtitle)}<br>${escapeHTML(b.tip)}</p><div class="trial-record">${records[b.id]?`Aventurier · ${timeLabel(records[b.id].best)}`:'Aventurier · aucun record'}${records['master:'+b.id]?`<br>Maître · ${timeLabel(records['master:'+b.id].best)}`:''}</div><button class="button primary" data-trial="${b.id}">Affronter ce gardien <span>→</span></button></div></article>`).join('')}</div><div class="modal-footer"><span>Double saut, fiole et trois armes. Records Aventurier et Maître séparés.</span></div>`);
    for(const {id:type} of CM.BOSSES){
      const preview=new CM.Engine({stats:{speed:4,power:4,vitality:4}});preview.startTrial(type);
      const boss=preview.enemies.find(e=>e.type==='boss');if(boss)preview.camera.x=Math.max(0,boss.x+boss.w/2-720);
      new CM.Renderer($(`preview-${type}`)).draw(preview,0);
    }
    $('modal-content').querySelectorAll('[data-trial]').forEach(button=>button.onclick=()=>startTrial(button.dataset.trial,$('trial-difficulty').value));
  }
  function startTrial(type,difficulty='adventurer'){
    if(game&&!game.trial)saveGame();sound.unlock();closeModal();
    config={name:'Charles',stats:{speed:4,power:4,vitality:4},weapon:'sword',difficulty,assist:difficulty==='explorer',color:'#a1d8cd'};
    game=new CM.Engine(config);game.startTrial(type);game.player.color=config.color;
    showScreen('game');saveClock=0;hudClock=1;clearTimeout(saveTimer);$('save-indicator').classList.remove('visible');updateHUD();
  }
  function showTrialWin(){
    const type=game.trialBossType||CM.BOSSES.find(b=>b.roomIndex===game.roomIndex)?.id||'warden';
    if(!config.assist){try{const records=trialRecords(),key=config.difficulty==='master'?'master:'+type:type,old=records[key];records[key]={best:Math.min(old?.best??Infinity,game.time),wins:(old?.wins||0)+1};localStorage.setItem(TRIAL_KEY,JSON.stringify(records));}catch{}}
    openModal('win',`<div class="pause-content"><div class="eyebrow">LE GARDIEN S’INCLINE</div><div class="win-symbol">♜</div><h2>${escapeHTML(CM.BOSSES.find(b=>b.id===type)?.name)} est vaincu.</h2><p>Tu as trouvé les ouvertures jusque dans la dernière phase.</p><div class="run-stats"><div><strong>${timeLabel(game.time)}</strong><span>TEMPS DU DÉFI</span></div><div><strong>${game.deaths}</strong><span>RETOURS</span></div></div><p>Ta sauvegarde d’aventure est préservée.</p><div class="pause-buttons"><button class="button primary" id="trial-retry">Relever le défi à nouveau <span>→</span></button><button class="button secondary" id="trial-other">Choisir un autre gardien</button><button class="button ghost" id="trial-home">Retour à l’accueil</button></div></div>`);
    $('trial-retry').onclick=()=>startTrial(type,config.difficulty||'adventurer');$('trial-other').onclick=showTrials;$('trial-home').onclick=title;
  }
  function openModal(mode,html){previousFocus=document.activeElement;modalMode=mode;clearInput();$('modal-content').innerHTML=html;$('modal-content').querySelector('h2')?.setAttribute('id','modal-title');$('modal').classList.remove('hidden');$('modal-close').classList.toggle('hidden',mode==='dead'||mode==='win');$('modal-close').focus();$('touch-controls').classList.add('hidden');}
  function closeModal(){modalMode=null;$('modal').classList.add('hidden');$('modal-close').classList.remove('hidden');clearInput();if(screen==='game'&&touchEnabled)$('touch-controls').classList.remove('hidden');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
  function showPause(){if(!game||game.dead||game.won)return;saveGame();openModal('pause',`<div class="pause-content"><div class="eyebrow">${game.trial?'DÉFI DES GARDIENS':'UNE PAUSE AU SANCTUAIRE'}</div><h2>La lumière t’attendra.</h2><p>${game.trial?'Ce défi est indépendant de ta sauvegarde d’aventure.':'Ta progression est enregistrée sur ce navigateur.'}</p><div class="pause-buttons"><button class="button primary" id="resume-button">Reprendre le combat <span>→</span></button><button class="button secondary" id="pause-skills">${game.trial?'Choisir un autre gardien':'Développer mes talents'}</button><button class="button ghost" id="pause-zones" aria-pressed="${game.showAttackZones!==false}">Zones d’attaque : ${game.showAttackZones!==false?'affichées':'masquées'}</button><button class="button ghost" id="pause-help">Commandes et conseils</button><button class="button ghost" id="pause-title">${game.trial?'Quitter le défi':'Sauvegarder et quitter'}</button></div></div>`);$('resume-button').onclick=closeModal;$('pause-skills').onclick=game.trial?showTrials:showSkills;$('pause-help').onclick=showHelp;$('pause-title').onclick=title;$('pause-zones').onclick=()=>{game.showAttackZones=game.showAttackZones===false;saveGame();showPause();};}
  function showHelp(){if(game?.dead||game?.won)return;openModal('help',`<div class="eyebrow">LE CARNET DE L’AVENTURIER</div><h2>Un peu d’instinct. Le bon timing.</h2><p>Explore les passages, récupère les éclats et apprends le rythme de tes adversaires. Choisis Explorateur pour découvrir, Aventurier pour le défi original ou Maître pour des dégâts accrus et des ouvertures plus courtes.</p><div class="help-grid"><div><h3>Au clavier · AZERTY et QWERTY</h3>${[['← → / Q D / A D','Se déplacer'],['Espace / ↑','Sauter, puis double saut débloqué'],['J / X','Attaquer'],['↓ / S + J, en l’air','Frappe plongeante et rebond'],['K / C (maintenir)','Lever la garde'],['Maj / L','Esquiver'],['E','Activer un sanctuaire'],['F','Boire une fiole de soin'],['I','Équiper les talismans'],['1 / 2 / 3','Épée / hache / lance'],['Tab / M / Échap','Talents / carte / pause']].map(([k,v])=>`<div class="control-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}</div><div><h3>À la manette · disposition Xbox</h3>${[['Stick / croix','Se déplacer'],['A / X','Sauter / frapper'],['Bas + X, en l’air','Frappe plongeante'],['B / RT','Esquiver'],['LB / LT','Garder et parer'],['Y / RB','Interagir / changer d’arme'],['Croix vers le haut','Boire une fiole de soin'],['Start / Select','Pause / carte']].map(([k,v])=>`<div class="control-row"><kbd>${k}</kbd><span>${v}</span></div>`).join('')}<p class="help-tip">Les zones au sol annoncent la portée des attaques. Elles sont masquées par défaut en mode Maître ; l’option « Zones d’attaque » dans la pause permet de changer ce réglage. Les gestes des ennemis restent visibles. Lève la garde juste avant l’impact pour une parade parfaite : l’ennemi est étourdi. Maintenir la garde absorbe les coups, mais consomme de l’endurance.</p><p class="help-tip">Les colosses portent des sceaux lumineux. Brise-les ou réussis une parade pour ouvrir leur point faible. Les bras marqués deviennent des marches : grimpe et frappe la lumière avant qu’elle se referme. Chaque tiers de vie change la phase.</p><p class="help-tip">Le papillon dévoile son cœur quand il se pose. Le serpent émerge là où tu te trouvais : bouge, puis contre-attaque. Face au chevalier, esquive ses assauts ou pare au dernier instant.</p><p class="help-tip">Une fiole rend 50 points de vie : F au clavier ou haut sur la croix de la manette. Les sanctuaires la rechargent. Ouvre les talismans avec I pour combiner deux pouvoirs.</p><p class="help-tip">Les murs fissurés cachent des trésors : frappe pour les briser. Depuis un sanctuaire, ouvre la carte pour voyager et retrouver les secrets laissés derrière toi.</p></div></div><div class="modal-footer"><button class="button secondary" id="toggle-touch">${touchEnabled?'Masquer':'Afficher'} les commandes tactiles</button><button class="button primary" id="help-done">C’est parti <span>→</span></button></div>`);$('help-done').onclick=closeModal;$('toggle-touch').onclick=()=>{touchEnabled=!touchEnabled;document.body.classList.toggle('touch-on',touchEnabled);showHelp();};}
  function skillList(){const list=CM.SKILLS||[];return Array.isArray(list)?list:Object.entries(list).map(([id,value])=>({id,...value}));}
  function showCharms(){
    if(!game||game.dead||game.won)return;
    const owned=game.ownedCharms||[],equipped=game.equippedCharms||[];
    openModal('charms',`<div class="eyebrow">LES TRÉSORS DES ROYAUMES</div><h2>Deux talismans. Ta façon de jouer.</h2><p>Explore les détours pour retrouver ces six objets. Combine librement leurs pouvoirs.</p><div class="charm-slots">${[0,1].map(i=>{const c=CM.CHARMS.find(x=>x.id===equipped[i]);return `<div class="charm-slot ${c?'filled':''}"><span>${c?escapeHTML(c.symbol):'◇'}</span><div><small>EMPLACEMENT ${i+1}</small><strong>${c?escapeHTML(c.name):'Aucun talisman'}</strong></div></div>`;}).join('')}</div><div class="charms-grid">${CM.CHARMS.map(c=>{const found=owned.includes(c.id),on=equipped.includes(c.id);return `<article class="charm-card ${on?'equipped':''} ${found?'':'unfound'}"><span class="charm-symbol" style="--charm-color:${c.color}">${escapeHTML(c.symbol)}</span><small>${on?'ÉQUIPÉ':found?'DÉCOUVERT':'À DÉCOUVRIR'}</small><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.description)}</p><button data-charm="${c.id}" ${!found||(!on&&equipped.length>=2)?'disabled':''}>${on?'Retirer':!found?'Caché dans le monde':equipped.length>=2?'Deux emplacements occupés':'Équiper'}</button></article>`;}).join('')}</div><div class="modal-footer"><span>${owned.length} / ${CM.CHARMS.length} découverts · ${equipped.length} / 2 équipés${game.trial?' · Défis sans talismans de campagne':''}</span><button class="button primary" id="charms-done">Reprendre <span>→</span></button></div>`);
    $('charms-done').onclick=closeModal;
    $('modal-content').querySelectorAll('[data-charm]').forEach(el=>el.onclick=()=>{if(game.equipCharm(el.dataset.charm)){sound.play('pickup');saveGame();showCharms();updateHUD();}});
  }
  function showSkills(){if(!game||game.dead||game.won)return;const p=game.player;openModal('skills',`<div class="eyebrow">FAIRE GRANDIR SA LUMIÈRE</div><h2>Les talents de l’Aurore.</h2><p><strong style="color:var(--gold)">${game.skillPoints||0} point${game.skillPoints!==1?'s':''} de talent disponible${game.skillPoints!==1?'s':''}</strong> · Collecte les éclats et terrasse les gardiens.</p><div class="skills-grid">${skillList().map((s,i)=>{const owned=!!p.skills?.[s.id];const req=s.requires?(Array.isArray(s.requires)?s.requires:[s.requires]):[];const allowed=req.every(r=>p.skills?.[r]);const reqNames=req.map(id=>skillList().find(x=>x.id===id)?.name||id).join(', ');return `<article class="skill-card ${owned?'owned':''}"><span class="skill-symbol">${['✧','⚔','◇','❖','✺','↟','✦','◈'][i%8]}</span><h3>${escapeHTML(s.name)}</h3><p>${escapeHTML(s.description)}${req.length?`<br><span style="color:var(--gold)">Après ${escapeHTML(reqNames)}</span>`:''}</p><button data-skill="${s.id}" ${owned||!allowed||game.skillPoints<(s.cost||1)?'disabled':''}>${owned?'✓ Acquis':`${s.cost||1} point${s.cost>1?'s':''} · Apprendre`}</button></article>`;}).join('')}</div><div class="modal-footer"><span>Les talents s’appliquent immédiatement et sont sauvegardés.</span><button class="button primary" id="skills-done">Reprendre <span>→</span></button></div>`);$('skills-done').onclick=closeModal;$('modal-content').querySelectorAll('[data-skill]').forEach(el=>el.onclick=()=>{game.buySkill(el.dataset.skill);sound.play('pickup');saveGame();showSkills();updateHUD();});}
  function showMap(){
    if(!game||game.dead||game.won)return;
    const visited=game.roomsVisited||[],canTravel=!game.trial&&game.atSanctuary?.()&&!game.arenaLocked;
    openModal('map',`<div class="eyebrow">LES TERRES ASSOUPIES</div><h2>Chaque détour est une découverte.</h2><p>${canTravel?'Le sanctuaire te relie aux terres déjà découvertes. Choisis ta destination.':'Approche un sanctuaire pour voyager vers les zones déjà découvertes.'}</p><div class="map-rooms">${(CM.ROOMS||[]).map((r,i)=>{
      const seen=visited.includes(i)||visited.includes(r.id)||i===game.roomIndex,treasures=(r.pickups||[]).filter(p=>p.type==='relic'||p.type==='charm'),found=treasures.filter(p=>game.collected.includes(p.id)).length;
      return `<article class="map-room ${i===game.roomIndex?'current':''} ${seen?'':'locked'}"><span class="map-icon">${seen?(r.bossGate?'♜':'✧'):'◇'}</span><strong>${seen?escapeHTML(r.name):'Terre inexplorée'}</strong><small>${String(i+1).padStart(2,'0')} / ${seen?escapeHTML(r.subtitle||'Passage découvert'):'Un nouveau chemin t’attend'}</small>${seen&&treasures.length?`<div class="map-treasure">✦ Trésors ${found} / ${treasures.length}${found<treasures.length?' · Un secret demeure':''}</div>`:''}${seen&&i!==game.roomIndex?`<button class="map-travel" data-travel="${i}" ${canTravel?'':'disabled'}>Voyager au sanctuaire →</button>`:''}</article>`;
    }).join('')}</div><div class="modal-footer"><span>✧ Les sanctuaires soignent et enregistrent le retour.<br><br>${game.player.doubleJump?'↟ Double saut acquis : explore les hauteurs et les murs fissurés.':'↟ Trouve les Ailes d’aurore pour revisiter les hauteurs.'}</span><button class="button primary" id="map-done">En route <span>→</span></button></div>`);
    $('map-done').onclick=closeModal;
    $('modal-content').querySelectorAll('[data-travel]').forEach(button=>button.onclick=()=>{if(game.travelTo(Number(button.dataset.travel))){saveGame();closeModal();updateHUD();}});
  }
  function showDeath(){openModal('dead',`<div class="pause-content"><div class="eyebrow">CE N’EST QU’UN CONTRETEMPS</div><div class="win-symbol">◇</div><h2>Une flamme ne s’éteint pas si vite.</h2><p>Retourne au dernier sanctuaire. Observe les signaux, ménage ton endurance et réessaie.</p><div class="pause-buttons"><button class="button primary" id="retry-button">Rallumer la flamme <span>→</span></button><button class="button ghost" id="death-title">Retour à l’accueil</button></div></div>`);$('retry-button').onclick=()=>{game.respawn();closeModal();saveGame();updateHUD();};$('death-title').onclick=title;$('retry-button').focus();}
  function showWin(){saveGame();openModal('win',`<div class="pause-content"><div class="eyebrow">POUR CHARLES, QUI N’A PAS RENONCÉ</div><div class="win-symbol">✺</div><h2>L’Aurore se lève à nouveau.</h2><p>Les cinq gardiens sont tombés. Des racines jusqu’aux étoiles, les royaumes retrouvent leur lumière.<br>Et tout cela, c’est grâce à toi.</p><div class="run-stats"><div><strong>${Math.floor(game.time/60)}:${String(Math.floor(game.time%60)).padStart(2,'0')}</strong><span>TEMPS D’AVENTURE</span></div><div><strong>${game.kills||0}</strong><span>ENNEMIS VAINCUS</span></div><div><strong>${game.deaths||0}</strong><span>RETOURS</span></div></div><div class="pause-buttons"><button class="button primary" id="win-new">Une autre voie, une autre aventure <span>→</span></button><button class="button ghost" id="win-title">Savourer la victoire</button></div></div>`);$('win-new').onclick=selectHero;$('win-title').onclick=title;$('win-new').focus();}
  function updateHUD(){
    if(!game)return;const p=game.player;
    $('save-indicator').classList.toggle('hidden',!!game.trial);
    $('hero-name').textContent=config.name+(config.assist?' · Explorateur':config.difficulty==='master'?' · Maître':'')+(game.trial?' · Défi':'');
    $('hp-text').textContent=`${Math.max(0,Math.ceil(p.hp))} / ${Math.ceil(p.maxHp)}`;
    $('health-fill').style.width=`${Math.max(0,p.hp/p.maxHp)*100}%`;
    $('stamina-fill').style.width=`${Math.max(0,p.stamina/p.maxStamina)*100}%`;
    $('shard-count').textContent=game.shards||0;
    $('flask-count').textContent=`${p.flasks} / ${p.maxFlasks}`;
    $('heal-button').disabled=!p.flasks||p.hp>=p.maxHp||!!modalMode||game.dead||game.won;
    $('heal-button').title=`F · Boire une fiole de soin (${p.skills.restoration?75:50} PV) · Recharge au sanctuaire`;
    $('charm-count').textContent=`${game.equippedCharms?.length||0}/2`;
    $('skill-badge').classList.toggle('hidden',!game.skillPoints);$('skill-badge').textContent=game.skillPoints;
    $('room-number').textContent=game.trial?'DÉFI DES GARDIENS · '+timeLabel(game.time):`${game.roomIndex<6?'I · LES TERRES ASSOUPIES':'II · LES ROYAUMES OUBLIÉS'} / ${String(game.roomIndex+1).padStart(2,'0')}`;
    $('room-name').textContent=game.room.name;$('room-subtitle').textContent=game.trial?'Ta sauvegarde d’aventure est préservée.':game.room.subtitle||'';
    $('weapon-slots').querySelectorAll('button').forEach(el=>el.classList.toggle('active',el.dataset.weapon===p.weapon));
    const boss=game.enemies.find(e=>e.type==='boss'&&e.hp>0);
    document.body.classList.toggle('boss-active',!!boss);
    $('boss-hud').classList.toggle('hidden',!boss);
    if(boss){
      const open=!!boss.weakpoint?.active,seals=boss.seals||[],meta=CM.BOSSES.find(b=>b.id===boss.bossType);
      $('boss-name').textContent=boss.name||'Le Gardien';$('boss-fill').style.width=`${Math.max(0,boss.hp/boss.maxHp)*100}%`;
      $('boss-hud').classList.toggle('exposed',open);
      $('boss-phase').textContent=`PHASE ${['I','II','III'][(boss.phase||1)-1]} / III`;
      $('boss-state').textContent=open?`✧ ${(meta?.weakpointLabel||'Point faible vulnérable').toUpperCase()}`:seals.length?`◇ SCEAUX ${seals.filter(s=>s.hp<=0).length} / ${seals.length}`:`◇ ${(meta?.openingLabel||'Guette une ouverture').toUpperCase()}`;
      $('boss-window').textContent=open?`${Math.max(0,boss.vulnerabilityTimer).toFixed(1)} s`:(seals.length?'ARMURE FERMÉE':boss.maxPoise?`PARADES ${boss.poise} / ${boss.maxPoise}`:'OBSERVE ET ESQUIVE');
      $('boss-hint').textContent=boss.actionHint||'Brise les sceaux ou pare une attaque, puis grimpe vers le point faible.';
    }
    const message=game.message;$('toast').classList.toggle('hidden',!message?.text||message.timer<=0);
    if(message?.text){$('toast-title').textContent=message.text;$('toast-sub').textContent=message.subtext||'';}
  }

  $('trial-button').onclick=()=>{sound.unlock();showTrials();};
  $('new-game').onclick=()=>{sound.unlock();selectHero();};$('continue-game').onclick=()=>start(true);$('begin-game').onclick=()=>start();$('hero-back').onclick=title;
  $('brand').onclick=e=>{e.preventDefault();if(game)showPause();else title();};$('sound-button').onclick=()=>sound.toggle();$('help-button').onclick=showHelp;$('title-help').onclick=showHelp;
  $('fullscreen-button').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('game-shell').requestFullscreen();}catch{$('fullscreen-button').title='Le plein écran n’est pas disponible dans ce navigateur';}};
  $('pause-button').onclick=showPause;$('skills-button').onclick=showSkills;$('map-button').onclick=showMap;$('charms-button').onclick=showCharms;$('modal-close').onclick=closeModal;
  $('heal-button').onclick=()=>{if(game&&!modalMode&&!game.dead&&!game.won&&game.heal()){saveGame();updateHUD();}};
  $('weapon-slots').querySelectorAll('button').forEach(el=>el.onclick=()=>{game?.setWeapon(el.dataset.weapon);updateHUD();});
  $('touch-controls').querySelectorAll('[data-input]').forEach(el=>{const release=e=>{e.preventDefault();touch[el.dataset.input]=false;};el.addEventListener('pointerdown',e=>{e.preventDefault();sound.unlock();touch[el.dataset.input]=true;el.setPointerCapture(e.pointerId);});el.addEventListener('pointerup',release);el.addEventListener('pointercancel',release);el.addEventListener('lostpointercapture',()=>touch[el.dataset.input]=false);});
  const controlled=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyQ','KeyD','KeyW','KeyZ','KeyJ','KeyX','KeyK','KeyC','ShiftLeft','ShiftRight','KeyL','KeyE','KeyF','KeyI','KeyS','Tab','KeyM','KeyP','Escape','Digit1','Digit2','Digit3'];
  window.addEventListener('keydown',e=>{
    if(modalMode && e.code==='Tab'){
      const focusable=Array.from($('modal').querySelectorAll('button:not([disabled]),select,a[href]')).filter(el=>!el.classList.contains('hidden'));const first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;
    }
    if(e.code==='Escape'){e.preventDefault();if(modalMode&&modalMode!=='dead'&&modalMode!=='win')closeModal();else if(!modalMode&&game)showPause();else if(screen==='hero')title();return;}
    if(screen!=='game')return;if(controlled.includes(e.code))e.preventDefault();if(e.repeat)return;
    if(e.code==='KeyP'){if(modalMode==='pause')closeModal();else if(!modalMode)showPause();return;}
    if(modalMode)return;
    if(e.code==='Tab'){showSkills();return;}if(e.code==='KeyM'){showMap();return;}if(e.code==='KeyI'){showCharms();return;}if(['Digit1','Digit2','Digit3'].includes(e.code)){game.setWeapon(['sword','axe','spear'][Number(e.code.slice(-1))-1]);return;}
    keys.add(e.code);sound.unlock();
  });window.addEventListener('keyup',e=>keys.delete(e.code));
  const blur=()=>{clearInput();if(game&&!modalMode&&!game.dead&&!game.won)showPause();};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur();});window.addEventListener('pagehide',saveGame);
  window.addEventListener('error',e=>{console.error('Carlus Magnus:',e.message);});
  try{renderer=new CM.Renderer($('world'));}catch(e){$('fatal-error').classList.remove('hidden');$('fatal-error').textContent='Le monde n’a pas pu être chargé. Recharge la page pour réessayer.';throw e;}
  updateSoundButton();$('continue-game').classList.toggle('hidden',!readSave());
  function frame(now){const dt=Math.min(.05,(now-lastTime)/1000||0);lastTime=now;elapsed+=dt;
    if(screen==='game'&&game){
      const controls=input();
      if(!modalMode&&!game.dead&&!game.won){let remaining=dt;while(remaining>0){const step=Math.min(remaining,1/120);game.update(step,controls);remaining-=step;if(game.dead||game.won)break;}sound.ambient(elapsed);saveClock+=dt;if(saveClock>12){saveGame();saveClock=0;}}
      if(game.events?.length){for(const ev of game.events.splice(0)){sound.play(ev.type);if(ev.type==='save')saveGame();}}
      renderer.draw(game,modalMode?0:dt);hudClock+=dt;if(hudClock>.06){updateHUD();hudClock=0;}
      if(game.dead&&modalMode!=='dead')showDeath();else if(game.won&&modalMode!=='win'){if(game.trial)showTrialWin();else showWin();}
    }else renderer.drawTitle(elapsed);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // Read-only instrumentation for reproducible QA; game state is not exposed.
  window.CarlusMagnus = Object.freeze({status:()=>({screen,modal:modalMode,room:game?.roomIndex,dead:game?.dead,won:game?.won,hero:config?.name}),version:'1.2.1'});
}
