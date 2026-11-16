export type ViewMode =
  | 'home'
  | 'learn'
  | 'ai-assistant'
  | 'jobs'
  | 'profile'
  | 'tasks'
  | 'voice'
  | 'tutor'
  | 'chat'
  | 'notes'
  | 'videos'
  | 'research'
  | 'apps'
  | 'interview'
  | 'resume-analyzer'
  | 'resume-builder'
  | 'companies'
  | 'roadmap'
  | 'skill-gap'
  | 'linkedin'
  | 'not-found';

export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export type AIProviderId = 'gemini' | 'openai' | 'anthropic';

export interface AIModelOption {
  id: string;
  label: string;
  tier: 'free' | 'standard';
}

export interface AIProviderInfo {
  id: AIProviderId;
  name: string;
  configured: boolean;
  defaultModel: string;
  models: AIModelOption[];
  statusMessage: string;
}

export interface AISettings {
  provider: AIProviderId;
  model: string;
  responseStyle: 'concise' | 'balanced' | 'comprehensive';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  allowFallback: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'private' | 'mentors';
  saveChatHistory: boolean;
  notificationsEnabled: boolean;
}

export type ThemePreference = 'dark' | 'light' | 'system';

export type LearningLanguage = 'en' | 'ta' | 'tanglish' | 'hi' | 'te' | 'ml' | 'kn';
export type SupportedLanguage = 'auto' | LearningLanguage;

export type ThemeId =
  | 'midnight-gold'
  | 'ocean-blue'
  | 'forest-green'
  | 'royal-purple'
  | 'sunset-orange'
  | 'rose-pink'
  | 'warm-cream'
  | 'high-contrast'
  | 'custom';

export interface CustomThemeColors {
  background: string;
  surface: string;
  accent: string;
  buttonBg: string;
  buttonText: string;
  textPrimary: string;
}

export type StudyNoteCategory =
  | 'College Subjects'
  | 'Programming'
  | 'Technical Skills'
  | 'Career Preparation'
  | 'Interview Preparation'
  | 'Courses'
  | 'Personal Notes';

