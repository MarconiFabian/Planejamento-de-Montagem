export enum StageStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED', // e.g., missing scaffolding
  ISSUE = 'ISSUE' // e.g., inspection failed
}

export interface PipelineStage {
  id: string;
  label: string;
  status: StageStatus;
  icon: string; // Icon name reference
  requiredResources: string[]; // e.g., "Crane 70t", "Welder x2"
}

export interface PipeSegment {
  id: string;
  name: string;
  type: 'PIPE' | 'ELBOW' | 'VALVE' | 'SUPPORT' | 'CANTILEVER';
  x: number; // Central X coordinate
  y: number; // Central Y coordinate
  coordinates: string; // SVG path data (generated from x,y)
  length?: string; // e.g., "6m"
  weight?: string; // e.g., "250kg" or diameter/rotation info
  description: string;
  stages: {
    scaffolding: PipelineStage;
    lifting: PipelineStage; // Positioning with Munk/Crane
    welding: PipelineStage;
    inspection: PipelineStage; // QC / RX
    hydrotest: PipelineStage;
    insulation: PipelineStage;
  };
}

export interface AIAdvice {
  segmentId: string;
  message: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  actionItems: string[];
}