// ─────────────────────────────────────────────────────────────
//  RideSure Phase 2 — Firebase Integration
//  Auth:  Firebase Authentication (email/password + Google)
//  DB:    Firestore with mock fallback
//  New collections: earnings, platform_activity, risk_data,
//                   global_risk_config
// ─────────────────────────────────────────────────────────────
import { firebaseConfig } from "./firebaseConfig.js";

const isRealConfig = firebaseConfig.apiKey !== "YOUR_API_KEY";

// ── In-memory mock store ──────────────────────────────────────
let _store = {
  users: {}, policies: {}, claims: [],
  earnings: {}, platform_activity: {}, risk_data: {},
  global_risk_config: { isOn: false, updatedAt: null, updatedBy: null },
};

// ── Mock Auth ─────────────────────────────────────────────────
let _currentUser = null;
const MockAuth = {
  async signUpWithEmail(email, password) {
    const uid = `usr_${Date.now()}`;
    _currentUser = { uid, email, displayName: email.split("@")[0] };
    console.log("[MockAuth] signUp →", email);
    return _currentUser;
  },
  async signInWithEmail(email, password) {
    _currentUser = { uid: `usr_${email.replace(/\W/g, "")}`, email, displayName: email.split("@")[0] };
    console.log("[MockAuth] signIn →", email);
    return _currentUser;
  },
  async signInWithGoogle() {
    _currentUser = { uid: "google_mock_uid", email: "rider@gmail.com", displayName: "Rider (Google)" };
    console.log("[MockAuth] Google sign-in mock");
    return _currentUser;
  },
  async signOut() {
    console.log("[MockAuth] signOut");
    _currentUser = null;
  },
  getUser()                { return _currentUser; },
  onAuthStateChange(cb)    { cb(_currentUser); return () => {}; },
};

