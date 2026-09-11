const STORE_KEY = 'headWeather.v06';
const LEGACY_STORE_KEYS = ['headWeather.v05','headWeather.v04','headWeather.v03','headWeather.v02','headWeather.v01'];

const WEATHER = {
  sunny: { icon:'☀️', label:'맑음' },
  partly: { icon:'🌤️', label:'조금 흐림' },
  cloudy: { icon:'☁️', label:'흐림' },
  rain: { icon:'🌧️', label:'비' },
  storm: { icon:'⛈️', label:'폭풍' }
};

const EFFECTS = {
  better: { label:'좋아짐', icon:'↗' },
  same: { label:'비슷함', icon:'→' },
  worse: { label:'더 아픔', icon:'↘' }
};

const SIDE_EFFECTS = {
  none: { label:'불편한 점 없어요', icon:'😊' },
  sleepy: { label:'졸려요', icon:'😴' },
  dizzy: { label:'어지러워요', icon:'😵' },
  stomach: { label:'속이 불편해요', icon:'🤢' }
};

let state = loadState();
let calendarCursor = new Date();
const todayKey = toKey(new Date());
let selectedDateKey = todayKey;
let dayDraft = null;
let dayDraftOriginal = '';
let dayDraftKey = '';
let dayDraftDirty = false;
let medicationRecordDrafts = new Map();
let medicationDraftKey = '';
const medicationDirtyIds = new Set();
const medicationSaveMessages = new Map();
let detailOpenKey = '';
let detailOpen = false;
let returnToRecordDateKey = '';
let visitFormOpen = false;
let visitFormDirty = false;
let visitFormOriginal = '';
const expandedVisitIds = new Set();

function emptyState(){
  return { version:6, days:{}, medications:[], visits:[] };
}

function normalizeSideEffectEntry(raw){
  if(!raw || typeof raw!=='object') return { values:[], custom:'', customOpen:false };
  const allowed=['none','sleepy','dizzy','stomach'];
  const values=Array.isArray(raw.values) ? raw.values.filter(v=>allowed.includes(v)) : [];
  return {
    values: values.includes('none') ? ['none'] : [...new Set(values.filter(v=>v!=='none'))],
    custom: typeof raw.custom==='string' ? raw.custom : '',
    customOpen: Boolean(raw.customOpen || raw.custom)
  };
}

function loadState(){
  try {
    const current = JSON.parse(localStorage.getItem(STORE_KEY));
    if(current) return normalizeState(current);

    for(const key of LEGACY_STORE_KEYS){
      const older = JSON.parse(localStorage.getItem(key));
      if(older){
        const migrated = normalizeState(older);
        localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch(e) {
    console.warn('저장된 기록을 불러오지 못했습니다.', e);
  }
  return emptyState();
}

function normalizeState(raw){
  const next = {
    version:6,
    days: raw?.days && typeof raw.days === 'object' ? raw.days : {},
    medications: Array.isArray(raw?.medications) ? raw.medications : [],
    visits: Array.isArray(raw?.visits) ? raw.visits : []
  };

  next.medications = next.medications.map((m,index) => {
    const sideEffects={};
    if(m.sideEffects && typeof m.sideEffects==='object'){
      Object.entries(m.sideEffects).forEach(([key,value])=>sideEffects[key]=normalizeSideEffectEntry(value));
    }
    const rescueDoses={};
    if(m.rescueDoses && typeof m.rescueDoses==='object'){
      Object.entries(m.rescueDoses).forEach(([key,doses])=>{
        rescueDoses[key]=(Array.isArray(doses)?doses:[]).map((dose,doseIndex)=>({
          id: dose?.id || `${Date.now()}-${index}-${doseIndex}`,
          time: dose?.time || '',
          effect: ['better','same','worse'].includes(dose?.effect) ? dose.effect : '',
          sideEffects: normalizeSideEffectEntry(dose?.sideEffects),
          note: dose?.note || ''
        }));
      });
    }
    return {
      id: m.id || `med-${Date.now()}-${index}`,
      visitId: m.visitId || '',
      visitDate: m.visitDate || '',
      hospitalName: m.hospitalName || '',
      startDate: m.startDate || '',
      days: Math.max(1, Number(m.days || 14)),
      medName: m.medName || '',
      type: m.type==='rescue' ? 'rescue' : 'daily',
      schedule: m.schedule || '',
      nextVisitDate: m.nextVisitDate || '',
      memo: m.memo || '',
      takenDates: Array.isArray(m.takenDates) ? [...new Set(m.takenDates)] : [],
      effects: m.effects && typeof m.effects === 'object' ? m.effects : {},
      sideEffects,
      rescueDoses,
      updatedAt: m.updatedAt || ''
    };
  });

  next.visits = next.visits.map((v,index) => ({
    id: v.id || `visit-${v.medicationId || `${v.visitDate || 'unknown'}-${index}`}`,
    visitDate: v.visitDate || '',
    hospitalName: v.hospitalName || '',
    nextVisitDate: v.nextVisitDate || '',
    memo: v.memo || '',
    medicationIds: Array.isArray(v.medicationIds)
      ? v.medicationIds
      : (v.medicationId ? [v.medicationId] : []),
    legacyMedicationId: v.medicationId || null,
    updatedAt: v.updatedAt || ''
  }));

  // v0.4까지의 '진료 1건 = 약 1개' 데이터를 v0.5 방문-다중약 구조로 안전하게 연결한다.
  next.medications.forEach((med,index)=>{
    let visit = med.visitId ? next.visits.find(v=>String(v.id)===String(med.visitId)) : null;
    if(!visit){
      visit = next.visits.find(v=>
        (v.medicationIds||[]).some(id=>String(id)===String(med.id)) ||
        String(v.legacyMedicationId||'')===String(med.id)
      );
    }
    if(!visit){
      visit={
        id:`visit-migrated-${med.id || index}`,
        visitDate:med.visitDate || '',
        hospitalName:med.hospitalName || '',
        nextVisitDate:med.nextVisitDate || '',
        memo:med.memo || '',
        medicationIds:[med.id],
        legacyMedicationId:null,
        updatedAt:med.updatedAt || ''
      };
      next.visits.push(visit);
    }
    med.visitId=visit.id;
    med.visitDate=visit.visitDate || med.visitDate;
    med.hospitalName=visit.hospitalName || med.hospitalName;
    med.nextVisitDate=visit.nextVisitDate || med.nextVisitDate;
    if(!(visit.medicationIds||[]).some(id=>String(id)===String(med.id))){
      visit.medicationIds=[...(visit.medicationIds||[]),med.id];
    }
  });

  const visitMap=new Map();
  next.visits.forEach(v=>{
    const key=String(v.id);
    if(!visitMap.has(key)) visitMap.set(key,v);
    else{
      const prev=visitMap.get(key);
      prev.medicationIds=[...new Set([...(prev.medicationIds||[]),...(v.medicationIds||[])])];
    }
  });
  next.visits=[...visitMap.values()].map(v=>{
    const {legacyMedicationId,...clean}=v;
    return clean;
  });

  return next;
}

let supabaseClient = null;
let currentUser = null;
let cloudSyncTimer = null;
let cloudSyncBusy = false;
let editingVisitId = null;
const AUTH_CALLBACK_AT_LOAD = /(?:[?#&])(access_token|refresh_token|code|token_hash|type)=/i.test(window.location.href);
let authSuccessShown = false;
let authReady = false;
let lastSessionUserId = null;
let sessionResumeTimer = null;
const IS_STANDALONE = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

function accountIdleLabel(){
  return IS_STANDALONE ? '기기 저장' : '로그인';
}

function setAccountReady(ready){
  authReady=ready;
  const btn=document.getElementById('accountBtn');
  const label=document.getElementById('accountBtnLabel');
  if(btn){
    btn.disabled=!ready;
    btn.setAttribute('aria-busy', ready ? 'false' : 'true');
  }
  if(label && !ready) label.textContent='연결 확인 중…';
}

async function requestPersistentStorage(){
  try{
    if(!navigator.storage?.persist) return false;
    if(await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  }catch(err){
    console.warn('지속 저장공간 요청을 완료하지 못했습니다.',err);
    return false;
  }
}

function setAuthPanel(name){
  ['authSignedOut','authLinkSent','authSuccess','authSignedIn','authNotConfigured','authPwaNotice'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.hidden=(id!==name);
  });
}

function showLoginSuccess(email=''){
  if(authSuccessShown) return;
  authSuccessShown=true;
  document.getElementById('successEmail').textContent=email || '이 이메일';
  setAuthPanel('authSuccess');
  const dialog=document.getElementById('authDialog');
  if(!dialog.open) dialog.showModal();
  if(AUTH_CALLBACK_AT_LOAD){
    try{ history.replaceState({},document.title,window.location.pathname); }catch(e){}
  }
}

function persist(options={}){
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  if(!options.skipCloud) queueCloudSync();
}

function isSupabaseConfigured(){
  const cfg=window.HEAD_WEATHER_SUPABASE || {};
  return Boolean(cfg.url && cfg.publishableKey && window.supabase?.createClient);
}

function setSyncStatus(text, tone=''){
  const el=document.getElementById('syncStatus');
  if(el){
    el.textContent=text;
    el.dataset.tone=tone;
  }
  const label=document.getElementById('accountBtnLabel');
  if(label) label.textContent=currentUser ? (cloudSyncBusy?'동기화 중':'연동됨') : accountIdleLabel();
}

function queueCloudSync(){
  if(!currentUser || !supabaseClient) return;
  clearTimeout(cloudSyncTimer);
  setSyncStatus('변경사항 저장 중…');
  cloudSyncTimer=setTimeout(()=>pushCloudState(),700);
}

async function pushCloudState(){
  if(!currentUser || !supabaseClient || cloudSyncBusy) return;
  cloudSyncBusy=true;
  setSyncStatus('동기화 중…');
  try{
    const { error } = await supabaseClient
      .from('head_weather_data')
      .upsert({ user_id: currentUser.id, payload: state, updated_at: new Date().toISOString() }, { onConflict:'user_id' });
    if(error) throw error;
    setSyncStatus('동기화됨 ✓','ok');
  }catch(err){
    console.error('동기화 실패',err);
    setSyncStatus('동기화에 실패했어요. 이 기기에는 저장돼 있어요.','error');
  }finally{
    cloudSyncBusy=false;
    const label=document.getElementById('accountBtnLabel');
    if(label) label.textContent=currentUser ? '연동됨' : accountIdleLabel();
  }
}

function stateHasData(data){
  if(!data) return false;
  const dayHas=Object.values(data.days||{}).some(d=>d && (d.weather || d.time || d.side || (d.symptoms||[]).length || (d.triggers||[]).length || d.memo));
  return dayHas || (data.medications||[]).length>0 || (data.visits||[]).length>0;
}

function mergeStates(cloudRaw, localRaw){
  const cloud=normalizeState(cloudRaw||emptyState());
  const local=normalizeState(localRaw||emptyState());
  const merged=emptyState();
  merged.days={...cloud.days,...local.days};

  const medMap=new Map();
  cloud.medications.forEach(m=>medMap.set(String(m.id),m));
  local.medications.forEach(m=>medMap.set(String(m.id),m));
  merged.medications=[...medMap.values()];

  const visitMap=new Map();
  cloud.visits.forEach((v,i)=>visitMap.set(String(v.id || `cloud-${i}-${v.visitDate}`),v));
  local.visits.forEach((v,i)=>visitMap.set(String(v.id || `local-${i}-${v.visitDate}`),v));
  merged.visits=[...visitMap.values()];
  return normalizeState(merged);
}

async function loadCloudState(){
  if(!currentUser || !supabaseClient) return;
  setSyncStatus('계정 기록 불러오는 중…');
  try{
    const { data, error } = await supabaseClient
      .from('head_weather_data')
      .select('payload, updated_at')
      .eq('user_id',currentUser.id)
      .maybeSingle();
    if(error) throw error;

    const localHas=stateHasData(state);
    const cloudHas=stateHasData(data?.payload);

    if(!cloudHas){
      await pushCloudState();
      return;
    }

    if(!localHas){
      state=normalizeState(data.payload);
      persist({skipCloud:true});
    }else{
      const same=JSON.stringify(normalizeState(data.payload))===JSON.stringify(normalizeState(state));
      if(!same){
        const merge=confirm(`이 기기 기록과 계정 기록이 모두 있어요.\n\n확인: 두 기록을 합쳐서 동기화\n취소: 계정 기록을 이 기기로 불러오기`);
        state=merge ? mergeStates(data.payload,state) : normalizeState(data.payload);
        persist({skipCloud:true});
        if(merge) await pushCloudState();
      }
    }

    renderAll();
    setSyncStatus('동기화됨 ✓','ok');
  }catch(err){
    console.error('계정 기록 불러오기 실패',err);
    setSyncStatus('계정 기록을 불러오지 못했어요.','error');
  }
}

function renderAll(){
  if(!hasUnsavedChanges()){
    loadDayDraft(selectedDateKey,true);
    initializeMedicationRecordDrafts(true);
  }
  renderToday();
  renderCalendar();
  renderMedication();
}

async function initAccountSync(){
  setAccountReady(false);

  if(!isSupabaseConfigured()){
    setAuthPanel(IS_STANDALONE ? 'authPwaNotice' : 'authNotConfigured');
    const label=document.getElementById('accountBtnLabel');
    if(label) label.textContent=accountIdleLabel();
    setAccountReady(true);
    return;
  }

  const cfg=window.HEAD_WEATHER_SUPABASE;
  supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      storage:window.localStorage
    }
  });

  const applySession=async(session, loadCloud=true)=>{
    const nextUser=session?.user || null;
    const changedUser=nextUser?.id && nextUser.id!==lastSessionUserId;

    currentUser=nextUser;
    lastSessionUserId=nextUser?.id || null;

    setAuthPanel(currentUser ? 'authSignedIn' : (IS_STANDALONE ? 'authPwaNotice' : 'authSignedOut'));
    document.getElementById('signedInEmail').textContent=currentUser?.email || '';
    document.getElementById('accountBtnLabel').textContent=currentUser?'연동됨':accountIdleLabel();

    if(currentUser && loadCloud && changedUser){
      await loadCloudState();
    }else if(currentUser){
      setSyncStatus('연동됨 ✓','ok');
    }
  };

  const handleAuthEvent=(event,session)=>{
    // onAuthStateChange 콜백 안에서는 오래 걸리는 비동기 작업을 바로 기다리지 않는다.
    setTimeout(async()=>{
      if(event==='SIGNED_OUT'){
        await applySession(null,false);
        return;
      }

      if(event==='INITIAL_SESSION' || event==='SIGNED_IN'){
        await applySession(session,true);
        if(event==='SIGNED_IN'){
          requestPersistentStorage();
          if(AUTH_CALLBACK_AT_LOAD) showLoginSuccess(session?.user?.email);
        }
        return;
      }

      if(event==='TOKEN_REFRESHED' || event==='USER_UPDATED'){
        await applySession(session,false);
      }
    },0);
  };

  supabaseClient.auth.onAuthStateChange(handleAuthEvent);

  try{
    const { data, error }=await supabaseClient.auth.getSession();
    if(error) throw error;
    await applySession(data.session,true);
    if(data.session && AUTH_CALLBACK_AT_LOAD) showLoginSuccess(data.session.user?.email);
  }catch(err){
    console.error('기존 로그인 세션 확인 실패',err);
    // 네트워크가 잠깐 끊긴 경우를 곧바로 로그아웃으로 단정하지 않는다.
    const label=document.getElementById('accountBtnLabel');
    if(label) label.textContent='연결 확인';
    setSyncStatus('로그인 상태를 확인하지 못했어요. 연결되면 다시 확인할게요.','error');
  }finally{
    setAccountReady(true);
  }

  const resumeSession=async()=>{
    if(!supabaseClient || document.visibilityState==='hidden') return;
    clearTimeout(sessionResumeTimer);
    sessionResumeTimer=setTimeout(async()=>{
      try{
        const { data, error }=await supabaseClient.auth.getSession();
        if(error) throw error;
        await applySession(data.session,false);

        const session=data.session;
        const expiresAt=(session?.expires_at || 0)*1000;
        const remaining=expiresAt-Date.now();

        // 홈 화면 앱이 오래 백그라운드에 있었다가 돌아온 경우,
        // 만료가 임박했으면 refresh token으로 바로 갱신한다.
        if(session && remaining>0 && remaining<5*60*1000){
          const { data: refreshed, error: refreshError }=await supabaseClient.auth.refreshSession(session);
          if(refreshError) throw refreshError;
          if(refreshed?.session) await applySession(refreshed.session,false);
        }
      }catch(err){
        console.warn('앱 복귀 후 세션 재확인 실패',err);
        if(currentUser){
          setSyncStatus('연결을 다시 확인하는 중이에요. 기록은 이 기기에 남아 있어요.','error');
        }
      }
    },120);
  };

  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible') resumeSession();
  });
  window.addEventListener('pageshow',resumeSession);
  window.addEventListener('online',resumeSession);
}

