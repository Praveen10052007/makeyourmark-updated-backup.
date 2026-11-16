import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  deleteUser,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocFromServer,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { CareerRoadmapPlan, ResumeData, StudyNote, UserProfile, WeeklyTask } from '../types';

export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
];

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || '(default)';
function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      databaseId
    );
  } catch {
    return getFirestore(app, databaseId);
  }
}
export const db = createFirestoreInstance();

const googleProvider = new GoogleAuthProvider();
WORKSPACE_SCOPES.forEach((scope) => googleProvider.addScope(scope));

// In-memory only cache for Google Workspace OAuth access token (never stored in localStorage/sessionStorage)
let cachedWorkspaceToken: string | null = null;
let isSigningInFlag = false;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
let connectionChecked = false;
export async function testFirestoreConnection(): Promise<boolean> {
  if (connectionChecked) return true;
  connectionChecked = true;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      const isOffline = msg.includes('the client is offline') || msg.includes('unavailable');
      if (!isOffline) {
        // e.g. permission-denied confirms live reachability to Firestore backend
        return true;
      }
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      console.error('Please check your Firebase configuration.');
      return false;
    }
  }
  return true;
}

export function initFirebaseAuth(
  onUserActive: (user: User, hasWorkspaceToken: boolean) => void,
  onSignedOut: () => void
) {
  testFirestoreConnection().catch(() => {});
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onUserActive(user, Boolean(cachedWorkspaceToken));
    } else if (!isSigningInFlag) {
      cachedWorkspaceToken = null;
      onSignedOut();
    }
  });
}

export function getWorkspaceAccessToken(): string | null {
  return cachedWorkspaceToken;
}

export async function signInWithGoogleWorkspace(): Promise<{
  user: User;
  accessToken: string | null;
}> {
  isSigningInFlag = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedWorkspaceToken = credential?.accessToken || null;
    return {
      user: result.user,
      accessToken: cachedWorkspaceToken,
    };
  } finally {
    isSigningInFlag = false;
  }
}

export async function signUpWithFirebaseEmail(name: string, email: string, password: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await sendEmailVerification(cred.user).catch(() => {});
  return cred.user;
}

export async function signInWithFirebaseEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function sendFirebasePasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

export async function resendFirebaseVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No active Firebase user signed in.');
  }
  await sendEmailVerification(auth.currentUser);
}

export async function reloadFirebaseUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function logoutFirebase(): Promise<void> {
  cachedWorkspaceToken = null;
  await firebaseSignOut(auth);
}

// ============================================================================
// FIRESTORE SYNC HELPERS (STRICTLY SCHEMA-BOUNDED & VERIFIED OWNER ONLY)
// ============================================================================
function canWriteFirestore(): boolean {
  const u = auth.currentUser;
  return Boolean(u && u.uid && u.emailVerified);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
  return cleaned || `doc_${Date.now()}`;
}

