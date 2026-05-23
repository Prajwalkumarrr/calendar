// Pure types and constants — safe to import in client components.
// No mongodb dependency here.

export type HiringStage = 'screen' | 'technical' | 'founder' | 'offer' | 'rejected';

export const HIRING_STAGES: { id: HiringStage; label: string; color: string }[] = [
  { id: 'screen',    label: 'Screen',       color: '#748AA6' },
  { id: 'technical', label: 'Technical',    color: '#997594' },
  { id: 'founder',   label: 'Founder Call', color: '#C49746' },
  { id: 'offer',     label: 'Offer',        color: '#7E9C7A' },
  { id: 'rejected',  label: 'Rejected',     color: '#A19D94' },
];

export type CandidateDTO = {
  id: string;
  ownerId: string;
  name: string;
  email?: string;
  role: string;
  stage: HiringStage;
  notes?: string;
  linkedinUrl?: string;
  createdAt: string;
  updatedAt: string;
};