function ensureDay(key=selectedDateKey){
  if(!state.days[key]) state.days[key] = { symptoms:[], triggers:[] };
  if(!Array.isArray(state.days[key].symptoms)) state.days[key].symptoms = [];
  if(!Array.isArray(state.days[key].triggers)) state.days[key].triggers = [];
  return state.days[key];
}

function cloneData(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizedDay(raw={}){
  return {
    weather: raw.weather || '',
    time: raw.time || '',
    side: raw.side || '',
    symptoms: Array.isArray(raw.symptoms) ? [...raw.symptoms] : [],
    triggers: Array.isArray(raw.triggers) ? [...raw.triggers] : [],
    memo: typeof raw.memo==='string' ? raw.memo : '',
    ...(raw.updatedAt ? {updatedAt:raw.updatedAt} : {})
  };
}

function dayRecordHasContent(day){
  return Boolean(day && (day.weather || day.time || day.side || (day.symptoms||[]).length || (day.triggers||[]).length || day.memo));
}

function dayHasDetails(day){
  return Boolean(day && (day.time || day.side || (day.symptoms||[]).length || (day.triggers||[]).length || day.memo));
}

function loadDayDraft(key=selectedDateKey, force=false){
  if(!force && dayDraft && dayDraftKey===key) return dayDraft;
  dayDraft=normalizedDay(state.days[key] || {});
  dayDraftOriginal=JSON.stringify(dayDraft);
  dayDraftKey=key;
  dayDraftDirty=false;
  detailOpenKey=key;
  detailOpen=dayHasDetails(state.days[key]);
  return dayDraft;
}

function updateDayDirty(){
  dayDraftDirty=Boolean(dayDraft) && JSON.stringify(dayDraft)!==dayDraftOriginal;
  updateRecordSaveState();
}

function hasUnsavedChanges(){
  return dayDraftDirty || medicationDirtyIds.size>0 || visitFormDirty;
}

function confirmDiscardChanges(){
  if(!hasUnsavedChanges()) return true;
  return confirm('저장하지 않은 변경사항이 있어요.\n\n확인: 저장하지 않고 이동\n취소: 계속 작성');
}

function discardDraftChanges(){
  loadDayDraft(selectedDateKey,true);
  medicationDraftKey='';
  medicationRecordDrafts.clear();
  medicationDirtyIds.clear();
  medicationSaveMessages.clear();
  if(visitFormDirty) resetMedicationForm();
}

function toKey(date){
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,'0');
  const d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}

function parseLocal(key){
  if(!key) return null;
  const [y,m,d]=key.split('-').map(Number);
  return new Date(y,m-1,d);
}

function fmtDate(date){
  return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(date);
}

function fmtShort(key){
  const d=parseLocal(key);
  return d ? new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric'}).format(d) : '-';
}

function dateDiffDays(a,b){
  if(!a || !b) return 0;
  return Math.floor((new Date(a.getFullYear(),a.getMonth(),a.getDate()) - new Date(b.getFullYear(),b.getMonth(),b.getDate())) / 86400000);
}

function addDays(date, days){
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate()+days);
  return d;
}

