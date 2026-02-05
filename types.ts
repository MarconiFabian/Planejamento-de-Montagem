
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
  date?: string; // Data de realização da etapa
}

export interface PipeSegment {
  id: string;
  name: string;
  type: 'PIPE' | 'ELBOW' | 'VALVE' | 'SUPPORT' | 'CANTILEVER' | 'RECTANGLE' | 'CIRCLE' | 'FLOATING' | 'ZONE' | 'TEXT';
  x: number; // Central X coordinate
  y: number; // Central Y coordinate
  coordinates: string; // SVG path data (generated from x,y)
  length?: string; // e.g., "6m" or Width
  weight?: string; // e.g., "250kg" or Height
  description: string;
  // Text Styling Properties
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  
  joints?: StageStatus[]; // New: Independent weld status for each joint [Joint1, Joint2]
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