// ── Mock DB ───────────────────────────────────────────────────
const MockDB = {
  // ── Existing collections ──
  async saveUser(uid, data)        { _store.users[uid] = { ...data, uid, createdAt: Date.now() }; return _store.users[uid]; },
  async getUser(uid)               { return _store.users[uid] || null; },
  async savePolicy(policyId, data) { _store.policies[policyId] = { ...data, policyId, createdAt: Date.now(), status: "active" }; return _store.policies[policyId]; },
  async getPolicy(policyId)        { return _store.policies[policyId] || null; },
  async getUserPolicies(uid)       { return Object.values(_store.policies).filter(p => p.userId === uid); },
  async saveClaim(claim) {
    const id  = `CLM_${Date.now()}_${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const doc = { ...claim, id, createdAt: Date.now(), status: claim.fraudFlag ? "partial-hold" : "auto-approved" };
    _store.claims.push(doc);
    return doc;
  },
  async getUserClaims(uid)               { return _store.claims.filter(c => c.uid === uid).sort((a,b) => b.createdAt - a.createdAt); },
  async updateClaimStatus(claimId, status) { const c = _store.claims.find(c => c.id === claimId); if (c) c.status = status; return c; },

  // ── Earnings ──
  async saveEarnings(userId, records) {
    _store.earnings[userId] = records;
    console.log("[MockDB] earnings/", userId, "saved", records.length, "records");
    return records;
  },
  async getUserEarnings(userId) { return _store.earnings[userId] || []; },

  // ── Platform Activity ──
  async savePlatformActivity(city, records) {
    _store.platform_activity[city] = records;
    console.log("[MockDB] platform_activity/", city, "saved");
    return records;
  },
  async getPlatformActivity(city) { return _store.platform_activity[city] || []; },

  // ── Risk Snapshots ──
  async saveRiskSnapshot(zoneId, data) {
    _store.risk_data[zoneId] = { ...data, zoneId, savedAt: Date.now() };
    console.log("[MockDB] risk_data/", zoneId, "saved");
    return _store.risk_data[zoneId];
  },
  async getRiskSnapshot(zoneId) { return _store.risk_data[zoneId] || null; },

  // ── Global Risk Config ──
  async getGlobalRiskConfig()            { return { ..._store.global_risk_config }; },
  async setGlobalRiskConfig(isOn, uid)   {
    _store.global_risk_config = { isOn, updatedAt: Date.now(), updatedBy: uid || "admin" };
    console.log("[MockDB] global_risk_config →", isOn);
    return _store.global_risk_config;
  },
};

// ── Real Firebase ─────────────────────────────────────────────
let _realDB   = null;
let _realAuth = null;

async function buildRealFirebase() {
  try {
    const { initializeApp, getApps }                   = await import("firebase/app");
    const { getFirestore, doc, setDoc, getDoc,
            collection, addDoc, query, where,
            getDocs, updateDoc }                        = await import("firebase/firestore");
    const { getAuth, createUserWithEmailAndPassword,
            signInWithEmailAndPassword, GoogleAuthProvider,
            signInWithPopup, signOut, onAuthStateChanged } = await import("firebase/auth");

    const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const db   = getFirestore(app);
    const auth = getAuth(app);
    console.log("[Firebase] ✓ Connected to Firestore + Auth");

    _realAuth = {
      async signUpWithEmail(email, password) {
        const c = await createUserWithEmailAndPassword(auth, email, password);
        return c.user;
      },
      async signInWithEmail(email, password) {
        const c = await signInWithEmailAndPassword(auth, email, password);
        return c.user;
      },
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const c = await signInWithPopup(auth, provider);
        return c.user;
      },
      async signOut()              { return signOut(auth); },
      getUser()                    { return auth.currentUser; },
      onAuthStateChange(cb)        { return onAuthStateChanged(auth, cb); },
    };

    _realDB = {
      async saveUser(uid, data)        { await setDoc(doc(db,"users",uid), { ...data, uid, createdAt: Date.now() }); return { uid, ...data }; },
      async getUser(uid)               { const s = await getDoc(doc(db,"users",uid)); return s.exists() ? s.data() : null; },
      async savePolicy(policyId, data) { await setDoc(doc(db,"policies",policyId), { ...data, policyId, createdAt: Date.now(), status: "active" }); return { policyId, ...data }; },
      async getPolicy(policyId)        { const s = await getDoc(doc(db,"policies",policyId)); return s.exists() ? s.data() : null; },
      async getUserPolicies(uid)       { const q = query(collection(db,"policies"), where("userId","==",uid)); const s = await getDocs(q); return s.docs.map(d => d.data()); },
      async saveClaim(claim)           { const ref = await addDoc(collection(db,"claims"), { ...claim, createdAt: Date.now(), status: claim.fraudFlag ? "partial-hold" : "auto-approved" }); return { id: ref.id, ...claim }; },
      async getUserClaims(uid)         { const q = query(collection(db,"claims"), where("uid","==",uid)); const s = await getDocs(q); return s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.createdAt-a.createdAt); },
      async updateClaimStatus(id, st)  { await updateDoc(doc(db,"claims",id), { status: st }); },
      async saveEarnings(userId, records) { await setDoc(doc(db,"earnings",userId), { userId, records, updatedAt: Date.now() }); return records; },
      async getUserEarnings(userId)    { const s = await getDoc(doc(db,"earnings",userId)); return s.exists() ? s.data().records : []; },
      async savePlatformActivity(city, records) { await setDoc(doc(db,"platform_activity",city), { city, records, updatedAt: Date.now() }); return records; },
      async getPlatformActivity(city)  { const s = await getDoc(doc(db,"platform_activity",city)); return s.exists() ? s.data().records : []; },
      async saveRiskSnapshot(zoneId, data) { await setDoc(doc(db,"risk_data",zoneId), { ...data, zoneId, savedAt: Date.now() }); return data; },
      async getRiskSnapshot(zoneId)    { const s = await getDoc(doc(db,"risk_data",zoneId)); return s.exists() ? s.data() : null; },
      async getGlobalRiskConfig()      { const s = await getDoc(doc(db,"config","global_risk")); return s.exists() ? s.data() : { isOn: false }; },
      async setGlobalRiskConfig(isOn, uid) { await setDoc(doc(db,"config","global_risk"), { isOn, updatedAt: Date.now(), updatedBy: uid||"admin" }); return { isOn }; },
    };
  } catch (err) {
    console.warn("[Firebase] Could not connect, using mock:", err.message);
    _realDB = null; _realAuth = null;
  }
}

if (isRealConfig) buildRealFirebase();

// ── Exported Auth ─────────────────────────────────────────────
export const Auth = {
  signUpWithEmail:  (...a) => (_realAuth || MockAuth).signUpWithEmail(...a),
  signInWithEmail:  (...a) => (_realAuth || MockAuth).signInWithEmail(...a),
  signInWithGoogle: (...a) => (_realAuth || MockAuth).signInWithGoogle(...a),
  signOut:          (...a) => (_realAuth || MockAuth).signOut(...a),
  getUser:          ()     => (_realAuth || MockAuth).getUser(),
  onAuthStateChange:(...a) => (_realAuth || MockAuth).onAuthStateChange(...a),
};

// ── Exported DB ───────────────────────────────────────────────
export const DB = {
  saveUser:             (...a) => (_realDB || MockDB).saveUser(...a),
  getUser:              (...a) => (_realDB || MockDB).getUser(...a),
  savePolicy:           (...a) => (_realDB || MockDB).savePolicy(...a),
  getPolicy:            (...a) => (_realDB || MockDB).getPolicy(...a),
  getUserPolicies:      (...a) => (_realDB || MockDB).getUserPolicies(...a),
  saveClaim:            (...a) => (_realDB || MockDB).saveClaim(...a),
  getUserClaims:        (...a) => (_realDB || MockDB).getUserClaims(...a),
  updateClaimStatus:    (...a) => (_realDB || MockDB).updateClaimStatus(...a),
  saveEarnings:         (...a) => (_realDB || MockDB).saveEarnings(...a),
  getUserEarnings:      (...a) => (_realDB || MockDB).getUserEarnings(...a),
  savePlatformActivity: (...a) => (_realDB || MockDB).savePlatformActivity(...a),
  getPlatformActivity:  (...a) => (_realDB || MockDB).getPlatformActivity(...a),
  saveRiskSnapshot:     (...a) => (_realDB || MockDB).saveRiskSnapshot(...a),
  getRiskSnapshot:      (...a) => (_realDB || MockDB).getRiskSnapshot(...a),
  getGlobalRiskConfig:  (...a) => (_realDB || MockDB).getGlobalRiskConfig(...a),
  setGlobalRiskConfig:  (...a) => (_realDB || MockDB).setGlobalRiskConfig(...a),
  isLive:               ()     => _realDB !== null,
};

// ── Razorpay Mock ─────────────────────────────────────────────
const rid = (p) => `${p}_${Math.random().toString(36).slice(2,10).toUpperCase()}`;
export const Razorpay = {
  createOrder:    (amt)      => new Promise(r => setTimeout(() => r({ id: rid("order"), amount: amt, status: "created"   }), 400)),
  capturePayment: (orderId)  => new Promise(r => setTimeout(() => r({ id: rid("pay"),   orderId,   status: "captured"  }), 800)),
  processPayout:  (uid, amt) => new Promise(r => setTimeout(() => r({ utr: rid("UTR"),  amount: amt, status: "processed" }), 600)),
};