function escapeHtml(str=''){
  return String(str).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function updateRecordSaveState(){
  const btn=document.getElementById('saveRecordBtn');
  const note=document.getElementById('recordSaveNote');
  if(!btn || !note) return;
  const date=parseLocal(selectedDateKey) || new Date();
  const isToday=selectedDateKey===todayKey;
  const stored=dayRecordHasContent(state.days[selectedDateKey]);
  btn.textContent=isToday?'오늘 기록 저장':`${date.getMonth()+1}월 ${date.getDate()}일 기록 저장`;
  btn.disabled=!dayDraftDirty;
  btn.classList.remove('saved');
  note.classList.toggle('saved',!dayDraftDirty && stored);
  note.classList.toggle('unsaved',dayDraftDirty);
  if(dayDraftDirty) note.textContent='저장하지 않은 변경사항이 있어요.';
  else if(stored) note.textContent='이 날짜에 저장된 기록이 있어요 ✓';
  else note.textContent='선택한 내용은 저장 버튼을 눌러야 기록돼요.';
}

function syncDetailPanel(){
  const panel=document.getElementById('detailsPanel');
  if(!panel) return;
  if(detailOpenKey!==selectedDateKey){
    detailOpenKey=selectedDateKey;
    detailOpen=dayHasDetails(state.days[selectedDateKey]);
  }
  panel.hidden=!detailOpen;
  document.getElementById('detailToggle').setAttribute('aria-expanded',String(detailOpen));
  document.getElementById('detailChevron').textContent=detailOpen?'⌃':'⌄';
}

function renderToday(){
  const recordDate=parseLocal(selectedDateKey) || new Date();
  const isToday=selectedDateKey===todayKey;
  const yesterdayKey=toKey(addDays(parseLocal(todayKey),-1));
  const day=loadDayDraft(selectedDateKey);
  document.getElementById('recordContext').textContent=isToday?'오늘 기록':(selectedDateKey===yesterdayKey?'어제 기록':'지난날 기록');
  document.getElementById('todayDate').textContent = fmtDate(recordDate);
  document.getElementById('todayTitle').textContent = isToday ? '오늘 머리 날씨는 어때요?' : '이날 머리 날씨는 어땠나요?';
  document.getElementById('todaySubcopy').textContent = isToday
    ? '길게 쓰지 않아도 괜찮아요. 오늘 상태만 남겨두세요.'
    : '기억나는 만큼만 남겨도 괜찮아요. 지난 기록도 언제든 수정할 수 있어요.';
  document.getElementById('recordYesterday').hidden=!isToday;
  document.getElementById('backToToday').hidden=isToday;
  document.getElementById('recordNavLabel').textContent=isToday?'오늘':'기록';
  document.getElementById('medTodayEyebrow').textContent=isToday?'오늘의 약':'이날의 약';

  document.querySelectorAll('.weather-btn').forEach(btn=>{
    const selected=btn.dataset.weather===day.weather;
    btn.classList.toggle('selected',selected);
    btn.setAttribute('aria-pressed',String(selected));
  });

  document.querySelectorAll('.chip-row[data-group]').forEach(row=>{
    const group=row.dataset.group;
    row.querySelectorAll('.chip').forEach(chip=>{
      const value=chip.dataset.value;
      const active = row.classList.contains('multi') ? (day[group]||[]).includes(value) : day[group]===value;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed',String(active));
    });
  });

  document.getElementById('memoInput').value = day.memo || '';
  syncDetailPanel();
  updateRecordSaveState();
  renderMedToday();
  renderThirtyDaySummary();
}

function saveFlash(text='저장했어요 ✓'){
  const el=document.getElementById('saveStatus');
  el.textContent=text;
  clearTimeout(saveFlash.t);
  saveFlash.t=setTimeout(()=>el.textContent='',2200);
}

document.querySelectorAll('.weather-btn').forEach(btn=>btn.addEventListener('click',()=>{
  const day=loadDayDraft(selectedDateKey);
  day.weather=btn.dataset.weather;
  updateDayDirty();
  renderToday();
}));

document.querySelectorAll('.chip-row[data-group]').forEach(row=>row.addEventListener('click',e=>{
  const chip=e.target.closest('.chip');
  if(!chip) return;
  const day=loadDayDraft(selectedDateKey), group=row.dataset.group, value=chip.dataset.value;

  if(row.classList.contains('multi')){
    day[group]=day[group]||[];
    day[group]=day[group].includes(value) ? day[group].filter(v=>v!==value) : [...day[group],value];
  } else {
    day[group]=day[group]===value ? '' : value;
  }

  updateDayDirty();
  renderToday();
}));

document.getElementById('memoInput').addEventListener('input',e=>{
  loadDayDraft(selectedDateKey).memo=e.target.value;
  updateDayDirty();
});

document.getElementById('saveRecordBtn').addEventListener('click',()=>{
  const day=loadDayDraft(selectedDateKey);
  if(!day.weather){
    document.getElementById('recordSaveNote').textContent='머리날씨를 하나 선택하면 기록할 수 있어요.';
    document.getElementById('recordSaveNote').classList.remove('saved');
    document.querySelector('.weather-grid')?.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  state.days[selectedDateKey]={...cloneData(day),updatedAt:new Date().toISOString()};
  persist();
  dayDraft=normalizedDay(state.days[selectedDateKey]);
  dayDraftOriginal=JSON.stringify(dayDraft);
  dayDraftDirty=false;
  renderCalendar();
  renderThirtyDaySummary();
  const dateLabel=fmtDate(parseLocal(selectedDateKey));
  const btn=document.getElementById('saveRecordBtn');
  const note=document.getElementById('recordSaveNote');
  btn.textContent='저장 완료 ✓';
  btn.classList.add('saved');
  btn.disabled=true;
  note.textContent=`${dateLabel} 기록을 저장했어요 ✓`;
  note.classList.add('saved');
  note.classList.remove('unsaved');
  clearTimeout(saveRecordBtnReset);
  saveRecordBtnReset=setTimeout(()=>{
    updateRecordSaveState();
  },2200);
});
let saveRecordBtnReset;

document.getElementById('detailToggle').addEventListener('click',()=>{
  detailOpen=!detailOpen;
  detailOpenKey=selectedDateKey;
  syncDetailPanel();
});

function medicationRange(med){
  if(med.type==='rescue') return null;
  const start=parseLocal(med.startDate);
  if(!start) return null;
  const end=addDays(start, med.days-1);
  return {start,end};
}

function activeDailyMedications(dateKey=todayKey){
  const target=parseLocal(dateKey);
  if(!target) return [];
  return state.medications.filter(m=>{
    if(m.type!=='daily') return false;
    const range=medicationRange(m);
    return range && target>=range.start && target<=range.end;
  });
}

function activeRescueMedications(dateKey=todayKey){
  const target=parseLocal(dateKey);
  if(!target) return [];
  return state.medications.filter(m=>{
    if(m.type!=='rescue') return false;
    const start=parseLocal(m.startDate);
    return start && target>=start;
  });
}

function elapsedPrescriptionDays(med, dateKey=todayKey){
  if(med.type!=='daily') return 0;
  const start=parseLocal(med.startDate);
  const target=parseLocal(dateKey);
  if(!start || !target) return 0;
  const diff=dateDiffDays(target, start)+1;
  return Math.max(0, Math.min(med.days, diff));
}

function ensureDailySideEffect(med,key){
  med.sideEffects=med.sideEffects||{};
  if(!med.sideEffects[key]) med.sideEffects[key]=normalizeSideEffectEntry(null);
  return med.sideEffects[key];
}

function findRescueDose(med,key,doseId){
  return (med.rescueDoses?.[key]||[]).find(d=>String(d.id)===String(doseId));
}

function sideEffectEntryFor(med,key,doseId='',create=false){
  if(doseId){
    const dose=findRescueDose(med,key,doseId);
    if(!dose) return null;
    if(create && !dose.sideEffects) dose.sideEffects=normalizeSideEffectEntry(null);
    return dose.sideEffects || normalizeSideEffectEntry(null);
  }
  if(create) return ensureDailySideEffect(med,key);
  return med.sideEffects?.[key] || normalizeSideEffectEntry(null);
}

function sideEffectControlsHtml(med,entry,doseId=''){
  const current=normalizeSideEffectEntry(entry);
  const attrs=`data-med-id="${escapeHtml(med.id)}" ${doseId?`data-dose-id="${escapeHtml(doseId)}"`:''}`;
  const chips=Object.entries(SIDE_EFFECTS).map(([key,item])=>`
    <button class="chip side-effect-chip ${current.values.includes(key)?'active':''}" type="button" data-side-effect="${key}" aria-pressed="${current.values.includes(key)}" ${attrs}>${item.icon} ${item.label}</button>
  `).join('');
  const customOpen=current.customOpen || Boolean(current.custom);
  return `
    <div class="side-effect-box">
      <p class="field-label">복용 후 불편한 점이 있었나요?</p>
      <div class="chip-row side-effect-row">
        ${chips}
        <button class="chip ${customOpen?'active':''}" type="button" data-action="toggle-custom-side-effect" aria-pressed="${customOpen}" ${attrs}>✏️ 직접 적기</button>
      </div>
      <div class="custom-side-effect" ${customOpen?'':'hidden'}>
        <input class="side-effect-custom-input" type="text" maxlength="80" placeholder="예: 입이 너무 말랐어요" value="${escapeHtml(current.custom)}" ${attrs} />
      </div>
      <p class="microcopy">약 때문에 생겼다고 단정하지 않고, 복용 뒤 함께 느낀 불편함만 기록해요.</p>
    </div>
  `;
}

function medicationDraftPayload(draft){
  if(!draft) return null;
  return draft.type==='daily'
    ? {type:'daily',taken:Boolean(draft.taken),sideEffects:normalizeSideEffectEntry(draft.sideEffects)}
    : {type:'rescue',doses:cloneData(draft.doses||[])};
}

function createMedicationRecordDraft(med){
  const payload=med.type==='daily'
    ? {
        type:'daily',
        taken:(med.takenDates||[]).includes(selectedDateKey),
        sideEffects:normalizeSideEffectEntry(med.sideEffects?.[selectedDateKey])
      }
    : {
        type:'rescue',
        doses:cloneData(med.rescueDoses?.[selectedDateKey]||[]).map(dose=>({
          ...dose,
          sideEffects:normalizeSideEffectEntry(dose.sideEffects)
        }))
      };
  return {...payload,_original:JSON.stringify(payload)};
}

function initializeMedicationRecordDrafts(force=false){
  if(!force && medicationDraftKey===selectedDateKey) return;
  medicationRecordDrafts=new Map();
  [...activeDailyMedications(selectedDateKey),...activeRescueMedications(selectedDateKey)].forEach(med=>{
    medicationRecordDrafts.set(String(med.id),createMedicationRecordDraft(med));
  });
  medicationDraftKey=selectedDateKey;
  medicationDirtyIds.clear();
  medicationSaveMessages.clear();
}

function medicationRecordDraft(med){
  initializeMedicationRecordDrafts();
  const key=String(med.id);
  if(!medicationRecordDrafts.has(key)) medicationRecordDrafts.set(key,createMedicationRecordDraft(med));
  return medicationRecordDrafts.get(key);
}

function markMedicationDirty(medId){
  const key=String(medId);
  const draft=medicationRecordDrafts.get(key);
  if(!draft) return;
  const changed=JSON.stringify(medicationDraftPayload(draft))!==draft._original;
  if(changed) medicationDirtyIds.add(key);
  else medicationDirtyIds.delete(key);
  medicationSaveMessages.delete(key);
}

function sideEffectInlineSummary(raw){
  const entry=normalizeSideEffectEntry(raw);
  const labels=entry.values.map(key=>SIDE_EFFECTS[key]?.label).filter(Boolean);
  if(entry.custom) labels.push(entry.custom);
  return labels.join(' · ');
}

function medicationStatusText(med,draft,dayWord){
  const key=String(med.id);
  if(medicationSaveMessages.has(key)) return medicationSaveMessages.get(key);
  if(medicationDirtyIds.has(key)) return '저장하지 않은 변경사항이 있어요.';
  if(draft.type==='daily' && draft.taken){
    const side=sideEffectInlineSummary(draft.sideEffects);
    return `${dayWord} 복용 완료${side?` · ${side}`:''}`;
  }
  if(draft.type==='rescue' && draft.doses.length) return `${dayWord} ${draft.doses.length}회 복용 기록 저장됨`;
  return '복용 내용을 선택한 뒤 저장해 주세요.';
}

function medicationSaveAreaHtml(med,draft,dayWord){
  const key=String(med.id);
  const dirty=medicationDirtyIds.has(key);
  const status=medicationStatusText(med,draft,dayWord);
  return `
    <div class="med-record-save-area">
      <button class="primary med-record-save" type="button" data-action="save-medication-draft" data-med-id="${escapeHtml(med.id)}" ${dirty?'':'disabled'}>복약 기록 저장</button>
      <p class="med-save-status ${dirty?'unsaved':''} ${medicationSaveMessages.has(key)?'saved':''}" aria-live="polite">${escapeHtml(status)}</p>
    </div>`;
}

function renderMedToday(){
  const container=document.getElementById('medTodayContent');
  if(!container) return;
  initializeMedicationRecordDrafts();
  const daily=activeDailyMedications(selectedDateKey);
  const rescue=activeRescueMedications(selectedDateKey);
  const day=loadDayDraft(selectedDateKey);
  const dayWord=selectedDateKey===todayKey?'오늘':'이날';
  const showRescue=Boolean(day.weather && day.weather!=='sunny');
  const registerLabel=selectedDateKey===todayKey?'먹은 약 등록하기':'이날 먹은 약 등록하기';

  const dailyHtml=daily.length ? `
    <div class="med-today-section">
      <div class="med-section-title"><span>💊</span><div><strong>매일 먹는 약</strong><small>꾸준히 먹는 약</small></div></div>
      <div class="med-today-list">
        ${daily.map(med=>{
          const draft=medicationRecordDraft(med);
          const taken=draft.taken;
          const elapsed=elapsedPrescriptionDays(med,selectedDateKey);
          const recordDate=parseLocal(selectedDateKey);
          const storedTaken=(med.takenDates||[]).filter(key=>key!==selectedDateKey);
          const takenUntil=[...storedTaken,...(taken?[selectedDateKey]:[])].filter(key=>{
            const d=parseLocal(key); return d && d<=recordDate && d>=parseLocal(med.startDate);
          }).length;
          return `
            <div class="med-today-item ${taken?'is-taken':''}">
              <div class="med-today-item-head">
                <div><strong>${escapeHtml(med.medName || '매일 먹는 약')}</strong>${med.schedule?`<span class="med-schedule">${escapeHtml(med.schedule)}</span>`:''}<small>${taken?`${dayWord} 복용 선택 · ${takenUntil}/${elapsed}일`:`${dayWord} 복용 체크 전 · ${takenUntil}/${elapsed}일`}</small></div>
                <button class="${taken?'secondary':'primary'} small med-take-action" type="button" data-action="toggle-daily-dose" data-med-id="${escapeHtml(med.id)}" aria-pressed="${taken}">${taken?`${dayWord} 복용 선택 취소`:`${dayWord} 먹었어요`}</button>
              </div>
              ${taken?sideEffectControlsHtml(med,draft.sideEffects):''}
              ${medicationSaveAreaHtml(med,draft,dayWord)}
            </div>
          `;
        }).join('')}
      </div>
    </div>` : `
    <div class="med-empty-line"><span>💊</span><div><strong>매일 먹는 약</strong><small>${dayWord} 해당하는 처방이 없어요.</small><button class="secondary tiny med-register-link" type="button" data-action="register-medication-for-date">${registerLabel}</button></div></div>`;

  let rescueHtml='';
  if(showRescue){
    rescueHtml=rescue.length ? `
      <div class="med-today-section rescue-section">
        <div class="med-section-title"><span>🌧️</span><div><strong>머리 아플 때 먹는 약</strong><small>필요할 때만 기록해요</small></div></div>
        <div class="med-today-list">
          ${rescue.map(med=>{
            const draft=medicationRecordDraft(med);
            const doses=draft.doses;
            return `
              <div class="med-today-item rescue-med-item">
                <div class="med-today-item-head">
                  <div><strong>${escapeHtml(med.medName || '두통약')}</strong><small>${doses.length?`${dayWord} ${doses.length}회 복용 기록`:'아직 복용 기록 없음'}</small></div>
                  <button class="primary small" type="button" data-action="add-rescue-dose" data-med-id="${escapeHtml(med.id)}">복용 기록 +</button>
                </div>
                ${doses.map((dose,index)=>`
                  <div class="rescue-dose-card" data-dose-card="${escapeHtml(dose.id)}">
                    <div class="rescue-dose-head"><strong>${index+1}회 복용</strong><button class="danger-link" type="button" data-action="remove-rescue-dose" data-med-id="${escapeHtml(med.id)}" data-dose-id="${escapeHtml(dose.id)}">삭제</button></div>
                    <label class="dose-time-label"><span>복용 시간</span><input class="rescue-dose-time" type="time" value="${escapeHtml(dose.time||'')}" data-med-id="${escapeHtml(med.id)}" data-dose-id="${escapeHtml(dose.id)}" /></label>
                    <div class="dose-effect-box">
                      <p class="field-label">먹고 나서 머리는 어땠나요?</p>
                      <div class="chip-row effect-row rescue-effect-row">
                        ${Object.entries(EFFECTS).map(([key,item])=>`<button class="chip ${dose.effect===key?'active':''}" type="button" data-rescue-effect="${key}" aria-pressed="${dose.effect===key}" data-med-id="${escapeHtml(med.id)}" data-dose-id="${escapeHtml(dose.id)}">${item.label}</button>`).join('')}
                      </div>
                    </div>
                    ${sideEffectControlsHtml(med,dose.sideEffects,dose.id)}
                  </div>
                `).join('')}
                ${medicationSaveAreaHtml(med,draft,dayWord)}
              </div>
            `;
          }).join('')}
        </div>
      </div>` : `
      <div class="med-empty-line rescue-empty"><span>🌧️</span><div><strong>머리 아플 때 먹는 약</strong><small>병원 기록에서 필요할 때 먹는 약을 등록하면 여기에 보여요.</small>${daily.length?`<button class="secondary tiny med-register-link" type="button" data-action="register-medication-for-date">두통약 등록하기</button>`:''}</div></div>`;
  }

  if(!daily.length && !showRescue){
    container.innerHTML=`${dailyHtml}<p class="med-context-note">머리날씨가 흐림 이상인 날에는 필요 시 두통약 기록도 여기에서 할 수 있어요.</p>`;
  }else{
    container.innerHTML=dailyHtml+rescueHtml;
  }
}

function currentTimeValue(){
  const d=new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function applySideEffectChoice(entry,key){
  entry.values=Array.isArray(entry.values)?entry.values:[];
  if(key==='none'){
    entry.values=entry.values.includes('none')?[]:['none'];
    if(entry.values.includes('none')){
      entry.custom='';
      entry.customOpen=false;
    }
  }else{
    entry.values=entry.values.filter(v=>v!=='none');
    entry.values=entry.values.includes(key) ? entry.values.filter(v=>v!==key) : [...entry.values,key];
  }
}

document.getElementById('medTodayCard').addEventListener('click',e=>{
  const actionBtn=e.target.closest('[data-action]');
  const sideBtn=e.target.closest('[data-side-effect]');
  const effectBtn=e.target.closest('[data-rescue-effect]');

  if(sideBtn){
    const med=state.medications.find(m=>String(m.id)===String(sideBtn.dataset.medId));
    if(!med) return;
    const draft=medicationRecordDraft(med);
    const entry=sideBtn.dataset.doseId
      ? draft.doses.find(d=>String(d.id)===String(sideBtn.dataset.doseId))?.sideEffects
      : draft.sideEffects;
    if(!entry) return;
    applySideEffectChoice(entry,sideBtn.dataset.sideEffect);
    markMedicationDirty(med.id);
    renderMedToday();
    return;
  }

  if(effectBtn){
    const med=state.medications.find(m=>String(m.id)===String(effectBtn.dataset.medId));
    const draft=med && medicationRecordDraft(med);
    const dose=draft?.doses?.find(d=>String(d.id)===String(effectBtn.dataset.doseId));
    if(!dose) return;
    dose.effect=dose.effect===effectBtn.dataset.rescueEffect?'':effectBtn.dataset.rescueEffect;
    markMedicationDirty(med.id);
    renderMedToday();
    return;
  }

  if(!actionBtn) return;
  const med=state.medications.find(m=>String(m.id)===String(actionBtn.dataset.medId));

  if(actionBtn.dataset.action==='toggle-daily-dose' && med){
    const draft=medicationRecordDraft(med);
    draft.taken=!draft.taken;
    if(!draft.taken) draft.sideEffects=normalizeSideEffectEntry(null);
    markMedicationDirty(med.id);
    renderMedToday();
    return;
  }

  if(actionBtn.dataset.action==='add-rescue-dose' && med){
    const draft=medicationRecordDraft(med);
    draft.doses.push({
      id:`dose-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      time:selectedDateKey===todayKey?currentTimeValue():'',
      effect:'',
      sideEffects:normalizeSideEffectEntry(null),
      note:''
    });
    markMedicationDirty(med.id);
    renderMedToday();
    return;
  }

  if(actionBtn.dataset.action==='remove-rescue-dose' && med){
    const draft=medicationRecordDraft(med);
    draft.doses=draft.doses.filter(d=>String(d.id)!==String(actionBtn.dataset.doseId));
    markMedicationDirty(med.id);
    renderMedToday();
    return;
  }

  if(actionBtn.dataset.action==='toggle-custom-side-effect' && med){
    const draft=medicationRecordDraft(med);
    const entry=actionBtn.dataset.doseId
      ? draft.doses.find(d=>String(d.id)===String(actionBtn.dataset.doseId))?.sideEffects
      : draft.sideEffects;
    if(!entry) return;
    entry.customOpen=!entry.customOpen;
    if(entry.customOpen){
      entry.values=(entry.values||[]).filter(v=>v!=='none');
    }else if(!entry.custom){
      entry.custom='';
    }
    markMedicationDirty(med.id);
    renderMedToday();
    if(entry.customOpen){
      requestAnimationFrame(()=>{
        const input=document.querySelector(`.side-effect-custom-input[data-med-id="${CSS.escape(String(med.id))}"]${actionBtn.dataset.doseId?`[data-dose-id="${CSS.escape(String(actionBtn.dataset.doseId))}"]`:':not([data-dose-id])'}`);
        input?.focus();
      });
    }
    return;
  }

  if(actionBtn.dataset.action==='save-medication-draft' && med){
    const draft=medicationRecordDraft(med);
    if(draft.type==='daily'){
      med.takenDates=med.takenDates||[];
      med.sideEffects=med.sideEffects||{};
      if(draft.taken){
        if(!med.takenDates.includes(selectedDateKey)) med.takenDates=[...med.takenDates,selectedDateKey];
        med.sideEffects[selectedDateKey]=normalizeSideEffectEntry(draft.sideEffects);
      }else{
        med.takenDates=med.takenDates.filter(key=>key!==selectedDateKey);
        delete med.sideEffects[selectedDateKey];
        if(med.effects) delete med.effects[selectedDateKey];
      }
    }else{
      med.rescueDoses=med.rescueDoses||{};
      if(draft.doses.length) med.rescueDoses[selectedDateKey]=cloneData(draft.doses);
      else delete med.rescueDoses[selectedDateKey];
    }
    med.updatedAt=new Date().toISOString();
    persist();
    draft._original=JSON.stringify(medicationDraftPayload(draft));
    medicationDirtyIds.delete(String(med.id));
    const date=parseLocal(selectedDateKey);
    medicationSaveMessages.set(String(med.id),`${date.getMonth()+1}월 ${date.getDate()}일 복약 기록을 저장했어요 ✓`);
    renderMedToday(); renderMedication(); renderCalendar(); renderThirtyDaySummary();
    setTimeout(()=>{
      if(medicationSaveMessages.delete(String(med.id))) renderMedToday();
    },2600);
    return;
  }

  if(actionBtn.dataset.action==='register-medication-for-date'){
    returnToRecordDateKey=selectedDateKey;
    resetMedicationForm();
    document.getElementById('visitDate').value=selectedDateKey;
    medicationDrafts=[newMedicationDraft('daily')];
    medicationDrafts[0].startDate=selectedDateKey;
    renderMedicationFormRows();
    setVisitFormBaseline();
    document.getElementById('cancelMedicationEdit').hidden=false;
    document.getElementById('cancelMedicationEdit').textContent='약 등록 취소';
    showView('medView');
    setVisitFormOpen(true,{scroll:true});
  }
});

document.getElementById('medTodayCard').addEventListener('input',e=>{
  const input=e.target.closest('.side-effect-custom-input');
  if(!input) return;
  const med=state.medications.find(m=>String(m.id)===String(input.dataset.medId));
  if(!med) return;
  const draft=medicationRecordDraft(med);
  const entry=input.dataset.doseId
    ? draft.doses.find(d=>String(d.id)===String(input.dataset.doseId))?.sideEffects
    : draft.sideEffects;
  if(!entry) return;
  entry.custom=input.value;
  entry.customOpen=true;
  entry.values=(entry.values||[]).filter(v=>v!=='none');
  markMedicationDirty(med.id);
  const saveBtn=document.querySelector(`[data-action="save-medication-draft"][data-med-id="${CSS.escape(String(med.id))}"]`);
  if(saveBtn) saveBtn.disabled=false;
  const status=saveBtn?.parentElement?.querySelector('.med-save-status');
  if(status){
    status.textContent='저장하지 않은 변경사항이 있어요.';
    status.classList.add('unsaved');
    status.classList.remove('saved');
  }
});

document.getElementById('medTodayCard').addEventListener('change',e=>{
  const input=e.target.closest('.rescue-dose-time');
  if(!input) return;
  const med=state.medications.find(m=>String(m.id)===String(input.dataset.medId));
  const draft=med && medicationRecordDraft(med);
  const dose=draft?.doses?.find(d=>String(d.id)===String(input.dataset.doseId));
  if(!dose) return;
  dose.time=input.value;
  markMedicationDirty(med.id);
  renderMedToday();
});

function hasMedicationRecordOnDate(key){
  const dailyTaken=state.medications.some(m=>m.type==='daily' && (m.takenDates||[]).includes(key));
  const rescueTaken=state.medications.some(m=>m.type==='rescue' && (m.rescueDoses?.[key]||[]).length>0);
  return dailyTaken || rescueTaken;
}

function calendarDateLabel(date,key,rec,isFuture){
  const full=new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(date);
  if(isFuture) return `${full}, 미래 날짜`;
  const bits=[];
  if(rec?.weather) bits.push(WEATHER[rec.weather].label);
  if(hasMedicationRecordOnDate(key)) bits.push('복약 기록 있음');
  if(!bits.length) bits.push('기록 없음');
  return `${full}, ${bits.join(', ')}`;
}

function renderCalendar(){
  const grid=document.getElementById('calendarGrid');
  if(!grid) return;
  const y=calendarCursor.getFullYear(), m=calendarCursor.getMonth();
  document.getElementById('monthLabel').textContent=`${y}년 ${m+1}월`;
  const currentMonthButton=document.getElementById('currentMonth');
  const now=new Date();
  currentMonthButton.hidden=y===now.getFullYear() && m===now.getMonth();
  const first=new Date(y,m,1), start=new Date(y,m,1-first.getDay());
  grid.innerHTML='';
  const counts={sunny:0,partly:0,cloudy:0,rain:0,storm:0};
  const medicationDays=new Set();
  let rescueDoseCount=0;

  for(let i=0;i<42;i++){
    const d=new Date(start);
    d.setDate(start.getDate()+i);
    const key=toKey(d), rec=state.days[key];
    if(d.getMonth()===m && rec?.weather) counts[rec.weather]++;
    if(d.getMonth()===m && hasMedicationRecordOnDate(key)) medicationDays.add(key);
    if(d.getMonth()===m){
      state.medications.filter(med=>med.type==='rescue').forEach(med=>{
        rescueDoseCount+=(med.rescueDoses?.[key]||[]).length;
      });
    }
    const cell=document.createElement('button');
    const isFuture=d > parseLocal(todayKey);
    const medMarker=hasMedicationRecordOnDate(key)?'<span class="med-marker" title="복약 기록 있음">💊</span>':'';
    cell.className='day'+(d.getMonth()!==m?' other':'')+(key===todayKey?' today':'')+(key===selectedDateKey?' selected':'')+(isFuture?' future':'');
    cell.innerHTML=`<span class="num">${d.getDate()}</span>${rec?.weather?`<span class="weather-icon">${WEATHER[rec.weather].icon}</span>`:''}${medMarker}`;
    const accessibleLabel=calendarDateLabel(d,key,rec,isFuture);
    cell.setAttribute('aria-label',accessibleLabel);
    cell.title=accessibleLabel;
    cell.disabled=isFuture;
    if(!isFuture) cell.addEventListener('click',()=>openRecordDate(key));
    grid.appendChild(cell);
  }

  const total=Object.values(counts).reduce((a,b)=>a+b,0);
  const headacheDays=counts.cloudy+counts.rain+counts.storm;
  document.getElementById('monthSummary').innerHTML=`
    <h3>${m+1}월의 머리날씨</h3>
    ${total
      ? `<div class="summary-chips">${Object.entries(counts).filter(([,n])=>n).map(([k,n])=>`<span class="summary-pill">${WEATHER[k].icon} ${WEATHER[k].label} ${n}일</span>`).join('')}</div>`
      : '<p class="muted compact">이 달에는 아직 머리날씨 기록이 없어요.</p>'}
    <div class="month-stat-grid">
      <div class="month-stat"><strong>${total}일</strong><span>기록한 날</span></div>
      <div class="month-stat"><strong>${headacheDays}일</strong><span>두통이 있었던 날</span></div>
      <div class="month-stat"><strong>${medicationDays.size}일</strong><span>약을 복용한 날</span></div>
      <div class="month-stat"><strong>${rescueDoseCount}회</strong><span>필요 시 약 복용</span></div>
    </div>
  `;
}

function showView(viewId){
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===viewId));
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===viewId));
  if(viewId==='calendarView') renderCalendar();
  if(viewId==='medView') renderMedication();
}

function openRecordDate(key){
  const target=parseLocal(key);
  if(!target || target > parseLocal(todayKey)) return;
  if(key!==selectedDateKey && !confirmDiscardChanges()) return;
  if(key!==selectedDateKey) discardDraftChanges();
  selectedDateKey=key;
  loadDayDraft(key,true);
  initializeMedicationRecordDrafts(true);
  renderToday();
  renderCalendar();
  showView('todayView');
}

document.getElementById('backToToday').addEventListener('click',()=>{
  if(!confirmDiscardChanges()) return;
  discardDraftChanges();
  selectedDateKey=todayKey;
  calendarCursor=new Date();
  loadDayDraft(todayKey,true);
  initializeMedicationRecordDrafts(true);
  renderToday();
  renderCalendar();
});

document.getElementById('recordYesterday').addEventListener('click',()=>{
  const yesterday=toKey(addDays(parseLocal(todayKey),-1));
  openRecordDate(yesterday);
});

document.getElementById('prevMonth').addEventListener('click',()=>{
  calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);
  renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click',()=>{
  calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);
  renderCalendar();
});

document.getElementById('currentMonth').addEventListener('click',()=>{
  calendarCursor=new Date();
  renderCalendar();
});

function medEffectIcon(med,key){
  const doses=med.rescueDoses?.[key]||[];
  if(doses.some(d=>d.effect==='better')) return '↗';
  if(doses.some(d=>d.effect==='same')) return '→';
  if(doses.some(d=>d.effect==='worse')) return '↘';
  return '';
}

function sideEffectSummary(entries){
  const counts={sleepy:0,dizzy:0,stomach:0,none:0};
  const custom=[];
  entries.forEach(raw=>{
    const entry=normalizeSideEffectEntry(raw);
    entry.values.forEach(v=>{ if(counts[v]!==undefined) counts[v]++; });
    if(entry.custom && !custom.includes(entry.custom)) custom.push(entry.custom);
  });
  const parts=[];
  if(counts.none) parts.push(`불편함 없음 ${counts.none}회`);
  if(counts.sleepy) parts.push(`졸림 ${counts.sleepy}회`);
  if(counts.dizzy) parts.push(`어지러움 ${counts.dizzy}회`);
  if(counts.stomach) parts.push(`속 불편 ${counts.stomach}회`);
  if(custom.length) parts.push(`직접 기록: ${custom.map(x=>`“${x}”`).join(', ')}`);
  return parts.join(' · ');
}

function renderMedication(){
  const card=document.getElementById('activeMedicationCard');
  const daily=activeDailyMedications(todayKey);
  const rescue=activeRescueMedications(todayKey);
  const blocks=[];

  daily.forEach(med=>{
    const start=parseLocal(med.startDate);
    const range=medicationRange(med);
    const elapsed=elapsedPrescriptionDays(med);
    const taken=(med.takenDates||[]).filter(key=>{
      const d=parseLocal(key); return d && d<=parseLocal(todayKey) && d>=start;
    });
    const progress=elapsed?Math.round((taken.length/elapsed)*100):0;
    const meta=[med.hospitalName,`${fmtShort(med.startDate)} 시작`,`${fmtShort(toKey(range.end))} 종료 예정`,med.schedule].filter(Boolean);
    blocks.push(`
      <div class="active-med-block">
        <div class="active-med-summary"><div><span class="med-type-badge daily">💊 매일약</span><h4>${escapeHtml(med.medName||'매일 먹는 약')}</h4><p class="active-med-meta">${meta.map(escapeHtml).join(' · ')}</p></div><strong>${taken.length}/${elapsed||med.days}일 복용</strong></div>
        <div class="progress-bar"><span style="width:${Math.min(progress,100)}%"></span></div>
        ${med.memo?`<p class="active-med-note">${escapeHtml(med.memo)}</p>`:''}
      </div>`);
  });

  rescue.forEach(med=>{
    const allDoses=Object.values(med.rescueDoses||{}).flat();
    const doseDates=Object.entries(med.rescueDoses||{}).filter(([,doses])=>(doses||[]).length).map(([key])=>key).sort();
    const latest=doseDates[doseDates.length-1];
    const meta=[med.hospitalName,`${fmtShort(med.startDate)}부터 필요 시 복용`].filter(Boolean);
    blocks.push(`
      <div class="active-med-block rescue-active-block">
        <div class="active-med-summary"><div><span class="med-type-badge rescue">🌧️ 필요 시 약</span><h4>${escapeHtml(med.medName||'머리 아플 때 먹는 약')}</h4><p class="active-med-meta">${meta.map(escapeHtml).join(' · ')}${latest?` · 최근 복용 ${escapeHtml(fmtShort(latest))}`:''}</p></div><strong>${allDoses.length}회 기록</strong></div>
        ${med.memo?`<p class="active-med-note">${escapeHtml(med.memo)}</p>`:''}
      </div>`);
  });

  card.innerHTML=`<div class="section-row active-medication-heading"><div><p class="eyebrow">현재 처방</p><h3>복용 중인 약</h3></div></div>${blocks.length?blocks.join('<div class="med-block-divider"></div>'):'<div class="empty-state">현재 등록된 복용 중 약이 없어요.<br/>아래에서 새 진료 기록을 추가해보세요.</div>'}`;

  const history=document.getElementById('visitHistory');
  document.getElementById('visitCount').textContent=`${state.visits.length}건`;
  if(!state.visits.length){
    history.innerHTML='<p class="muted">아직 진료 기록이 없어요.</p>';
    return;
  }

  const sorted=state.visits.slice().sort((a,b)=>String(b.visitDate||'').localeCompare(String(a.visitDate||'')));
  history.innerHTML=sorted.map((v,index)=>{
    const meds=state.medications.filter(m=>String(m.visitId)===String(v.id) || (v.medicationIds||[]).some(id=>String(id)===String(m.id)));
    const expanded=expandedVisitIds.has(String(v.id));
    const detailsId=`visit-details-${index}`;
    const visitLabel=[v.visitDate||'날짜 없음',v.hospitalName||'병원명 없음'].join(' ');
    return `
      <div class="history-item">
        <div class="history-item-head">
          <div><strong>${escapeHtml(v.visitDate||'날짜 없음')} 진료${v.hospitalName?` · ${escapeHtml(v.hospitalName)}`:''}</strong><div class="history-meta">처방약 ${meds.length}개${v.nextVisitDate?` · 다음 진료 ${escapeHtml(v.nextVisitDate)}`:''}</div></div>
          <div class="history-actions"><button class="secondary tiny" data-edit-visit="${escapeHtml(v.id)}" aria-label="${escapeHtml(visitLabel)} 진료 기록 수정">수정</button><button class="danger-link" data-delete-visit="${escapeHtml(v.id)}" aria-label="${escapeHtml(visitLabel)} 진료 기록 삭제">삭제</button></div>
        </div>
        <button class="danger-link history-detail-toggle" type="button" data-toggle-visit-details="${escapeHtml(v.id)}" aria-expanded="${expanded}" aria-controls="${detailsId}">${expanded?'간단히 보기':'자세히 보기'}</button>
        <div class="history-details" id="${detailsId}" ${expanded?'':'hidden'}>
          <div class="history-med-list">
            ${meds.map(med=>{
              if(med.type==='daily'){
                const sideText=sideEffectSummary(Object.values(med.sideEffects||{}));
                return `<div class="history-med-card"><span class="med-type-badge daily">💊 매일약</span>${med.medName?`<strong>${escapeHtml(med.medName)}</strong>`:''}<div class="history-meta">${escapeHtml(med.startDate)} 시작 · ${med.days}일${med.schedule?` · ${escapeHtml(med.schedule)}`:''} · 복용 ${(med.takenDates||[]).length}회</div>${sideText?`<div class="history-meta">복용 후 기록 · ${escapeHtml(sideText)}</div>`:''}${med.memo?`<div class="history-meta">${escapeHtml(med.memo)}</div>`:''}</div>`;
              }
              const doses=Object.values(med.rescueDoses||{}).flat();
              const effects={better:0,same:0,worse:0};
              doses.forEach(d=>{ if(effects[d.effect]!==undefined) effects[d.effect]++; });
              const sideText=sideEffectSummary(doses.map(d=>d.sideEffects));
              return `<div class="history-med-card"><span class="med-type-badge rescue">🌧️ 필요 시 약</span>${med.medName?`<strong>${escapeHtml(med.medName)}</strong>`:''}<div class="history-meta">${escapeHtml(med.startDate)}부터 필요 시 · 복용 ${doses.length}회${doses.length?` · 좋아짐 ${effects.better} / 비슷함 ${effects.same} / 더 아픔 ${effects.worse}`:''}</div>${sideText?`<div class="history-meta">복용 후 기록 · ${escapeHtml(sideText)}</div>`:''}${med.memo?`<div class="history-meta">${escapeHtml(med.memo)}</div>`:''}</div>`;
            }).join('') || '<div class="history-meta">처방약 없이 저장한 진료예요.</div>'}
          </div>
          ${v.memo?`<div class="history-meta visit-note">진료 메모 · ${escapeHtml(v.memo)}</div>`:''}
        </div>
      </div>`;
  }).join('');
}

function newMedicationDraft(type='daily'){
  return { id:null, type, medName:'', startDate:toKey(new Date()), days:14, schedule:'', memo:'' };
}
let medicationDrafts=[newMedicationDraft('daily')];

function visitFormSnapshot(){
  const byId=id=>document.getElementById(id)?.value||'';
  return JSON.stringify({
    editingVisitId:editingVisitId===null?'':String(editingVisitId),
    visitDate:byId('visitDate'),
    hospitalName:byId('hospitalName'),
    nextVisitDate:byId('nextVisitDate'),
    memo:byId('prescriptionMemo'),
    noPrescription:Boolean(document.getElementById('noPrescription')?.checked),
    medications:medicationDrafts.map(d=>({...d}))
  });
}

function setVisitFormBaseline(){
  visitFormOriginal=visitFormSnapshot();
  visitFormDirty=false;
}

function updateVisitFormDirty(){
  visitFormDirty=visitFormSnapshot()!==visitFormOriginal;
}

function setVisitFormOpen(open,options={}){
  visitFormOpen=Boolean(open);
  const body=document.getElementById('medFormBody');
  const toggle=document.getElementById('toggleMedicationForm');
  if(body) body.hidden=!visitFormOpen;
  if(toggle) toggle.setAttribute('aria-expanded',String(visitFormOpen));
  if(visitFormOpen && options.scroll){
    document.getElementById('medFormCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
}

document.getElementById('toggleMedicationForm').addEventListener('click',()=>{
  if(visitFormOpen){
    if(visitFormDirty && !confirm('저장하지 않은 진료 기록이 있어요.\n\n확인: 입력 내용을 지우고 닫기\n취소: 계속 작성')) return;
    if(visitFormDirty) resetMedicationForm();
    else setVisitFormOpen(false);
    return;
  }
  setVisitFormOpen(true);
});

function renderMedicationFormRows(){
  const list=document.getElementById('medicationFormList');
  if(!list) return;
  const noPrescription=document.getElementById('noPrescription')?.checked;
  document.getElementById('addMedicationRow').disabled=Boolean(noPrescription);
  list.hidden=Boolean(noPrescription);
  if(noPrescription){
    list.innerHTML='';
    return;
  }
  list.innerHTML=medicationDrafts.map((draft,index)=>`
    <div class="med-form-item" data-med-form-index="${index}">
      <div class="med-form-item-head"><strong>약 ${index+1}</strong>${medicationDrafts.length>1?`<button class="danger-link" type="button" data-remove-med-row="${index}">삭제</button>`:''}</div>
      <div class="form-grid med-form-grid">
        <label class="wide"><span>약 이름</span><input type="text" data-med-field="medName" value="${escapeHtml(draft.medName)}" placeholder="예: 처방전에 적힌 약 이름" /><small class="field-error" data-med-error="${index}-medName"></small></label>
        <label><span>약 종류</span><select data-med-field="type"><option value="daily" ${draft.type==='daily'?'selected':''}>💊 매일 먹는 약</option><option value="rescue" ${draft.type==='rescue'?'selected':''}>🌧️ 머리 아플 때 먹는 약</option></select></label>
        <label><span>처방 시작일</span><input type="date" data-med-field="startDate" value="${escapeHtml(draft.startDate)}" /><small class="field-error" data-med-error="${index}-startDate"></small></label>
        ${draft.type==='daily'?`
          <label><span>복용 기간</span><div class="input-suffix"><input type="number" min="1" max="180" data-med-field="days" value="${draft.days===''?'':Number(draft.days??14)}" /><span>일</span></div><small class="field-error" data-med-error="${index}-days"></small></label>
          <label><span>복용 시점 <small>(선택)</small></span><select data-med-field="schedule"><option value="" ${!draft.schedule?'selected':''}>정하지 않음</option><option value="아침" ${draft.schedule==='아침'?'selected':''}>아침</option><option value="저녁" ${draft.schedule==='저녁'?'selected':''}>저녁</option><option value="자기 전" ${draft.schedule==='자기 전'?'selected':''}>자기 전</option></select></label>
        `:`<div class="rescue-form-note">필요할 때 복용하는 약으로 기록돼요. 매일 체크하지 않습니다.</div>`}
        <label class="wide"><span>복용 메모 <small>(선택)</small></span><input type="text" data-med-field="memo" value="${escapeHtml(draft.memo)}" placeholder="예: 두통 시작 시 1정" /></label>
      </div>
    </div>
  `).join('');
}

document.getElementById('addMedicationRow').addEventListener('click',()=>{
  document.getElementById('noPrescription').checked=false;
  medicationDrafts.push(newMedicationDraft(medicationDrafts.some(d=>d.type==='rescue')?'daily':'rescue'));
  renderMedicationFormRows();
  updateVisitFormDirty();
});

document.getElementById('noPrescription').addEventListener('change',e=>{
  document.getElementById('prescriptionChoiceError').textContent='';
  if(!e.target.checked && !medicationDrafts.length) medicationDrafts=[newMedicationDraft('daily')];
  renderMedicationFormRows();
  updateVisitFormDirty();
});

document.getElementById('medicationFormList').addEventListener('input',e=>{
  const item=e.target.closest('[data-med-form-index]');
  const field=e.target.dataset.medField;
  if(!item || !field) return;
  const index=Number(item.dataset.medFormIndex);
  if(!medicationDrafts[index]) return;
  medicationDrafts[index][field]=field==='days'?(e.target.value===''?'':Number(e.target.value)):e.target.value;
  e.target.classList.remove('field-invalid');
  const error=item.querySelector(`[data-med-error="${index}-${field}"]`);
  if(error) error.textContent='';
  updateVisitFormDirty();
});

document.getElementById('medicationFormList').addEventListener('change',e=>{
  const item=e.target.closest('[data-med-form-index]');
  const field=e.target.dataset.medField;
  if(!item || !field) return;
  const index=Number(item.dataset.medFormIndex);
  if(!medicationDrafts[index]) return;
  medicationDrafts[index][field]=field==='days'?(e.target.value===''?'':Number(e.target.value)):e.target.value;
  if(field==='type') renderMedicationFormRows();
  updateVisitFormDirty();
});

document.getElementById('medicationFormList').addEventListener('click',e=>{
  const btn=e.target.closest('[data-remove-med-row]');
  if(!btn) return;
  medicationDrafts.splice(Number(btn.dataset.removeMedRow),1);
  if(!medicationDrafts.length) medicationDrafts=[newMedicationDraft('daily')];
  renderMedicationFormRows();
  updateVisitFormDirty();
});

['visitDate','hospitalName','nextVisitDate','prescriptionMemo'].forEach(id=>{
  document.getElementById(id).addEventListener('input',updateVisitFormDirty);
  document.getElementById(id).addEventListener('change',updateVisitFormDirty);
});

document.getElementById('visitHistory').addEventListener('click',e=>{
  const detailBtn=e.target.closest('[data-toggle-visit-details]');
  if(detailBtn){
    const id=String(detailBtn.dataset.toggleVisitDetails);
    if(expandedVisitIds.has(id)) expandedVisitIds.delete(id);
    else expandedVisitIds.add(id);
    renderMedication();
    return;
  }
  const editBtn=e.target.closest('[data-edit-visit]');
  if(editBtn){ beginVisitEdit(editBtn.dataset.editVisit); return; }
  const deleteBtn=e.target.closest('[data-delete-visit]');
  if(!deleteBtn) return;
  const id=deleteBtn.dataset.deleteVisit;
  if(!confirm('이 진료 기록과 연결된 처방약 기록을 삭제할까요?')) return;
  const medIds=state.medications.filter(m=>String(m.visitId)===String(id)).map(m=>String(m.id));
  state.medications=state.medications.filter(m=>String(m.visitId)!==String(id));
  state.visits=state.visits.filter(v=>String(v.id)!==String(id));
  if(String(editingVisitId)===String(id)) resetMedicationForm();
  medicationDraftKey='';
  medicationRecordDrafts.clear();
  medicationDirtyIds.clear();
  persist(); renderMedication(); renderMedToday(); renderCalendar(); renderThirtyDaySummary();
});

function beginVisitEdit(id){
  if(visitFormDirty && !confirm('작성 중인 새 진료 기록을 지우고 기존 기록을 수정할까요?')) return;
  const visit=state.visits.find(v=>String(v.id)===String(id));
  if(!visit) return;
  const meds=state.medications.filter(m=>String(m.visitId)===String(id) || (visit.medicationIds||[]).some(mid=>String(mid)===String(m.id)));
  returnToRecordDateKey='';
  editingVisitId=id;
  document.getElementById('visitDate').value=visit.visitDate||'';
  document.getElementById('hospitalName').value=visit.hospitalName||'';
  document.getElementById('nextVisitDate').value=visit.nextVisitDate||'';
  document.getElementById('prescriptionMemo').value=visit.memo||'';
  medicationDrafts=meds.map(m=>({id:m.id,type:m.type||'daily',medName:m.medName||'',startDate:m.startDate||'',days:m.days||14,schedule:m.schedule||'',memo:m.memo||''}));
  document.getElementById('noPrescription').checked=!medicationDrafts.length;
  if(!medicationDrafts.length) medicationDrafts=[newMedicationDraft('daily')];
  renderMedicationFormRows();
  document.getElementById('medFormTitle').textContent='진료 · 처방 기록 수정';
  document.getElementById('startMedication').textContent='수정 저장';
  document.getElementById('cancelMedicationEdit').hidden=false;
  document.getElementById('medFormStatus').textContent='복용 기록은 유지하면서 진료와 처방 내용을 수정할 수 있어요.';
  setVisitFormBaseline();
  setVisitFormOpen(true,{scroll:true});
}

function resetMedicationForm(options={}){
  editingVisitId=null;
  const today=toKey(new Date());
  document.getElementById('visitDate').value=today;
  document.getElementById('hospitalName').value='';
  document.getElementById('nextVisitDate').value='';
  document.getElementById('prescriptionMemo').value='';
  document.getElementById('noPrescription').checked=false;
  document.getElementById('visitDateError').textContent='';
  document.getElementById('prescriptionChoiceError').textContent='';
  medicationDrafts=[newMedicationDraft('daily')];
  renderMedicationFormRows();
  document.getElementById('medFormTitle').textContent='새 진료 기록 추가';
  document.getElementById('startMedication').textContent='진료 기록 저장';
  document.getElementById('cancelMedicationEdit').hidden=true;
  document.getElementById('cancelMedicationEdit').textContent='수정 취소';
  document.getElementById('medFormStatus').textContent='';
  setVisitFormBaseline();
  if(options.collapse!==false) setVisitFormOpen(false);
}

document.getElementById('cancelMedicationEdit').addEventListener('click',()=>{
  const returnKey=returnToRecordDateKey;
  returnToRecordDateKey='';
  resetMedicationForm();
  if(returnKey){
    selectedDateKey=returnKey;
    initializeMedicationRecordDrafts(true);
    renderToday();
    showView('todayView');
  }
});

let medFormStatusTimer;
function showMedicationFormStatus(text,tone='ok'){
  const status=document.getElementById('medFormStatus');
  clearTimeout(medFormStatusTimer);
  status.textContent=text;
  status.dataset.tone=tone;
  if(tone==='ok') medFormStatusTimer=setTimeout(()=>{
    if(status.textContent===text) status.textContent='';
  },2800);
}

function clearMedicationFormErrors(){
  document.getElementById('visitDateError').textContent='';
  document.getElementById('prescriptionChoiceError').textContent='';
  document.querySelectorAll('#medicationFormList .field-error').forEach(el=>el.textContent='');
  document.querySelectorAll('#medicationFormList .field-invalid').forEach(el=>el.classList.remove('field-invalid'));
}

function setMedicationRowError(index,field,message){
  const item=document.querySelector(`[data-med-form-index="${index}"]`);
  const input=item?.querySelector(`[data-med-field="${field}"]`);
  const error=item?.querySelector(`[data-med-error="${index}-${field}"]`);
  input?.classList.add('field-invalid');
  if(error) error.textContent=message;
  return input;
}

function migrateTypeIfNeeded(med,newType){
  const oldType=med.type||'daily';
  if(oldType===newType) return;
  if(oldType==='daily' && newType==='rescue'){
    med.rescueDoses=med.rescueDoses||{};
    (med.takenDates||[]).forEach(key=>{
      med.rescueDoses[key]=med.rescueDoses[key]||[];
      if(!med.rescueDoses[key].length){
        med.rescueDoses[key].push({id:`dose-migrated-${med.id}-${key}`,time:'',effect:med.effects?.[key]||'',sideEffects:normalizeSideEffectEntry(med.sideEffects?.[key]),note:''});
      }
    });
    med.takenDates=[]; med.sideEffects={}; med.effects={};
  }else if(oldType==='rescue' && newType==='daily'){
    const keys=Object.keys(med.rescueDoses||{}).filter(key=>(med.rescueDoses[key]||[]).length);
    med.takenDates=[...new Set([...(med.takenDates||[]),...keys])];
    med.sideEffects=med.sideEffects||{};
    med.effects=med.effects||{};
    keys.forEach(key=>{
      const first=med.rescueDoses[key][0];
      med.sideEffects[key]=normalizeSideEffectEntry(first.sideEffects);
      if(first.effect) med.effects[key]=first.effect;
    });
    med.rescueDoses={};
  }
  med.type=newType;
}

document.getElementById('startMedication').addEventListener('click',()=>{
  clearMedicationFormErrors();
  const visitDate=document.getElementById('visitDate').value;
  const hospitalName=document.getElementById('hospitalName').value.trim();
  const nextVisitDate=document.getElementById('nextVisitDate').value;
  const visitMemo=document.getElementById('prescriptionMemo').value.trim();
  const noPrescription=document.getElementById('noPrescription').checked;
  const drafts=noPrescription ? [] : medicationDrafts.map(d=>({...d,medName:String(d.medName||'').trim(),memo:String(d.memo||'').trim(),days:d.days}));
  let firstInvalid=null;

  if(!visitDate){
    document.getElementById('visitDateError').textContent='진료일을 선택해 주세요.';
    firstInvalid=document.getElementById('visitDate');
  }
  if(!noPrescription && !drafts.length){
    document.getElementById('prescriptionChoiceError').textContent='처방약을 추가하거나 처방약 없음을 선택해 주세요.';
    firstInvalid=firstInvalid || document.getElementById('addMedicationRow');
  }
  drafts.forEach((draft,index)=>{
    if(!draft.medName) firstInvalid=firstInvalid || setMedicationRowError(index,'medName','약 이름을 입력해 주세요.');
    if(!draft.startDate) firstInvalid=firstInvalid || setMedicationRowError(index,'startDate','처방 시작일을 선택해 주세요.');
    if(draft.type==='daily' && (!Number.isInteger(Number(draft.days)) || Number(draft.days)<1 || Number(draft.days)>180)){
      firstInvalid=firstInvalid || setMedicationRowError(index,'days','1~180일 사이의 복용 기간을 입력해 주세요.');
    }
  });
  if(firstInvalid){
    showMedicationFormStatus('입력하지 않은 항목을 확인해 주세요.','error');
    firstInvalid.scrollIntoView({behavior:'smooth',block:'center'});
    firstInvalid.focus?.();
    return;
  }

  drafts.forEach(draft=>{
    if(draft.type==='daily') draft.days=Math.max(1,Math.min(180,Number(draft.days)));
  });

  const now=new Date().toISOString();
  let visit;
  if(editingVisitId!==null){
    visit=state.visits.find(v=>String(v.id)===String(editingVisitId));
    if(!visit){ alert('수정할 진료 기록을 찾지 못했어요.'); resetMedicationForm(); return; }
  }else{
    visit={id:`visit-${Date.now()}-${Math.random().toString(16).slice(2)}`,medicationIds:[]};
    state.visits.push(visit);
  }
  Object.assign(visit,{visitDate,hospitalName,nextVisitDate,memo:visitMemo,updatedAt:now});

  const keptIds=[];
  drafts.forEach((draft,index)=>{
    let med=draft.id ? state.medications.find(m=>String(m.id)===String(draft.id)) : null;
    if(!med){
      med={id:`med-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,takenDates:[],effects:{},sideEffects:{},rescueDoses:{}};
      state.medications.push(med);
    }
    migrateTypeIfNeeded(med,draft.type);
    Object.assign(med,{
      visitId:visit.id,visitDate,hospitalName,nextVisitDate,
      type:draft.type,medName:draft.medName,startDate:draft.startDate,
      days:draft.type==='daily'?draft.days:(med.days||90),
      schedule:draft.type==='daily'?draft.schedule:'',memo:draft.memo,updatedAt:now
    });
    if(med.type==='daily'){
      const start=parseLocal(med.startDate), end=addDays(start,med.days-1);
      med.takenDates=(med.takenDates||[]).filter(key=>{const d=parseLocal(key);return d&&d>=start&&d<=end;});
      const keptSide={};
      Object.entries(med.sideEffects||{}).forEach(([key,value])=>{if(med.takenDates.includes(key)) keptSide[key]=value;});
      med.sideEffects=keptSide;
    }
    keptIds.push(med.id);
  });

  // 수정 중 폼에서 제거한 약만 삭제한다.
  state.medications=state.medications.filter(m=>String(m.visitId)!==String(visit.id) || keptIds.some(id=>String(id)===String(m.id)));
  visit.medicationIds=keptIds;
  persist();
  const wasEditing=editingVisitId!==null;
  const returnKey=returnToRecordDateKey;
  resetMedicationForm();
  medicationDraftKey='';
  medicationRecordDrafts.clear();
  medicationDirtyIds.clear();
  renderMedication(); renderMedToday(); renderCalendar(); renderThirtyDaySummary();
  if(returnKey){
    returnToRecordDateKey='';
    selectedDateKey=returnKey;
    initializeMedicationRecordDrafts(true);
    renderToday();
    showView('todayView');
    const note=document.getElementById('recordSaveNote');
    if(dayDraftDirty){
      note.textContent='약을 등록했어요. 머리날씨 변경사항은 아직 저장 전이에요.';
      note.classList.add('unsaved');
    }
  }else{
    showMedicationFormStatus(wasEditing?'진료 · 처방 기록을 수정했어요 ✓':(noPrescription?'처방약 없는 진료 기록을 저장했어요 ✓':'새 진료 · 처방 기록을 저장했어요 ✓'));
  }
});

function recentKeys(days=30){
  const keys=[];
  const today=new Date();
  for(let i=days-1;i>=0;i--) keys.push(toKey(addDays(today,-i)));
  return keys;
}

function getRecentSummary(days=30){
  const keys=recentKeys(days);
  const weatherCounts={sunny:0,partly:0,cloudy:0,rain:0,storm:0};
  const symptomCounts={};
  const triggerCounts={};
  let recorded=0;

  keys.forEach(key=>{
    const rec=state.days[key];
    if(!rec) return;
    if(rec.weather && WEATHER[rec.weather]){
      recorded++;
      weatherCounts[rec.weather]++;
    }
    (rec.symptoms||[]).forEach(s=>symptomCounts[s]=(symptomCounts[s]||0)+1);
    (rec.triggers||[]).forEach(s=>triggerCounts[s]=(triggerCounts[s]||0)+1);
  });

  const uncomfortable=weatherCounts.cloudy+weatherCounts.rain+weatherCounts.storm;
  const severe=weatherCounts.rain+weatherCounts.storm;
  const topSymptoms=Object.entries(symptomCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topTriggers=Object.entries(triggerCounts).sort((a,b)=>b[1]-a[1]).slice(0,3);

  return { keys, weatherCounts, recorded, uncomfortable, severe, topSymptoms, topTriggers };
}

function renderThirtyDaySummary(){
  const summary=getRecentSummary(30);
  const stat=document.getElementById('thirtyDaySummary');
  stat.innerHTML=`
    <div class="stat-card"><span>🗓️</span><strong>${summary.recorded}일</strong><small>기록</small></div>
    <div class="stat-card"><span>☁️</span><strong>${summary.uncomfortable}일</strong><small>흐림 이상</small></div>
    <div class="stat-card"><span>🌧️</span><strong>${summary.severe}일</strong><small>비·폭풍</small></div>
  `;

  const note=document.getElementById('topSymptoms');
  if(summary.topSymptoms.length){
    note.innerHTML=`<strong>자주 함께 기록된 증상</strong><br>${summary.topSymptoms.map(([name,n])=>`${escapeHtml(shortSymptom(name))} ${n}회`).join(' · ')}`;
  } else {
    note.textContent=summary.recorded ? '상세 증상을 기록하면 자주 함께 있었던 증상을 여기에서 볼 수 있어요.' : '오늘 날씨를 기록하면 최근 30일 요약이 시작돼요.';
  }
}

function shortSymptom(name){
  return ({'빛이 불편함':'빛 불편','소리가 불편함':'소리 불편','목·어깨 뻐근함':'목·어깨'})[name] || name;
}

function medicationRecordsRecent(days=30){
  const windowStart=parseLocal(toKey(addDays(new Date(),-(days-1))));
  const windowEnd=parseLocal(todayKey);
  return state.medications.filter(m=>{
    const start=parseLocal(m.startDate);
    if(!start || start>windowEnd) return false;
    if(m.type==='daily'){
      const range=medicationRange(m);
      return range && range.end>=windowStart;
    }
    return Object.entries(m.rescueDoses||{}).some(([key,doses])=>{
      const d=parseLocal(key); return d && d>=windowStart && d<=windowEnd && (doses||[]).length;
    }) || start<=windowEnd;
  }).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate)));
}