export async function syncProfileToFirestore(profile: UserProfile): Promise<boolean> {
  if (!canWriteFirestore() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const docPath = `users/${uid}`;
  const docRef = doc(db, 'users', uid);

  try {
    const existingSnap = await getDoc(docRef);
    const basePayload = {
      uid,
      name: (profile.name || 'Student').slice(0, 120),
      email: (profile.email || auth.currentUser.email || '').slice(0, 200),
      phone: (profile.phone || '').slice(0, 40),
      city: (profile.city || '').slice(0, 100),
      country: (profile.country || '').slice(0, 100),
      college: (profile.college || '').slice(0, 200),
      degree: (profile.degree || '').slice(0, 150),
      department: (profile.department || '').slice(0, 150),
      departmentCategory: (profile.departmentCategory || '').slice(0, 120),
      interests: (profile.interests || []).slice(0, 30),
      yearOfStudy: profile.yearOfStudy || '3rd Year',
      graduationYear: (profile.graduationYear || '').slice(0, 10),
      dreamJob: (profile.careerGoals?.dreamJob || '').slice(0, 160),
      preferredLanguage: profile.preferredLanguage || 'en',
      themePreference: profile.themePreference || 'dark',
      customThemeId: (profile.customThemeId || 'sunset-orange').slice(0, 40),
      ...(profile.customThemeColors ? { customThemeColors: profile.customThemeColors } : {}),
      currencyPreference: profile.currencyPreference || 'both',
      dataSaverMode: Boolean(profile.dataSaverMode),
      profileVisibility: profile.privacySettings?.profileVisibility || 'private',
      saveChatHistory: profile.privacySettings?.saveChatHistory !== false,
      weeklyTargetHours: Math.min(168, Math.max(0, Number(profile.currentActivities?.weeklyTargetHours || 10))),
      currentStreak: Math.max(0, Number(profile.streakData?.currentStreak || 0)),
      longestStreak: Math.max(0, Number(profile.streakData?.longestStreak || 0)),
      lastCheckInDate: (profile.streakData?.lastCheckInDate || '').slice(0, 20),
      totalTasksCompleted: Math.max(0, Number(profile.streakData?.totalTasksCompleted || 0)),
      rewardPoints: Math.max(0, Number(profile.streakData?.rewardPoints || 0)),
      badges: (profile.streakData?.badges || []).slice(0, 30),
      rewardedTaskIds: (profile.streakData?.rewardedTaskIds || []).slice(0, 200),
      rewardedCheckInDates: (profile.streakData?.rewardedCheckInDates || []).slice(0, 200),
      lastInterviewScore: Math.min(100, Math.max(0, Number(profile.lastInterviewScore || 0))),
      knownSkills: (profile.knownSkills || []).slice(0, 60),
      learningSkills: (profile.learningSkills || []).slice(0, 60),
      wantToLearnSkills: (profile.wantToLearnSkills || []).slice(0, 60),
      bookmarkedVideos: (profile.bookmarkedVideos || []).slice(0, 100),
      savedJobs: (profile.savedJobs || []).slice(0, 100),
      completedRoadmapNodes: (profile.completedRoadmapNodes || []).slice(0, 200),
      updatedAt: serverTimestamp(),
    };

    if (!existingSnap.exists()) {
      await setDoc(docRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, basePayload, { merge: true });
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, docPath);
  }
}

export async function fetchProfileFromFirestore(): Promise<Record<string, any> | null> {
  if (!canWriteFirestore() || !auth.currentUser) return null;
  const uid = auth.currentUser.uid;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function syncNoteToFirestore(note: StudyNote): Promise<boolean> {
  if (!canWriteFirestore() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const noteId = sanitizeId(note.id);
  const path = `users/${uid}/notes/${noteId}`;
  const docRef = doc(db, 'users', uid, 'notes', noteId);

  try {
    const snap = await getDoc(docRef);
    const payload = {
      id: noteId,
      userId: uid,
      title: note.title.slice(0, 200) || 'Untitled Note',
      content: note.content.slice(0, 50000),
      category: note.category,
      subject: (note.subject || '').slice(0, 150),
      linkedSkillId: (note.linkedSkillId || '').slice(0, 128),
      linkedSkillName: (note.linkedSkillName || '').slice(0, 160),
      isFavorite: Boolean(note.isFavorite),
      aiGenerated: Boolean(note.aiGenerated),
      tags: (note.tags || []).slice(0, 20).map((t) => String(t).slice(0, 40)),
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(docRef, { ...payload, createdAt: serverTimestamp() });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteNoteFromFirestore(noteId: string): Promise<void> {
  if (!canWriteFirestore() || !auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const cleanId = sanitizeId(noteId);
  const path = `users/${uid}/notes/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notes', cleanId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchNotesFromFirestore(): Promise<StudyNote[]> {
  if (!canWriteFirestore() || !auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  const path = `users/${uid}/notes`;
  try {
    const q = query(collection(db, 'users', uid, 'notes'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: String(data.title || ''),
        content: String(data.content || ''),
        category: data.category || 'Personal Notes',
        subject: data.subject || '',
        linkedSkillId: data.linkedSkillId || undefined,
        linkedSkillName: data.linkedSkillName || undefined,
        isFavorite: Boolean(data.isFavorite),
        aiGenerated: Boolean(data.aiGenerated),
        tags: Array.isArray(data.tags) ? data.tags : [],
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function syncTaskToFirestore(task: WeeklyTask): Promise<boolean> {
  if (!canWriteFirestore() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const taskId = sanitizeId(task.id);
  const path = `users/${uid}/tasks/${taskId}`;
  const docRef = doc(db, 'users', uid, 'tasks', taskId);
  try {
    const snap = await getDoc(docRef);
    const payload = {
      id: taskId,
      userId: uid,
      title: task.title.slice(0, 240) || 'Study Task',
      dayOfWeek: task.dayOfWeek,
      category: task.category,
      completed: Boolean(task.completed),
      estimatedMinutes: Math.min(600, Math.max(5, Number(task.estimatedMinutes || 30))),
      priority: task.priority,
      deadline: (task.deadline || '').slice(0, 30),
      notes: (task.notes || '').slice(0, 2000),
      ...(task.completedAt ? { completedAt: task.completedAt.slice(0, 40) } : {}),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(docRef, { ...payload, createdAt: serverTimestamp() });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchTasksFromFirestore(): Promise<WeeklyTask[]> {
  if (!canWriteFirestore() || !auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  const path = `users/${uid}/tasks`;
  try {
    const q = query(collection(db, 'users', uid, 'tasks'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: String(data.title || 'Study Task'),
        dayOfWeek: data.dayOfWeek || 'Monday',
        category: data.category || 'Coding & DSA',
        completed: Boolean(data.completed),
        estimatedMinutes: Number(data.estimatedMinutes || 30),
        priority: data.priority || 'Medium',
        deadline: data.deadline || undefined,
        notes: data.notes || undefined,
        completedAt: data.completedAt || undefined,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function syncRoadmapToFirestore(roadmap: CareerRoadmapPlan): Promise<boolean> {
  if (!canWriteFirestore() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const roadmapId = sanitizeId(roadmap.id);
  const path = `users/${uid}/roadmaps/${roadmapId}`;
  const docRef = doc(db, 'users', uid, 'roadmaps', roadmapId);
  try {
    const snap = await getDoc(docRef);
    const payload = {
      id: roadmapId,
      userId: uid,
      careerTitle: roadmap.careerTitle.slice(0, 160),
      careerCategory: roadmap.careerCategory.slice(0, 120),
      summary: roadmap.summary.slice(0, 2000),
      estimatedMonths: Math.min(60, Math.max(1, Number(roadmap.estimatedMonths || 6))),
      stages: (roadmap.stages || []).slice(0, 12),
      weeklySchedule: (roadmap.weeklySchedule || []).slice(0, 7),
      monthlyPlan: (roadmap.monthlyPlan || []).slice(0, 12),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(docRef, { ...payload, createdAt: serverTimestamp() });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchRoadmapsFromFirestore(): Promise<CareerRoadmapPlan[]> {
  if (!canWriteFirestore() || !auth.currentUser) return [];
  const uid = auth.currentUser.uid;
  const path = `users/${uid}/roadmaps`;
  try {
    const q = query(collection(db, 'users', uid, 'roadmaps'), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        careerTitle: String(data.careerTitle || 'Career Roadmap'),
        careerCategory: String(data.careerCategory || 'General'),
        summary: String(data.summary || ''),
        estimatedMonths: Number(data.estimatedMonths || 6),
        stages: Array.isArray(data.stages) ? data.stages : [],
        weeklySchedule: Array.isArray(data.weeklySchedule) ? data.weeklySchedule : [],
        monthlyPlan: Array.isArray(data.monthlyPlan) ? data.monthlyPlan : [],
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function syncResumeToFirestore(resume: ResumeData, template: string, targetRole: string): Promise<boolean> {
  if (!canWriteFirestore() || !auth.currentUser) return false;
  const uid = auth.currentUser.uid;
  const resumeId = 'primary_resume';
  const path = `users/${uid}/resumes/${resumeId}`;
  const docRef = doc(db, 'users', uid, 'resumes', resumeId);
  try {
    const snap = await getDoc(docRef);
    const payload = {
      id: resumeId,
      userId: uid,
      template,
      targetRole: (targetRole || 'Candidate').slice(0, 160),
      personalInfo: resume.personalInfo,
      summary: (resume.summary || '').slice(0, 3000),
      experience: (resume.experience || []).slice(0, 20),
      education: (resume.education || []).slice(0, 10),
      projects: (resume.projects || []).slice(0, 20),
      skills: (resume.skills || []).slice(0, 25),
      certifications: (resume.certifications || []).slice(0, 20),
      achievements: (resume.achievements || []).slice(0, 20),
      languages: (resume.languages || []).slice(0, 15),
      updatedAt: serverTimestamp(),
    };
    if (!snap.exists()) {
      await setDoc(docRef, { ...payload, createdAt: serverTimestamp() });
    } else {
      await setDoc(docRef, payload, { merge: true });
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function deleteAllUserCloudData(): Promise<void> {
  if (!canWriteFirestore() || !auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const subcollections = ['notes', 'tasks', 'roadmaps', 'resumes'] as const;
  try {
    for (const sub of subcollections) {
      const q = query(collection(db, 'users', uid, sub), where('userId', '==', uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
    await deleteDoc(doc(db, 'users', uid));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
  }
}

export async function deleteFirebaseAccount(): Promise<void> {
  if (auth.currentUser) {
    await deleteAllUserCloudData().catch(() => {});
    await deleteUser(auth.currentUser);
  }
}

// ============================================================================
// GOOGLE DOCS & GOOGLE DRIVE API HELPERS (CLIENT-SIDE TOKEN ONLY)
// ============================================================================
export interface DriveFileSummary {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export async function exportTextToGoogleDoc(title: string, bodyText: string): Promise<{
  documentId: string;
  title: string;
  docUrl: string;
}> {
  const token = cachedWorkspaceToken;
  if (!token) {
    throw new Error('Google Workspace permission not active. Please click "Sign in with Google" first.');
  }

  // 1. Create the Google Doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title: title.slice(0, 120) || 'MakeYourMark Document' }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !created.documentId) {
    throw new Error(created?.error?.message || `Failed to create Google Doc (${createRes.status}).`);
  }

  // 2. Insert formatted content into the newly created Google Doc
  if (bodyText.trim()) {
    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${created.documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: bodyText,
            },
          },
        ],
      }),
    });
    if (!updateRes.ok) {
      const errData = await updateRes.json().catch(() => ({}));
      throw new Error(errData?.error?.message || 'Google Doc was created, but writing content failed.');
    }
  }

  return {
    documentId: created.documentId,
    title: created.title || title,
    docUrl: `https://docs.google.com/document/d/${created.documentId}/edit`,
  };
}

export async function listAppDriveFiles(): Promise<DriveFileSummary[]> {
  const token = cachedWorkspaceToken;
  if (!token) {
    throw new Error('Google Workspace permission not active. Please click "Sign in with Google" first.');
  }

  const res = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,modifiedTime,webViewLink)&orderBy=modifiedTime desc',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Google Drive request failed (${res.status}).`);
  }
  return Array.isArray(data.files) ? data.files : [];
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = cachedWorkspaceToken;
  if (!token) {
    throw new Error('Google Workspace permission not active.');
  }
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Could not delete Drive file (${res.status}).`);
  }
}
