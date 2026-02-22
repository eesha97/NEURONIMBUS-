export type UserRole = 'caregiver' | 'patient';

export interface User {
  uid: string;
  role: UserRole;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: number; // timestamp
  patientUid?: string; // For caregivers, the UID of the patient they are assigned to
}

export interface Memory {
  id: string;
  ownerUid: string; // original creator UID
  caregiverUid?: string; // Legacy field
  patientUid: string;
  photoUrl: string;
  publicId?: string; // Cloudinary public_id for deletion
  photoHint: string;
  caption: string;
  createdAt: number; // timestamp
  event?: {
    id: string;
    title: string;
  };
  people: Pick<Person, 'id' | 'displayName' | 'faceThumbUrl' | 'faceThumbHint'>[];
  keywords: string[];
  label?: string; // Legacy singular label
  labels: string[]; // Grouping labels (e.g. ["Amma", "Grandma"])
  uploadedBy: string[]; // List of caregiver UIDs who shared/labeled this
  labelMap?: Record<string, string>; // UID -> Label mapping for precise deletion
  imageHash: string;
  duplicateStatus: 'none' | 'candidate' | 'hidden' | 'confirmed';
  processing?: {
    status: 'queued' | 'processing' | 'done' | 'error';
    errorMessage?: string;
  };
}

export interface Person {
  id: string;
  patientUid: string;
  displayName: string;
  relationshipTag?: string;
  faceThumbUrl: string;
  faceThumbHint: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface Event {
  id: string;
  patientUid: string;
  title: string;
  date?: number; // timestamp
  createdAt: number; // timestamp
  memoryCount: number;
  description?: string;
  images?: { url: string; publicId: string }[];
  imageUrls?: string[]; // Deprecated, kept for backward compatibility if needed
  coverPhotoUrl?: string;
  coverPhotoHint?: string;
}

export interface Note {
  id?: string;
  text: string;
  createdAt: number; // timestamp
}

export interface NoteSession {
  id: string;
  caregiverUid: string;
  patientUid: string;
  title: string;
  notes: Note[];
  summaryText?: string;
  summaryKeywords?: string[];
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}