function renderReport(){
  const summary=getRecentSummary(30);
  const start=addDays(new Date(),-29);
  const startKey=toKey(start);
  document.getElementById('reportPeriod').textContent=`${startKey} ~ ${todayKey}`;

  const meds=medicationRecordsRecent(30);
  const dailyMeds=meds.filter(m=>m.type==='daily');
  const rescueMeds=meds.filter(m=>m.type==='rescue');
  const windowStart=parseLocal(startKey);
  const windowEnd=parseLocal(todayKey);

  const dailyCard=med=>{
    const medStart=parseLocal(med.startDate);
    const range=medicationRange(med);
    const from=medStart>windowStart?medStart:windowStart;
    const to=range.end<windowEnd?range.end:windowEnd;
    const expected=to>=from?dateDiffDays(to,from)+1:0;
    const taken=(med.takenDates||[]).filter(key=>{
      const d=parseLocal(key); return d && d>=from && d<=to;
    });
    const sideEntries=taken.map(key=>med.sideEffects?.[key]).filter(Boolean);
    const sideText=sideEffectSummary(sideEntries);
    return `
      <div class="report-med-card">
        <div class="report-med-title"><span>💊</span><div><strong>${escapeHtml(med.medName||'매일 먹는 약')}</strong>${med.hospitalName?`<small>${escapeHtml(med.hospitalName)}</small>`:''}</div></div>
        <div class="report-lines">
          <div class="report-line"><span>복용 기간</span><b>${escapeHtml(med.startDate)} ~ ${escapeHtml(toKey(range.end))}</b></div>
          <div class="report-line"><span>최근 30일 복용</span><b>${taken.length}/${expected}일</b></div>
          ${med.schedule?`<div class="report-line"><span>복용 시점</span><b>${escapeHtml(med.schedule)}</b></div>`:''}
          ${sideText?`<div class="report-line report-line-stack"><span>복용 후 함께 기록된 불편함</span><b>${escapeHtml(sideText)}</b></div>`:''}
        </div>
      </div>`;
  };
  const currentDaily=dailyMeds.filter(med=>medicationRange(med)?.end>=windowEnd);
  const endedDaily=dailyMeds.filter(med=>medicationRange(med)?.end<windowEnd);
  const dailyHtml=dailyMeds.length
    ? `${currentDaily.length?`<div class="report-subgroup"><p class="report-subgroup-title">현재 복용 중</p>${currentDaily.map(dailyCard).join('')}</div>`:''}${endedDaily.length?`<div class="report-subgroup"><p class="report-subgroup-title">최근 복용 종료</p>${endedDaily.map(dailyCard).join('')}</div>`:''}`
    : '<p class="muted compact">최근 30일에 해당하는 매일약 기록이 없어요.</p>';

  const rescueHtml=rescueMeds.length ? rescueMeds.map(med=>{
    const doseRows=[];
    Object.entries(med.rescueDoses||{}).forEach(([key,doses])=>{
      const d=parseLocal(key);
      if(d && d>=windowStart && d<=windowEnd) (doses||[]).forEach(dose=>doseRows.push({key,dose}));
    });
    const effects={better:0,same:0,worse:0};
    doseRows.forEach(({dose})=>{ if(effects[dose.effect]!==undefined) effects[dose.effect]++; });
    const sideText=sideEffectSummary(doseRows.map(({dose})=>dose.sideEffects));
    const latestKey=doseRows.map(row=>row.key).sort().pop();
    return `
      <div class="report-med-card">
        <div class="report-med-title"><span>🌧️</span><div><strong>${escapeHtml(med.medName||'머리 아플 때 먹는 약')}</strong>${med.hospitalName?`<small>${escapeHtml(med.hospitalName)}</small>`:''}</div></div>
        <div class="report-lines">
          <div class="report-line"><span>최근 30일 복용</span><b>${doseRows.length}회</b></div>
          ${latestKey?`<div class="report-line"><span>최근 복용일</span><b>${escapeHtml(latestKey)}</b></div>`:''}
          ${doseRows.length?`<div class="report-line"><span>복용 후 머리 상태</span><b>좋아짐 ${effects.better} · 비슷함 ${effects.same} · 더 아픔 ${effects.worse}</b></div>`:''}
          ${sideText?`<div class="report-line report-line-stack"><span>복용 후 함께 기록된 불편함</span><b>${escapeHtml(sideText)}</b></div>`:''}
        </div>
      </div>`;
  }).join('') : '<p class="muted compact">최근 30일 두통약 복용 기록이 없어요.</p>';

  const symptomText=summary.topSymptoms.map(([name,n])=>`${escapeHtml(shortSymptom(name))} ${n}회`).join(' · ');
  const triggerText=summary.topTriggers.map(([name,n])=>`${escapeHtml(name)} ${n}회`).join(' · ');
  const detailSummaryHtml=(symptomText||triggerText) ? `
    <section class="report-block">
      <h4>함께 기록된 내용</h4>
      <div class="report-lines">
        ${symptomText?`<div class="report-line"><span>증상</span><b>${symptomText}</b></div>`:''}
        ${triggerText?`<div class="report-line"><span>특이사항</span><b>${triggerText}</b></div>`:''}
      </div>
    </section>` : '';

  document.getElementById('reportContent').innerHTML=`
    <section class="report-block">
      <h4>머리날씨</h4>
      <div class="report-numbers">
        <div class="report-number"><strong>${summary.recorded}일</strong><span>기록</span></div>
        <div class="report-number"><strong>${summary.uncomfortable}일</strong><span>흐림 이상</span></div>
        <div class="report-number"><strong>${summary.severe}일</strong><span>비·폭풍</span></div>
      </div>
      <div class="summary-chips" style="margin-top:10px">${Object.entries(summary.weatherCounts).filter(([,n])=>n).map(([k,n])=>`<span class="summary-pill">${WEATHER[k].icon} ${WEATHER[k].label} ${n}일</span>`).join('') || '<span class="muted">날씨 기록 없음</span>'}</div>
    </section>
    ${detailSummaryHtml}
    <section class="report-block">
      <h4>💊 매일 먹는 약</h4>
      <div class="report-med-list">${dailyHtml}</div>
    </section>
    <section class="report-block">
      <h4>🌧️ 머리 아플 때 먹는 약</h4>
      <div class="report-med-list">${rescueHtml}</div>
    </section>
  `;
}

