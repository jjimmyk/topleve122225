import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown, ChevronRight, Edit2, Trash2, Map, X, Check, ArrowRightToLine, Sparkles, AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import svgPaths from '../../imports/svg-7hg6d30srz';

interface AlertsPhaseProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  onComplete: () => void;
  onPrevious?: () => void;
  onZoomToLocation?: (center: string, scale: string) => void;
  onAddAIContext?: (itemName: string) => void;
  onShowMapMarker?: (id: string, lat: number, lon: number, color: string) => void;
  onIncidentNotification?: (count: number) => void;
}

type Severity = 'Info' | 'Advisory' | 'Watch' | 'Warning' | 'Stand Down Safety';

interface AlertItem {
  id: string;
  title: string;
  source: string;
  severity: Severity;
  issuedAt: string;   // ISO
  expiresAt?: string; // ISO
  status: 'Active' | 'Cleared' | 'Expired';
  description: string;
  recipients?: string[]; // User emails/IDs
  scheduledTime?: string; // ISO timestamp
  channels?: string[]; // Communication channels
  timeSent?: string; // ISO timestamp
  sentBy?: string; // Name or email of sender
  location?: string; // Location where alert applies
}

export function AlertsPhase({ data, onDataChange, onZoomToLocation, onAddAIContext, onShowMapMarker, onIncidentNotification }: AlertsPhaseProps) {
  // Helper functions for notification severity
  const getNotificationSeverity = (notificationId: string): 'Minor' | 'Moderate' | 'Serious' | 'Severe' | 'Critical' => {
    switch (notificationId) {
      case 'incident-activation-request': return 'Critical';
      case 'boom-data-layer-review': return 'Serious';
      case 'sitrep-review': return 'Moderate';
      case 'safety-check-form': return 'Serious';
      case 'acknowledgement-receipt': return 'Moderate';
      default: return 'Moderate';
    }
  };

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

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [activationConfirmType, setActivationConfirmType] = useState<'accept' | 'decline' | null>(null);
  const [expandedRecipientSections, setExpandedRecipientSections] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'active' | 'historical' | 'sent'>('active');
  const [selectedIncidents, setSelectedIncidents] = useState<string[]>([]);
  const [isIncidentPopoverOpen, setIsIncidentPopoverOpen] = useState(false);
  const [selectedAORs, setSelectedAORs] = useState<string[]>([]);
  const [isAORPopoverOpen, setIsAORPopoverOpen] = useState(false);
  
  // State for acknowledgement notification
  const [acknowledgedTimestamp, setAcknowledgedTimestamp] = useState<string | null>(data.acknowledgedTimestamp || null);
  
  // State for safety check form notification
  const [safetyFormSubmitted, setSafetyFormSubmitted] = useState(data.safetyFormSubmitted || false);
  const [safetyFormData, setSafetyFormData] = useState({
    isSafe: data.safetyFormData?.isSafe || '',
    comments: data.safetyFormData?.comments || '',
    submittedAt: data.safetyFormData?.submittedAt || null
  });
  const [safetyCheckArchived, setSafetyCheckArchived] = useState(data.safetyCheckArchived || false);
  const [safetyCheckArchiveModalOpen, setSafetyCheckArchiveModalOpen] = useState(false);

  // State for boom data layer review notification
  const [boomDataLayerReviewed, setBoomDataLayerReviewed] = useState(data.boomDataLayerReviewed || false);
  const [boomDataLayerArchived, setBoomDataLayerArchived] = useState(data.boomDataLayerArchived || false);
  const [boomDataLayerReviewData, setBoomDataLayerReviewData] = useState({
    decision: data.boomDataLayerReviewData?.decision || '',
    comments: data.boomDataLayerReviewData?.comments || '',
    submittedAt: data.boomDataLayerReviewData?.submittedAt || null
  });

  // State for incident activation request notification
  const [incidentActivationResponded, setIncidentActivationResponded] = useState(data.incidentActivationResponded || false);
  const [incidentActivationAccepted, setIncidentActivationAccepted] = useState(data.incidentActivationAccepted || false);
  const [incidentActivationResponse, setIncidentActivationResponse] = useState({
    decision: data.incidentActivationResponse?.decision || '',
    submittedAt: data.incidentActivationResponse?.submittedAt || null
  });

  // State for action completion notification
  const [actionCompletionSubmitted, setActionCompletionSubmitted] = useState(data.actionCompletionSubmitted || false);
  const [actionCompletionText, setActionCompletionText] = useState(data.actionCompletionText || '');
  const [actionCompletionResponse, setActionCompletionResponse] = useState({
    submittedAt: data.actionCompletionResponse?.submittedAt || null,
    completionNotes: data.actionCompletionResponse?.completionNotes || ''
  });

  // State for ICS-204 Draft Update modal
  const [ics204ModalOpen, setIcs204ModalOpen] = useState(false);
  const [uasShootdownVisible, setUasShootdownVisible] = useState(false);

  // State for Create Incident modal
  const [createIncidentModalOpen, setCreateIncidentModalOpen] = useState(false);
  const [createIncidentModalStep, setCreateIncidentModalStep] = useState(1);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Civil Disturbance');
  const [selectedNotificationChannels, setSelectedNotificationChannels] = useState<string[]>([]);
  const [incidentTeamsPopoverOpen, setIncidentTeamsPopoverOpen] = useState(false);
  const [incidentIndividualsPopoverOpen, setIncidentIndividualsPopoverOpen] = useState(false);
  const [incidentCategoriesPopoverOpen, setIncidentCategoriesPopoverOpen] = useState(false);
  const [incidentNotificationChannelsPopoverOpen, setIncidentNotificationChannelsPopoverOpen] = useState(false);
  const [incidentAORPopoverOpen, setIncidentAORPopoverOpen] = useState(false);
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null);
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [initialSitrep, setInitialSitrep] = useState('Social media intelligence indicates emerging civil disturbance near MetLife Stadium main entrance on Route 120 / Paterson Plank Road. Crowd size estimated at 200-300 individuals based on multiple geotagged posts. Social media users describe opposition to the Iranian soccer team playing in a match today at 14:00 EST.');
  const [initialObjectives, setInitialObjectives] = useState('Deter violence from emerging during the protests.');
  const [incidentAOR, setIncidentAOR] = useState('Sector New York');
  const [incidentAddress, setIncidentAddress] = useState('Vicinity of Metlife Stadium');
  const [incidentStartTime, setIncidentStartTime] = useState('');
  const [incidentLocationType, setIncidentLocationType] = useState('Point');

  // State for SITREP review notification
  const [sitrepReviewed, setSitrepReviewed] = useState(data.sitrepReviewed || false);
  const [sitrepArchived, setSitrepArchived] = useState(data.sitrepArchived || false);
  const [sitrepReviewData, setSitrepReviewData] = useState({
    decision: data.sitrepReviewData?.decision || '',
    comments: data.sitrepReviewData?.comments || '',
    submittedAt: data.sitrepReviewData?.submittedAt || null
  });
  const [draftSitrepContent] = useState(
    'SITREP - FIFA World Cup 2026 Security Operations\n\nCurrent Situation: DHS maintains ELEVATED threat posture for all World Cup venues in the Northeast corridor. 11 stadiums report GREEN security status with enhanced screening protocols active. MetLife Stadium match day operations commence at 0600L with USA vs Mexico quarterfinal kickoff scheduled for 1500L.\n\nOperational Status: TSA screening checkpoints at stadium perimeters report normal throughput. CBP has 47 special agents deployed for credential verification and anti-counterfeiting operations. Secret Service CAT teams positioned at venue outer perimeter. CBRN detection systems operational at all entry points.\n\nResources: 240 DHS personnel on-site including K9 teams, tactical units, and intelligence liaisons. FBI Joint Terrorism Task Force maintains joint operations center. State and local law enforcement report 850 officers deployed in coordinated security posture. Air space restrictions (TFR) in effect 30nm radius. All resources report full operational capability.\n\nSubmitted by: J. Smith (j.smith@hq.dhs.gov)\nSubmitted: 06/28/2026 14:30'
  );

  // State for sent notification search filters
  const [incidentBriefingAckSearch, setIncidentBriefingAckSearch] = useState('');
  const [incidentBriefingNotAckSearch, setIncidentBriefingNotAckSearch] = useState('');
  const [emergencyStandDownAckSearch, setEmergencyStandDownAckSearch] = useState('');
  const [emergencyStandDownNotAckSearch, setEmergencyStandDownNotAckSearch] = useState('');

  const [alerts, setAlerts] = useState<AlertItem[]>(
    data.alerts || [
      {
        id: 'al-dhs-hq-threat',
        title: 'DHS HQ Directive: Increase Threat Posture – Sector Seattle',
        source: 'DHS Headquarters',
        severity: 'Critical',
        issuedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        description: 'DHS Headquarters directs all operational units in Sector Seattle to immediately increase threat posture to ELEVATED in response to a likely UAS threat. Intelligence indicates a high probability of hostile unmanned aircraft system activity targeting critical infrastructure and World Cup venue areas within the Sector Seattle AOR.',
        timeSent: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        sentBy: 'ops.center@hq.dhs.gov',
        location: 'Sector Seattle AOR'
      },
      {
        id: 'al-uas-seattle',
        title: 'Intelligence Alert: Suspected UAS Cargo – Port of Seattle',
        source: 'Grist Mill',
        severity: 'Critical',
        issuedAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        description: 'Credible intelligence indicates that shipping traffic into the Port of Seattle contains a Chinese vessel barge suspected of carrying unmanned aircraft systems (UAS). Source assessment is rated high confidence. Recommend immediate coordination with port authority and CBP for inspection and interdiction posture.',
        timeSent: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        sentBy: 'grist.mill@intel.dhs.gov',
        location: 'Port of Seattle, WA'
      },
      {
        id: 'al1',
        title: 'Elevated Threat Advisory - FIFA World Cup Venues',
        source: 'DHS/NTAS',
        severity: 'Advisory',
        issuedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        description: 'DHS maintains elevated security posture for all World Cup 2026 venues and surrounding areas. Enhanced screening and surveillance protocols are in effect. Personnel should remain vigilant and report suspicious activities immediately.',
        timeSent: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        sentBy: 'j.martinez@hq.dhs.gov',
        location: 'Northeast Region World Cup Venues'
      },
      {
        id: 'al2',
        title: 'Temporary Flight Restriction - Match Day Operations',
        source: 'FAA/TSA',
        severity: 'Watch',
        issuedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        description: 'TFR established 30 nautical mile radius around MetLife Stadium. No drone operations permitted within restricted airspace. All aircraft must maintain minimum altitude 3000ft AGL. Duration: Match start minus 1 hour through match end plus 1 hour.',
        timeSent: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
        sentBy: 'm.rodriguez@tsa.dhs.gov',
        location: 'MetLife Stadium - East Rutherford, NJ'
      },
      {
        id: 'al3',
        title: 'Mass Transit Security Alert - Fan Movement Operations',
        source: 'TSA Surface Division',
        severity: 'Info',
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'Active',
        description: 'Increased screening at major transit hubs serving World Cup venues. NJ Transit, PATH, and Amtrak stations implementing enhanced K9 patrols and VIPR team deployments. Expect increased passenger processing times. Fans should arrive 90 minutes early.',
        timeSent: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        sentBy: 's.johnson@tsa.dhs.gov',
        location: 'NY/NJ Metro Transit System'
      }
    ]
  );

  // Available incidents for filtering
  const incidents = [
    'World Cup 2026 - MetLife Stadium Operations',
    'World Cup 2026 - Gillette Stadium Operations',
    'World Cup 2026 - Lincoln Financial Field Operations',
    'Credentialing and Access Control - All Venues',
    'Counter-UAS Operations - Northeast Region',
    'Mass Gathering Security - Fan Zones'
  ];

  // Available AORs for filtering
  const aors = [
    'Northeast Region',
    'MetLife Stadium Complex',
    'NYC Metro Area',
    'TSA Screening Operations',
    'CBP Entry Points',
  ];

  // Handler for incident selection
  const toggleIncident = (incident: string) => {
    setSelectedIncidents(prev => 
      prev.includes(incident) 
        ? prev.filter(i => i !== incident)
        : [...prev, incident]
    );
  };

  const clearIncidentFilter = () => {
    setSelectedIncidents([]);
  };

  // Handler for AOR selection
  const toggleAOR = (aor: string) => {
    setSelectedAORs(prev => 
      prev.includes(aor) 
        ? prev.filter(a => a !== aor)
        : [...prev, aor]
    );
  };

  // Available teams and individuals for Create Incident modal
  const incidentAvailableTeams = [
    { 
      name: 'IMT Alpha', 
      type: 'Type 1', 
      people: 45, 
      available: true,
      members: [
        { name: 'Sarah Chen', role: 'Incident Commander', available: true },
        { name: 'Marcus Johnson', role: 'Planning Section Chief', available: true },
        { name: 'Jennifer Martinez', role: 'Operations Section Chief', available: true },
        { name: 'David Kim', role: 'Logistics Section Chief', available: true },
        { name: 'Rachel Thompson', role: 'Finance/Admin Chief', available: true }
      ]
    },
    { 
      name: 'IMT Bravo', 
      type: 'Type 1', 
      people: 42, 
      available: true,
      members: [
        { name: 'Robert Garcia', role: 'Incident Commander', available: true },
        { name: 'Emily Rodriguez', role: 'Planning Section Chief', available: true },
        { name: 'Michael Brown', role: 'Operations Section Chief', available: false },
        { name: 'Amanda Wilson', role: 'Logistics Section Chief', available: true },
        { name: 'James Taylor', role: 'Finance/Admin Chief', available: true }
      ]
    },
    { 
      name: 'IMT Charlie', 
      type: 'Type 2', 
      people: 28, 
      available: false,
      members: [
        { name: 'Lisa Anderson', role: 'Incident Commander', available: false },
        { name: 'Daniel White', role: 'Planning Section Chief', available: false },
        { name: 'Maria Lopez', role: 'Operations Section Chief', available: true },
        { name: 'Thomas Harris', role: 'Logistics Section Chief', available: false }
      ]
    },
    { 
      name: 'IMT Delta', 
      type: 'Type 2', 
      people: 31, 
      available: true,
      members: [
        { name: 'Christopher Lee', role: 'Incident Commander', available: true },
        { name: 'Patricia Moore', role: 'Planning Section Chief', available: true },
        { name: 'Kevin Clark', role: 'Operations Section Chief', available: true },
        { name: 'Nancy Martinez', role: 'Logistics Section Chief', available: true }
      ]
    },
    { 
      name: 'IMT Echo', 
      type: 'Type 3', 
      people: 18, 
      available: false,
      members: [
        { name: 'Steven Wright', role: 'Incident Commander', available: false },
        { name: 'Michelle King', role: 'Planning Section Chief', available: true },
        { name: 'Brian Scott', role: 'Operations Section Chief', available: false }
      ]
    },
    { 
      name: 'IMT Foxtrot', 
      type: 'Type 3', 
      people: 22, 
      available: true,
      members: [
        { name: 'Rebecca Adams', role: 'Incident Commander', available: true },
        { name: 'Charles Baker', role: 'Planning Section Chief', available: true },
        { name: 'Jessica Turner', role: 'Operations Section Chief', available: true }
      ]
    }
  ];

  const incidentAvailableIndividuals = [
    'Sarah Chen - Incident Commander',
    'Marcus Johnson - Planning Section Chief',
    'Jennifer Martinez - Operations Section Chief',
    'David Kim - Logistics Section Chief',
    'Rachel Thompson - Finance/Admin Section Chief',
    'Robert Garcia - Safety Officer',
    'Emily Rodriguez - Intelligence Officer',
    'Michael Brown - Public Information Officer',
    'Amanda Wilson - Liaison Officer',
    'James Taylor - Situation Unit Leader'
  ];

  const incidentAvailableCategories = [
    'Civil Disturbance',
    'Terrorism Threat',
    'Mass Casualty Event',
    'Security Breach',
    'Infrastructure Disruption',
    'Cyber Attack',
    'CBRN Incident',
    'Venue Security'
  ];

  const incidentAvailableAORs = [
    'Sector New York',
    'Sector Boston',
    'Sector Delaware Bay',
    'Sector Long Island Sound',
    'Sector Northern New England'
  ];

  const incidentAvailableNotificationChannels = [
    'PRATUS',
    'Microsoft Teams',
    'SMS',
    'Call'
  ];

  // Toggle functions for Create Incident modal
  const toggleTeam = (teamName: string) => {
    const team = incidentAvailableTeams.find(t => t.name === teamName);
    const isCurrentlySelected = selectedTeams.includes(teamName);
    
    setSelectedTeams(prev => 
      isCurrentlySelected
        ? prev.filter(t => t !== teamName)
        : [...prev, teamName]
    );
    
    // Toggle all team members
    if (team) {
      const memberIds = team.members.map(m => `${teamName}:${m.name}`);
      setSelectedTeamMembers(prev => 
        isCurrentlySelected
          ? prev.filter(id => !memberIds.includes(id))
          : [...prev, ...memberIds]
      );
    }
  };
  
  const toggleTeamMember = (teamName: string, memberName: string) => {
    const memberId = `${teamName}:${memberName}`;
    setSelectedTeamMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const toggleIndividual = (individual: string) => {
    setSelectedIndividuals(prev => 
      prev.includes(individual) 
        ? prev.filter(i => i !== individual)
        : [...prev, individual]
    );
  };

  const selectCategory = (category: string) => {
    setSelectedCategory(category);
    setIncidentCategoriesPopoverOpen(false);
  };

  const selectAOR = (aor: string) => {
    setIncidentAOR(aor);
    setIncidentAORPopoverOpen(false);
  };

  const toggleNotificationChannel = (channel: string) => {
    setSelectedNotificationChannels(prev => 
      prev.includes(channel) 
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const clearAORFilter = () => {
    setSelectedAORs([]);
  };

  const [formData, setFormData] = useState<AlertItem>({
    id: '',
    title: '',
    source: '',
    severity: 'Info',
    issuedAt: new Date().toISOString(),
    expiresAt: '',
    status: 'Active',
    description: '',
    recipients: [],
    scheduledTime: new Date().toISOString(),
    channels: [],
    archiveDateTime: '',
  });
  const [enableArchiveDateTime, setEnableArchiveDateTime] = useState(false);

  // State for recipient popovers
  const [individualsPopoverOpen, setIndividualsPopoverOpen] = useState(false);
  const [teamsPopoverOpen, setTeamsPopoverOpen] = useState(false);
  const [associatedIncidentsPopoverOpen, setAssociatedIncidentsPopoverOpen] = useState(false);
  
  // State for associated incidents in notification
  const [associatedIncidents, setAssociatedIncidents] = useState<string[]>([]);
  
  // State for send timing mode
  const [sendTimingMode, setSendTimingMode] = useState<'now' | 'scheduled'>('scheduled');

  // State for keep message same across channels
  const [keepMessageSame, setKeepMessageSame] = useState(true);
  
  // State for require acknowledgement
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false);
  
  // State for accept responses
  const [letRecipientsArchive, setLetRecipientsArchive] = useState(false);
  
  // State for active message tab
  const [activeMessageTab, setActiveMessageTab] = useState<string>('');
  
  // State for channel-specific messages
  const [channelMessages, setChannelMessages] = useState<Record<string, string>>({});

  // Set active tab when channels change
  useEffect(() => {
    if (formData.channels && formData.channels.length > 0) {
      // Set to first channel if no active tab or active tab is not in selected channels
      if (!activeMessageTab || !formData.channels.includes(activeMessageTab)) {
        setActiveMessageTab(formData.channels[0]);
      }
    }
  }, [formData.channels, activeMessageTab]);

  // Available communication channels
  const communicationChannels = [
    { id: 'email', label: 'Email', icon: '📧' },
    { id: 'sms', label: 'SMS', icon: '💬' },
    { id: 'push', label: 'PRATUS Notification', icon: '🔔' },
    { id: 'teams', label: 'Microsoft Teams', icon: '💼' },
  ];

  // Available individuals for recipient selection
  const availableIndividuals = [
    'john.smith@uscg.mil',
    'sarah.johnson@uscg.mil',
    'mike.williams@noaa.gov',
    'lisa.chen@epa.gov',
    'david.rodriguez@uscg.mil',
    'emily.davis@state.gov',
    'james.wilson@uscg.mil',
    'maria.garcia@noaa.gov',
    'robert.brown@uscg.mil',
    'jennifer.taylor@noaa.gov',
    'michael.anderson@epa.gov',
    'patricia.martinez@state.gov',
  ];

  // Available teams for recipient selection
  const availableTeams = [
    'Operations Section',
    'Planning Section',
    'Logistics Section',
    'Finance/Admin Section',
    'Incident Command Team',
    'Marine Branch',
    'Safety Officers',
    'Public Information Team',
    'Liaison Officers',
    'Environmental Unit',
    'Response Coordinators',
    'Field Operations Team',
  ];

  // Available incidents for association
  const availableIncidents = [
    'Incident Alpha',
    'Maritime Emergency - Sector Honolulu',
    'Hurricane Watch - Pacific Region',
    'Search and Rescue Operation',
    'Oil Spill Response',
    'Port Security Exercise',
  ];

  // Helper functions for recipients
  const toggleRecipient = (recipient: string) => {
    const recipients = formData.recipients || [];
    if (recipients.includes(recipient)) {
      setFormData({ ...formData, recipients: recipients.filter(r => r !== recipient) });
    } else {
      setFormData({ ...formData, recipients: [...recipients, recipient] });
    }
  };

  const removeRecipient = (recipient: string) => {
    setFormData({ ...formData, recipients: formData.recipients?.filter(r => r !== recipient) || [] });
  };

  // Helper functions for associated incidents in notification
  const toggleAssociatedIncident = (incident: string) => {
    if (associatedIncidents.includes(incident)) {
      setAssociatedIncidents(associatedIncidents.filter(i => i !== incident));
    } else {
      setAssociatedIncidents([...associatedIncidents, incident]);
    }
  };

  const removeAssociatedIncident = (incident: string) => {
    setAssociatedIncidents(associatedIncidents.filter(i => i !== incident));
  };

  const toggleChannel = (channelId: string) => {
    const channels = formData.channels || [];
    if (channels.includes(channelId)) {
      setFormData({ ...formData, channels: channels.filter(c => c !== channelId) });
    } else {
      setFormData({ ...formData, channels: [...channels, channelId] });
    }
  };

  // Get map coordinates for each alert based on alert type and content
  const getAlertCoordinates = (alertId: string): { center: string; scale: string } => {
    switch (alertId) {
      case 'civil-disturbance-grist': // Civil Disturbance - MetLife Stadium
        return { center: '-74.0742,40.8128', scale: '72223.819286' }; // MetLife Stadium, East Rutherford, NJ
      case 'al1': // Small Craft Advisory - outer coastal waters
        return { center: '-74.2,40.5', scale: '288895.277144' }; // New York/New Jersey coastal waters
      case 'al2': // Port Condition Yankee - major port
        return { center: '-95.2631,29.7604', scale: '144447.638572' }; // Houston Ship Channel
      case 'al3': // Air Quality Alert - industrial/waterfront area
        return { center: '-118.2437,33.7701', scale: '144447.638572' }; // LA/Long Beach port area
      default:
        return { center: '-74.006,40.7128', scale: '144447.638572' }; // Default to NYC area
    }
  };

  const formatDateDisplay = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  };

  const formatMilitaryTimeUTC = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hours = String(d.getUTCHours()).padStart(2, '0');
    const minutes = String(d.getUTCMinutes()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes} UTC`;
  };

  const persist = (items: AlertItem[]) => {
    setAlerts(items);
    onDataChange({ ...data, alerts: items });
  };

  const toggleAlert = (id: string) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAddAlert = () => {
    setEditingAlertId(null);
    setFormData({
      id: '',
      title: '',
      source: 'Manual Alert',
      severity: 'Info',
      issuedAt: new Date().toISOString(),
      expiresAt: '',
      status: 'Active',
      description: '',
      recipients: [],
      scheduledTime: new Date().toISOString(),
      channels: [],
    });
    setSendTimingMode('scheduled');
    setIsSheetOpen(true);
  };

  const openEditAlert = (id: string) => {
    const a = alerts.find(x => x.id === id);
    if (!a) return;
    setEditingAlertId(id);
    setFormData({ ...a });
    setSendTimingMode(a.scheduledTime ? 'scheduled' : 'now');
    setIsSheetOpen(true);
  };

  const deleteAlert = (id: string) => {
    persist(alerts.filter(a => a.id !== id));
  };

  const saveAlert = () => {
    if (!formData.title) {
      return;
    }
    
    // Update scheduledTime based on send timing mode
    const updatedFormData = {
      ...formData,
      scheduledTime: sendTimingMode === 'now' ? new Date().toISOString() : formData.scheduledTime
    };
    
    if (editingAlertId) {
      persist(alerts.map(a => (a.id === editingAlertId ? { ...updatedFormData, id: editingAlertId } : a)));
    } else {
      const id = `${Date.now()}`;
      persist([...alerts, { ...updatedFormData, id, source: 'Manual Alert' }]);
    }
    setIsSheetOpen(false);
    setEditingAlertId(null);
  };

  const filtered = alerts.filter(a => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(s) ||
      (a.sentBy && a.sentBy.toLowerCase().includes(s)) ||
      a.severity.toLowerCase().includes(s) ||
      a.status.toLowerCase().includes(s)
    );
  });

  const severityColor = (sev: Severity) => {
    switch (sev) {
      case 'Warning': return '#EF4444';
      case 'Watch': return '#F59E0B';
      case 'Advisory': return '#3B82F6';
      case 'Stand Down Safety': return '#DC2626';
      default: return '#6e757c';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header - similar to Resources */}
      <div className="sticky top-0 z-10 bg-[#222529] rounded-lg border border-[#6e757c] relative">
        <div className="flex items-center justify-between px-[13px] py-3 w-full border-b-2 border-border rounded-t-lg rounded-b-none">
          <div className="flex items-center gap-4">
            <div className="relative">
              <p className="caption text-nowrap text-white whitespace-pre">Notifications</p>
            </div>
          </div>
          <button
            onClick={openAddAlert}
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
            <p className="caption text-nowrap text-white ml-[21px]">Add Notification</p>
          </button>
        </div>
      </div>

      {/* Active/Historical/Sent Toggle */}
      <div className="mb-4 flex w-fit border border-border bg-[#1a1d21] rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setViewMode('active')}
          className={`px-2 text-xs font-medium transition-colors ${
            viewMode === 'active'
              ? 'bg-[#01669f] text-white'
              : 'bg-transparent text-foreground hover:bg-muted/50'
          }`}
          style={{ paddingTop: '2px', paddingBottom: '2px' }}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setViewMode('historical')}
          className={`px-2 text-xs font-medium transition-colors border-l border-border ${
            viewMode === 'historical'
              ? 'bg-[#01669f] text-white'
              : 'bg-transparent text-foreground hover:bg-muted/50'
          }`}
          style={{ paddingTop: '2px', paddingBottom: '2px' }}
        >
          Historical
        </button>
        <button
          type="button"
          onClick={() => setViewMode('sent')}
          className={`px-2 text-xs font-medium transition-colors border-l border-border ${
            viewMode === 'sent'
              ? 'bg-[#01669f] text-white'
              : 'bg-transparent text-foreground hover:bg-muted/50'
          }`}
          style={{ paddingTop: '2px', paddingBottom: '2px' }}
        >
          Sent
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4 relative h-[26px] w-[390px]">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={
            viewMode === 'active' 
              ? 'Search Active Notifications' 
              : viewMode === 'historical' 
              ? 'Search Historical Notifications' 
              : 'Search Sent Notifications'
          }
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

      {/* Incident and AOR Filters */}
      <div className="mb-4 flex items-center gap-2">
        {/* Incident Filter */}
        <div className="flex-1 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <div className="flex items-center gap-2">
            <span className="caption text-white whitespace-nowrap">Incident:</span>
            <Popover open={isIncidentPopoverOpen} onOpenChange={setIsIncidentPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-[180px] h-[24px] bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent cursor-pointer flex items-center justify-between"
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  {selectedIncidents.length === 0 
                    ? 'All Incidents' 
                    : selectedIncidents.length === 1 
                    ? selectedIncidents[0]
                    : `${selectedIncidents.length} selected`}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                <Command className="bg-[#222529]">
                  <CommandInput 
                    placeholder="Search incident..." 
                    className="h-9 caption text-white"
                    style={{ 
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  />
                  <CommandList>
                    <CommandEmpty className="caption text-white/70 p-2">No incident found.</CommandEmpty>
                    <CommandGroup>
                      {incidents.map((incident) => (
                        <CommandItem
                          key={incident}
                          value={incident}
                          onSelect={() => toggleIncident(incident)}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          style={{ 
                            fontFamily: "'Open Sans', sans-serif",
                            fontSize: '12px',
                            fontWeight: 400,
                            lineHeight: '18px'
                          }}
                        >
                          <Checkbox
                            checked={selectedIncidents.includes(incident)}
                            className="mr-2 h-3 w-3 border-white data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                          />
                          {incident}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedIncidents.length > 0 && (
              <button
                onClick={clearIncidentFilter}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Clear filter"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* AOR Filter */}
        <div className="flex-1 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <div className="flex items-center gap-2">
            <span className="caption text-white whitespace-nowrap">AOR:</span>
            <Popover open={isAORPopoverOpen} onOpenChange={setIsAORPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-[180px] h-[24px] bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent cursor-pointer flex items-center justify-between"
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
                    : `${selectedAORs.length} selected`}
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-0 bg-[#222529] border-[#6e757c]" align="start">
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
      </div>

      {/* Alerts List - similar card layout to Resources */}
      {viewMode === 'active' && (
        <div className="space-y-4">
        
        {/* UAS Shootdown Report – Levi Stadium TFR */}
        {uasShootdownVisible && (
        <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('uas-shootdown') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'uas-shootdown';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('uas-shootdown') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">Field Report: UAS Neutralized Approaching Levi Stadium TFR</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor('Critical')}20`,
                        color: getSeverityColor('Critical'),
                        border: `1px solid ${getSeverityColor('Critical')}60`
                      }}
                    >
                      Critical
                    </span>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-3">
                      <span className="caption text-white">Source: Division Alpha</span>
                      <span className="caption text-white">{formatMilitaryTimeUTC(new Date().toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onZoomToLocation) {
                      onZoomToLocation('-122.0886,37.4983', '36111.909643');
                    }
                    const mapEl = document.querySelector('arcgis-embedded-map') as any;
                    if (mapEl?.view) {
                      mapEl.view.goTo({ center: [-122.0886, 37.4983], zoom: 14 }, { duration: 1500 });
                    }
                  }}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                  title="Zoom to alert location"
                >
                  <Map className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
          {expandedAlerts.has('uas-shootdown') && (
            <div className="p-4 space-y-4 bg-card/50">
              <div>
                <label className="text-white mb-1 block">Incident Summary</label>
                <p className="caption text-white">Division Alpha reports successful neutralization of an unmanned aircraft system (UAS) approaching the Levi Stadium Temporary Flight Restriction (TFR) zone. The UAS was detected by counter-UAS sensors and engaged per standing rules of engagement. The asset was downed approximately 0.5 nautical miles from the stadium perimeter with no collateral damage or injuries reported. Debris recovery and forensic analysis are underway.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white mb-1 block">Location</label>
                  <p className="caption text-white">Levi Stadium TFR, Santa Clara, CA</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Reporting Unit</label>
                  <p className="caption text-white">Division Alpha — Strike Team 001</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Threat Category</label>
                  <p className="caption text-white">UAS / Counter-UAS</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Outcome</label>
                  <p className="caption text-white">UAS neutralized — no casualties</p>
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        {/* DHS HQ Directive: Increase Threat Posture – Sector Seattle */}
        <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('dhs-hq-threat-posture') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'dhs-hq-threat-posture';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('dhs-hq-threat-posture') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">DHS HQ Directive: Increase Threat Posture – Sector Seattle</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor('Critical')}20`,
                        color: getSeverityColor('Critical'),
                        border: `1px solid ${getSeverityColor('Critical')}60`
                      }}
                    >
                      Critical
                    </span>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-3">
                      <span className="caption text-white">Source: DHS Headquarters</span>
                      <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 1 * 60 * 1000).toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onZoomToLocation) {
                      onZoomToLocation('-122.3321,47.6062', '144447.638572');
                    }
                    const mapEl = document.querySelector('arcgis-embedded-map') as any;
                    if (mapEl?.view) {
                      mapEl.view.goTo({ center: [-122.3321, 47.6062], zoom: 12 }, { duration: 1500 });
                    }
                  }}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                  title="Zoom to alert location"
                >
                  <Map className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
          {expandedAlerts.has('dhs-hq-threat-posture') && (
            <div className="p-4 space-y-4 bg-card/50">
              <div>
                <label className="text-white mb-1 block">Directive Summary</label>
                <p className="caption text-white">DHS Headquarters directs all operational units in Sector Seattle to immediately increase threat posture to ELEVATED in response to a likely UAS threat. Intelligence indicates a high probability of hostile unmanned aircraft system activity targeting critical infrastructure and World Cup venue areas within the Sector Seattle AOR. All units are to activate enhanced surveillance protocols, establish counter-UAS watch stations, and coordinate with local law enforcement and FAA for airspace monitoring.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white mb-1 block">Affected Area</label>
                  <p className="caption text-white">Sector Seattle AOR</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Issuing Authority</label>
                  <p className="caption text-white">DHS Headquarters</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Threat Category</label>
                  <p className="caption text-white">UAS / Counter-UAS</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Posture Level</label>
                  <p className="caption text-white">ELEVATED</p>
                </div>
              </div>
              <div>
                <label className="text-white mb-1 block">Required Actions</label>
                <div className="space-y-3 mt-2">
                  <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)' }}>
                    <p className="caption text-white">Activate enhanced counter-UAS surveillance and detection protocols across all Sector Seattle watch stations and World Cup venue perimeters.</p>
                  </div>
                  <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)' }}>
                    <p className="caption text-white">Coordinate with FAA and local law enforcement to enforce expanded temporary flight restrictions and airspace monitoring in the Sector Seattle AOR.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence Alert: Suspected UAS Cargo – Port of Seattle */}
        <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('uas-seattle-intel') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'uas-seattle-intel';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('uas-seattle-intel') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">Intelligence Alert: Suspected UAS Cargo – Port of Seattle</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor('Critical')}20`,
                        color: getSeverityColor('Critical'),
                        border: `1px solid ${getSeverityColor('Critical')}60`
                      }}
                    >
                      Critical
                    </span>
                  </div>
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-3">
                      <span className="caption text-white">Source: Grist Mill</span>
                      <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 2 * 60 * 1000).toISOString())}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onZoomToLocation) {
                      onZoomToLocation('-122.3321,47.6062', '144447.638572');
                    }
                    const mapEl = document.querySelector('arcgis-embedded-map') as any;
                    if (mapEl?.view) {
                      mapEl.view.goTo({ center: [-122.3321, 47.6062], zoom: 12 }, { duration: 1500 });
                    }
                  }}
                  className="p-1 hover:bg-muted/30 rounded transition-colors"
                  title="Zoom to alert location"
                >
                  <Map className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
          {expandedAlerts.has('uas-seattle-intel') && (
            <div className="p-4 space-y-4 bg-card/50">
              <div>
                <label className="text-white mb-1 block">Intelligence Summary</label>
                <p className="caption text-white">Credible intelligence indicates that shipping traffic into the Port of Seattle contains a Chinese vessel barge suspected of carrying unmanned aircraft systems (UAS). Source assessment is rated high confidence. Recommend immediate coordination with port authority and CBP for inspection and interdiction posture.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white mb-1 block">Location</label>
                  <p className="caption text-white">Port of Seattle, WA</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Data Source</label>
                  <p className="caption text-white">Grist Mill</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Threat Category</label>
                  <p className="caption text-white">UAS / Counter-UAS, Maritime Security</p>
                </div>
                <div>
                  <label className="text-white mb-1 block">Confidence Level</label>
                  <p className="caption text-white">High</p>
                </div>
              </div>
              <div>
                <label className="text-white mb-1 block">Recommended Actions</label>
                <div className="space-y-3 mt-2">
                  <div className="rounded-md p-3" style={{ backgroundColor: 'rgba(139, 92, 246, 0.08)' }}>
                    <p className="caption text-white">Update ICS-204 in Current IAP: Patrol the waters surrounding Levi Stadium to surveil and identify any UAS assets in the area.</p>
                    <button
                      onClick={() => setIcs204ModalOpen(true)}
                      className="bg-[#01669f] h-[22.75px] rounded-[4px] hover:bg-[#01669f]/90 transition-colors flex items-center justify-center px-3 mt-2"
                    >
                      <p className="caption text-nowrap text-white">Draft Update</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Assignment Notification */}
        {!actionCompletionSubmitted && <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('action-assignment') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'action-assignment';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('action-assignment') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">Action Assignment: Establish Communications Protocol</span>
                  </div>
                  {!expandedAlerts.has('action-assignment') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="caption text-white">Planning Section Chief</span>
                        <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 45 * 60 * 1000).toISOString())}</span>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedAlerts(prev => {
                            const next = new Set(prev);
                            next.add('action-assignment');
                            return next;
                          });
                        }}
                        className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                        style={{ paddingTop: '4px', paddingBottom: '4px' }}
                      >
                        Submit Completion
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {expandedAlerts.has('action-assignment') && (
            <div className="p-4 space-y-4 bg-card/50">
              <div>
                <label className="text-white mb-1 block">Action Assignment: Establish Communications Protocol</label>
                <p className="caption text-white mb-3">
                  Assigned by: Planning Section Chief at {formatMilitaryTimeUTC(new Date(Date.now() - 45 * 60 * 1000).toISOString())}
                </p>
                <p className="caption text-white font-semibold">
                  Priority: High
                </p>
                <div style={{ height: '1rem' }}></div>
                <p className="caption text-white">
                  You have been assigned to establish and document a standardized communications protocol for all field units operating in the incident area. This should include primary and backup channels, check-in procedures, and emergency protocols.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="completion-notes" className="text-white mb-2 block">
                    Completion Notes
                  </Label>
                  <Textarea
                    id="completion-notes"
                    value={actionCompletionText}
                    onChange={(e) => {
                      setActionCompletionText(e.target.value);
                      onDataChange({
                        ...data,
                        actionCompletionText: e.target.value
                      });
                    }}
                    placeholder="Enter details about how you completed this action..."
                    className="bg-card/50 border-border text-white placeholder:text-white/40 min-h-[100px]"
                    style={{ fontSize: '12px' }}
                  />
                  <p className="caption text-white/60 mt-1">
                    Describe the steps taken to complete this action and any relevant details for verification.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setActionCompletionResponse({
                      submittedAt: new Date().toISOString(),
                      completionNotes: actionCompletionText
                    });
                    setActionCompletionSubmitted(true);
                    onDataChange({
                      ...data,
                      actionCompletionSubmitted: true,
                      actionCompletionResponse: {
                        submittedAt: new Date().toISOString(),
                        completionNotes: actionCompletionText
                      }
                    });
                  }}
                  disabled={!actionCompletionText.trim()}
                  className="bg-primary hover:bg-primary/90 text-white px-4 h-auto text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ paddingTop: '6px', paddingBottom: '6px' }}
                >
                  Submit Completion
                </Button>
              </div>
            </div>
          )}
        </div>}
        
        {/* Boom Data Layer Review Notification - Only show if not archived */}
        {!boomDataLayerArchived && <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('boom-data-layer-review') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                  const id = 'boom-data-layer-review';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                {expandedAlerts.has('boom-data-layer-review') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">Review Requested: Stadium Perimeter Security Zone Update - MetLife Stadium</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor(getNotificationSeverity('boom-data-layer-review'))}20`,
                        color: getSeverityColor(getNotificationSeverity('boom-data-layer-review')),
                        border: `1px solid ${getSeverityColor(getNotificationSeverity('boom-data-layer-review'))}60`
                      }}
                    >
                      {getNotificationSeverity('boom-data-layer-review')}
                    </span>
                  </div>
                  {!expandedAlerts.has('boom-data-layer-review') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                        <span className="caption text-white">M. Rodriguez</span>
                        <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())}</span>
                      </div>
                      {!boomDataLayerReviewed ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAlerts(prev => new Set(prev).add('boom-data-layer-review'));
                          }}
                          className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                          style={{ paddingTop: '4px', paddingBottom: '4px' }}
                        >
                          Review Update
                        </Button>
                      ) : (
                        <p className="caption text-white">
                          Review submitted at {formatDateDisplay(boomDataLayerReviewData.submittedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBoomDataLayerArchived(true);
                  onDataChange({
                    ...data,
                    boomDataLayerArchived: true
                  });
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {expandedAlerts.has('boom-data-layer-review') && (
            <div className="p-4 space-y-4 bg-card/50">
              {!boomDataLayerReviewed ? (
                <>
                  <div>
                    <label className="text-white mb-1 block">MetLife Stadium Security Perimeter Update</label>
                    <p className="caption text-white mb-3">
                      Submitted by: M. Rodriguez at {formatMilitaryTimeUTC(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())}
                    </p>
                    <Button
                      onClick={() => {
                        console.log('Preview Proposed Data Layer clicked');
                        // Placeholder for functionality
                      }}
                      className="bg-primary hover:bg-primary/90 text-white px-4 h-auto text-xs"
                      style={{ paddingTop: '6px', paddingBottom: '6px', marginTop: '8px' }}
                    >
                      Preview Proposed Security Zones
                    </Button>
                    
                    {/* Legend Section */}
                    <div className="mt-4">
                      <label className="text-white mb-2 block text-xs">Legend</label>
                      <div className="flex items-center gap-3">
                        <span className="caption text-white">Proposed Security Zone</span>
                        <div 
                          style={{ 
                            width: '16px', 
                            height: '16px', 
                            borderRadius: '50%', 
                            backgroundColor: '#ef4444',
                            zIndex: 9999,
                            position: 'relative',
                            border: '3px solid rgba(255, 255, 255, 0.5)',
                            flexShrink: 0
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-white mb-2 block">Decision</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setBoomDataLayerReviewData({ ...boomDataLayerReviewData, decision: 'approve' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            boomDataLayerReviewData.decision === 'approve'
                              ? 'bg-accent/20 border-accent text-accent'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setBoomDataLayerReviewData({ ...boomDataLayerReviewData, decision: 'deny' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            boomDataLayerReviewData.decision === 'deny'
                              ? 'bg-accent/20 border-accent text-accent'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          Deny
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-white mb-2 block">Comments to Submitter</label>
                      <Textarea
                        value={boomDataLayerReviewData.comments}
                        onChange={(e) => setBoomDataLayerReviewData({ ...boomDataLayerReviewData, comments: e.target.value })}
                        placeholder="Enter feedback or additional requirements..."
                        rows={4}
                        className="bg-input-background border-border resize-none text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => {
                        if (boomDataLayerReviewData.decision) {
                          const submittedData = {
                            ...boomDataLayerReviewData,
                            submittedAt: new Date().toISOString()
                          };
                          setBoomDataLayerReviewData(submittedData);
                          setBoomDataLayerReviewed(true);
                          onDataChange({ 
                            ...data, 
                            boomDataLayerReviewed: true,
                            boomDataLayerReviewData: submittedData
                          });
                          // Auto-collapse after submission
                          setExpandedAlerts(prev => {
                            const next = new Set(prev);
                            next.delete('boom-data-layer-review');
                            return next;
                          });
                        }
                      }}
                      disabled={!boomDataLayerReviewData.decision}
                      className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Review
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-white mb-1 block">Review Submitted</label>
                    <p className="caption text-white">
                      You {boomDataLayerReviewData.decision === 'approve' ? 'approved' : 'denied'} this update at {formatDateDisplay(boomDataLayerReviewData.submittedAt)}.
                    </p>
                  </div>
                  {boomDataLayerReviewData.comments && (
                    <div>
                      <label className="text-white mb-1 block">Your Comments</label>
                      <p className="caption text-white">{boomDataLayerReviewData.comments}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>}
        
        {/* Safety Check Form Notification - Only show if not archived */}
        {!safetyCheckArchived && <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('safety-check-form') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  if (!safetyFormSubmitted) {
                    const id = 'safety-check-form';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }
                }}
              >
                {expandedAlerts.has('safety-check-form') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                          <div className="flex items-center gap-2">
                    <span className="caption text-white">Safety Check - Personnel Status Report</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor(getNotificationSeverity('safety-check-form'))}20`,
                        color: getSeverityColor(getNotificationSeverity('safety-check-form')),
                        border: `1px solid ${getSeverityColor(getNotificationSeverity('safety-check-form'))}60`
                      }}
                    >
                      {getNotificationSeverity('safety-check-form')}
                    </span>
                          </div>
                  {!expandedAlerts.has('safety-check-form') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="caption text-white">System</span>
                        <span className="caption text-white">{formatMilitaryTimeUTC(new Date().toISOString())}</span>
                        </div>
                      {!safetyFormSubmitted ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAlerts(prev => new Set(prev).add('safety-check-form'));
                          }}
                          className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                          style={{ paddingTop: '4px', paddingBottom: '4px' }}
                        >
                          Complete Form
                        </Button>
                      ) : (
                        <p className="caption text-white">
                          Status submitted at {formatDateDisplay(safetyFormData.submittedAt)}
                        </p>
                      )}
                      </div>
                    )}
                  </div>
                </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Edit functionality placeholder
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  title="Edit notification"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSafetyCheckArchiveModalOpen(true);
                  }}
                  className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                  title="Archive for all users"
                >
                  <ArrowRightToLine className="w-4 h-4 text-white" />
                </button>
                </div>
              </div>
            </div>

          {expandedAlerts.has('safety-check-form') && (
            <div className="p-4 space-y-4 bg-card/50">
              {!safetyFormSubmitted ? (
                <>
                <div>
                  <label className="text-white mb-1 block">Description</label>
                  <p className="caption text-white">
                      Please complete this safety status form to confirm your current condition, location, and operational readiness for World Cup match day operations.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-white mb-2 block">Are you safe?</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSafetyFormData({ ...safetyFormData, isSafe: 'yes' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            safetyFormData.isSafe === 'yes'
                              ? 'bg-green-500/20 border-green-500 text-green-500'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setSafetyFormData({ ...safetyFormData, isSafe: 'no' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            safetyFormData.isSafe === 'no'
                              ? 'bg-red-500/20 border-red-500 text-red-500'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-white mb-2 block">Do you have any comments?</label>
                      <Textarea
                        value={safetyFormData.comments}
                        onChange={(e) => setSafetyFormData({ ...safetyFormData, comments: e.target.value })}
                        placeholder="Enter any additional comments or information..."
                        rows={4}
                        className="bg-input-background border-border resize-none text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => {
                        if (safetyFormData.isSafe) {
                          const submittedData = {
                            ...safetyFormData,
                            submittedAt: new Date().toISOString()
                          };
                          setSafetyFormData(submittedData);
                          setSafetyFormSubmitted(true);
                          onDataChange({ 
                            ...data, 
                            safetyFormSubmitted: true,
                            safetyFormData: submittedData
                          });
                          // Auto-collapse after submission
                          setExpandedAlerts(prev => {
                            const next = new Set(prev);
                            next.delete('safety-check-form');
                            return next;
                          });
                        }
                      }}
                      disabled={!safetyFormData.isSafe}
                      className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-white mb-1 block">Form Submitted</label>
                    <p className="caption text-white">
                      Thank you for completing the safety status form.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-white mb-1 block">Status</label>
                      <p className="caption text-white capitalize">{safetyFormData.isSafe === 'yes' ? 'Safe' : 'Unsafe'}</p>
                  </div>
                  <div>
                      <label className="text-white mb-1 block">Submitted</label>
                      <p className="caption text-white">{formatDateDisplay(safetyFormData.submittedAt)}</p>
                  </div>
                  </div>

                  {safetyFormData.comments && (
                  <div>
                      <label className="text-white mb-1 block">Comments</label>
                      <p className="caption text-white">{safetyFormData.comments}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>}
        

        {/* SITREP Review Notification - Only show if not archived */}
        {!sitrepArchived && <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('sitrep-review') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'sitrep-review';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('sitrep-review') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                    <span className="caption text-white">Review Requested of SITREP for World Cup Security Operations</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor(getNotificationSeverity('sitrep-review'))}20`,
                        color: getSeverityColor(getNotificationSeverity('sitrep-review')),
                        border: `1px solid ${getSeverityColor(getNotificationSeverity('sitrep-review'))}60`
                      }}
                    >
                      {getNotificationSeverity('sitrep-review')}
                    </span>
                    </div>
                  {!expandedAlerts.has('sitrep-review') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="caption text-white">J. Smith</span>
                        <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())}</span>
                  </div>
                      {!sitrepReviewed ? (
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedAlerts(prev => new Set(prev).add('sitrep-review'));
                          }}
                          className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                          style={{ paddingTop: '4px', paddingBottom: '4px' }}
                        >
                          Review Draft SITREP
                        </Button>
                      ) : (
                        <p className="caption text-white">
                          Review submitted at {formatDateDisplay(sitrepReviewData.submittedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSitrepArchived(true);
                  onDataChange({
                    ...data,
                    sitrepArchived: true
                  });
                }}
                className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {expandedAlerts.has('sitrep-review') && (
            <div className="p-4 space-y-4 bg-card/50">
              {!sitrepReviewed ? (
                <>
                  <div>
                    <label className="text-white mb-1 block">District East SITREP</label>
                    <p className="caption text-white mb-3">
                      Drafted by: J. Smith at {formatMilitaryTimeUTC(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())}
                    </p>
                    <div className="bg-input-background border border-border rounded p-3 max-h-[200px] overflow-y-auto" style={{ marginTop: '13px' }}>
                      <pre className="caption text-white whitespace-pre-wrap font-sans break-words">
                        {draftSitrepContent}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-white mb-2 block">Decision</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setSitrepReviewData({ ...sitrepReviewData, decision: 'approve' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            sitrepReviewData.decision === 'approve'
                              ? 'bg-accent/20 border-accent text-accent'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSitrepReviewData({ ...sitrepReviewData, decision: 'deny' })}
                          className={`px-4 py-2 rounded border transition-colors ${
                            sitrepReviewData.decision === 'deny'
                              ? 'bg-accent/20 border-accent text-accent'
                              : 'border-border text-white hover:bg-muted/20'
                          }`}
                        >
                          Deny
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-white mb-2 block">Comments to Author</label>
                      <Textarea
                        value={sitrepReviewData.comments}
                        onChange={(e) => setSitrepReviewData({ ...sitrepReviewData, comments: e.target.value })}
                        placeholder="Enter feedback or revision requests..."
                        rows={4}
                        className="bg-input-background border-border resize-none text-white"
                      />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => {
                        if (sitrepReviewData.decision) {
                          const submittedData = {
                            ...sitrepReviewData,
                            submittedAt: new Date().toISOString()
                          };
                          setSitrepReviewData(submittedData);
                          setSitrepReviewed(true);
                          onDataChange({ 
                            ...data, 
                            sitrepReviewed: true,
                            sitrepReviewData: submittedData
                          });
                          // Auto-collapse after submission
                          setExpandedAlerts(prev => {
                            const next = new Set(prev);
                            next.delete('sitrep-review');
                            return next;
                          });
                        }
                      }}
                      disabled={!sitrepReviewData.decision}
                      className="bg-primary hover:bg-primary/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Submit Review
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-white mb-1 block">Review Submitted</label>
                    <p className="caption text-white">
                      Your review decision has been submitted and sent to J. Smith.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white mb-1 block text-xs">Decision</label>
                      <p className="caption text-sm text-accent">
                        {sitrepReviewData.decision === 'approve' ? 'Approved' : 'Denied'}
                      </p>
                    </div>
                    <div>
                      <label className="text-white mb-1 block text-xs">Submitted At</label>
                      <p className="caption text-white text-sm">{formatDateDisplay(sitrepReviewData.submittedAt)}</p>
                    </div>
                  </div>
                  {sitrepReviewData.comments && (
                    <div>
                      <label className="text-white mb-1 block text-xs">Comments</label>
                      <p className="caption text-white text-sm">{sitrepReviewData.comments}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>}
        {/* Acknowledgement Receipt Notification */}
        <div
          className="border border-border rounded-lg overflow-hidden"
          style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
        >
          <div className={`p-3 ${expandedAlerts.has('acknowledgement-receipt') ? 'border-b border-border' : ''}`}>
            <div className="flex items-start justify-between">
              <div
                className="flex items-start gap-2 flex-1 cursor-pointer"
                onClick={() => {
                  const id = 'acknowledgement-receipt';
                  setExpandedAlerts(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
              >
                {expandedAlerts.has('acknowledgement-receipt') ? (
                  <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="caption text-white">Acknowledgement Required - World Cup Security Briefing Review</span>
                    <span 
                      className="caption px-2 py-0.5 rounded text-xs"
                      style={{ 
                        backgroundColor: `${getSeverityColor(getNotificationSeverity('acknowledgement-receipt'))}20`,
                        color: getSeverityColor(getNotificationSeverity('acknowledgement-receipt')),
                        border: `1px solid ${getSeverityColor(getNotificationSeverity('acknowledgement-receipt'))}60`
                      }}
                    >
                      {getNotificationSeverity('acknowledgement-receipt')}
                    </span>
                  </div>
                  {!expandedAlerts.has('acknowledgement-receipt') && (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-3">
                        <span className="caption text-white">System</span>
                        <span className="caption text-white">{formatMilitaryTimeUTC(new Date().toISOString())}</span>
                      </div>
                      {!acknowledgedTimestamp ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                            const timestamp = new Date().toISOString();
                            setAcknowledgedTimestamp(timestamp);
                            onDataChange({ ...data, acknowledgedTimestamp: timestamp });
                          }}
                          className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                          style={{ paddingTop: '4px', paddingBottom: '4px' }}
                        >
                          Acknowledge Receipt
                        </Button>
                      ) : (
                        <p className="caption text-white">
                          User acknowledged at {formatDateDisplay(acknowledgedTimestamp)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {expandedAlerts.has('acknowledgement-receipt') && (
            <div className="p-4 space-y-4 bg-card/50">
              <div>
                <label className="text-white mb-1 block">Description</label>
                <p className="caption text-white">
                  Please acknowledge receipt of the World Cup security briefing documentation and confirm your review of all match day operational procedures and threat assessments.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white mb-1 block">Severity</label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                    <span className="caption text-white">Info</span>
                  </div>
                </div>
                <div>
                  <label className="text-white mb-1 block">Status</label>
                  <p className="caption text-white">{acknowledgedTimestamp ? 'Acknowledged' : 'Pending'}</p>
                </div>
              </div>

              {!acknowledgedTimestamp ? (
                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={() => {
                      const timestamp = new Date().toISOString();
                      setAcknowledgedTimestamp(timestamp);
                      onDataChange({ ...data, acknowledgedTimestamp: timestamp });
                    }}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    Acknowledge Receipt
                  </Button>
                </div>
              ) : (
                <div className="pt-2">
                  <p className="caption text-white">
                    User acknowledged at {formatDateDisplay(acknowledgedTimestamp)}
                  </p>
              </div>
            )}
          </div>
        )}
        </div>
        
        {filtered.map((a) => {
          const isExpanded = expandedAlerts.has(a.id);
          return (
            <div
              key={a.id}
              className="border border-border rounded-lg overflow-hidden"
              style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
            >
              <div className={`p-3 ${isExpanded ? 'border-b border-border' : ''}`}>
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-start gap-2 flex-1 cursor-pointer"
                    onClick={() => {
                      toggleAlert(a.id);
                      if (onAddAIContext) {
                        onAddAIContext(a.title);
                      }
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="caption text-white">{a.title}</span>
                      {!isExpanded && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="caption text-white">{a.sentBy}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor(a.severity) }} />
                            <span className="caption" style={{ color: severityColor(a.severity) }}>{a.severity}</span>
                          </div>
                          <span className="caption text-white">{formatMilitaryTimeUTC(a.timeSent)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Zoom to alert location
                        if (onZoomToLocation) {
                          const coords = getAlertCoordinates(a.id);
                          onZoomToLocation(coords.center, coords.scale);
                        }
                      }}
                      className="p-1 hover:bg-muted/30 rounded transition-colors"
                      title="Zoom to alert location"
                    >
                      <Map className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4 bg-card/50">
                  {a.description && (
                    <div>
                      <label className="text-white mb-1 block">Description</label>
                      <p className="caption text-white">{a.description}</p>
                    </div>
                  )}
                  
                  {/* Recipients section */}
                  {a.recipients && a.recipients.length > 0 && (
                    <div>
                      <label className="text-white mb-1 block">Recipients</label>
                      <div className="flex flex-wrap gap-2">
                        {a.recipients.map((recipient) => (
                          <span 
                            key={recipient}
                            className="caption text-white bg-accent/20 px-2 py-1 rounded text-xs"
                          >
                            {recipient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scheduled time */}
                  {a.scheduledTime && (
                    <div>
                      <label className="text-white mb-1 block">Scheduled Send Time</label>
                      <p className="caption text-white">{formatDateDisplay(a.scheduledTime)}</p>
                    </div>
                  )}

                  {/* Channels */}
                  {a.channels && a.channels.length > 0 && (
                    <div>
                      <label className="text-white mb-1 block">Communication Channels</label>
                      <div className="flex flex-wrap gap-2">
                        {a.channels.map((channelId) => {
                          const channel = communicationChannels.find(c => c.id === channelId);
                          return channel ? (
                            <span 
                              key={channelId}
                              className="caption text-white bg-primary/20 px-2 py-1 rounded text-xs"
                            >
                              {channel.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white mb-1 block">Severity</label>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: severityColor(a.severity) }} />
                        <span className="caption text-white">{a.severity}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-white mb-1 block">Expires</label>
                      <p className="caption text-white">{formatDateDisplay(a.expiresAt)}</p>
                    </div>
                    <div>
                      <label className="text-white mb-1 block">Status</label>
                      <p className="caption text-white">{a.status}</p>
                    </div>
                    {a.location && (
                      <div>
                        <label className="text-white mb-1 block">Location</label>
                        <p className="caption text-white">{a.location}</p>
                      </div>
                    )}
                    {a.timeSent && (
                      <div>
                        <label className="text-white mb-1 block">Time Sent</label>
                        <p className="caption text-white">{formatDateDisplay(a.timeSent)}</p>
                      </div>
                    )}
                    {a.sentBy && (
                      <div>
                        <label className="text-white mb-1 block">Sent By</label>
                        <p className="caption text-white">{a.sentBy}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Historical Notifications View */}
      {viewMode === 'historical' && (
        <div className="space-y-4">
          {/* Boom Data Layer Review Notification - Only show if archived */}
          {boomDataLayerArchived && <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('boom-data-layer-review-historical') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'boom-data-layer-review-historical';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('boom-data-layer-review-historical') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white">Review Requested: Stadium Perimeter Security Zone Update - MetLife Stadium</span>
                    {!expandedAlerts.has('boom-data-layer-review-historical') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">M. Rodriguez</span>
                          <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())}</span>
                        </div>
                        <p className="caption text-white">
                          Review submitted at {formatDateDisplay(boomDataLayerReviewData.submittedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('boom-data-layer-review-historical') && (
              <div className="p-4 space-y-4 bg-card/50">
                <div>
                  <label className="text-white mb-1 block">Review Submitted</label>
                  <p className="caption text-white">
                    You {boomDataLayerReviewData.decision === 'approve' ? 'approved' : 'denied'} this update at {formatDateDisplay(boomDataLayerReviewData.submittedAt)}.
                  </p>
                </div>
                {boomDataLayerReviewData.comments && (
                  <div>
                    <label className="text-white mb-1 block">Your Comments</label>
                    <p className="caption text-white">{boomDataLayerReviewData.comments}</p>
                  </div>
                )}
                <div>
                  <label className="text-white mb-1 block">MetLife Stadium Security Perimeter Update</label>
                  <p className="caption text-white mb-3">
                    Submitted by: M. Rodriguez at {formatMilitaryTimeUTC(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())}
                  </p>
                </div>
              </div>
            )}
          </div>}

          {/* SITREP Review Notification - Only show if archived */}
          {sitrepArchived && <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('sitrep-review-historical') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'sitrep-review-historical';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('sitrep-review-historical') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white">Review Requested of SITREP for World Cup Security Operations</span>
                    {!expandedAlerts.has('sitrep-review-historical') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">J. Smith</span>
                          <span className="caption text-white">{formatMilitaryTimeUTC(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())}</span>
                        </div>
                        {sitrepReviewed && (
                          <p className="caption text-white">
                            Review submitted at {formatDateDisplay(sitrepReviewData.submittedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('sitrep-review-historical') && (
              <div className="p-4 space-y-4 bg-card/50">
                {sitrepReviewed ? (
                  <>
                    <div>
                      <label className="text-white mb-1 block">Review Submitted</label>
                      <p className="caption text-white">
                        Your review decision has been submitted and sent to J. Smith.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white mb-1 block text-xs">Decision</label>
                        <p className="caption text-sm text-accent">
                          {sitrepReviewData.decision === 'approve' ? 'Approved' : 'Denied'}
                        </p>
                      </div>
                      <div>
                        <label className="text-white mb-1 block text-xs">Submitted At</label>
                        <p className="caption text-white text-sm">{formatDateDisplay(sitrepReviewData.submittedAt)}</p>
                      </div>
                    </div>
                    {sitrepReviewData.comments && (
                      <div>
                        <label className="text-white mb-1 block text-xs">Comments</label>
                        <p className="caption text-white text-sm">{sitrepReviewData.comments}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="text-white mb-1 block">World Cup Security Operations SITREP</label>
                    <p className="caption text-white mb-3">
                      Drafted by: J. Smith at {formatMilitaryTimeUTC(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())}
                    </p>
                    <div className="bg-input-background border border-border rounded p-3" style={{ marginTop: '13px' }}>
                      <p className="caption text-white whitespace-pre-wrap">
                        {draftSitrepContent}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>}

          {/* Safety Check Notification - Only show if archived */}
          {safetyCheckArchived && <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('safety-check-historical') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'safety-check-historical';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('safety-check-historical') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white">Safety Check - Personnel Status Report</span>
                    {!expandedAlerts.has('safety-check-historical') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">System</span>
                          <span className="caption text-white">{formatMilitaryTimeUTC(new Date().toISOString())}</span>
                        </div>
                        <p className="caption text-white">
                          Archived for all users
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('safety-check-historical') && (
              <div className="p-4 space-y-4 bg-card/50">
                <div>
                  <label className="text-white mb-1 block">Notification Archived</label>
                  <p className="caption text-white">
                    This notification has been archived for all users and is no longer visible in Active notifications.
                  </p>
                </div>
                {safetyFormSubmitted && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-white mb-1 block">Status</label>
                        <p className="caption text-white capitalize">{safetyFormData.isSafe === 'yes' ? 'Safe' : 'Unsafe'}</p>
                      </div>
                      <div>
                        <label className="text-white mb-1 block">Submitted</label>
                        <p className="caption text-white">{formatDateDisplay(safetyFormData.submittedAt)}</p>
                      </div>
                    </div>
                    {safetyFormData.comments && (
                      <div>
                        <label className="text-white mb-1 block">Comments</label>
                        <p className="caption text-white">{safetyFormData.comments}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>}
        </div>
      )}

      {/* Sent Notifications View */}
      {viewMode === 'sent' && (
        <div className="space-y-4">
          {/* Safety Assessment Notification */}
          <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('sent-safety-assessment') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'sent-safety-assessment';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('sent-safety-assessment') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white font-semibold">Match Day Personnel Status and Readiness Check</span>
                    {!expandedAlerts.has('sent-safety-assessment') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">Sent: {formatMilitaryTimeUTC(new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString())}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="caption text-white">Recipients: Security Operations, Screening Operations, Intelligence Division</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('sent-safety-assessment') && (
              <div className="p-4 space-y-4 bg-card/50">
                <div>
                  <label className="text-white mb-1 block">Message</label>
                  <p className="caption text-white">
                    All DHS personnel assigned to World Cup match day operations: Please complete this readiness assessment to confirm your deployment status, current location, and operational capability for today's USA vs Mexico quarterfinal match.
                  </p>
                </div>

                <div>
                  <label className="text-white mb-2 block">Recipients</label>
                  <div className="space-y-2">
                    {/* Security Operations */}
                    <div className="border border-border rounded">
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
                        onClick={() => {
                          const id = 'safety-ops-section';
                          setExpandedRecipientSections(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                      >
                        {expandedRecipientSections.has('safety-ops-section') ? (
                          <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
                        )}
                        <span className="caption text-white">Security Operations (15)</span>
                      </div>
                      {expandedRecipientSections.has('safety-ops-section') && (
                        <div className="px-4 pb-2 space-y-1">
                          {[
                            'Jose Martinez',
                            'Sarah Johnson',
                            'Michael Rodriguez',
                            'Karen Williams',
                            'Thomas Brown',
                            'Amanda Davis',
                            'Robert Wilson',
                            'Lisa Moore',
                            'Christopher Taylor',
                            'David Anderson',
                            'Patricia Thomas',
                            'Henry Jackson',
                            'Nancy White',
                            'Edward Harris',
                            'Barbara Martin'
                          ].map((name) => (
                            <div key={name} className="caption text-white/80 text-xs py-0.5">
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Screening Operations */}
                    <div className="border border-border rounded">
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
                        onClick={() => {
                          const id = 'safety-planning-section';
                          setExpandedRecipientSections(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                      >
                        {expandedRecipientSections.has('safety-planning-section') ? (
                          <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
                        )}
                        <span className="caption text-white">Screening Operations (15)</span>
                      </div>
                      {expandedRecipientSections.has('safety-planning-section') && (
                        <div className="px-4 pb-2 space-y-1">
                          {[
                            'George Thompson',
                            'Victoria Garcia',
                            'Frank Martinez',
                            'Isabella Robinson',
                            'Oscar Clark',
                            'Uma Rodriguez',
                            'Yolanda Lewis',
                            'Quentin Lee',
                            'Walter Walker',
                            'Xavier Hall',
                            'Zachary Allen',
                            'Sophia Young',
                            'James Hernandez',
                            'Megan King',
                            'Kevin Wright'
                          ].map((name) => (
                            <div key={name} className="caption text-white/80 text-xs py-0.5">
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Intelligence Division */}
                    <div className="border border-border rounded">
                      <div
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
                        onClick={() => {
                          const id = 'safety-logistics-section';
                          setExpandedRecipientSections(prev => {
                            const next = new Set(prev);
                            if (next.has(id)) next.delete(id); else next.add(id);
                            return next;
                          });
                        }}
                      >
                        {expandedRecipientSections.has('safety-logistics-section') ? (
                          <ChevronDown className="w-4 h-4 text-white flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-white flex-shrink-0" />
                        )}
                        <span className="caption text-white">Intelligence Division (15)</span>
                      </div>
                      {expandedRecipientSections.has('safety-logistics-section') && (
                        <div className="px-4 pb-2 space-y-1">
                          {[
                            'Teresa Lopez',
                            'Anthony Hill',
                            'Rachel Scott',
                            'Lawrence Green',
                            'Carol Adams',
                            'Daniel Baker',
                            'Paula Gonzalez',
                            'Harold Nelson',
                            'Nathan Carter',
                            'Emily Mitchell',
                            'Brian Perez',
                            'Grace Roberts',
                            'Vincent Turner',
                            'Fiona Phillips',
                            'Isaac Campbell'
                          ].map((name) => (
                            <div key={name} className="caption text-white/80 text-xs py-0.5">
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Incident Briefing Acknowledgement */}
          <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('sent-incident-briefing') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'sent-incident-briefing';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('sent-incident-briefing') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white font-semibold">World Cup Security Briefing - Match Day Operations Review Required</span>
                    {!expandedAlerts.has('sent-incident-briefing') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">Sent: {formatMilitaryTimeUTC(new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString())}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="caption text-white font-semibold">25</span>
                            <span className="caption text-white">acknowledged</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('sent-incident-briefing') && (
              <div className="p-4 space-y-4 bg-card/50">
                <div>
                  <label className="text-white mb-1 block">Message</label>
                  <p className="caption text-white">
                    Please review and acknowledge receipt of the World Cup Security Operations briefing documentation for USA vs Mexico quarterfinal match operations.
                  </p>
                </div>

                <div>
                  <label className="text-white mb-2 block">Acknowledgement Status</label>
                  <p className="caption text-white text-lg font-semibold mb-3">25 / 30 acknowledged (83%)</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="caption text-white font-bold mb-2">Acknowledged (25)</p>
                      <input
                        type="text"
                        value={incidentBriefingAckSearch}
                        onChange={(e) => setIncidentBriefingAckSearch(e.target.value)}
                        placeholder="Search acknowledged..."
                        className="w-full h-6 bg-transparent border border-[#6e757c] rounded px-2 caption text-white placeholder:text-[#6e757c] focus:outline-none focus:border-accent mb-2"
                      />
                      <div className="max-h-[200px] overflow-y-auto">
                        {(() => {
                          const acknowledgedUsers = [
                            { name: 'Jose Martinez', email: 'jose.martinez@hq.dhs.gov' },
                            { name: 'Sarah Johnson', email: 'sarah.johnson@hq.dhs.gov' },
                            { name: 'Michael Rodriguez', email: 'michael.rodriguez@hq.dhs.gov' },
                            { name: 'Karen Williams', email: 'karen.williams@hq.dhs.gov' },
                            { name: 'Thomas Brown', email: 'thomas.brown@hq.dhs.gov' },
                            { name: 'Amanda Davis', email: 'amanda.davis@hq.dhs.gov' },
                            { name: 'Robert Wilson', email: 'robert.wilson@hq.dhs.gov' },
                            { name: 'Lisa Moore', email: 'lisa.moore@hq.dhs.gov' },
                            { name: 'Christopher Taylor', email: 'christopher.taylor@hq.dhs.gov' },
                            { name: 'David Anderson', email: 'david.anderson@hq.dhs.gov' },
                            { name: 'Patricia Thomas', email: 'patricia.thomas@hq.dhs.gov' },
                            { name: 'Henry Jackson', email: 'henry.jackson@hq.dhs.gov' },
                            { name: 'Nancy White', email: 'nancy.white@hq.dhs.gov' },
                            { name: 'Edward Harris', email: 'edward.harris@hq.dhs.gov' },
                            { name: 'Barbara Martin', email: 'barbara.martin@hq.dhs.gov' },
                            { name: 'George Thompson', email: 'george.thompson@hq.dhs.gov' },
                            { name: 'Victoria Garcia', email: 'victoria.garcia@hq.dhs.gov' },
                            { name: 'Frank Martinez', email: 'frank.martinez@hq.dhs.gov' },
                            { name: 'Isabella Robinson', email: 'isabella.robinson@hq.dhs.gov' },
                            { name: 'Oscar Clark', email: 'oscar.clark@hq.dhs.gov' },
                            { name: 'Uma Rodriguez', email: 'uma.rodriguez@hq.dhs.gov' },
                            { name: 'Yolanda Lewis', email: 'yolanda.lewis@hq.dhs.gov' },
                            { name: 'Quentin Lee', email: 'quentin.lee@hq.dhs.gov' },
                            { name: 'Walter Walker', email: 'walter.walker@hq.dhs.gov' },
                            { name: 'Xavier Hall', email: 'xavier.hall@hq.dhs.gov' }
                          ];
                          
                          const filteredUsers = acknowledgedUsers.filter(user => {
                            const searchLower = incidentBriefingAckSearch.toLowerCase();
                            return user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);
                          });
                          
                          return filteredUsers.map((user) => (
                            <div key={user.email} className="caption text-white text-xs py-1">
                              {user.name} ({user.email})
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div>
                      <p className="caption text-white font-bold mb-2">Not Yet Acknowledged (5)</p>
                      <input
                        type="text"
                        value={incidentBriefingNotAckSearch}
                        onChange={(e) => setIncidentBriefingNotAckSearch(e.target.value)}
                        placeholder="Search not acknowledged..."
                        className="w-full h-6 bg-transparent border border-[#6e757c] rounded px-2 caption text-white placeholder:text-[#6e757c] focus:outline-none focus:border-accent mb-2"
                      />
                      <div>
                        {(() => {
                          const notAcknowledgedUsers = [
                            { name: 'Zachary Allen', email: 'zachary.allen@hq.dhs.gov' },
                            { name: 'Sophia Young', email: 'sophia.young@hq.dhs.gov' },
                            { name: 'James Hernandez', email: 'james.hernandez@hq.dhs.gov' },
                            { name: 'Megan King', email: 'megan.king@hq.dhs.gov' },
                            { name: 'Kevin Wright', email: 'kevin.wright@hq.dhs.gov' }
                          ];
                          
                          const filteredUsers = notAcknowledgedUsers.filter(user => {
                            const searchLower = incidentBriefingNotAckSearch.toLowerCase();
                            return user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);
                          });
                          
                          return filteredUsers.map((user) => (
                            <div key={user.email} className="caption text-white/70 text-xs py-1">
                              {user.name} ({user.email})
                            </div>
                          ));
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Stand Down */}
          <div
            className="border border-border rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
          >
            <div className={`p-3 ${expandedAlerts.has('sent-emergency-standdown') ? 'border-b border-border' : ''}`}>
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start gap-2 flex-1 cursor-pointer"
                  onClick={() => {
                    const id = 'sent-emergency-standdown';
                    setExpandedAlerts(prev => {
                      const next = new Set(prev);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      return next;
                    });
                  }}
                >
                  {expandedAlerts.has('sent-emergency-standdown') ? (
                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <span className="caption text-white font-semibold">Security Alert Stand Down - All Clear Issued</span>
                    {!expandedAlerts.has('sent-emergency-standdown') && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3">
                          <span className="caption text-white">Sent: {formatMilitaryTimeUTC(new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString())}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="caption text-red-500">Stand Down Safety</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="caption text-white font-semibold">45</span>
                            <span className="caption text-white">acknowledged</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {expandedAlerts.has('sent-emergency-standdown') && (
              <div className="p-4 space-y-4 bg-card/50">
                <div>
                  <label className="text-white mb-1 block">Message</label>
                  <p className="caption text-white">
                    ALL CLEAR. Security threat has been resolved. All DHS personnel may resume normal World Cup security operations. Maintain heightened awareness and report any suspicious activity.
                  </p>
                </div>

                <div>
                  <label className="text-white mb-2 block">Acknowledgement Status</label>
                  <p className="caption text-green-500 text-lg font-semibold mb-3">45 / 45 acknowledged (100%)</p>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="caption text-white font-bold mb-2">Acknowledged (45)</p>
                      <input
                        type="text"
                        value={emergencyStandDownAckSearch}
                        onChange={(e) => setEmergencyStandDownAckSearch(e.target.value)}
                        placeholder="Search acknowledged..."
                        className="w-full h-6 bg-transparent border border-[#6e757c] rounded px-2 caption text-white placeholder:text-[#6e757c] focus:outline-none focus:border-accent mb-2"
                      />
                      <div className="max-h-[200px] overflow-y-auto">
                        {(() => {
                          const acknowledgedUsers = [
                            { name: 'Jose Martinez', email: 'jose.martinez@hq.dhs.gov' },
                            { name: 'Sarah Johnson', email: 'sarah.johnson@hq.dhs.gov' },
                            { name: 'Michael Rodriguez', email: 'michael.rodriguez@hq.dhs.gov' },
                            { name: 'Karen Williams', email: 'karen.williams@hq.dhs.gov' },
                            { name: 'Thomas Brown', email: 'thomas.brown@hq.dhs.gov' },
                            { name: 'Amanda Davis', email: 'amanda.davis@hq.dhs.gov' },
                            { name: 'Robert Wilson', email: 'robert.wilson@hq.dhs.gov' },
                            { name: 'Lisa Moore', email: 'lisa.moore@hq.dhs.gov' },
                            { name: 'Christopher Taylor', email: 'christopher.taylor@hq.dhs.gov' },
                            { name: 'David Anderson', email: 'david.anderson@hq.dhs.gov' },
                            { name: 'Patricia Thomas', email: 'patricia.thomas@hq.dhs.gov' },
                            { name: 'Henry Jackson', email: 'henry.jackson@hq.dhs.gov' },
                            { name: 'Nancy White', email: 'nancy.white@hq.dhs.gov' },
                            { name: 'Edward Harris', email: 'edward.harris@hq.dhs.gov' },
                            { name: 'Barbara Martin', email: 'barbara.martin@hq.dhs.gov' },
                            { name: 'George Thompson', email: 'george.thompson@hq.dhs.gov' },
                            { name: 'Victoria Garcia', email: 'victoria.garcia@hq.dhs.gov' },
                            { name: 'Frank Martinez', email: 'frank.martinez@hq.dhs.gov' },
                            { name: 'Isabella Robinson', email: 'isabella.robinson@hq.dhs.gov' },
                            { name: 'Oscar Clark', email: 'oscar.clark@hq.dhs.gov' },
                            { name: 'Uma Rodriguez', email: 'uma.rodriguez@hq.dhs.gov' },
                            { name: 'Yolanda Lewis', email: 'yolanda.lewis@hq.dhs.gov' },
                            { name: 'Quentin Lee', email: 'quentin.lee@hq.dhs.gov' },
                            { name: 'Walter Walker', email: 'walter.walker@hq.dhs.gov' },
                            { name: 'Xavier Hall', email: 'xavier.hall@hq.dhs.gov' },
                            { name: 'Zachary Allen', email: 'zachary.allen@hq.dhs.gov' },
                            { name: 'Sophia Young', email: 'sophia.young@hq.dhs.gov' },
                            { name: 'James Hernandez', email: 'james.hernandez@hq.dhs.gov' },
                            { name: 'Megan King', email: 'megan.king@hq.dhs.gov' },
                            { name: 'Kevin Wright', email: 'kevin.wright@hq.dhs.gov' },
                            { name: 'Teresa Lopez', email: 'teresa.lopez@hq.dhs.gov' },
                            { name: 'Anthony Hill', email: 'anthony.hill@hq.dhs.gov' },
                            { name: 'Rachel Scott', email: 'rachel.scott@hq.dhs.gov' },
                            { name: 'Lawrence Green', email: 'lawrence.green@hq.dhs.gov' },
                            { name: 'Carol Adams', email: 'carol.adams@hq.dhs.gov' },
                            { name: 'Daniel Baker', email: 'daniel.baker@hq.dhs.gov' },
                            { name: 'Paula Gonzalez', email: 'paula.gonzalez@hq.dhs.gov' },
                            { name: 'Harold Nelson', email: 'harold.nelson@hq.dhs.gov' },
                            { name: 'Nathan Carter', email: 'nathan.carter@hq.dhs.gov' },
                            { name: 'Emily Mitchell', email: 'emily.mitchell@hq.dhs.gov' },
                            { name: 'Brian Perez', email: 'brian.perez@hq.dhs.gov' },
                            { name: 'Grace Roberts', email: 'grace.roberts@hq.dhs.gov' },
                            { name: 'Vincent Turner', email: 'vincent.turner@hq.dhs.gov' },
                            { name: 'Fiona Phillips', email: 'fiona.phillips@hq.dhs.gov' },
                            { name: 'Isaac Campbell', email: 'isaac.campbell@hq.dhs.gov' }
                          ];
                          
                          const filteredUsers = acknowledgedUsers.filter(user => {
                            const searchLower = emergencyStandDownAckSearch.toLowerCase();
                            return user.name.toLowerCase().includes(searchLower) || user.email.toLowerCase().includes(searchLower);
                          });
                          
                          return filteredUsers.map((user) => (
                            <div key={user.email} className="caption text-white text-xs py-1">
                              {user.name} ({user.email})
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div>
                      <p className="caption text-white font-bold mb-2">Not Yet Acknowledged (0)</p>
                      <input
                        type="text"
                        value={emergencyStandDownNotAckSearch}
                        onChange={(e) => setEmergencyStandDownNotAckSearch(e.target.value)}
                        placeholder="Search not acknowledged..."
                        className="w-full h-6 bg-transparent border border-[#6e757c] rounded px-2 caption text-white placeholder:text-[#6e757c] focus:outline-none focus:border-accent mb-2"
                      />
                      <div>
                        <span className="caption text-white/70 text-xs italic">All recipients have acknowledged</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
      )}

      {/* Add/Edit Alert Side Panel */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[640px] bg-card overflow-y-auto px-6 [&>button]:text-white">
          <SheetHeader>
            <SheetTitle style={{ marginLeft: '-20px' }}>{editingAlertId ? 'Edit Notification' : 'New Notification'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-6 pb-6" style={{ marginTop: 'calc(1.5rem - 20px)' }}>
            {/* Communication Channels */}
            <div className="space-y-2">
              <Label className="text-foreground">Communication Channels <span className="text-destructive">*</span></Label>
              <div className="flex flex-wrap gap-3">
                {communicationChannels.map((channel) => {
                  const isSelected = formData.channels?.includes(channel.id);
                  return (
                    <label
                      key={channel.id}
                      className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border border-border transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-[#01476f]'
                          : 'hover:bg-muted/20'
                      }`}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleChannel(channel.id)}
                      />
                      
                      {/* Icon */}
                      <div className="w-6 h-6 flex items-center justify-center">
                        {channel.id === 'email' && (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" fill="white"/>
                          </svg>
                        )}
                        {channel.id === 'sms' && (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9 11H7V9h2v2zm4 0h-2V9h2v2zm4 0h-2V9h2v2z" fill="white"/>
                          </svg>
                        )}
                        {channel.id === 'push' && (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="white"/>
                          </svg>
                        )}
                        {channel.id === 'voice' && (
                          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" fill="white"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-white text-xs font-semibold whitespace-nowrap">
                        {channel.label}
                      </span>
                      {/* Info icon */}
                      <div className="w-2.5 h-2.5 bg-white/50 rounded-full"></div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              {/* Keep message same checkbox */}
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  id="keep-message-same"
                  checked={keepMessageSame}
                  onCheckedChange={(checked) => setKeepMessageSame(checked as boolean)}
                  className="border-border"
                />
                <label
                  htmlFor="keep-message-same"
                  className="text-sm cursor-pointer text-foreground"
                >
                  Keep message the same across all channels
                </label>
              </div>
              
              <Label className="text-foreground">Notification Message <span className="text-destructive">*</span></Label>
              
              {/* Show tabs when channels are selected */}
              {formData.channels && formData.channels.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {formData.channels.map((channelId) => {
                    const channel = communicationChannels.find(c => c.id === channelId);
                    if (!channel) return null;
                    return (
                      <button
                        key={channelId}
                        type="button"
                        onClick={() => setActiveMessageTab(channelId)}
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded ${
                          activeMessageTab === channelId
                            ? 'bg-accent text-white'
                            : 'text-white hover:bg-muted/20'
                        }`}
                      >
                        {channel.label}
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Message field - shared or channel-specific */}
              {formData.channels && formData.channels.length > 0 ? (
                keepMessageSame ? (
                  <Textarea 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    placeholder="Enter notification message (will be sent to all selected channels)..."
                    rows={3}
                    className="bg-input-background border-border resize-none" 
                  />
                ) : (
                  formData.channels.map((channelId) => {
                    const channel = communicationChannels.find(c => c.id === channelId);
                    if (!channel || activeMessageTab !== channelId) return null;
                    return (
                      <Textarea
                        key={channelId}
                        value={channelMessages[channelId] || ''}
                        onChange={(e) => setChannelMessages(prev => ({ ...prev, [channelId]: e.target.value }))}
                        placeholder={`Enter custom message for ${channel.label}...`}
                        rows={3}
                        className="bg-input-background border-border resize-none"
                      />
                    );
                  })
                )
              ) : (
                <p className="text-sm text-muted-foreground p-3 border border-border rounded bg-input-background">
                  Please select at least one communication channel above to compose your message.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Upload Files</Label>
            </div>

            {/* Require Acknowledgement checkbox */}
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="require-acknowledgement"
                checked={requireAcknowledgement}
                onCheckedChange={(checked) => setRequireAcknowledgement(checked as boolean)}
                className="border-border"
              />
              <label
                htmlFor="require-acknowledgement"
                className="text-sm cursor-pointer text-foreground"
              >
                Require Recipients to Acknowledge
              </label>
            </div>

            {/* Let Recipients Archive checkbox */}
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                id="let-recipients-archive"
                checked={letRecipientsArchive}
                onCheckedChange={(checked) => setLetRecipientsArchive(checked as boolean)}
                className="border-border"
              />
              <label
                htmlFor="let-recipients-archive"
                className="text-sm cursor-pointer text-foreground"
              >
                Let Recipients Dismiss
              </label>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Recipients <span className="text-destructive">*</span></Label>
              <div className="space-y-3">
                {/* Individuals Multi-Select Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Individuals</Label>
                  <Popover open={individualsPopoverOpen} onOpenChange={setIndividualsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between bg-input-background border border-border rounded-md px-3 py-2 text-sm hover:bg-accent/5"
                      >
                        <span className="text-muted-foreground">
                          {formData.recipients?.filter(r => availableIndividuals.includes(r)).length || 0} selected
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-card border-border" align="start">
                      <Command className="bg-card">
                        <CommandInput 
                          placeholder="Search individuals..." 
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No individual found.</CommandEmpty>
                          <CommandGroup>
                            {availableIndividuals.map((individual) => (
                              <CommandItem
                                key={individual}
                                value={individual}
                                onSelect={() => toggleRecipient(individual)}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={formData.recipients?.includes(individual)}
                                  className="mr-2"
                                />
                                {individual}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* Selected individuals tags */}
                  {formData.recipients?.filter(r => availableIndividuals.includes(r)).length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-input-background border border-border rounded-md">
                      {formData.recipients
                        .filter(r => availableIndividuals.includes(r))
                        .map((individual) => (
                          <div 
                            key={individual}
                            className="flex items-center gap-1 bg-accent/20 text-accent px-2 py-1 rounded text-xs"
                          >
                            <span>{individual}</span>
                            <button
                              onClick={() => removeRecipient(individual)}
                              className="hover:bg-accent/30 rounded p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Teams Multi-Select Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Teams</Label>
                  <Popover open={teamsPopoverOpen} onOpenChange={setTeamsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between bg-input-background border border-border rounded-md px-3 py-2 text-sm hover:bg-accent/5"
                      >
                        <span className="text-muted-foreground">
                          {formData.recipients?.filter(r => availableTeams.includes(r)).length || 0} selected
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-card border-border" align="start">
                      <Command className="bg-card">
                        <CommandInput 
                          placeholder="Search teams..." 
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No team found.</CommandEmpty>
                          <CommandGroup>
                            {availableTeams.map((team) => (
                              <CommandItem
                                key={team}
                                value={team}
                                onSelect={() => toggleRecipient(team)}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={formData.recipients?.includes(team)}
                                  className="mr-2"
                                />
                                {team}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* Selected teams tags */}
                  {formData.recipients?.filter(r => availableTeams.includes(r)).length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-input-background border border-border rounded-md">
                      {formData.recipients
                        .filter(r => availableTeams.includes(r))
                        .map((team) => (
                          <div 
                            key={team}
                            className="flex items-center gap-1 bg-accent/20 text-accent px-2 py-1 rounded text-xs"
                          >
                            <span>{team}</span>
                            <button
                              onClick={() => removeRecipient(team)}
                              className="hover:bg-accent/30 rounded p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Associated Incident(s) Multi-Select Dropdown */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground">Associated Incident(s)</Label>
                  <Popover open={associatedIncidentsPopoverOpen} onOpenChange={setAssociatedIncidentsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="w-full flex items-center justify-between bg-input-background border border-border rounded-md px-3 py-2 text-sm hover:bg-accent/5"
                      >
                        <span className="text-muted-foreground">
                          {associatedIncidents.length || 0} selected
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-card border-border" align="start">
                      <Command className="bg-card">
                        <CommandInput 
                          placeholder="Search incidents..." 
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No incident found.</CommandEmpty>
                          <CommandGroup>
                            {availableIncidents.map((incident) => (
                              <CommandItem
                                key={incident}
                                value={incident}
                                onSelect={() => toggleAssociatedIncident(incident)}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={associatedIncidents.includes(incident)}
                                  className="mr-2"
                                />
                                {incident}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {/* Selected incidents tags */}
                  {associatedIncidents.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-2 bg-input-background border border-border rounded-md">
                      {associatedIncidents.map((incident) => (
                        <div 
                          key={incident}
                          className="flex items-center gap-1 bg-accent/20 text-accent px-2 py-1 rounded text-xs"
                        >
                          <span>{incident}</span>
                          <button
                            onClick={() => removeAssociatedIncident(incident)}
                            className="hover:bg-accent/30 rounded p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Scheduled Time <span className="text-destructive">*</span></Label>
              <div className="flex w-full border border-border bg-input-background rounded-md overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSendTimingMode('now')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                    sendTimingMode === 'now'
                      ? 'bg-[#01669f] text-white'
                      : 'bg-transparent text-foreground hover:bg-muted/50'
                  }`}
                >
                  Send alert now
                </button>
                <button
                  type="button"
                  onClick={() => setSendTimingMode('scheduled')}
                  className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
                    sendTimingMode === 'scheduled'
                      ? 'bg-[#01669f] text-white'
                      : 'bg-transparent text-foreground hover:bg-muted/50'
                  }`}
                >
                  Schedule alert
                </button>
              </div>
              
              {sendTimingMode === 'scheduled' && (
                <div className="mt-3">
                  <Input 
                    type="datetime-local"
                    value={formData.scheduledTime ? new Date(formData.scheduledTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: new Date(e.target.value).toISOString() })}
                    className="bg-input-background border-border" 
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Severity</Label>
              <Select value={formData.severity} onValueChange={(value) => setFormData({ ...formData, severity: value as Severity })}>
                <SelectTrigger className="bg-input-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Info">Info</SelectItem>
                  <SelectItem value="Advisory">Advisory</SelectItem>
                  <SelectItem value="Watch">Watch</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Stand Down Safety">Stand Down Safety</SelectItem>
                </SelectContent>
              </Select>
              
              {formData.severity === 'Stand Down Safety' && (
                <div className="mt-3 p-3 border border-border rounded bg-input-background">
                  <p className="text-sm text-white font-bold">
                    A Stand Down Safety notification will be sent immediately to recipients via all communication channels available.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Location</Label>
              <Input 
                value={formData.location || ''} 
                onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                placeholder="Enter location..."
                className="bg-input-background border-border" 
              />
            </div>

            {/* Archive Date & Time */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2">
                <Checkbox
                  id="enable-archive-datetime"
                  checked={enableArchiveDateTime}
                  onCheckedChange={(checked) => {
                    setEnableArchiveDateTime(checked as boolean);
                    if (!checked) {
                      setFormData({ ...formData, archiveDateTime: '' });
                    }
                  }}
                  className="border-border"
                />
                <label
                  htmlFor="enable-archive-datetime"
                  className="text-sm cursor-pointer text-foreground"
                >
                  Set Archive Date & Time
                </label>
              </div>
              
              {enableArchiveDateTime && (
                <div className="space-y-2 pl-6">
                  <Label className="text-foreground text-xs">Archive Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.archiveDateTime ? new Date(formData.archiveDateTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => {
                      const dateValue = e.target.value ? new Date(e.target.value).toISOString() : '';
                      setFormData({ ...formData, archiveDateTime: dateValue });
                    }}
                    className="bg-input-background border-border text-white"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Additional Details</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Add any additional context or instructions..."
                className="bg-input-background border-border min-h-[120px] resize-none" 
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={saveAlert} className="flex-1 bg-primary hover:bg-primary/90">
                {editingAlertId ? 'Update Alert' : 'Schedule Alert'}
              </Button>
              <Button onClick={() => setIsSheetOpen(false)} variant="outline" className="flex-1 border-border">
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Safety Check Archive Confirmation Modal */}
      <Dialog open={safetyCheckArchiveModalOpen} onOpenChange={setSafetyCheckArchiveModalOpen}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Archive Safety Check Notification</DialogTitle>
            <DialogDescription className="text-white/70">
              This will archive the "Safety Check - Personnel Status Report" notification for all users. 
              It will be moved to the Historical tab and will no longer be visible in the Active notifications.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <Button
              onClick={() => setSafetyCheckArchiveModalOpen(false)}
              variant="outline"
              className="border-border text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setSafetyCheckArchived(true);
                setSafetyCheckArchiveModalOpen(false);
                onDataChange({
                  ...data,
                  safetyCheckArchived: true
                });
              }}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              Confirm Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Incident Modal */}
      <Dialog open={createIncidentModalOpen} onOpenChange={(open) => {
        setCreateIncidentModalOpen(open);
        if (!open) setCreateIncidentModalStep(1);
      }}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white" style={{ maxWidth: '1344px', fontSize: '90%' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Create Incident & Activate IMT</DialogTitle>
          </DialogHeader>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-medium`} style={createIncidentModalStep === 1 ? { backgroundColor: '#60a5fa', boxShadow: '0 0 0 4px rgba(96, 165, 250, 0.3)' } : createIncidentModalStep > 1 ? { backgroundColor: '#16a34a' } : { backgroundColor: '#6b7280' }}>
                {createIncidentModalStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-sm ${createIncidentModalStep === 1 ? 'text-white font-medium' : 'text-white/70'}`}>Incident Details</span>
            </div>
            <div className="flex-[0.3] h-[2px] bg-border"></div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-medium`} style={createIncidentModalStep === 2 ? { backgroundColor: '#60a5fa', boxShadow: '0 0 0 4px rgba(96, 165, 250, 0.3)' } : createIncidentModalStep > 2 ? { backgroundColor: '#16a34a' } : { backgroundColor: '#6b7280' }}>
                {createIncidentModalStep > 2 ? '✓' : '2'}
              </div>
              <span className={`text-sm ${createIncidentModalStep === 2 ? 'text-white font-medium' : 'text-white/70'}`}>Incident Location</span>
            </div>
            <div className="flex-[0.3] h-[2px] bg-border"></div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-medium`} style={createIncidentModalStep === 3 ? { backgroundColor: '#60a5fa', boxShadow: '0 0 0 4px rgba(96, 165, 250, 0.3)' } : { backgroundColor: '#6b7280' }}>
                3
              </div>
              <span className={`text-sm ${createIncidentModalStep === 3 ? 'text-white font-medium' : 'text-white/70'}`}>Activate Teams</span>
            </div>
          </div>
          
          <div className="space-y-6 py-4">
            {/* Step 1: Incident Details */}
            {createIncidentModalStep === 1 && (
              <>
                {/* Initial Situation Report (SITREP) */}
                <div className="space-y-3">
                  <Label className="text-white">Initial Situation Report (SITREP)</Label>
                  <Textarea
                    value={initialSitrep}
                    onChange={(e) => setInitialSitrep(e.target.value)}
                    className="min-h-[120px] bg-[#14171a] border-[#6e757c] text-white resize-none"
                    placeholder="Enter initial situation report..."
                  />
                </div>

                {/* Incident Start Time */}
                <div className="space-y-3">
                  <Label className="text-white">Incident Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={incidentStartTime}
                    onChange={(e) => setIncidentStartTime(e.target.value)}
                    className="bg-[#14171a] border-[#6e757c] text-white"
                  />
                </div>
              </>
            )}

            {/* Step 2: Incident Location */}
            {createIncidentModalStep === 2 && (
              <div className="grid grid-cols-2 gap-6">
                {/* Left side - Form fields */}
                <div className="space-y-6">
                  {/* Incident Location */}
                  <div className="space-y-3">
                    <Label className="text-white">Incident Location</Label>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Incident Location</Label>
                        <Select value={incidentLocationType} onValueChange={setIncidentLocationType}>
                          <SelectTrigger className="w-full bg-[#14171a] border-[#6e757c] text-white">
                            <SelectValue placeholder="Select location type" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#222529] border-[#6e757c]">
                            <SelectItem value="Point" className="text-white">Point</SelectItem>
                            <SelectItem value="Polygon" className="text-white">Polygon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white text-sm">AOR</Label>
                        <Popover open={incidentAORPopoverOpen} onOpenChange={setIncidentAORPopoverOpen}>
                          <PopoverTrigger asChild>
                            <button className="w-full flex items-center justify-between bg-[#14171a] border border-[#6e757c] rounded-md px-3 py-2 text-sm hover:bg-[#1a1d21] text-white">
                              <span className="text-white">{incidentAOR}</span>
                              <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                            <Command className="bg-[#222529]">
                              <CommandInput placeholder="Search AORs..." className="h-9 text-white" />
                              <CommandList>
                                <CommandEmpty className="text-white/70 p-2">No AOR found.</CommandEmpty>
                                <CommandGroup>
                                  {incidentAvailableAORs.map((aor) => (
                                    <CommandItem key={aor} value={aor} onSelect={() => selectAOR(aor)} className="text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]">
                                      {aor}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side - Map placeholder */}
                <div className="flex items-center justify-center bg-[#14171a] border border-[#6e757c] rounded-md min-h-[400px]">
                  <span className="text-white/50">[placeholder for map component]</span>
                </div>
              </div>
            )}

            {/* Step 3: Teams and Individuals */}
            {createIncidentModalStep === 3 && (
              <>
            {/* IMT List */}
            <div className="space-y-2">
              <div className="px-4 py-2 bg-[#14171a] border border-[#6e757c] rounded-md text-white">
                IMT Alpha
              </div>
              <div className="px-4 py-2 bg-[#14171a] border border-[#6e757c] rounded-md text-white">
                IMT Bravo
              </div>
              <div className="px-4 py-2 bg-[#14171a] border border-[#6e757c] rounded-md text-white">
                IMT Charlie
              </div>
            </div>
            
            {/* Notification Channels */}
            <div className="space-y-3">
              <Label className="text-white">Notification Channels</Label>
              <Popover open={incidentNotificationChannelsPopoverOpen} onOpenChange={setIncidentNotificationChannelsPopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="w-full flex items-center justify-between bg-[#14171a] border border-[#6e757c] rounded-md px-3 py-2 text-sm hover:bg-[#1a1d21] text-white">
                    <span className={selectedNotificationChannels.length === 0 ? "text-white/70" : "text-white truncate pr-2"}>
                      {selectedNotificationChannels.length === 0 ? 'Select channels...' : selectedNotificationChannels.join(', ')}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0 bg-[#222529] border-[#6e757c]" align="start">
                  <Command className="bg-[#222529]">
                    <CommandInput placeholder="Search channels..." className="h-9 text-white" />
                    <CommandList>
                      <CommandEmpty className="text-white/70 p-2">No channel found.</CommandEmpty>
                      <CommandGroup>
                        {incidentAvailableNotificationChannels.map((channel) => (
                          <CommandItem key={channel} value={channel} onSelect={() => toggleNotificationChannel(channel)} className="text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]">
                            <Checkbox checked={selectedNotificationChannels.includes(channel)} className="mr-2 border-white/30" />
                            {channel}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            </>
            )}
          </div>

          <DialogFooter className="flex gap-3">
            {createIncidentModalStep === 1 ? (
              <>
                <Button
                  onClick={() => {
                    setCreateIncidentModalOpen(false);
                    setCreateIncidentModalStep(1);
                    setSelectedTeams([]);
                    setSelectedIndividuals([]);
                    setSelectedTeamMembers([]);
                    setSelectedNotificationChannels([]);
                    setIncidentTeamsPopoverOpen(false);
                    setIncidentIndividualsPopoverOpen(false);
                    setIncidentNotificationChannelsPopoverOpen(false);
                    setIncidentAORPopoverOpen(false);
                    setInitialSitrep('Social media intelligence indicates emerging civil disturbance near MetLife Stadium main entrance on Route 120 / Paterson Plank Road. Crowd size estimated at 200-300 individuals based on multiple geotagged posts. Social media users describe opposition to the Iranian soccer team playing in a match today at 14:00 EST.');
                    setInitialObjectives('Deter violence from emerging during the protests.');
                    setIncidentAOR('Sector New York');
                    setIncidentAddress('Vicinity of Metlife Stadium');
                    setIncidentStartTime('');
                    setIncidentLocationType('Point');
                  }}
                  variant="outline"
                  className="border-border text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setCreateIncidentModalStep(2)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Next
                </Button>
              </>
            ) : createIncidentModalStep === 2 ? (
              <>
                <Button
                  onClick={() => setCreateIncidentModalStep(1)}
                  variant="outline"
                  className="border-border text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setCreateIncidentModalStep(3)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setCreateIncidentModalStep(2)}
                  variant="outline"
                  className="border-border text-white hover:bg-white/10"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    console.log('Creating incident with:', {
                      sitrep: initialSitrep,
                      objectives: initialObjectives,
                      teams: selectedTeams,
                      teamMembers: selectedTeamMembers,
                      individuals: selectedIndividuals,
                      notificationChannels: selectedNotificationChannels,
                      aor: incidentAOR,
                      address: incidentAddress
                    });
                    toast.success('Incident Created');
                    setCreateIncidentModalOpen(false);
                    setCreateIncidentModalStep(1);
                    setSelectedTeams([]);
                    setSelectedIndividuals([]);
                    setSelectedTeamMembers([]);
                    setSelectedNotificationChannels([]);
                    setIncidentTeamsPopoverOpen(false);
                    setIncidentIndividualsPopoverOpen(false);
                    setIncidentNotificationChannelsPopoverOpen(false);
                    setIncidentAORPopoverOpen(false);
                    setInitialSitrep('Social media intelligence indicates emerging civil disturbance near MetLife Stadium main entrance on Route 120 / Paterson Plank Road. Crowd size estimated at 200-300 individuals based on multiple geotagged posts. Social media users describe opposition to the Iranian soccer team playing in a match today at 14:00 EST.');
                    setInitialObjectives('Deter violence from emerging during the protests.');
                    setIncidentAOR('Sector New York');
                    setIncidentAddress('Vicinity of Metlife Stadium');
                    setIncidentStartTime('');
                    setIncidentLocationType('Point');
                  }}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  Create Incident & Activate
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activation Confirm Modal */}
      <Dialog open={activationConfirmType !== null} onOpenChange={(open) => { if (!open) setActivationConfirmType(null); }}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white" style={{ maxWidth: '840px' }}>
          <DialogHeader>
            <DialogTitle className="text-white text-sm font-semibold">
              {activationConfirmType === 'accept' ? 'Confirm Accept Activation' : 'Confirm Decline Activation'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white text-sm">
            {activationConfirmType === 'accept'
              ? 'Are you sure you want to accept the activation request for Incident Alpha? You will be assigned as Logistics Section Chief.'
              : 'Are you sure you want to decline the activation request for Incident Alpha?  '}
          </p>
          <div className="flex gap-3 pt-2 justify-end">
            <button
              onClick={() => setActivationConfirmType(null)}
              className="bg-transparent border border-[#6e757c] text-white caption px-4 py-1.5 rounded-[4px] hover:bg-[#222529] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (activationConfirmType === 'accept') {
                  toast.success('You have been added to the Incident Alpha Roster.');
                  onIncidentNotification?.(1);
                }
                setActivationConfirmType(null);
              }}
              className={`text-white caption px-4 py-1.5 rounded-[4px] transition-colors ${
                activationConfirmType === 'accept'
                  ? 'bg-[#01669f] hover:bg-[#01669f]/90'
                  : 'bg-red-600 hover:bg-red-600/90'
              }`}
            >
              {activationConfirmType === 'accept' ? 'Accept Activation' : 'Decline Activation'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ICS-204 Draft Update Modal */}
      <Dialog open={ics204ModalOpen} onOpenChange={setIcs204ModalOpen}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white" style={{ maxWidth: '1080px', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white">ICS-204 — Assignment List</DialogTitle>
            <DialogDescription className="text-white/70 flex items-center justify-between">
              <span>Current Incident Action Plan — Operational Period 2</span>
              <span>Assigned Work Group: Division Alpha</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* Recommended Update Highlight */}
            <div className="border border-purple-500/50 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(139, 92, 246, 0.12)' }}>
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">Recommended Update</span>
                  </div>
                  <button
                    className="p-1 hover:bg-purple-500/20 rounded transition-colors"
                    title="Edit Recommended Update"
                  >
                    <Edit2 className="w-4 h-4 text-white/70" />
                  </button>
                </div>
                <p className="text-white text-sm font-medium">UAS Surveillance Patrol — Levi Stadium Waters</p>
                <p className="text-white/70 text-xs mt-1">Patrol the waters surrounding Levi Stadium to surveil and identify any UAS assets in the area.</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                  <span>Start: Immediate</span>
                </div>

                <div className="mt-3 border-t border-purple-500/30 pt-3">
                  <label className="text-white/50 text-xs block mb-2">Resources for this Assignment</label>
                  <div className="border border-border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border" style={{ backgroundColor: 'rgba(139, 92, 246, 0.10)' }}>
                          <th className="text-left px-3 py-1.5 text-white/70 font-medium">Resource</th>
                          <th className="text-left px-3 py-1.5 text-white/70 font-medium">Identifier</th>
                          <th className="text-left px-3 py-1.5 text-white/70 font-medium">Current Op Period Work Availability</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border">
                          <td className="px-3 py-1.5 text-white">Patrol Boat CG-25502</td>
                          <td className="px-3 py-1.5 text-white">PB-25502</td>
                          <td className="px-3 py-1.5 text-green-400">Unassigned Available</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-1.5 text-white">UAS Detection Kit Bravo</td>
                          <td className="px-3 py-1.5 text-white">UDK-B</td>
                          <td className="px-3 py-1.5 text-green-400">Unassigned Available</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Assignments */}
            <div>
              <label className="text-white text-sm font-semibold block mb-2">Existing Work Assignments</label>
              <div className="space-y-2">
                {[
                  { id: 'wa-1', title: 'Perimeter Patrol — Levi Stadium Waterfront', assignedTo: 'Strike Team 001', start: '0600L', status: 'Active', description: 'Maintain continuous patrol of the waterfront perimeter surrounding Levi Stadium. Monitor for unauthorized vessel traffic and report anomalies.' },
                  { id: 'wa-2', title: 'Port Entry Screening — Pier 27', assignedTo: 'Marine Safety Unit SF', start: '0700L', status: 'Active', description: 'Conduct enhanced screening of all inbound commercial vessels at Pier 27. Coordinate with CBP for cargo manifest verification.' },
                  { id: 'wa-3', title: 'Comms Relay — Channel 16 Monitoring', assignedTo: 'Comms Unit', start: '0600L', status: 'Active', description: 'Maintain continuous VHF Channel 16 watch and relay critical communications between field units and the Incident Command Post.' }
                ].map((wa) => (
                  <div
                    key={wa.id}
                    className="border border-border rounded-lg overflow-hidden"
                    style={{ background: 'linear-gradient(90deg, rgba(2, 163, 254, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                  >
                    <div className={`p-3 ${expandedAlerts.has(wa.id) ? 'border-b border-border' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div
                          className="flex items-start gap-2 flex-1 cursor-pointer"
                          onClick={() => {
                            setExpandedAlerts(prev => {
                              const next = new Set(prev);
                              if (next.has(wa.id)) next.delete(wa.id); else next.add(wa.id);
                              return next;
                            });
                          }}
                        >
                          {expandedAlerts.has(wa.id) ? (
                            <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="caption text-white">{wa.title}</span>
                            {!expandedAlerts.has(wa.id) && (
                              <div className="flex items-center gap-3 mt-1">
                                <span className="caption text-white">{wa.assignedTo} • Start: {wa.start}</span>
                                <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40">{wa.status}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {expandedAlerts.has(wa.id) && (
                      <div className="p-4 space-y-3 bg-card/50">
                        <div>
                          <label className="text-white/50 text-xs block mb-1">Description</label>
                          <p className="caption text-white">{wa.description}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Assigned To</label>
                            <p className="caption text-white">{wa.assignedTo}</p>
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Start Time</label>
                            <p className="caption text-white">{wa.start}</p>
                          </div>
                          <div>
                            <label className="text-white/50 text-xs block mb-1">Status</label>
                            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40">{wa.status}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-3 mt-4 flex-shrink-0">
            <Button
              onClick={() => setIcs204ModalOpen(false)}
              variant="outline"
              className="border-border text-white hover:bg-muted/20"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIcs204ModalOpen(false);
                toast.success('204 update notification sent to Division Alpha.');
                setTimeout(() => {
                  setUasShootdownVisible(true);
                  toast('Field Report: UAS Neutralized Approaching Levi Stadium TFR', {
                    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
                    style: { border: '1px solid #ef4444', backgroundColor: '#222529', color: 'white' },
                  });
                }, 5000);
              }}
              className="bg-[#01669f] hover:bg-[#01669f]/90 text-white"
            >
              Submit Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