export interface StudyNote {
  id: string;
  title: string;
  content: string;
  category: StudyNoteCategory;
  subject?: string;
  linkedSkillId?: string;
  linkedSkillName?: string;
  isFavorite: boolean;
  aiGenerated: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTask {
  id: string;
  title: string;
  dayOfWeek: DayOfWeek;
  category: 'Coding & DSA' | 'Interview Prep' | 'Resume & LinkedIn' | 'Projects' | 'Core CS & System Design' | 'Academic & Department' | 'Study Schedule';
  completed: boolean;
  estimatedMinutes: number;
  priority: 'High' | 'Medium' | 'Low';
  deadline?: string;
  notes?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate: string; // YYYY-MM-DD
  activeDaysThisWeek: DayOfWeek[];
  totalTasksCompleted: number;
  freezeAvailable: boolean;
  checkInHistory: string[]; // List of YYYY-MM-DD
  rewardPoints?: number;
  badges?: string[];
  rewardedTaskIds?: string[];
  rewardedCheckInDates?: string[];
}

export interface EducationalVideo {
  id: string;
  title: string;
  channel: string;
  category: 'Computer Science' | 'Web Development' | 'AI & ML' | 'DevOps & Cloud' | 'Career & Interview';
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  youtubeId: string;
  description: string;
  topics: string[];
}

export interface ResearchWebsite {
  id: string;
  name: string;
  category: 'Official Docs' | 'Interactive Learning' | 'System Design' | 'CS Fundamentals' | 'Open Source Guides';
  url: string;
  description: string;
  badge: string;
  features: string[];
}

export interface CuratedApp {
  id: string;
  name: string;
  category: 'Coding & Terminal' | 'Note Taking & Knowledge' | 'Interview Prep' | 'Focus & Productivity';
  platforms: ('Android' | 'Web' | 'Desktop' | 'iOS')[];
  pricing: 'Free' | 'Freemium' | 'Open Source';
  rating: number;
  description: string;
  pros: string[];
  url: string;
}

export interface CompanyCareerPortal {
  id: string;
  name: string;
  logoText: string;
  origin: 'India' | 'Global / MNC';
  industry: string;
  locationType: 'Remote-Friendly' | 'Hybrid' | 'Pan-India Hubs' | 'Global Hubs';
  careersUrl: string;
  cultureGuideUrl: string;
  openRolesCount: string;
  hiringPrograms: string[];
  perks: string[];
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  country: 'India' | 'United States' | 'Global / Remote';
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Fresher / Trainee' | 'Graduate' | 'Apprenticeship';
  workplace: 'Remote' | 'Hybrid' | 'On-site';
  salaryInr: string;
  salaryUsd: string;
  packageCombined: string;
  experience: 'College Student' | 'Fresher' | 'Entry-Level' | 'Mid-Level' | 'Senior';
  posted: string;
  skills: string[];
  applyUrl: string;
  description: string;
  source: string;
  lastVerifiedDate: string;
  applicationDeadline?: string;
}

export interface TrackedJobApplication {
  jobId: string;
  status: 'Wishlist' | 'Applied' | 'Interviewing' | 'Offered' | 'Archived';
  notes: string;
  deadline?: string;
  appliedDate?: string;
}

export interface KnownSkill {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface StudentProject {
  id: string;
  title: string;
  technologies: string;
  description: string;
  link?: string;
  date?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  year: string;
  url?: string;
}

export interface InternshipExperience {
  id: string;
  role: string;
  company: string;
  duration: string;
  description: string;
}

export interface CurrentActivities {
  currentCourse: string;
  currentProject: string;
  skillsPracticing: string;
  currentLearningGoals: string;
  internshipSearchStatus: 'Actively Searching' | 'Preparing' | 'Accepted Offer' | 'Not Looking';
  weeklyTargetHours: number;
}

export interface CareerGoals {
  shortTermGoals: string;
  longTermGoals: string;
  dreamJob: string;
  careerCategory?: string;
  preferredIndustries: string[];
  targetCompanies: string[];
  preferredLocations: string[];
  workplacePreference: 'Remote' | 'Hybrid' | 'On-site';
  targetSalaryInr: string;
  targetSalaryUsd: string;
  requiredSkills: string[];
}

export interface UserProfile {
  name: string;
  avatar?: string;
  email: string;
  phone?: string;
  country: string;
  city: string;
  college: string;
  degree: string;
  department: string;
  departmentCategory?: string;
  interests?: string[];
  yearOfStudy: '1st Year' | '2nd Year' | '3rd Year' | 'Final Year' | 'Recent Graduate' | 'Working Professional';
  graduationYear: string;
  currentOccupation: string;

  knownSkills: KnownSkill[];
  learningSkills: string[];
  wantToLearnSkills: string[];
  completedProjects: StudentProject[];
  certifications: Certification[];
  internships: InternshipExperience[];

  currentActivities: CurrentActivities;
  careerGoals: CareerGoals;

  savedJobs: string[];
  trackedApplications: TrackedJobApplication[];
  completedRoadmapNodes: string[];
  bookmarkedVideos: string[];
  lastInterviewScore?: number;
  weeklyTasks?: WeeklyTask[];
  streakData?: StreakData;