function openReport(){
  renderReport();
  document.getElementById('reportDialog').showModal();
}

document.getElementById('openReportFromToday').addEventListener('click',openReport);
document.getElementById('openReportFromMed').addEventListener('click',openReport);
document.getElementById('closeReport').addEventListener('click',()=>document.getElementById('reportDialog').close());
document.getElementById('reportDialog').addEventListener('click',e=>{
  if(e.target===e.currentTarget) e.currentTarget.close();
});

document.getElementById('accountBtn').addEventListener('click',()=>{
  if(!authReady) return;
  document.getElementById('authStatus').textContent='';
  document.getElementById('pwaSafariStatus').textContent='';
  if(IS_STANDALONE && !currentUser) setAuthPanel('authPwaNotice');
  else if(!isSupabaseConfigured()) setAuthPanel('authNotConfigured');
  else setAuthPanel(currentUser ? 'authSignedIn' : 'authSignedOut');
  document.getElementById('authDialog').showModal();
});

document.getElementById('closeAuth').addEventListener('click',()=>document.getElementById('authDialog').close());
document.getElementById('authDialog').addEventListener('click',e=>{
  if(e.target===e.currentTarget) e.currentTarget.close();
});

document.getElementById('sendLoginLink').addEventListener('click',async()=>{
  const status=document.getElementById('authStatus');
  if(IS_STANDALONE){
    setAuthPanel('authPwaNotice');
    return;
  }
  if(!supabaseClient){
    status.textContent='먼저 Supabase 연결 설정이 필요해요.';
    return;
  }
  const email=document.getElementById('authEmail').value.trim();
  if(!email || !email.includes('@')){
    status.textContent='이메일 주소를 확인해 주세요.';
    return;
  }
  const btn=document.getElementById('sendLoginLink');
  btn.disabled=true;
  status.textContent='로그인 링크를 보내는 중…';
  try{
    const redirectTo=`${window.location.origin}${window.location.pathname}`;
    const { error }=await supabaseClient.auth.signInWithOtp({
      email,
      options:{ emailRedirectTo:redirectTo }
    });
    if(error) throw error;
    status.textContent='';
    document.getElementById('sentEmail').textContent=email;
    setAuthPanel('authLinkSent');
  }catch(err){
    console.error(err);
    status.textContent='로그인 메일을 보내지 못했어요. Supabase 설정과 Redirect URL을 확인해 주세요.';
  }finally{
    btn.disabled=false;
  }
});

