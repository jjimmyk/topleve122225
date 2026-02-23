export interface DisasterPhase {
  id: string;
  name: string;
  shortName: string;
  description: string;
  completed: boolean;
  data?: Record<string, any>;
}

export interface OperationalPeriod {
  id: string;
  number: number;
  startTime: Date;
  endTime?: Date;
  phases: DisasterPhase[];
}

export const PLANNING_P_PHASES: Omit<DisasterPhase, 'completed' | 'data'>[] = [
  {
    id: 'initial-response',
    name: 'Initial Response & Assessment',
    shortName: 'Initial Response',
    description: 'Immediate response and situation assessment'
  },
  {
    id: 'incident-briefing',
    name: 'Incident Briefing',
    shortName: 'Incident Briefing',
    description: 'Brief key personnel on the current incident situation'
  }
];

export const OPERATIONAL_PERIOD_PHASES: Omit<DisasterPhase, 'completed' | 'data'>[] = [
  {
    id: 'alerts',
    name: 'Notifications',
    shortName: 'Notifications',
    description: 'Notifications, advisories, and operational alerts'
  },
  {
    id: 'overview',
    name: 'Reports',
    shortName: 'Reports',
    description: 'Incident overview and situational awareness'
  },
  {
    id: 'objectives-actions',
    name: 'Incidents',
    shortName: 'Incidents',
    description: 'Define incident objectives and tactical actions'
  },
  {
    id: 'incident-roster',
    name: 'AORs',
    shortName: 'AORs',
    description: 'Personnel assignments and organizational structure'
  },
  {
    id: 'resources',
    name: 'Resources',
    shortName: 'Resources',
    description: 'Resource management and allocation'
  },
  {
    id: 'layers',
    name: 'Layers',
    shortName: 'Layers',
    description: 'Data layers and map overlays'
  },
  {
    id: 'planning-p',
    name: 'Planning P',
    shortName: 'Planning P',
    description: 'Planning-P process and schedule'
  }
];