  dataSaverMode: boolean;
  currencyPreference: 'both' | 'inr' | 'usd';
  preferredLanguage: LearningLanguage;
  theme: 'light' | 'dark';
  themePreference?: ThemePreference;
  customThemeId?: ThemeId;
  customThemeColors?: CustomThemeColors;
  aiSettings?: AISettings;
  privacySettings?: PrivacySettings;
}

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  duration: string;
  skills: string[];
  completed?: boolean;
  resources: { name: string; url: string }[];
}

export interface CareerTrack {
  id: string;
  title: string;
  tagline: string;
  avgSalaryInr: string;
  avgSalaryUsd: string;
  avgSalaryCombined: string;
  difficulty: string;
  iconName: string;
  nodes: RoadmapNode[];
}

export type RoadmapSkillStatus = 'not-started' | 'learning' | 'completed';

export interface DynamicRoadmapSkill {
  id: string;
  name: string;
  meaning: string;
  whyRequired: string;
  whatToLearn: string[];
  resources: { name: string; url: string; type: string }[];
  youtubeTopics: string[];
  practicalExercises: string[];
  estimatedHours: number;
  estimatedTimeLabel: string;
  status: RoadmapSkillStatus;
}

export interface DynamicRoadmapStage {
  id: string;
  stageNumber: number;
  title: string;
  description: string;
  skills: DynamicRoadmapSkill[];
}

export interface CareerRoadmapPlan {
  id: string;
  careerTitle: string;
  careerCategory: string;
  summary: string;
  estimatedMonths: number;
  disclaimer?: string;
  stages: DynamicRoadmapStage[];
  weeklySchedule: { day: string; hours: number; focus: string; activity: string }[];
  monthlyPlan: { month: number; theme: string; goals: string[]; milestoneProject: string }[];
  updatedAt?: string;
}

export interface ResumeData {
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    portfolioUrl: string;
    linkedinUrl: string;
    githubUrl: string;
  };
  summary: string;
  experience: {
    id: string;
    title: string;
    company: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    graduationYear: string;
    gpa?: string;
  }[];
  projects: {
    id: string;
    name: string;
    technologies: string;
    link?: string;
    description: string;
  }[];
  skills: {
    category: string;
    items: string;
  }[];
  certifications?: {
    id: string;
    name: string;
    issuer: string;
    year: string;
  }[];
  achievements?: string[];
  languages?: string[];
}

export interface UserSession {
  isAuthenticated: boolean;
  isGuest: boolean;
  uid?: string;
  authProvider?: 'google' | 'firebase-email' | 'local-email' | 'guest';
  emailVerified?: boolean;
  workspaceConnected?: boolean;
  email: string;
  name: string;
  avatar?: string;
}

export interface AcquiredSkillItem {
  name: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  assessment: string;
}

export interface RequiredSkillItem {
  name: string;
  category: string;
  importance: string;
}

export interface MissingSkillItem {
  id: string;
  name: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  whyImportant: string;
  estimatedWeeks: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

export interface LearningRoadmapPhase {
  phase: string;
  title: string;
  timeframe: string;
  milestones: string[];
  recommendedDeliverable: string;
}

export interface WeeklyTimetableSlot {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  focus: string;
  hours: number;
  actionItems: string;
}

export interface PortfolioProjectBlueprint {
  title: string;
  concept: string;
  techStack: string;
  architectureHighlights: string;
  resumeBullet: string;
}

export interface SkillGapAnalysisResult {
  acquiredSkills: AcquiredSkillItem[];
  requiredSkills: RequiredSkillItem[];
  missingSkills: MissingSkillItem[];
  learningRoadmap: LearningRoadmapPhase[];
  weeklyTimetable: WeeklyTimetableSlot[];
  portfolioProjects: PortfolioProjectBlueprint[];
  certificationsAndInterviews: {
    certifications: { name: string; issuer: string; whyValuable: string }[];
    topInterviewTopics: string[];
  };
  recommendedResources: {
    name: string;
    type: string;
    url: string;
    topics: string;
  }[];
  progressSummary: {
    matchPercentage: number;
    totalRequired: number;
    skillsMastered: number;
    skillsMissing: number;
    recommendedNextStep: string;
  };
  estimatedTimeline: {
    totalMonths: number;
    weeklyHours: number;
    explanation: string;
  };
  disclaimer: string;
}

export interface InterviewScorecard {
  overallScore: number;
  readinessGrade: string;
  executiveSummary: string;
  topStrengths: string[];
  areasToFocus: string[];
  recommendedStudyActions: string[];
}