document.getElementById('changeLoginEmail').addEventListener('click',()=>{
  setAuthPanel('authSignedOut');
  document.getElementById('authEmail').focus();
});

document.getElementById('finishLogin').addEventListener('click',async()=>{
  await requestPersistentStorage();
  document.getElementById('authDialog').close();
});

document.getElementById('syncNowBtn').addEventListener('click',async()=>{
  await pushCloudState();
});

document.getElementById('signOutBtn').addEventListener('click',async()=>{
  if(!supabaseClient) return;
  await supabaseClient.auth.signOut();
  currentUser=null;
  lastSessionUserId=null;
  authSuccessShown=false;
  setSyncStatus('로그아웃했어요. 이 기기의 기록은 그대로 남아 있어요.');
});

const safariUrl=`${window.location.origin}${window.location.pathname}`;
const openSafariLink=document.getElementById('openSafariLink');
if(openSafariLink) openSafariLink.href=safariUrl;

document.getElementById('copySafariUrl')?.addEventListener('click',async()=>{
  const status=document.getElementById('pwaSafariStatus');
  try{
    await navigator.clipboard.writeText(safariUrl);
    status.textContent='주소를 복사했어요. Safari 주소창에 붙여넣어 주세요 ✓';
  }catch(err){
    status.textContent=`Safari에서 ${safariUrl} 주소를 열어 주세요.`;
  }
});

