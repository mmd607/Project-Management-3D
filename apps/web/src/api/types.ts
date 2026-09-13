export type Confidence = "DETERMINISTIC" | "INFERRED" | "AI_INFERRED" | "UNKNOWN";

export interface Workspace {
  id: string;
  rootPath: string;
  displayName: string;
  createdAt: string;
  lastScanAt: string | null;
}

export interface IntelligenceProfile {
  id: string;
  description: string;
  category: string;
  projectType: string;
  architectureSummary: string;
  healthSummary: string;
  providerMode: string;
  confidence: Confidence;
  generatedAt: string;
}

export interface ScanResultSummary {
  id: string;
  status: "OK" | "PARTIAL" | "FAILED";
  fileCount: number;
  directoryCount: number;
  totalSizeBytes: number;
  truncated: boolean;
  startedAt: string;
  completedAt: string | null;
  errors: string | null;
}

export type HealthComponentKey = "tests" | "documentation" | "dependencies" | "structure" | "activity";

export interface HealthComponentResult {
  key: HealthComponentKey;
  label: string;
  weight: number;
  score: number | null;
  method: string;
  evidenceRefs: string[];
}

export interface HealthScoreResult {
  version: string;
  computedAt: string;
  overallScore: number | null;
  coverage: number;
  components: HealthComponentResult[];
}

export interface ProjectListItem {
  id: string;
  name: string;
  rootPath: string;
  discoveryConfidence: Confidence;
  intelligenceProfile: IntelligenceProfile | null;
  scanResults: ScanResultSummary[];
}

export interface Evidence {
  id: string;
  evidenceType: string;
  sourcePath: string;
  key: string;
  value: string;
  confidence: Confidence;
}

export interface Technology {
  id: string;
  name: string;
  kind: string;
  evidenceSource: string;
  confidence: Confidence;
}

export interface Recommendation {
  id: string;
  text: string;
  rationale: string;
  confidence: Confidence;
}

export interface ProjectDetail extends ProjectListItem {
  evidence: Evidence[];
  technologies: Technology[];
  recommendations: Recommendation[];
  healthScore: HealthScoreResult | null;
}

export interface AiInsight {
  id: string;
  projectId: string;
  kind: string;
  providerMode: string;
  outputText: string;
  confidence: Confidence;
  createdAt: string;
}

export interface ScanSummary {
  workspaceId: string;
  discoveredProjectCount: number;
  discoveryErrors: { path: string; message: string }[];
  projects: {
    projectId: string;
    name: string;
    rootPath: string;
    status: "OK" | "PARTIAL" | "FAILED";
    fileCount: number;
    directoryCount: number;
    errors: { path: string; message: string }[];
  }[];
}
