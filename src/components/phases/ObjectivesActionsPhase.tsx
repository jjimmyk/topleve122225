import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Checkbox } from '../ui/checkbox';
import { Edit2, Trash2, ChevronRight, ChevronDown, Map, Check, X, Filter } from 'lucide-react';
import svgPaths from '../../imports/svg-7hg6d30srz';

interface Action {
  id: string;
  description: string;
  status: string;
  assignee?: string;
  time?: string;
  date?: string;
  timezone?: string;
}

interface Objective {
  id: string;
  title: string;
  type: 'Operational' | 'Managerial';
  actions: Action[];
  childIncidents?: Objective[];
}

interface ObjectivesActionsPhaseProps {
  data?: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  onComplete: () => void;
  onPrevious?: () => void;
  onRecommendActions?: () => void;
  onZoomToLocation?: (center: string, scale: string) => void;
  onAddAIContext?: (itemName: string) => void;
  onApplyDataLayerFilter?: (incident: string) => void;
}

export function ObjectivesActionsPhase({ data = {}, onDataChange, onComplete, onPrevious, onRecommendActions, onZoomToLocation, onAddAIContext, onApplyDataLayerFilter }: ObjectivesActionsPhaseProps) {
  // Helper functions for severity (defined before state to use in initial sort)
  const getIncidentSeverityHelper = (id: string): 'Minor' | 'Moderate' | 'Serious' | 'Severe' | 'Critical' => {
    switch (id) {
      case '1': return 'Serious'; // Suspicious Package - Levi's Stadium, San Francisco
      case '1a': return 'Moderate';
      case '1b': return 'Serious';
      case '5': return 'Serious'; // Credible Threat - Seattle
      case '6': return 'Serious'; // Cyber Attack - Miami
      default: return 'Moderate';
    }
  };

  const getSeverityRankHelper = (severity: string): number => {
    switch (severity) {
      case 'Critical': return 5;
      case 'Severe': return 4;
      case 'Serious': return 3;
      case 'Moderate': return 2;
      case 'Minor': return 1;
      default: return 0;
    }
  };

  const initialObjectives = data.objectives || [
    {
      id: '1',
      title: 'San Francisco FIFA World Cup Games',
      type: 'Operational',
      actions: [],
      childIncidents: [
        {
          id: '1a',
          title: 'Perimeter Evacuation & K9 Sweep',
          type: 'Operational',
          actions: []
        },
        {
          id: '1b',
          title: 'EOD Response & Threat Neutralization',
          type: 'Operational',
          actions: []
        }
      ]
    },
    {
      id: '5',
      title: 'Seattle FIFA World Cup Games',
      type: 'Operational',
      actions: []
    },
    {
      id: '6',
      title: 'Miami FIFA World Cup Games',
      type: 'Operational',
      actions: []
    }
  ];

  // Sort by severity (Severe at top, then Serious, etc.)
  const sortedObjectives = initialObjectives.sort((a, b) => {
    const severityA = getIncidentSeverityHelper(a.id);
    const severityB = getIncidentSeverityHelper(b.id);
    return getSeverityRankHelper(severityB) - getSeverityRankHelper(severityA);
  });

  const [objectives, setObjectives] = useState<Objective[]>(sortedObjectives);

  const [editingObjective, setEditingObjective] = useState<string | null>(null);
  const [editingObjectiveOriginal, setEditingObjectiveOriginal] = useState<Objective | null>(null);
  const [editingAction, setEditingAction] = useState<{ objectiveId: string; actionId: string } | null>(null);
  const [editingActionOriginal, setEditingActionOriginal] = useState<Action | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());
  const [expandedChildIncidents, setExpandedChildIncidents] = useState<Set<string>>(new Set());
  const [isAddIncidentModalOpen, setIsAddIncidentModalOpen] = useState(false);
  const [newIncidentName, setNewIncidentName] = useState('');
  const [newIncidentCategories, setNewIncidentCategories] = useState<string[]>([]);
  const [newIncidentSitrep, setNewIncidentSitrep] = useState('');
  const [newIncidentCategoryOpen, setNewIncidentCategoryOpen] = useState(false);
  const [newIncidentLocation, setNewIncidentLocation] = useState('');
  const [newIncidentAORs, setNewIncidentAORs] = useState<string[]>([]);
  const [newIncidentAOROpen, setNewIncidentAOROpen] = useState(false);
  const [newIncidentUnits, setNewIncidentUnits] = useState<string[]>([]);
  const [newIncidentUnitOpen, setNewIncidentUnitOpen] = useState(false);
  const [addIncidentStep, setAddIncidentStep] = useState<1 | 2>(1);
  const [newIncidentStartTime, setNewIncidentStartTime] = useState(() => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [selectedIncidentTypes, setSelectedIncidentTypes] = useState<string[]>([]);
  const [isIncidentTypePopoverOpen, setIsIncidentTypePopoverOpen] = useState(false);
  const [selectedAORs, setSelectedAORs] = useState<string[]>([]);
  const [isAORPopoverOpen, setIsAORPopoverOpen] = useState(false);
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([]);
  const [isSeverityPopoverOpen, setIsSeverityPopoverOpen] = useState(false);
  
  type IncidentDetails = {
    description: string;
    location: string;
    status: 'Active' | 'Contained' | 'Monitoring';
    startTime: string;
    estimatedVolume: string;
    shorelineImpact: string;
    responsibleParty: string;
    incidentCommander: string;
    lastUpdate: string;
  };

  // Available Categorys
  const incidentTypes = [
    'Pipeline Spill',
    'Platform Leak',
    'Tanker Spill',
    'Barge Collision',
    'Sheen/Surface Oil',
    'Pipeline Release',
    'Vessel Incident',
    'Other'
  ];

  // Available AORs
  const aors = [
    'Gulf Coast Region',
    'Southeast Region',
    'Northeast Region',
    'Pacific Northwest Region',
    'Alaska Region'
  ];

  // Available severities
  const severities = [
    'Critical',
    'Severe',
    'Serious',
    'Moderate',
    'Minor'
  ];

  // Get Category based on objective title
  const getIncidentType = (objective: Objective): string => {
    const title = objective.title.toLowerCase();
    if (title.includes('suspicious package') || title.includes('bomb')) return 'Explosive Threat';
    if (title.includes('credential') && title.includes('fraud')) return 'Credential Fraud';
    if (title.includes('mass casualty') || title.includes('medical')) return 'Mass Casualty';
    if (title.includes('drone') || title.includes('uas')) return 'UAS Incursion';
    if (title.includes('threat') && title.includes('extremist')) return 'Threat Assessment';
    if (title.includes('cyber')) return 'Cyber Security';
    return 'Security Incident';
  };

  // Get AOR based on objective title
  const getIncidentAOR = (objective: Objective): string => {
    const title = objective.title.toLowerCase();
    if (title.includes('levi') || title.includes('gate c') || title.includes('san francisco') || title.includes('santa clara')) {
      return 'Levi\'s Stadium Complex - San Francisco';
    }
    if (title.includes('seattle') || title.includes('lumen field')) {
      return 'Lumen Field Complex - Seattle';
    }
    if (title.includes('miami') || title.includes('hard rock')) {
      return 'Hard Rock Stadium Complex - Miami';
    }
    if (title.includes('transit')) {
      return 'Transit Security Operations';
    }
    if (title.includes('airspace') || title.includes('drone')) {
      return 'Air Domain Operations';
    }
    if (title.includes('cyber') || title.includes('cctv')) {
      return 'Cyber Security Operations';
    }
    return 'Multi-Region Operations'; // Default
  };

  // Get severity level for each incident
  const getIncidentSeverity = (id: string): 'Minor' | 'Moderate' | 'Serious' | 'Severe' | 'Critical' => {
    switch (id) {
      case '1': return 'Serious'; // Suspicious Package - Levi's Stadium, San Francisco
      case '1a': return 'Moderate'; // Perimeter Evacuation (child)
      case '1b': return 'Serious'; // EOD Response (child)
      case '5': return 'Serious'; // Credible Threat - Seattle World Cup Venue
      case '6': return 'Serious'; // Cyber Attack - Miami World Cup Venue
      default: return 'Moderate';
    }
  };

  // Get severity rank (higher number = more severe)
  const getSeverityRank = (severity: string): number => {
    switch (severity) {
      case 'Critical': return 5;
      case 'Severe': return 4;
      case 'Serious': return 3;
      case 'Moderate': return 2;
      case 'Minor': return 1;
      default: return 0;
    }
  };

  // Get color for severity level
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'Critical': return '#DC2626'; // Red-600
      case 'Severe': return '#EA580C'; // Orange-600
      case 'Serious': return '#F59E0B'; // Amber-500
      case 'Moderate': return '#EAB308'; // Yellow-500
      case 'Minor': return '#84CC16'; // Lime-500
      default: return '#6B7280'; // Gray-500
    }
  };

  // Get map coordinates for each incident location
  const getIncidentCoordinates = (id: string): { center: string; scale: string } => {
    switch (id) {
      case '1': // Levi's Stadium, Santa Clara, CA
        return { center: '-121.9700,37.4033', scale: '144447.638572' };
      case '1a': // Gate C Perimeter, Levi's Stadium (child incident)
        return { center: '-121.9700,37.4033', scale: '72223.819286' };
      case '1b': // EOD Response Location (child incident)
        return { center: '-121.9700,37.4033', scale: '36111.909643' };
      case '5': // Lumen Field, Seattle, WA
        return { center: '-122.3321,47.5952', scale: '144447.638572' };
      case '6': // Hard Rock Stadium, Miami Gardens, FL
        return { center: '-80.2390,25.9580', scale: '144447.638572' };
      default:
        return { center: '-80.2390,25.9580', scale: '144447.638572' }; // Default to Hard Rock Stadium, Miami
    }
  };

  // Get data layer incident filter value for each incident
  const getIncidentFilterValue = (id: string): string => {
    // Map incident IDs to their incident filter values
    switch (id) {
      case '1':
        return 'suspicious-package-gate-c';
      case '1a':
        return 'suspicious-package-gate-c';
      case '1b':
        return 'suspicious-package-gate-c';
      default:
        return 'suspicious-package-gate-c';
    }
  };

  const getIncidentDetails = (id: string): IncidentDetails => {
    switch (id) {
      case '1':
        return {
          description: 'Suspicious unattended package discovered at Levi\'s Stadium Gate C screening checkpoint during World Cup match day operations; area evacuated and K9 explosive detection teams deployed.',
          location: 'Gate C Entrance, Levi\'s Stadium, Santa Clara, CA',
          status: 'Active',
          startTime: 'June 28, 2026 11:45',
          estimatedVolume: '~500 spectators in affected zone',
          shorelineImpact: 'Screening operations halted at Gate C',
          responsibleParty: 'DHS/TSA / FBI Joint Terrorism Task Force - San Francisco Field Office',
          incidentCommander: 'TSA Federal Security Director - San Francisco Region',
          lastUpdate: 'EOD team arrived on scene; package being assessed with portable X-ray; adjacent gates absorbing diverted crowd flow'
        };
      case '5':
        return {
          description: 'FBI received credible threat intelligence regarding domestic extremist cell planning disruption of World Cup match at Lumen Field in Seattle; enhanced security posture implemented across all venue access points and surrounding transit corridors.',
          location: 'Lumen Field and Surrounding Area, Seattle, WA',
          status: 'Active',
          startTime: 'June 27, 2026 22:15',
          estimatedVolume: '~Two individuals; associates under surveillance',
          shorelineImpact: 'Elevated threat level - additional screening measures at all entry points',
          responsibleParty: 'FBI Joint Terrorism Task Force / DHS Intelligence & Analysis / Seattle PD',
          incidentCommander: 'JTTF Supervisory Special Agent - Seattle Field Office',
          lastUpdate: 'Suspects under continuous surveillance in Pioneer Square area; tactical teams pre-positioned at Lumen Field perimeter; real-time intelligence sharing with all security partners'
        };
      case '6':
        return {
          description: 'Sophisticated cyber attack targeting Hard Rock Stadium CCTV surveillance network during World Cup match day in Miami; malware detected and network segments isolated to prevent spread.',
          location: 'Hard Rock Stadium Security Operations Center, Miami Gardens, FL',
          status: 'Active',
          startTime: 'June 28, 2026 08:30',
          estimatedVolume: '~40 cameras affected across north and east concourses',
          shorelineImpact: 'Reduced surveillance coverage - enhanced foot patrols deployed',
          responsibleParty: 'DHS CISA / FBI Cyber Division - Miami Field Office / Hard Rock Stadium Security',
          incidentCommander: 'CISA Cybersecurity Advisor - Southeast Region',
          lastUpdate: 'Isolated infected network segment; backup analog cameras activated; forensic analysis underway; state-sponsored actor suspected'
        };
      case '1a':
        return {
          description: 'Perimeter evacuation of approximately 500 spectators from Gate C area; K9 explosive detection sweep deployed following suspicious package discovery.',
          location: 'Gate C Perimeter, Levi\'s Stadium, Santa Clara, CA',
          status: 'Active',
          startTime: 'June 28, 2026 11:50',
          estimatedVolume: '~500 spectators evacuated to safe distance',
          shorelineImpact: 'N/A - Public safety operation',
          responsibleParty: 'TSA/DHS / Santa Clara PD (parent incident)',
          incidentCommander: 'TSA Federal Security Director - San Francisco Region',
          lastUpdate: 'K9 sweep 70% complete; no additional threats detected; spectators being re-screened at adjacent gates'
        };
      case '1b':
        return {
          description: 'EOD (Explosive Ordnance Disposal) team assessment and threat neutralization; package being analyzed with portable X-ray and chemical detection.',
          location: 'Gate C Screening Area, Levi\'s Stadium, Santa Clara, CA',
          status: 'Active',
          startTime: 'June 28, 2026 12:05',
          estimatedVolume: '~Single unattended backpack',
          shorelineImpact: 'Area secured - controlled access only',
          responsibleParty: 'FBI EOD / DHS (parent incident)',
          incidentCommander: 'FBI EOD Team Leader - San Francisco Field Office',
          lastUpdate: 'X-ray analysis complete - no explosive signature detected; opening package using remote tools; all-clear expected within 15 minutes'
        };
      default:
        return {
          description: 'World Cup security incident requiring DHS response and coordination with federal, state, and local partners.',
          location: 'World Cup Venue Complex and Surrounding Area',
          status: 'Active',
          startTime: 'June 28, 2026 12:00',
          estimatedVolume: 'TBD',
          shorelineImpact: 'Under assessment',
          responsibleParty: 'DHS / FBI Joint Terrorism Task Force',
          incidentCommander: 'Unified Command - World Cup Security Operations',
          lastUpdate: 'Response operations in progress; multi-agency coordination active'
        };
    }
  };

  // Helper functions for action items
  type ActionItem = {
    title: string;
    assignedTo: string;
    priority: 'High' | 'Medium' | 'Low';
    status: 'Completed' | 'In Progress' | 'Pending' | 'Overdue';
    dueDate: string;
    location: string;
    description: string;
    taskId: string;
    startedAt?: string;
    completedAt?: string;
  };

  const getActionsForIncident = (incidentId: string): ActionItem[] => {
    switch (incidentId) {
      case '1': // Suspicious Package - Levi's Stadium, San Francisco
        return [
          {
            title: 'Establish security perimeter and evacuate Gate C area',
            assignedTo: 'Operations - TSA Security Team Alpha',
            priority: 'High',
            status: 'In Progress',
            dueDate: '06/28/2026 12:15',
            location: 'Gate C, Levi\'s Stadium, Santa Clara',
            description: 'Create 300-meter security perimeter around suspicious package. Coordinate with Santa Clara PD to redirect spectators to adjacent gates.',
            taskId: 'ICS-204-A-015',
            startedAt: '06/28/2026 11:48'
          },
          {
            title: 'Deploy K9 explosive detection sweep',
            assignedTo: 'TSA K9 Unit - Handler Team Bravo',
            priority: 'High',
            status: 'In Progress',
            dueDate: '06/28/2026 12:00',
            location: 'Gate C Screening Area, Levi\'s Stadium',
            description: 'Conduct systematic K9 sweep of Gate C area and surrounding concourse. Clear all secondary locations before EOD assessment.',
            taskId: 'ICS-215-E-022',
            startedAt: '06/28/2026 11:52'
          },
          {
            title: 'Coordinate EOD response and threat assessment',
            assignedTo: 'FBI EOD Team - San Francisco Field Office',
            priority: 'High',
            status: 'Pending',
            dueDate: '06/28/2026 12:30',
            location: 'Gate C Hot Zone, Levi\'s Stadium',
            description: 'Deploy EOD technicians with portable X-ray and chemical detection. Assess threat level and execute neutralization protocol if needed.',
            taskId: 'ICS-204-L-008'
          }
        ];
      case '5': // Credible Threat Assessment - Seattle
        return [
          {
            title: 'Maintain continuous surveillance on suspects',
            assignedTo: 'Operations - FBI Surveillance Team',
            priority: 'High',
            status: 'In Progress',
            dueDate: '06/28/2026 15:00',
            location: 'Suspect Location - Pioneer Square, Seattle',
            description: 'Deploy mobile surveillance teams to maintain eyes-on suspects and known associates in the Pioneer Square district. Coordinate with JTTF Seattle Field Office for tactical support if needed.',
            taskId: 'ICS-204-M-027',
            startedAt: '06/27/2026 23:00'
          },
          {
            title: 'Pre-position tactical response teams at Lumen Field',
            assignedTo: 'Operations - FBI HRT / Secret Service CAT',
            priority: 'High',
            status: 'In Progress',
            dueDate: '06/28/2026 14:00',
            location: 'Strategic Positions - Lumen Field Perimeter, Seattle',
            description: 'Deploy tactical teams at strategic locations around Lumen Field and adjacent transit stations. Establish rapid response protocols if threat materializes.',
            taskId: 'ICS-204-B-014',
            startedAt: '06/28/2026 08:00'
          },
          {
            title: 'Coordinate real-time intelligence sharing',
            assignedTo: 'Intelligence & Analysis Division',
            priority: 'High',
            status: 'Pending',
            dueDate: '06/28/2026 12:00',
            location: 'Joint Operations Center - Seattle',
            description: 'Maintain open communication with FBI Seattle Field Office, NSA, and international partners. Update threat assessment every 30 minutes.',
            taskId: 'ICS-215-E-016'
          }
        ];
      case '6': // Cyber Attack - Hard Rock Stadium CCTV Network, Miami
        return [
          {
            title: 'Isolate infected network segments',
            assignedTo: 'Operations - CISA Cyber Response',
            priority: 'High',
            status: 'In Progress',
            dueDate: '06/28/2026 09:00',
            location: 'Hard Rock Stadium Security Operations Center, Miami Gardens',
            description: 'Isolate compromised CCTV network segments to prevent malware spread. Activate backup analog camera systems for coverage across north and east concourses.',
            taskId: 'ICS-204-M-037',
            startedAt: '06/28/2026 08:35'
          },
          {
            title: 'Conduct forensic analysis of malware',
            assignedTo: 'CISA Cyber Forensics Team',
            priority: 'High',
            status: 'Pending',
            dueDate: '06/28/2026 11:00',
            location: 'DHS Cyber Operations Center - Miami',
            description: 'Perform detailed forensic analysis of malware to identify threat actor and attack vector. Coordinate with FBI Cyber Division - Miami Field Office.',
            taskId: 'ICS-204-R-018'
          },
          {
            title: 'Deploy enhanced foot patrols to compensate',
            assignedTo: 'Operations - Hard Rock Stadium Security Patrols',
            priority: 'Medium',
            status: 'In Progress',
            dueDate: '06/28/2026 09:30',
            location: 'North & East Concourses - Hard Rock Stadium',
            description: 'Increase roving security patrols in areas with degraded camera coverage. Coordinate with Secret Service for VIP protection zones.',
            taskId: 'ICS-215-W-009',
            startedAt: '06/28/2026 08:40'
          }
        ];
      default:
        return [];
    }
  };

  const getPriorityColorForAction = (priority: string): string => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#22c55e';
      default: return '#6e757c';
    }
  };

  const getStatusColorForAction = (status: string): string => {
    switch (status) {
      case 'Completed': return '#22c55e';
      case 'In Progress': return '#3B82F6';
      case 'Pending': return '#facc15';
      case 'Overdue': return '#EF4444';
      default: return '#6e757c';
    }
  };
  const [showRecommended, setShowRecommended] = useState<Set<string>>(new Set());

  // Plausible IACI-centric assignees for an ongoing cyber attack
  const officialNames: string[] = [
    'IACI‑CERT Incident Lead',
    'IACInet Intelligence Lead',
    'Sector ISAC Analyst',
    'Member Organization SOC Lead',
    'CISA Central Liaison',
    'FBI Cyber Task Force Liaison',
    'SRMA Sector Liaison',
    'OT/ICS Security Lead',
    'Cloud Provider CSIRT',
    'Legal & Privacy Counsel',
    'Public Affairs (JIC)',
    'CISO, Member Organization'
  ];

  const getRecommendedActionsForObjective = (objectiveTitle: string): Action[] => {
    const title = objectiveTitle.toLowerCase();
    const makeId = (suffix: number) => `${Date.now()}-${suffix}`;

    // Life safety / rescue / sheltering
    if (
      title.includes('life') ||
      title.includes('rescue') ||
      title.includes('evacu') ||
      title.includes('shelter') ||
      title.includes('stabilize')
    ) {
      return [
        {
          id: makeId(1),
          description: 'Conduct high-water rescues and welfare checks in Cape Fear and Neuse basin communities; stage boats and HMMWVs at county EOCs (next 12–24 hrs).',
          status: 'Current',
        },
        {
          id: makeId(2),
          description: 'Sustain shelter operations for ~15,000 evacuees; ensure ADA access, medical triage, and behavioral health; coordinate supply chain (cots, blankets, meds).',
          status: 'Current',
        },
        {
          id: makeId(3),
          description: 'Execute targeted evacuations for neighborhoods with crest forecasts > major flood stage; issue IPAWS alerts and door-to-door notifications.',
          status: 'Current',
        },
        {
          id: makeId(4),
          description: 'Establish missing-persons tracking and reunification workflow with ARC and local PSAPs; update every 4 hours.',
          status: 'Planned (24h)',
        },
      ];
    }

    // Critical infrastructure / power / water / transportation
    if (
      title.includes('infrastructure') ||
      title.includes('power') ||
      title.includes('water') ||
      title.includes('transport') ||
      title.includes('corridor') ||
      title.includes('restore')
    ) {
      return [
        {
          id: makeId(1),
          description: 'Prioritize power restoration for hospitals, water/wastewater plants, and shelters; deploy generators and fuel support where grid access is delayed.',
          status: 'Current',
        },
        {
          id: makeId(2),
          description: 'Issue/maintain boil-water advisories; distribute bottled water; deploy mobile testing teams to impacted systems in six affected counties.',
          status: 'Current',
        },
        {
          id: makeId(3),
          description: 'Clear debris from priority routes; conduct bridge inspections; plan phased reopening of I‑95 and US‑70 when waters recede and safety checks pass.',
          status: 'Current',
        },
        {
          id: makeId(4),
          description: 'Stand up debris management sites and hazardous waste segregation in coordination with NCDEQ and county public works.',
          status: 'Planned (48–72h)',
        },
      ];
    }

    // Unified command / situational awareness / FEMA coordination
    if (
      title.includes('unified') ||
      title.includes('situational') ||
      title.includes('awareness') ||
      title.includes('fema') ||
      title.includes('command') ||
      title.includes('coordination')
    ) {
      return [
        {
          id: makeId(1),
          description: 'Activate Unified Command (NCEM, FEMA, NCNG, NCDOT, NCDEQ, utilities); set operational period schedule and SITREP cadence (AM/PM).',
          status: 'Current',
        },
        {
          id: makeId(2),
          description: 'Publish twice-daily river forecasts and flood-inundation maps; synchronize evacuation zones and public messaging with county PIOs.',
          status: 'Current',
        },
        {
          id: makeId(3),
          description: 'Establish regional logistics staging areas; track mission assignments (rescue, sheltering, debris) and resource requests in WebEOC.',
          status: 'Current',
        },
        {
          id: makeId(4),
          description: 'Coordinate federal assistance under DR‑4393‑NC; align state mission tasks with FEMA resource offerings (USAR, IA/PA, commodities).',
          status: 'Planned (24–48h)',
        },
      ];
    }

    // Fallback: generic flood-response actions
    return [
      { id: makeId(1), description: 'Validate life safety priorities; confirm rescue/sheltering posture and unmet needs with county EOCs.', status: 'Current' },
      { id: makeId(2), description: 'Update power/water restoration timelines; identify critical facilities needing generators or fuel resupply.', status: 'Current' },
      { id: makeId(3), description: 'Publish unified public messaging on travel restrictions, boil-water advisories, and assistance programs.', status: 'Planned (24h)' },
    ];
  };

  const updateData = (newObjectives: Objective[]) => {
    setObjectives(newObjectives);
    onDataChange({ ...data, objectives: newObjectives });
  };

  const addObjective = (position: 'top' | 'bottom' = 'bottom') => {
    const newObjective: Objective = {
      id: Date.now().toString(),
      title: '',
      type: 'Operational',
      actions: []
    };
    if (position === 'top') {
      updateData([newObjective, ...objectives]);
    } else {
      updateData([...objectives, newObjective]);
    }
    // Set the new objective to editing mode and expand it
    setEditingObjectiveOriginal({ ...newObjective });
    setEditingObjective(newObjective.id);
    setExpandedObjectives(prev => new Set([...prev, newObjective.id]));
  };

  const updateObjectiveTitle = (id: string, title: string) => {
    const updated = objectives.map(obj =>
      obj.id === id ? { ...obj, title } : obj
    );
    updateData(updated);
  };

  const updateObjectiveType = (id: string, type: 'Operational' | 'Managerial') => {
    const updated = objectives.map(obj =>
      obj.id === id ? { ...obj, type } : obj
    );
    updateData(updated);
  };

  const deleteObjective = (id: string) => {
    updateData(objectives.filter(obj => obj.id !== id));
  };

  const startEditingObjective = (objective: Objective) => {
    setEditingObjectiveOriginal({ ...objective });
    setEditingObjective(objective.id);
  };

  const saveObjectiveEdit = () => {
    setEditingObjective(null);
    setEditingObjectiveOriginal(null);
  };

  const cancelObjectiveEdit = () => {
    if (editingObjectiveOriginal) {
      const updated = objectives.map(obj =>
        obj.id === editingObjectiveOriginal.id ? editingObjectiveOriginal : obj
      );
      updateData(updated);
    }
    setEditingObjective(null);
    setEditingObjectiveOriginal(null);
  };

  const addAction = (objectiveId: string) => {
    const newAction: Action = {
      id: Date.now().toString(),
      description: '',
      status: 'Current',
      assignee: '',
      time: '',
      date: '',
      timezone: 'UTC'
    };
    const updated = objectives.map(obj =>
      obj.id === objectiveId 
        ? { ...obj, actions: [...obj.actions, newAction] }
        : obj
    );
    updateData(updated);
  };

  const updateAction = (objectiveId: string, actionId: string, field: keyof Action, value: string) => {
    const updated = objectives.map(obj =>
      obj.id === objectiveId
        ? {
            ...obj,
            actions: obj.actions.map(action =>
              action.id === actionId ? { ...action, [field]: value } : action
            )
          }
        : obj
    );
    updateData(updated);
  };

  const deleteAction = (objectiveId: string, actionId: string) => {
    const updated = objectives.map(obj =>
      obj.id === objectiveId
        ? { ...obj, actions: obj.actions.filter(action => action.id !== actionId) }
        : obj
    );
    updateData(updated);
  };

  const startEditingAction = (objectiveId: string, action: Action) => {
    setEditingActionOriginal({ ...action });
    setEditingAction({ objectiveId, actionId: action.id });
  };

  const saveActionEdit = () => {
    setEditingAction(null);
    setEditingActionOriginal(null);
  };

  const cancelActionEdit = () => {
    if (editingActionOriginal && editingAction) {
      const updated = objectives.map(obj =>
        obj.id === editingAction.objectiveId
          ? {
              ...obj,
              actions: obj.actions.map(action =>
                action.id === editingAction.actionId ? editingActionOriginal : action
              )
            }
          : obj
      );
      updateData(updated);
    }
    setEditingAction(null);
    setEditingActionOriginal(null);
  };

  

  const toggleObjective = (objectiveId: string) => {
    setExpandedObjectives(prev => {
      const newSet = new Set(prev);
      if (newSet.has(objectiveId)) {
        newSet.delete(objectiveId);
      } else {
        newSet.add(objectiveId);
      }
      return newSet;
    });
  };

  const toggleChildIncident = (childId: string) => {
    setExpandedChildIncidents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
      } else {
        newSet.add(childId);
      }
      return newSet;
    });
  };

  const toggleRecommended = (objectiveId: string) => {
    setShowRecommended(prev => {
      const next = new Set(prev);
      const enabling = !next.has(objectiveId);
      if (enabling) {
        next.add(objectiveId);
        onRecommendActions && onRecommendActions();
        // If no actions, generate context-aware actions based on the objective title
        const updated = objectives.map(obj => {
          if (obj.id !== objectiveId) return obj;
          const hasActions = obj.actions && obj.actions.length > 0;
          const actionsToUse = hasActions ? obj.actions : getRecommendedActionsForObjective(obj.title);
          return {
            ...obj,
            actions: actionsToUse.map((action, idx) => ({
              ...action,
              assignee:
                action.assignee && action.assignee.trim().length > 0
                  ? action.assignee
                  : officialNames[idx % officialNames.length],
            })),
          };
        });
        updateData(updated);
      } else {
        next.delete(objectiveId);
      }
      return next;
    });
  };

  // Filter objectives based on search term and Category
  const filteredObjectives = objectives.filter(objective => {
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        objective.title.toLowerCase().includes(searchLower) ||
        objective.actions.some(action => 
          action.description.toLowerCase().includes(searchLower)
        );
      if (!matchesSearch) return false;
    }
    
    // Filter by Category
    if (selectedIncidentTypes.length > 0) {
      const incidentType = getIncidentType(objective);
      if (!selectedIncidentTypes.includes(incidentType)) return false;
    }
    
    // Filter by AOR
    if (selectedAORs.length > 0) {
      const aor = getIncidentAOR(objective);
      if (!selectedAORs.includes(aor)) return false;
    }
    
    // Filter by severity
    if (selectedSeverities.length > 0) {
      const severity = getIncidentSeverity(objective.id);
      if (!selectedSeverities.includes(severity)) return false;
    }
    
    return true;
  });

  // Handler for Category selection
  const toggleIncidentType = (type: string) => {
    setSelectedIncidentTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearIncidentTypeFilter = () => {
    setSelectedIncidentTypes([]);
  };

  // Handler for AOR selection
  const toggleAOR = (aor: string) => {
    setSelectedAORs(prev => 
      prev.includes(aor) 
        ? prev.filter(a => a !== aor)
        : [...prev, aor]
    );
  };

  const clearAORFilter = () => {
    setSelectedAORs([]);
  };

  // Handler for severity selection
  const toggleSeverity = (severity: string) => {
    setSelectedSeverities(prev => 
      prev.includes(severity) 
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    );
  };

  const clearSeverityFilter = () => {
    setSelectedSeverities([]);
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Sticky */}
      <div className="sticky top-0 z-10 bg-[#222529] rounded-lg border border-[#6e757c] relative">
        <div className="flex items-center justify-between px-[13px] py-3 w-full border-b-2 border-border rounded-t-lg rounded-b-none">
          {/* Title */}
          <div className="relative shrink-0 flex items-center gap-2">
            <p className="caption text-nowrap text-white whitespace-pre">
              Incidents
            </p>
            <span className="caption text-white">
              ({objectives.filter(obj => getIncidentDetails(obj.id).status === 'Active').length} active)
            </span>
          </div>

          {/* Search and Add Objective Button */}
          <div className="flex items-center gap-[29px]">
            {/* Search Input */}
            <div className="relative h-[26px] w-[195px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search"
                className="box-border w-full h-[26px] bg-transparent border border-[#6e757c] rounded-[4px] px-[26px] py-[3.25px] caption text-white placeholder:text-[#6e757c] focus:outline-none focus:border-accent"
              />
              <div className="absolute left-[8px] size-[11.375px] top-[7.44px] pointer-events-none">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
                  <g>
                    <path d={svgPaths.p3a3bec00} stroke="#6E757C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.710938" />
                    <path d={svgPaths.p380aaa80} stroke="#6E757C" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.710938" />
                  </g>
                </svg>
              </div>
            </div>

            {/* Add Objective Button */}
            <button
              onClick={() => setIsAddIncidentModalOpen(true)}
              className="bg-[#01669f] h-[22.75px] rounded-[4px] w-[130.625px] hover:bg-[#01669f]/90 transition-colors flex items-center justify-center relative"
            >
              <div className="absolute left-[16px] size-[13px]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 13">
                  <g>
                    <path d="M2.70833 6.5H10.2917" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                    <path d="M6.5 2.70833V10.2917" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.08333" />
                  </g>
                </svg>
              </div>
              <p className="caption text-nowrap text-white ml-[21px]">
                Add Incident
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section - Three Columns */}
      <div className="flex gap-3">
        {/* Category Filter */}
        <div className="flex-1 space-y-2 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <span className="caption text-white whitespace-nowrap block">Category:</span>
          <div className="flex items-center gap-2">
            <Popover open={isIncidentTypePopoverOpen} onOpenChange={setIsIncidentTypePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex-1 h-[24px] bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent cursor-pointer flex items-center justify-between"
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  {selectedIncidentTypes.length === 0 
                    ? 'All Types' 
                    : selectedIncidentTypes.length === 1 
                    ? selectedIncidentTypes[0]
                    : `${selectedIncidentTypes.length} types selected`}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                <Command className="bg-[#222529]">
                  <CommandInput 
                    placeholder="Search Category..." 
                    className="h-9 caption text-white"
                    style={{ 
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  />
                  <CommandList>
                    <CommandEmpty className="caption text-white/70 p-2">No Category found.</CommandEmpty>
                    <CommandGroup>
                      {incidentTypes.map((type) => (
                        <CommandItem
                          key={type}
                          value={type}
                          onSelect={() => toggleIncidentType(type)}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          style={{ 
                            fontFamily: "'Open Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 400,
                            lineHeight: '18px'
                          }}
                        >
                          <Checkbox
                            checked={selectedIncidentTypes.includes(type)}
                            className="mr-2 h-3 w-3 border-white data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          {type}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedIncidentTypes.length > 0 && (
              <button
                onClick={clearIncidentTypeFilter}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Clear filter"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* AOR Filter */}
        <div className="flex-1 space-y-2 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <span className="caption text-white whitespace-nowrap block">AOR:</span>
          <div className="flex items-center gap-2">
            <Popover open={isAORPopoverOpen} onOpenChange={setIsAORPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex-1 h-[24px] bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent cursor-pointer flex items-center justify-between"
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  {selectedAORs.length === 0 
                    ? 'All AORs' 
                    : selectedAORs.length === 1 
                    ? selectedAORs[0]
                    : `${selectedAORs.length} AORs selected`}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                <Command className="bg-[#222529]">
                  <CommandInput 
                    placeholder="Search AOR..." 
                    className="h-9 caption text-white"
                    style={{ 
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  />
                  <CommandList>
                    <CommandEmpty className="caption text-white/70 p-2">No AOR found.</CommandEmpty>
                    <CommandGroup>
                      {aors.map((aor) => (
                        <CommandItem
                          key={aor}
                          value={aor}
                          onSelect={() => toggleAOR(aor)}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          style={{ 
                            fontFamily: "'Open Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 400,
                            lineHeight: '18px'
                          }}
                        >
                          <Checkbox
                            checked={selectedAORs.includes(aor)}
                            className="mr-2 h-3 w-3 border-white data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          {aor}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedAORs.length > 0 && (
              <button
                onClick={clearAORFilter}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Clear filter"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Severity Filter */}
        <div className="flex-1 space-y-2 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <span className="caption text-white whitespace-nowrap block">Severity:</span>
          <div className="flex items-center gap-2">
            <Popover open={isSeverityPopoverOpen} onOpenChange={setIsSeverityPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="flex-1 h-[24px] bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent cursor-pointer flex items-center justify-between"
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  {selectedSeverities.length === 0 
                    ? 'All Severities' 
                    : selectedSeverities.length === 1 
                    ? selectedSeverities[0]
                    : `${selectedSeverities.length} severities selected`}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                <Command className="bg-[#222529]">
                  <CommandInput 
                    placeholder="Search severity..." 
                    className="h-9 caption text-white"
                    style={{ 
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  />
                  <CommandList>
                    <CommandEmpty className="caption text-white/70 p-2">No severity found.</CommandEmpty>
                    <CommandGroup>
                      {severities.map((severity) => (
                        <CommandItem
                          key={severity}
                          value={severity}
                          onSelect={() => toggleSeverity(severity)}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          style={{ 
                            fontFamily: "'Open Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 400,
                            lineHeight: '18px'
                          }}
                        >
                          <Checkbox
                            checked={selectedSeverities.includes(severity)}
                            className="mr-2 h-3 w-3 border-white data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          {severity}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedSeverities.length > 0 && (
              <button
                onClick={clearSeverityFilter}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Clear filter"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Objectives List */}
      <div className="space-y-4">
        {filteredObjectives.map((objective) => (
          <div
            key={objective.id}
            className="border border-border rounded-lg overflow-hidden"
            style={{ 
              background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)'
            }}
          >
            {/* Objective Header */}
            <div className={`p-3 ${expandedObjectives.has(objective.id) ? 'border-b border-border' : ''}`}>
              {editingObjective === objective.id ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-2" onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={objective.type}
                      onValueChange={(value) => updateObjectiveType(objective.id, value as 'Operational' | 'Managerial')}
                    >
                      <SelectTrigger 
                        className="w-14 h-[22px] bg-input-background border-border !text-[12px] flex-shrink-0"
                        style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: '1.5' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent onClick={(e) => e.stopPropagation()}>
                        <SelectItem 
                          value="Operational"
                          className="!text-[12px]"
                          style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: '1.5' }}
                        >
                          O
                        </SelectItem>
                        <SelectItem 
                          value="Managerial"
                          className="!text-[12px]"
                          style={{ fontFamily: "'Open Sans', sans-serif", lineHeight: '1.5' }}
                        >
                          M
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={objective.title}
                      onChange={(e) => updateObjectiveTitle(objective.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveObjectiveEdit();
                        if (e.key === 'Escape') cancelObjectiveEdit();
                      }}
                      placeholder="Enter objective text"
                      autoFocus
                      className="bg-input-background border-border text-card-foreground caption"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveObjectiveEdit();
                      }}
                      size="sm"
                      className="bg-primary hover:bg-primary/90 h-[22.75px] px-3"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelObjectiveEdit();
                      }}
                      variant="outline"
                      size="sm"
                      className="border-border h-[22.75px] px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div 
                    className="flex items-start gap-2 flex-1 cursor-pointer"
                    onClick={() => {
                      toggleObjective(objective.id);
                      if (onAddAIContext) {
                        onAddAIContext(objective.title);
                      }
                    }}
                  >
                    {expandedObjectives.has(objective.id) ? (
                      <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="caption text-white">{objective.title}</span>
                    </div>
                  </div>
              <div className="flex items-center gap-2">
                <span 
                  className="caption px-2 py-0.5 rounded"
                  style={{ 
                    backgroundColor: `${getSeverityColor(getIncidentSeverity(objective.id))}20`,
                    color: getSeverityColor(getIncidentSeverity(objective.id)),
                    border: `1px solid ${getSeverityColor(getIncidentSeverity(objective.id))}60`
                  }}
                >
                  {getIncidentSeverity(objective.id)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Apply data layer filter
                    if (onApplyDataLayerFilter) {
                      const incident = getIncidentFilterValue(objective.id);
                      onApplyDataLayerFilter(incident);
                    }
                  }}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                  title="Filter incident"
                >
                  <Filter className="w-3 h-3 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Zoom to incident location
                    if (onZoomToLocation) {
                      const coords = getIncidentCoordinates(objective.id);
                      onZoomToLocation(coords.center, coords.scale);
                    }
                  }}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                  title="Zoom to incident location"
                >
                  <Map className="w-3 h-3 text-white" />
                </button>
              </div>
                </div>
              )}
            </div>

            {/* Incident Details Section */}
            {expandedObjectives.has(objective.id) && (
              <div className="p-4 space-y-4 bg-card/50">
                {(() => {
                  const d = getIncidentDetails(objective.id);
                  return (
                    <>
                      {/* Incident Workspace Button */}
                      <div className="mb-4 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="bg-[#01669f] h-[22.75px] rounded-[4px] px-4 hover:bg-[#01669f]/90 transition-colors flex items-center justify-center"
                        >
                          <p className="caption text-nowrap text-white">Incident Workspace</p>
                        </button>
                      </div>
                      
                      {/* Incident Details Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="caption text-white/70 mb-1 block">Type</label>
                          <p className="caption text-white">Operational</p>
                        </div>
                        <div>
                          <label className="caption text-white/70 mb-1 block">Current Operational Period</label>
                          <p className="caption text-white">Period 3</p>
                        </div>
                        <div>
                          <label className="caption text-white/70 mb-1 block">Start Time</label>
                          <p className="caption text-white">{d.startTime}</p>
                        </div>
                        <div>
                          <label className="caption text-white/70 mb-1 block">Incident Commander</label>
                          <p className="caption text-white">{d.incidentCommander}</p>
                        </div>
                        <div>
                          <label className="caption text-white/70 mb-1 block">Location</label>
                          <p className="caption text-white">{d.location}</p>
                        </div>
                        <div>
                          <label className="caption text-white/70 mb-1 block">Severity</label>
                          <p className="caption text-white">{getIncidentSeverityHelper(objective.id)}</p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Incident Modal */}
      <Dialog open={isAddIncidentModalOpen} onOpenChange={(open) => {
        setIsAddIncidentModalOpen(open);
        if (!open) {
          setNewIncidentName('');
          setNewIncidentCategories([]);
          setNewIncidentSitrep('');
          setNewIncidentLocation('');
          setNewIncidentAORs([]);
          setNewIncidentUnits([]);
          setNewIncidentStartTime(() => { const now = new Date(); const pad = (n: number) => n.toString().padStart(2, '0'); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`; });
          setAddIncidentStep(1);
        }
      }}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white" style={{ maxWidth: '1296px', width: '1296px' }}>
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-semibold">Add Incident</DialogTitle>
          </DialogHeader>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-4 py-4">
            <button onClick={() => setAddIncidentStep(1)} className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium" style={addIncidentStep === 1 ? { backgroundColor: '#60a5fa', boxShadow: '0 0 0 4px rgba(96, 165, 250, 0.3)' } : addIncidentStep > 1 ? { backgroundColor: '#16a34a' } : { backgroundColor: '#6b7280' }}>
                {addIncidentStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-sm ${addIncidentStep === 1 ? 'text-white font-medium' : 'text-white/70'}`}>Name & Location</span>
            </button>
            <div className="flex-[0.3] h-[2px] bg-border"></div>
            <button onClick={() => setAddIncidentStep(2)} className="flex items-center gap-2 cursor-pointer">
              <div className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium" style={addIncidentStep === 2 ? { backgroundColor: '#60a5fa', boxShadow: '0 0 0 4px rgba(96, 165, 250, 0.3)' } : { backgroundColor: '#6b7280' }}>
                2
              </div>
              <span className={`text-sm ${addIncidentStep === 2 ? 'text-white font-medium' : 'text-white/70'}`}>Configure Team</span>
            </button>
          </div>

          <div className="flex gap-4" style={{ minHeight: '576px' }}>
            {/* Left half: form fields */}
            <div className="w-1/2 space-y-4 overflow-y-auto pr-2">
              {addIncidentStep === 1 ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">Incident Name</label>
                    <Input
                      value={newIncidentName}
                      onChange={(e) => setNewIncidentName(e.target.value)}
                      placeholder="e.g., Suspicious Package - Gate B"
                      className="bg-input-background border-border text-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">Incident Category</label>
                    <Popover open={newIncidentCategoryOpen} onOpenChange={setNewIncidentCategoryOpen}>
                      <PopoverTrigger asChild>
                        <button className="w-full bg-input-background border border-border rounded-md px-3 py-2 text-left text-sm text-white flex items-center justify-between">
                          <span className={newIncidentCategories.length > 0 ? 'text-white' : 'text-white/50'}>
                            {newIncidentCategories.length > 0 ? newIncidentCategories.join(', ') : 'Select categories...'}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#222529] border-[#6e757c]" align="start">
                        <Command className="bg-[#222529]">
                          <CommandInput placeholder="Search categories..." className="h-9 text-white text-sm" />
                          <CommandList className="max-h-48">
                            <CommandEmpty className="text-white text-sm p-2">No results.</CommandEmpty>
                            <CommandGroup>
                              {['Security Threat', 'Suspicious Activity', 'Mass Casualty', 'Cyber Incident', 'Environmental Hazard', 'Infrastructure Failure', 'Civil Disturbance', 'Aviation Incident', 'Maritime Incident', 'CBRN'].map((cat) => (
                                <CommandItem
                                  key={cat}
                                  value={cat}
                                  onSelect={() => {
                                    setNewIncidentCategories(prev =>
                                      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                                    );
                                  }}
                                  className="text-white text-sm flex items-center gap-2"
                                >
                                  <Checkbox checked={newIncidentCategories.includes(cat)} className="border-[#6e757c]" />
                                  <span>{cat}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">Initial Situation Report</label>
                    <Textarea
                      value={newIncidentSitrep}
                      onChange={(e) => setNewIncidentSitrep(e.target.value)}
                      placeholder="Enter initial situation report..."
                      className="min-h-[100px] bg-input-background border-border text-white resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">Incident Location</label>
                    <div className="flex gap-2">
                      <button className="bg-transparent border border-[#6e757c] text-white caption px-3 py-1 rounded-[4px] hover:bg-[#222529] transition-colors text-xs">
                        Input Coordinates
                      </button>
                      <button className="bg-transparent border border-[#6e757c] text-white caption px-3 py-1 rounded-[4px] hover:bg-[#222529] transition-colors text-xs">
                        Draw Location
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">AOR</label>
                    <Popover open={newIncidentAOROpen} onOpenChange={setNewIncidentAOROpen}>
                      <PopoverTrigger asChild>
                        <button className="w-full bg-input-background border border-border rounded-md px-3 py-2 text-left text-sm text-white flex items-center justify-between">
                          <span className={newIncidentAORs.length > 0 ? 'text-white' : 'text-white/50'}>
                            {newIncidentAORs.length > 0 ? newIncidentAORs.join(', ') : 'Select AORs...'}
                          </span>
                          <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#222529] border-[#6e757c]" align="start">
                        <Command className="bg-[#222529]">
                          <CommandInput placeholder="Search AORs..." className="h-9 text-white text-sm" />
                          <CommandList className="max-h-48">
                            <CommandEmpty className="text-white text-sm p-2">No results.</CommandEmpty>
                            <CommandGroup>
                              {['Sector New York', 'Sector Boston', 'Sector Northern New England', 'Sector Southeastern New England', 'Sector Long Island Sound', 'Sector Delaware Bay', 'Sector Maryland-NCR'].map((aor) => (
                                <CommandItem
                                  key={aor}
                                  value={aor}
                                  onSelect={() => {
                                    setNewIncidentAORs(prev =>
                                      prev.includes(aor) ? prev.filter(a => a !== aor) : [...prev, aor]
                                    );
                                  }}
                                  className="text-white text-sm flex items-center gap-2"
                                >
                                  <Checkbox checked={newIncidentAORs.includes(aor)} className="border-[#6e757c]" />
                                  <span>{aor}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-white text-xs block">Start Time</label>
                    <Input
                      type="datetime-local"
                      value={newIncidentStartTime}
                      onChange={(e) => setNewIncidentStartTime(e.target.value)}
                      className="bg-input-background border-border text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setAddIncidentStep(2)}
                      className="bg-[#01669f] hover:bg-[#01669f]/90 text-white caption px-4 py-1.5 rounded-[4px] transition-colors"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setIsAddIncidentModalOpen(false)}
                      className="bg-transparent border border-[#6e757c] text-white caption px-4 py-1.5 rounded-[4px] hover:bg-[#222529] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1 flex items-center justify-center border border-dashed border-[#6e757c] rounded-lg">
                    <span className="text-white/50 text-sm"> [placeholder for default incident roster org chart. The user can only assign users within their Home AOR to incident roster positions.]</span>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setAddIncidentStep(1)}
                      className="bg-transparent border border-[#6e757c] text-white caption px-4 py-1.5 rounded-[4px] hover:bg-[#222529] transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (newIncidentName.trim()) {
                          const newId = (objectives.length + 1).toString();
                          const newObjective: Objective = {
                            id: newId,
                            title: newIncidentName.trim(),
                            type: 'Operational',
                            actions: [],
                          };
                          setObjectives(prev => [...prev, newObjective]);
                          setIsAddIncidentModalOpen(false);
                          setNewIncidentName('');
                          setNewIncidentCategories([]);
                          setNewIncidentSitrep('');
                          setNewIncidentLocation('');
                          setNewIncidentAORs([]);
                          setNewIncidentUnits([]);
                          setNewIncidentStartTime(() => { const now = new Date(); const pad = (n: number) => n.toString().padStart(2, '0'); return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`; });
                          setAddIncidentStep(1);
                        }
                      }}
                      className="bg-[#01669f] hover:bg-[#01669f]/90 text-white caption px-4 py-1.5 rounded-[4px] transition-colors"
                    >
                      Add Incident
                    </button>
                    <button
                      onClick={() => setIsAddIncidentModalOpen(false)}
                      className="bg-transparent border border-[#6e757c] text-white caption px-4 py-1.5 rounded-[4px] hover:bg-[#222529] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right half: ArcGIS basemap (step 1 only) */}
            {addIncidentStep === 1 && (
              <div className="w-1/2 border border-border rounded-lg overflow-hidden">
                <arcgis-embedded-map
                  style={{ height: '100%', width: '100%', display: 'block' }}
                  item-id="c1a7e5587f4941f49d340d49dc7a0000"
                  theme="light"
                  center="-80.16200440365937,25.87478023462914"
                  scale="577790.554289"
                  portal-url="https://disastertech.maps.arcgis.com"
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