function initDates(){
  const today=toKey(new Date());
  document.getElementById('visitDate').value=today;
  renderMedicationFormRows();
  setVisitFormBaseline();
  setVisitFormOpen(false);
}

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  const activeView=document.querySelector('.view.active')?.id;
  const changesWouldBeLeft=hasUnsavedChanges() && (btn.dataset.view!==activeView || (btn.dataset.view==='todayView' && selectedDateKey!==todayKey));
  if(changesWouldBeLeft && !confirmDiscardChanges()) return;
  if(changesWouldBeLeft) discardDraftChanges();
  if(btn.dataset.view==='todayView'){
    selectedDateKey=todayKey;
    loadDayDraft(todayKey,true);
    initializeMedicationRecordDrafts(true);
  }
  if(btn.dataset.view==='calendarView'){
    calendarCursor=selectedDateKey===todayKey ? new Date() : (parseLocal(selectedDateKey)||new Date());
  }
  showView(btn.dataset.view);
  if(btn.dataset.view==='todayView') renderToday();
}));

window.addEventListener('beforeunload',e=>{
  if(!hasUnsavedChanges()) return;
  e.preventDefault();
  e.returnValue='';
});

document.getElementById('helpBtn').addEventListener('click',()=>document.getElementById('helpDialog').showModal());
document.getElementById('closeHelp').addEventListener('click',()=>document.getElementById('helpDialog').close());
document.getElementById('helpDialog').addEventListener('click',e=>{
  if(e.target===e.currentTarget) e.currentTarget.close();
});

initDates();
renderToday();
renderCalendar();
renderMedication();
initAccountSync();
