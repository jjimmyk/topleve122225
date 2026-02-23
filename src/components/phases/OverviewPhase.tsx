import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight, Edit2, Trash2, RefreshCw, Check, Download, Plus, ExternalLink, Map, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import svgPaths from '../../imports/svg-7hg6d30srz';
import { TiptapEditor } from '../TiptapEditor';
import '../TiptapEditor.css';

interface OverviewPhaseProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  onComplete: () => void;
  onPrevious?: () => void;
  onAddAIContext?: (itemName: string) => void;
}

type DataSourceStatus = 'Active' | 'Delayed' | 'Offline' | 'Maintenance';

interface DataSourceItem {
  id: string;
  name: string;
  status: DataSourceStatus;
  lastUpdated: string;
  updateFrequency: string;
  provider: string;
  description: string;
  dataTypes: string[];
  coverage: string;
  reliability: string;
  dataSources?: string;
}

export function OverviewPhase({ data, onDataChange, onAddAIContext }: OverviewPhaseProps) {
  const ALL_AORS_ID = 'all-aors';
  const ALL_INCIDENTS_ID = 'all-incidents';
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [expandedChildIncidents, setExpandedChildIncidents] = useState<Set<string>>(new Set());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'region' | 'incident'>('region');
  const [selectedRegion, setSelectedRegion] = useState<string>('sector-new-york');
  const [selectedIncident, setSelectedIncident] = useState<string>('platform-shutdown-alpha');
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [incidentPopoverOpen, setIncidentPopoverOpen] = useState(false);
  const [sitrepContent, setSitrepContent] = useState<string>(data.sitrep || '');
  const [sitrepEditMode, setSitrepEditMode] = useState(false);
  const [sitrepDraft, setSitrepDraft] = useState<string>('');
  const [sitrepLastUpdated, setSitrepLastUpdated] = useState<string>(data.sitrepLastUpdated || '');
  const [sitrepLastUpdatedBy, setSitrepLastUpdatedBy] = useState<string>(data.sitrepLastUpdatedBy || 'John Smith');
  const [sitrepViewMode, setSitrepViewMode] = useState<'latest' | 'historical' | 'drafts' | 'review'>('latest');
  const [reviewQueueTab, setReviewQueueTab] = useState<number>(1);
  const [reviewEditMode, setReviewEditMode] = useState(false);
  const [reviewEditContents, setReviewEditContents] = useState<Record<number, string>>({
    1: 'Reporting Unit: Sector Operations Center. Primary POC CAPT Rodriguez. Incident command structure activated.',
    2: 'Executive Summary: Hurricane Delta forming 400nm SE of Louisiana coast. Current track forecast landfall in 72-96 hours. Port Condition YANKEE set as precautionary measure.',
    9: 'Risk to Mission: Moderate. Monitoring storm development closely. Prepared to escalate response posture as needed.',
    10: 'Outstanding RFI/RFR: Weather forecasting updates requested every 6 hours. Resource availability confirmation from neighboring sectors.',
    11: 'Previous 14-day Critical Incident Reporting: Initial hurricane formation detected. Preparedness protocols initiated.',
    12: 'General Comments: Joint coordination calls established with State EOC and FEMA Region 6. All units briefed on storm track.',
    13: 'Imagery: Initial storm formation satellite imagery. Projected track cone maps distributed.'
  });
  
  // Historical SITREPs state
  const [historicalSitreps] = useState([
    {
      id: 'hist-1',
      sections: {
        1: 'Reporting Unit: Sector Operations Center. Primary POC CAPT Anderson. Full operational staffing maintained throughout hurricane response.',
        2: 'Executive Summary: Hurricane Delta downgraded to Category 2, moving NNE at 18 knots. All vessels accounted for in designated safe harbors. Port Condition ZULU remains in effect for Gulf Coast ports.',
        9: 'Risk to Mission: Low. Storm track moving away from operational area. Weather conditions improving steadily.',
        10: 'Outstanding RFI/RFR: Awaiting damage assessment reports from outlying stations. Expected completion within 24 hours.',
        11: 'Previous 14-day Critical Incident Reporting: Hurricane Delta response operations ongoing. Minor infrastructure damage documented.',
        12: 'General Comments: Excellent coordination across all units. Transition to recovery operations commencing at 1200L tomorrow.',
        13: 'Imagery: Aerial reconnaissance imagery of Station Galveston pier damage attached. Documentation of safe harbor positions included.'
      },
      approvedDate: '12/18/2025 09:15',
      approvedBy: 'CAPT Anderson',
      operationalPeriod: 'OP-3',
      authoredDate: '12/18/2025 08:30',
      authoredBy: 'LCDR Sarah Mitchell'
    },
    {
      id: 'hist-2',
      sections: {
        1: 'Reporting Unit: Sector Operations Center. Primary POC CAPT Anderson. Emergency operations center fully activated.',
        2: 'Executive Summary: Hurricane Delta intensified to Category 3, sustained winds 115 knots. Port Condition ZULU set for all Gulf Coast ports. All commercial traffic suspended.',
        9: 'Risk to Mission: High. Direct impact expected within 48 hours. All response assets staged and ready.',
        10: 'Outstanding RFI/RFR: Requesting additional SAR helicopter support from District. Fuel resupply coordination pending.',
        11: 'Previous 14-day Critical Incident Reporting: Hurricane Delta track updates. Evacuation operations in progress.',
        12: 'General Comments: All units operating under HURCON 2 protocols. Coordination with State EOC and FEMA ongoing.',
        13: 'Imagery: Satellite tracking imagery of Hurricane Delta. Vessel positioning maps included.'
      },
      approvedDate: '12/17/2025 16:30',
      approvedBy: 'CAPT Anderson',
      operationalPeriod: 'OP-2',
      authoredDate: '12/17/2025 15:45',
      authoredBy: 'LCDR Sarah Mitchell'
    },
    {
      id: 'hist-3',
      sections: {
        1: 'Reporting Unit: Sector Operations Center. Primary POC CAPT Rodriguez. Incident command structure activated.',
        2: 'Executive Summary: Hurricane Delta forming 400nm SE of Louisiana coast. Current track forecast landfall in 72-96 hours. Port Condition YANKEE set as precautionary measure.',
        9: 'Risk to Mission: Moderate. Monitoring storm development closely. Prepared to escalate response posture as needed.',
        10: 'Outstanding RFI/RFR: Weather forecasting updates requested every 6 hours. Resource availability confirmation from neighboring sectors.',
        11: 'Previous 14-day Critical Incident Reporting: Initial hurricane formation detected. Preparedness protocols initiated.',
        12: 'General Comments: Joint coordination calls established with State EOC and FEMA Region 6. All units briefed on storm track.',
        13: 'Imagery: Initial storm formation satellite imagery. Projected track cone maps distributed.'
      },
      approvedDate: '12/16/2025 14:00',
      approvedBy: 'CAPT Rodriguez',
      operationalPeriod: 'OP-1',
      authoredDate: '12/16/2025 13:15',
      authoredBy: 'LT Jackson Chen'
    }
  ]);
  
  // Draft SITREPs state
  const [draftSitreps] = useState([
    {
      id: 'draft-1',
      content: 'Current situation: Sector Honolulu monitoring Tropical Storm Olivia, currently 850nm ENE of Oahu moving WSW at 12 knots. Maximum sustained winds 50 knots, central pressure 995mb.\n\nOperational Status: Port Condition YANKEE set for all Hawaiian ports effective 1400L. All recreational vessels ordered to seek safe harbor. Commercial shipping continues with restrictions.\n\nResources: USCG Cutter WALNUT pre-positioned at Sand Island. MH-65 helicopter on standby at Air Station Barbers Point. Search and rescue assets staged.',
      submittedDate: '12/19/2025 14:30',
      status: 'Pending Review'
    }
  ]);
  const [isAddingDraft, setIsAddingDraft] = useState(false);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [modalDraftTab, setModalDraftTab] = useState<number>(1);
  const [modalDraftContents, setModalDraftContents] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: ''
  });
  const [draftDataSources, setDraftDataSources] = useState<string[]>([]);
  const [dataSourcesOpen, setDataSourcesOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [filesSubmenuOpen, setFilesSubmenuOpen] = useState(false);
  const filesItemRef = useRef<HTMLDivElement>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [filePreviewModal, setFilePreviewModal] = useState<string | null>(null);
  const [pdfPreviewModalOpen, setPdfPreviewModalOpen] = useState(false);
  const [historicalSitrepTabs, setHistoricalSitrepTabs] = useState<Record<string, number>>({});
  const [selectedDraftObjectName, setSelectedDraftObjectName] = useState<string | null>(null);
  
  // Modal-specific data sources state
  const [modalDataSourcesOpen, setModalDataSourcesOpen] = useState(false);
  const [modalSelectedFiles, setModalSelectedFiles] = useState<string[]>([]);
  const [modalFilesSubmenuOpen, setModalFilesSubmenuOpen] = useState(false);
  const modalFilesItemRef = useRef<HTMLDivElement>(null);
  const [modalSubmenuPosition, setModalSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [readinessExpanded, setReadinessExpanded] = useState<Record<string, boolean>>({
    maneuver: false,
    intel: false,
    logistics: false,
    command: false,
    force: false,
    other: false
  });
  const [readinessDataSourcesOpenKey, setReadinessDataSourcesOpenKey] = useState<string | null>(null);
  const [readinessFilesSubmenuOpen, setReadinessFilesSubmenuOpen] = useState(false);
  const readinessFilesItemRef = useRef<HTMLDivElement>(null);
  const [readinessSubmenuPosition, setReadinessSubmenuPosition] = useState<{ top: number; left: number } | null>(null);
  
  // SITREP tabs state
  const [activeSitrepTab, setActiveSitrepTab] = useState<number>(1);
  const [activeDraftTab, setActiveDraftTab] = useState<number>(1);
  const [childIncident1SitrepTab, setChildIncident1SitrepTab] = useState<number>(1);
  const [childIncident2SitrepTab, setChildIncident2SitrepTab] = useState<number>(1);
  const [sitrepPopoutOpen, setSitrepPopoutOpen] = useState(false);
  const [sitrepPopoutTab, setSitrepPopoutTab] = useState<number>(1);
  const [sitrepPopoutSection, setSitrepPopoutSection] = useState<number>(1);
  const [sitrepPopoutFontSize, setSitrepPopoutFontSize] = useState<number>(12);
  const [sitrepLatestFontSize, setSitrepLatestFontSize] = useState<number>(12);
  const [readinessExpandedPopout, setReadinessExpandedPopout] = useState<Record<string, boolean>>({
    maneuver: false,
    intel: false,
    logistics: false,
    command: false,
    force: false,
    other: false
  });
  const [sitrepModalOpen, setSitrepModalOpen] = useState<string | null>(null);
  const [sitrepModalTab, setSitrepModalTab] = useState<number>(1);
  const [portStatusCondition, setPortStatusCondition] = useState<string>('Port Condition X-RAY: 48 hours.');
  const [portStatusPopoverOpen, setPortStatusPopoverOpen] = useState(false);
  const [hurconStatus, setHurconStatus] = useState<string>('5');
  const [hurconPopoverOpen, setHurconPopoverOpen] = useState(false);
  const [coopStatus, setCoopStatus] = useState<string>('Normal Operations');
  const [coopPopoverOpen, setCoopPopoverOpen] = useState(false);
  const [cirAlertExpanded, setCirAlertExpanded] = useState(false);
  
  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filesSubmenuOpen && filesItemRef.current && !filesItemRef.current.contains(target)) {
        // Check if click is outside both the Files item and the submenu
        const submenuElement = document.querySelector('[data-submenu="files"]');
        if (submenuElement && !submenuElement.contains(target)) {
          setFilesSubmenuOpen(false);
        }
      }
      if (modalFilesSubmenuOpen && modalFilesItemRef.current && !modalFilesItemRef.current.contains(target)) {
        // Check if click is outside both the Files item and the submenu (modal version)
        const submenuElement = document.querySelector('[data-submenu="files-modal"]');
        if (submenuElement && !submenuElement.contains(target)) {
          setModalFilesSubmenuOpen(false);
        }
      }
      if (readinessFilesSubmenuOpen && readinessFilesItemRef.current && !readinessFilesItemRef.current.contains(target)) {
        const submenuElement = document.querySelector('[data-submenu="files-readiness"]');
        if (submenuElement && !submenuElement.contains(target)) {
          setReadinessFilesSubmenuOpen(false);
        }
      }
    };

    if (filesSubmenuOpen || modalFilesSubmenuOpen || readinessFilesSubmenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [filesSubmenuOpen, modalFilesSubmenuOpen, readinessFilesSubmenuOpen]);
  
  // Draft content for each tab
  const [draftTabContents, setDraftTabContents] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: '',
    4: '',
    5: ''
  });
  
  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Region options
  const regions = [
    { id: 'gulf-coast', name: 'Gulf Coast Region' },
    { id: 'southeast', name: 'Southeast Region' },
    { id: 'northeast', name: 'Northeast Region' },
    { id: 'west-coast', name: 'West Coast Region' },
    { id: 'great-lakes', name: 'Great Lakes Region' },
    { id: 'sector-new-york', name: 'Sector New York' }
  ];

  // Incident options
  const incidents = [
    { id: 'platform-shutdown-alpha', name: 'Platform Alpha Emergency Shutdown - Block 847' },
    { id: 'pipeline-leak-response', name: 'Subsea Pipeline Leak Response - Deepwater Corridor' },
    { id: 'hurricane-preparedness', name: 'Hurricane Delta Production Shutdown Protocol' },
    { id: 'well-control-incident', name: 'Well Control Event - Mobile Drilling Unit Genesis' },
    { id: 'vessel-collision-response', name: 'Supply Vessel Collision - Platform Bravo' }
  ];
  const portStatusOptions = [
    'Port Condition WHISKEY: Set when sustained gale force winds are forecasted to reach the port within 72 hours.',
    'Port Condition X-RAY: 48 hours.',
    'Port Condition YANKEE: 24 hours.',
    'Port Condition ZULU: 12 hours.',
    'Port Condition RECOVERY: Set after storm conditions have passed and the port is safe to return to normal operations.'
  ];
  const hurconOptions = ['1', '2', '3', '4', '5'];
  const coopOptions = ['Normal Operations', 'COOP Activated', 'Devolution', 'Reconstitution'];
  const pratusStubOptions = [
    'LCDR Sarah Mitchell — Incident Commander',
    'Firetruck 12 — Structural Engine',
    'USCG Cutter Hamilton (WMSL-753)'
  ];

  // Function to generate data based on region and incident
  const generateDataForSelection = (region: string, incident: string, mode: 'region' | 'incident' = 'region'): DataSourceItem[] => {
    const baseTime = new Date();
    const randomMinutes = () => Math.floor(Math.random() * 15);
    
    const regionCoverage =
      region === ALL_AORS_ID
        ? 'All AORs'
        : regions.find(r => r.id === region)?.name || 'Unknown Region';
    const incidentName =
      incident === ALL_INCIDENTS_ID
        ? 'All Incidents'
        : incidents.find(i => i.id === incident)?.name || 'Unknown Incident';
    
    const items: DataSourceItem[] = [];
    
    // Add Active Incidents item only when filtering by region
    if (mode === 'region') {
      items.push({
        id: 'src0',
        name: `Incidents Within ${regionCoverage}`,
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Real-time',
        provider: 'Integrated Emergency Management System',
        description: `Comprehensive list of all active emergency incidents and responses within ${regionCoverage}. Includes Category, severity, status, responding agencies, affected areas, resource allocation, and operational priorities. Provides regional situational awareness across all concurrent emergency operations.`,
        dataTypes: ['Category', 'Severity Level', 'Status', 'Location', 'Responding Agencies', 'Resources Deployed'],
        coverage: regionCoverage,
        reliability: '99.9% uptime',
        dataSources: 'FEMA IPAWS, State EOC, Local Emergency Dispatch, USCG Command Centers, DHS NIMS'
      });
    }
    
    items.push(
      {
        id: 'src0a',
        name: `Port Status for ${regionCoverage}`,
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Every 30 minutes',
        provider: 'U.S. Coast Guard Captain of the Port',
        description: `Port operational status for ${regionCoverage}: Open (with restrictions) or Closed. Includes berth availability, channel restrictions, pilot services, tug requirements, and maritime traffic management for ${incidentName}.`,
        dataTypes: ['Port Condition', 'Channel Status', 'Berth Availability', 'Vessel Traffic', 'Restrictions'],
        coverage: regionCoverage,
        reliability: '99.9% uptime',
        dataSources: 'USCG Sector Command Center, Homeport, Port Authority, Marine Exchange'
      },
      {
        id: 'src0b',
        name: 'HURCON Attainment',
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Every 6 hours',
        provider: 'U.S. Coast Guard',
        description: `Hurricane Condition (HURCON) readiness level for ${regionCoverage} facilities and units. Tracks progression through HURCON 5 (96 hours), HURCON 4 (72 hours), HURCON 3 (48 hours), HURCON 2 (24 hours), to HURCON 1 (12 hours) relative to ${incidentName}.`,
        dataTypes: ['HURCON Level', 'Readiness Status', 'Timeline', 'Resource Positioning', 'Evacuation Status'],
        coverage: regionCoverage,
        reliability: '99.9% uptime',
        dataSources: 'USCG District Command, Sector Operations Centers, Unit Commanders'
      },
      {
        id: 'src0d',
        name: 'COOP Status',
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Every 12 hours',
        provider: 'FEMA/DHS',
        description: `Continuity of Operations (COOP) planning status for ${regionCoverage} critical facilities and government operations. Tracks essential functions, alternate facility activation, personnel accountability, communications redundancy, and resource sustainability for ${incidentName} response.`,
        dataTypes: ['COOP Level', 'Essential Functions', 'Alternate Facilities', 'Personnel Status', 'Communications'],
        coverage: regionCoverage,
        reliability: '99.8% uptime',
        dataSources: 'Federal Emergency Operations, State EOC, Local Emergency Management, Agency COOP Coordinators'
      },
      {
        id: 'src0f',
        name: `Critical Information Requirements (CIRs) for ${regionCoverage}`,
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Per Operational Period',
        provider: 'Unified Command - Planning Section',
        description: `Critical Information Requirements (CIRs) for ${regionCoverage} that inform operational decisions and resource prioritization for ${incidentName}.`,
        dataTypes: ['Decision Points', 'Priority Information', 'Collection Tasks', 'Reporting Requirements'],
        coverage: regionCoverage,
        reliability: '99.5% uptime',
        dataSources: 'ICS-201/202, Planning Meeting Notes, UC Briefings'
      },
      {
        id: 'src0e',
        name: 'Force Layout',
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Every 4 hours',
        provider: 'U.S. Coast Guard/DoD',
        description: `Pre-staged emergency response assets for ${regionCoverage} including helicopters, fixed-wing aircraft, Catastrophic Incident Search and Rescue (CISAR) teams, unmanned aerial systems (drones), swift water rescue teams, and specialized equipment positioned for rapid deployment to ${incidentName} impact area.`,
        dataTypes: ['Helicopters', 'Fixed-Wing Aircraft', 'CISAR Teams', 'Drones/UAS', 'Swift Water Teams', 'Equipment'],
        coverage: regionCoverage,
        reliability: '99.7% uptime',
        dataSources: 'USCG Air Stations, FEMA Urban Search & Rescue, National Guard, DoD Northern Command, State Emergency Response'
      },
      {
        id: 'src1',
        name: `Weather in ${regionCoverage}`,
        status: 'Active',
        lastUpdated: new Date(baseTime.getTime() - randomMinutes() * 60000).toLocaleString('en-US', { 
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
        }).replace(',', ''),
        updateFrequency: 'Every 5 minutes',
        provider: 'NOAA National Weather Service',
        description: `Real-time current weather conditions for ${regionCoverage} including temperature, wind speed and direction, humidity, barometric pressure, visibility, precipitation, and current weather phenomena affecting ${incidentName} operations.`,
        dataTypes: ['Temperature', 'Wind Speed/Direction', 'Humidity', 'Pressure', 'Visibility', 'Precipitation', 'Cloud Cover'],
        coverage: regionCoverage,
        reliability: '99.8% uptime',
        dataSources: 'NOAA Weather Stations, NDBC Buoys, FAA AWOS Network, Regional Airports'
      },
    );
    
    return items;
  };

  const [dataSources, setDataSources] = useState<DataSourceItem[]>(
    data.dataSources || generateDataForSelection('gulf-coast', 'platform-shutdown-alpha', 'region')
  );

  // Function to manually update data
  const handleUpdate = () => {
    const newData = generateDataForSelection(selectedRegion, selectedIncident, filterMode);
    setDataSources(newData);
    persist(newData);
  };


  const [formData, setFormData] = useState<DataSourceItem>({
    id: '',
    name: '',
    status: 'Active',
    lastUpdated: '',
    updateFrequency: '',
    provider: '',
    description: '',
    dataTypes: [],
    coverage: '',
    reliability: ''
  });

  const persist = (items: DataSourceItem[]) => {
    setDataSources(items);
    onDataChange({ ...data, dataSources: items });
  };

  const startEditSitrep = () => {
    setSitrepDraft(sitrepContent);
    setSitrepEditMode(true);
  };

  const saveSitrep = () => {
    setSitrepContent(sitrepDraft);
    const timestamp = new Date().toLocaleString('en-US', { 
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false 
    }).replace(',', '');
    setSitrepLastUpdated(timestamp);
    onDataChange({ 
      ...data, 
      sitrep: sitrepDraft,
      sitrepLastUpdated: timestamp,
      sitrepLastUpdatedBy: sitrepLastUpdatedBy
    });
    setSitrepEditMode(false);
  };

  const cancelEditSitrep = () => {
    setSitrepDraft('');
    setSitrepEditMode(false);
  };

  const toggleSource = (id: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleChildIncident = (id: string) => {
    setExpandedChildIncidents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openAddSource = () => {
    setEditingSourceId(null);
    setFormData({
      id: '',
      name: '',
      status: 'Active',
      lastUpdated: new Date().toLocaleString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }).replace(',', ''),
      updateFrequency: '',
      provider: '',
      description: '',
      dataTypes: [],
      coverage: '',
      reliability: ''
    });
    setIsSheetOpen(true);
  };

  const openEditSource = (id: string) => {
    const s = dataSources.find(x => x.id === id);
    if (!s) return;
    setEditingSourceId(id);
    setFormData({ ...s });
    setIsSheetOpen(true);
  };

  const deleteSource = (id: string) => {
    persist(dataSources.filter(s => s.id !== id));
  };

  const saveSource = () => {
    if (!formData.name || !formData.provider) {
      return;
    }
    if (editingSourceId) {
      persist(dataSources.map(s => (s.id === editingSourceId ? { ...formData, id: editingSourceId } : s)));
    } else {
      const id = `${Date.now()}`;
      persist([...dataSources, { ...formData, id }]);
    }
    setIsSheetOpen(false);
    setEditingSourceId(null);
  };

  const filtered = dataSources.filter(s => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(search) ||
      s.provider.toLowerCase().includes(search) ||
      s.status.toLowerCase().includes(search) ||
      s.dataTypes.some(dt => dt.toLowerCase().includes(search))
    );
  });

  const getStatusColor = (status: DataSourceStatus) => {
    switch (status) {
      case 'Active': return '#22c55e';
      case 'Delayed': return '#F59E0B';
      case 'Offline': return '#EF4444';
      case 'Maintenance': return '#6e757c';
      default: return '#6e757c';
    }
  };

  const selectedRegionName =
    selectedRegion === ALL_AORS_ID
      ? 'All AORs'
      : regions.find(r => r.id === selectedRegion)?.name || 'Unknown Region';
  const selectedIncidentName =
    selectedIncident === ALL_INCIDENTS_ID
      ? 'All Incidents'
      : incidents.find(i => i.id === selectedIncident)?.name || 'Unknown Incident';
  const currentRegionName = selectedRegionName;
  const sitrepSections = [
    { id: 1, label: 'Reporting Unit' },
    { id: 2, label: 'Executive Summary' },
    { id: 8, label: 'Readiness Assessment / Incident Reporting by Category' },
    { id: 9, label: 'Risk to Mission' },
    { id: 10, label: 'Outstanding RFI or RFR' },
    { id: 11, label: 'Previous (14 day or less) Critical Incident Communications or Intelligence Reporting' },
    { id: 12, label: 'General Comments' },
    { id: 13, label: 'Imagery' }
  ];

  const getLatestSitrepContentByTab = (tabId: number): string => {
    const readinessApprovedContent: Record<string, string> = {
      maneuver: 'Patrol posture maintained at primary chokepoints. QRF remains on 15-minute standby. Partner unit coordination ongoing with no deviations reported.',
      intel: 'No new credible threats reported in the last 12 hours. Open-source monitoring stable. Liaison updates pending next intel brief.',
      logistics: 'Supply status green. Fuel and maintenance logs updated. Civil affairs coordination continuing with local agencies and port authority.',
      command: 'Command post fully staffed. Communications checks complete across all channels. Incident action plan updates distributed to section leads.',
      force: 'Force protection posture remains elevated. Access control measures in place. No security violations or perimeter breaches reported.',
      other: 'No additional readiness concerns reported. Monitoring continues with standard reporting cadence.'
    };

    const latestByTab: Record<number, string> = {
      1: 'Reporting Unit: Sector Operations Center. Primary POC LCDR Sarah Mitchell. Staffing at 92% with full watch rotation coverage.',
      2: 'Executive Summary: Operational tempo remains steady. Maritime security zones active with high compliance. No significant incidents reported in the last 12 hours.\nCutter Vessel 001 is in preparing to conduct a patrol of Zone Alpha.',
      8: [
        'Maneuver & Force:',
        readinessApprovedContent.maneuver,
        '',
        'Intelligence & Info:',
        readinessApprovedContent.intel,
        '',
        'Logistics / Civil Affairs:',
        readinessApprovedContent.logistics,
        '',
        'Command and Control:',
        readinessApprovedContent.command,
        '',
        'Force Protection:',
        readinessApprovedContent.force,
        '',
        'Other:',
        readinessApprovedContent.other
      ].join('\n'),
      9: 'Risk to Mission: Low. No credible threats or disruptions anticipated. Monitoring continues with elevated readiness posture.',
      10: 'Outstanding RFI/RFR: None at this time. All pending requests resolved in current operational period.',
      11: 'Previous 14-day Critical Incident Reporting: No critical incidents requiring follow-on reporting. Prior advisories have been closed.',
      12: 'General Comments: Interagency coordination remains strong. Next brief scheduled for 1800L.',
      13: 'Imagery: No new imagery submitted. Last update includes routine aerial reconnaissance set dated 02/03/2026.'
    };

    return latestByTab[tabId] || '';
  };

  const startNewDraftFromLatest = () => {
    const prefilledDraftContent: Record<number, string> = {
      1: getLatestSitrepContentByTab(1),
      2: getLatestSitrepContentByTab(2),
      8: getLatestSitrepContentByTab(8),
      9: getLatestSitrepContentByTab(9),
      10: getLatestSitrepContentByTab(10),
      11: getLatestSitrepContentByTab(11),
      12: getLatestSitrepContentByTab(12),
      13: getLatestSitrepContentByTab(13)
    };

    setDraftTabContents(prefilledDraftContent);
    setActiveDraftTab(1);
    setSelectedTemplate('');
    setSitrepViewMode('drafts');
    setIsAddingDraft(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#222529] rounded-lg border border-[#6e757c] relative">
        <div className="flex items-center justify-between px-[13px] py-3 w-full border-b-2 border-border rounded-t-lg rounded-b-none">
          <div className="flex items-center gap-4">
            <p className="caption text-nowrap text-white whitespace-pre">Report Sections</p>
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
          </div>
        </div>
      </div>

      {/* Two Separate Filter Components */}
      <div className="flex gap-3">
        {/* AOR */}
        <div className="flex-1 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <div className="space-y-2">
            <span className="caption text-white whitespace-nowrap block">AOR:</span>
            <div className="flex items-center gap-2">
              <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`flex-1 h-[24px] bg-transparent border rounded-[4px] px-2 caption text-white focus:outline-none flex items-center justify-between cursor-pointer ${
                      regionPopoverOpen ? 'border-accent' : 'border-[#6e757c]'
                    }`}
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  >
                    {selectedRegionName}
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
                        <CommandItem
                          value="All AORs"
                          onSelect={() => {
                            setSelectedRegion(ALL_AORS_ID);
                            setFilterMode('region');
                            const newData = generateDataForSelection(ALL_AORS_ID, selectedIncident, 'region');
                            setDataSources(newData);
                            persist(newData);
                            setRegionPopoverOpen(false);
                          }}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                        >
                          <Check className={`mr-2 h-3 w-3 ${selectedRegion === ALL_AORS_ID ? 'opacity-100' : 'opacity-0'}`} />
                          All AORs
                        </CommandItem>
                        {regions.map((region) => (
                          <CommandItem
                            key={region.id}
                            value={region.name}
                            onSelect={() => {
                              setSelectedRegion(region.id);
                              setFilterMode('region');
                              const newData = generateDataForSelection(region.id, selectedIncident, 'region');
                              setDataSources(newData);
                              persist(newData);
                              setRegionPopoverOpen(false);
                            }}
                            className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          >
                            <Check className={`mr-2 h-3 w-3 ${selectedRegion === region.id ? 'opacity-100' : 'opacity-0'}`} />
                            {region.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('AOR map clicked');
                }}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Show on map"
              >
                <Map className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('Exporting approved reports for AOR:', selectedRegionName);
                }}
                className="bg-[#01669f] rounded-[4px] px-3 py-2 hover:bg-[#01669f]/90 transition-colors flex items-start justify-start gap-2 flex-1 text-left"
              >
                <Download className="w-3 h-3 text-white shrink-0 mt-0.5" />
                <span className="caption text-white whitespace-normal leading-4">
                  Export Approved Reports
                </span>
              </button>
              <div className="w-5" aria-hidden />
            </div>
          </div>
        </div>

        {/* Select Incident */}
        <div className="flex-1 px-4 py-3 bg-[#222529] rounded-lg border border-[#6e757c]">
          <div className="space-y-2">
            <span className="caption text-white whitespace-nowrap block">Select Incident:</span>
            <div className="flex items-center gap-2">
              <Popover open={incidentPopoverOpen} onOpenChange={setIncidentPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className={`flex-1 h-[24px] bg-transparent border rounded-[4px] px-2 caption text-white focus:outline-none flex items-center justify-between cursor-pointer ${
                      incidentPopoverOpen ? 'border-accent' : 'border-[#6e757c]'
                    }`}
                    style={{
                      fontFamily: "'Open Sans', sans-serif",
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '18px'
                    }}
                  >
                    {selectedIncidentName}
                    <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0 bg-[#222529] border-[#6e757c]" align="start">
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
                        <CommandItem
                          value="All Incidents"
                          onSelect={() => {
                            setSelectedIncident(ALL_INCIDENTS_ID);
                            setFilterMode('incident');
                            const newData = generateDataForSelection(selectedRegion, ALL_INCIDENTS_ID, 'incident');
                            setDataSources(newData);
                            persist(newData);
                            setIncidentPopoverOpen(false);
                          }}
                          className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                        >
                          <Check className={`mr-2 h-3 w-3 ${selectedIncident === ALL_INCIDENTS_ID ? 'opacity-100' : 'opacity-0'}`} />
                          All Incidents
                        </CommandItem>
                        {incidents.map((incident) => (
                          <CommandItem
                            key={incident.id}
                            value={incident.name}
                            onSelect={() => {
                              setSelectedIncident(incident.id);
                              setFilterMode('incident');
                              const newData = generateDataForSelection(selectedRegion, incident.id, 'incident');
                              setDataSources(newData);
                              persist(newData);
                              setIncidentPopoverOpen(false);
                            }}
                            className="caption text-white cursor-pointer hover:bg-[#14171a] data-[selected=true]:bg-[#14171a]"
                          >
                            <Check className={`mr-2 h-3 w-3 ${selectedIncident === incident.id ? 'opacity-100' : 'opacity-0'}`} />
                            {incident.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Incident map clicked');
                }}
                className="p-1 hover:bg-muted/30 rounded transition-colors"
                title="Show on map"
              >
                <Map className="w-3 h-3 text-white" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('Exporting approved reports for incident:', selectedIncidentName);
                }}
                className="bg-[#01669f] rounded-[4px] px-3 py-2 hover:bg-[#01669f]/90 transition-colors flex items-start justify-start gap-2 flex-1 text-left"
              >
                <Download className="w-3 h-3 text-white shrink-0 mt-0.5" />
                <span className="caption text-white whitespace-normal leading-4">
                  Export Approved Reports
                </span>
              </button>
              <div className="w-5" aria-hidden />
            </div>
          </div>
        </div>
      </div>
      {/* SITREP Section */}
      <div className="mb-6">
        <div className="border border-border rounded-lg overflow-hidden bg-card/30">
          <div className="p-4 space-y-3">
            {/* SITREP View Mode Toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center bg-[#14171a] rounded-[4px] border border-[#6e757c] overflow-hidden">
                <button
                  onClick={() => setSitrepViewMode('latest')}
                  className={`caption px-3 py-1 transition-colors ${
                    sitrepViewMode === 'latest'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-white hover:bg-[#222529]'
                  }`}
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  Latest
                </button>
                <button
                  onClick={() => setSitrepViewMode('historical')}
                  className={`caption px-3 py-1 transition-colors ${
                    sitrepViewMode === 'historical'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-white hover:bg-[#222529]'
                  }`}
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  Historical
                </button>
                <button
                  onClick={() => setSitrepViewMode('drafts')}
                  className={`caption px-3 py-1 transition-colors ${
                    sitrepViewMode === 'drafts'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-white hover:bg-[#222529]'
                  }`}
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  My Drafts
                </button>
                <button
                  onClick={() => setSitrepViewMode('review')}
                  className={`caption px-3 py-1 transition-colors ${
                    sitrepViewMode === 'review'
                      ? 'bg-accent text-accent-foreground'
                      : 'text-white hover:bg-[#222529]'
                  }`}
                  style={{ 
                    fontFamily: "'Open Sans', sans-serif",
                    fontSize: '12px',
                    fontWeight: 400,
                    lineHeight: '18px'
                  }}
                >
                  Review Queue
                </button>
              </div>
              {sitrepViewMode === 'latest' && (
                <button
                  onClick={startNewDraftFromLatest}
                  className="bg-[#01669f] h-[22.75px] rounded-[4px] px-3 hover:bg-[#01669f]/90 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="text-white text-xs">+</span>
                  <span className="caption text-white">Add Draft</span>
                </button>
              )}
            </div>

            {sitrepViewMode === 'latest' ? (
              <>
                {/* Header with Edit icon and Last Updated */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-white text-sm font-semibold">
                        SITREP for {filterMode === 'region' ? selectedRegionName : selectedIncidentName}
                      </Label>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSitrepPopoutTab(activeSitrepTab);
                          setSitrepPopoutOpen(true);
                        }}
                        className="p-1 hover:bg-muted/30 rounded transition-colors"
                        title="Open in modal"
                      >
                        <ExternalLink className="w-3 h-3 text-white/70" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="caption text-white/70 text-xs block">
                      Authored by LCDR Sarah Mitchell at 14:30 UTC 19 DEC 2025
                    </span>
                    <span className="caption text-white/70 text-xs block">
                      Approved by CDR Thomas Bradley at 15:00 UTC 19 DEC 2025
                    </span>
                  </div>
                  
                {/* SITREP Section Selector */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                    {sitrepSections.map((section) => {
                      const isActive = activeSitrepTab === section.id;
                      return (
                        <button
                          key={section.id}
                          onClick={() => setActiveSitrepTab(section.id)}
                          className={`relative px-3 py-2 transition-colors whitespace-nowrap ${
                            isActive ? 'text-accent' : 'text-foreground hover:text-accent'
                          }`}
                        >
                          <span className="caption">{section.label}</span>
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                  
                  {sitrepLastUpdated && (
                    <span className="caption text-white/70 block">
                      Last updated {sitrepLastUpdated} by {sitrepLastUpdatedBy}
                    </span>
                  )}
                  {filterMode === 'region' && selectedRegion === 'west-coast' && (
                    <div className="space-y-1 mt-2">
                      <p className="caption text-white/70 text-xs">
                        Written by: CAPT Jennifer Morrison at 08:45 UTC 19 DEC 2025
                      </p>
                      <p className="caption text-white/70 text-xs">
                        Approved by: CDR Thomas Bradley at 09:30 UTC 19 JUN 2026
                      </p>
                    </div>
                  )}
                </div>

                {/* Content - View or Edit mode */}
                {sitrepEditMode ? (
                  <>
                    <Textarea
                      value={sitrepDraft}
                      onChange={(e) => setSitrepDraft(e.target.value)}
                      placeholder="Enter situation report..."
                      className="bg-input-background border-border min-h-[240px] resize-none"
                    />
                    <div className="flex gap-3">
                      <Button
                        onClick={saveSitrep}
                        className="bg-primary hover:bg-primary/90 px-6 py-0.5 h-auto text-sm"
                      >
                        {filterMode === 'region' && selectedRegion === 'sector-new-york' 
                          ? 'Submit to East District' 
                          : 'Save'}
                      </Button>
                      <Button
                        onClick={cancelEditSitrep}
                        variant="outline"
                        className="border-border px-6 py-0.5 h-auto text-sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {activeSitrepTab === 8 ? (
                      <div className="space-y-3">
                        {[
                          { key: 'maneuver', label: 'Maneuver & Force' },
                          { key: 'intel', label: 'Intelligence & Info' },
                          { key: 'logistics', label: 'Logistics / Civil Affairs' },
                          { key: 'command', label: 'Command and Control' },
                          { key: 'force', label: 'Force Protection' },
                          { key: 'other', label: 'Other' }
                        ].map((item) => {
                          const isOpen = !!readinessExpanded[item.key];
                          const approvedContent: Record<string, string> = {
                            maneuver: 'Patrol posture maintained at primary chokepoints. QRF remains on 15‑minute standby. Partner unit coordination ongoing with no deviations reported.',
                            intel: 'No new credible threats reported in the last 12 hours. Open‑source monitoring stable. Liaison updates pending next intel brief.',
                            logistics: 'Supply status green. Fuel and maintenance logs updated. Civil affairs coordination continuing with local agencies and port authority.',
                            command: 'Command post fully staffed. Communications checks complete across all channels. Incident action plan updates distributed to section leads.',
                            force: 'Force protection posture remains elevated. Access control measures in place. No security violations or perimeter breaches reported.',
                            other: 'No additional readiness concerns reported. Monitoring continues with standard reporting cadence.'
                          };
                          return (
                            <div
                              key={item.key}
                              className="border border-border rounded-lg overflow-hidden"
                              style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                            >
                              <div
                                className={`p-3 ${isOpen ? 'border-b border-border' : ''} cursor-pointer`}
                                onClick={() =>
                                  setReadinessExpanded(prev => ({
                                    ...prev,
                                    [item.key]: !isOpen
                                  }))
                                }
                              >
                                <div className="flex items-start gap-2">
                                  {isOpen ? (
                                    <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <span className="caption text-white">{item.label}</span>
                                  </div>
                                </div>
                              </div>
                              {isOpen && (
                                <div className="p-4 space-y-3 bg-card/50">
                                  <p className="caption text-white whitespace-pre-wrap">
                                    {approvedContent[item.key]}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
            ) : (
              <div>
                <div className="bg-input-background border border-border rounded p-3 min-h-[240px]">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setSitrepLatestFontSize((prev) => Math.max(10, prev - 1))}
                      className="w-5 h-5 rounded-full border border-white text-white hover:bg-muted/30 transition-colors flex items-center justify-center text-sm"
                      title="Decrease font size"
                    >
                      <span className="relative" style={{ top: '-1px' }}>-</span>
                    </button>
                    <button
                      onClick={() => setSitrepLatestFontSize((prev) => Math.min(40, prev + 1))}
                      className="w-5 h-5 rounded-full border border-white text-white hover:bg-muted/30 transition-colors flex items-center justify-center text-sm"
                      title="Increase font size"
                    >
                      +
                    </button>
                    <span className="text-xs text-white/70">Font size: {sitrepLatestFontSize}px</span>
                  </div>
                  <p className="text-white whitespace-pre-wrap" style={{ fontSize: `${sitrepLatestFontSize}px` }}>
                    {activeSitrepTab === 1 && 'Reporting Unit: Sector Operations Center. Primary POC LCDR Sarah Mitchell. Staffing at 92% with full watch rotation coverage.'}
                    {activeSitrepTab === 2 && (
                      <>
                        {'Executive Summary: Operational tempo remains steady. Maritime security zones active with high compliance. No significant incidents reported in the last 12 hours.\n'}
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedDraftObjectName('Cutter Vessel 001');
                          }}
                          style={{ textDecoration: 'underline', color: 'white', cursor: 'pointer' }}
                        >
                          Cutter Vessel 001
                        </a>
                        {' is in preparing to conduct a patrol of Zone Alpha.'}
                      </>
                    )}
                    {activeSitrepTab === 9 && 'Risk to Mission: Low. No credible threats or disruptions anticipated. Monitoring continues with elevated readiness posture.'}
                    {activeSitrepTab === 10 && 'Outstanding RFI/RFR: None at this time. All pending requests resolved in current operational period.'}
                    {activeSitrepTab === 11 && 'Previous 14‑day Critical Incident Reporting: No critical incidents requiring follow‑on reporting. Prior advisories have been closed.'}
                    {activeSitrepTab === 12 && 'General Comments: Interagency coordination remains strong. Next brief scheduled for 1800L.'}
                    {activeSitrepTab === 13 && 'Imagery: No new imagery submitted. Last update includes routine aerial reconnaissance set dated 02/03/2026.'}
                  </p>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center justify-between rounded-full bg-[#14171a] border border-[#6e757c] px-3 py-1 text-sm text-white min-w-[180px]">
                    <span>Document Alpha.pdf</span>
                    <button
                      onClick={() => setPdfPreviewModalOpen(true)}
                      className="ml-2 p-0.5 hover:bg-muted/30 rounded transition-colors"
                      title="Preview PDF"
                    >
                      <ExternalLink className="w-3 h-3 text-white/70" />
                    </button>
                  </span>
                </div>
              </div>
            )}
                  </>
                )}
              </>
            ) : sitrepViewMode === 'historical' ? (
              <>
                {/* Historical SITREPs View */}
                <div className="space-y-3">
                  <Label className="text-white text-sm font-semibold">
                    Previous SITREPs for {filterMode === 'region' ? selectedRegionName : selectedIncidentName}
                  </Label>

                  {/* Historical SITREPs List */}
                  {historicalSitreps.length > 0 ? (
                    <div className="space-y-4">
                      {historicalSitreps.map((sitrep, index) => {
                        const activeTab = historicalSitrepTabs[sitrep.id] || 1;
                        const versionNumber = historicalSitreps.length - index;
                        return (
                          <div key={sitrep.id} className="border border-border rounded-lg overflow-hidden bg-background/30">
                            <div className="p-3 space-y-3">
                              {/* Header with metadata */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-white text-sm font-semibold">
                                    Version {versionNumber}
                                  </Label>
                                </div>
                                <span className="caption text-white/70 text-xs block">
                                  Authored by {sitrep.authoredBy} at {sitrep.authoredDate}
                                </span>
                                <span className="caption text-white/70 text-xs block">
                                  Approved by {sitrep.approvedBy} at {sitrep.approvedDate}
                                </span>
                              </div>

                              {/* SITREP Section Selector */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                                  {sitrepSections.map((section) => {
                                    const isActive = activeTab === section.id;
                                    return (
                                      <button
                                        key={section.id}
                                        onClick={() => setHistoricalSitrepTabs(prev => ({ ...prev, [sitrep.id]: section.id }))}
                                        className={`relative px-3 py-2 transition-colors whitespace-nowrap ${
                                          isActive ? 'text-accent' : 'text-foreground hover:text-accent'
                                        }`}
                                      >
                                        <span className="caption">{section.label}</span>
                                        {isActive && (
                                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Content Area */}
                              {activeTab === 8 ? (
                                <div className="space-y-3">
                                  {[
                                    { key: 'maneuver', label: 'Maneuver & Force' },
                                    { key: 'intel', label: 'Intelligence & Info' },
                                    { key: 'logistics', label: 'Logistics / Civil Affairs' },
                                    { key: 'command', label: 'Command and Control' },
                                    { key: 'force', label: 'Force Protection' },
                                    { key: 'other', label: 'Other' }
                                  ].map((item) => (
                                    <div
                                      key={item.key}
                                      className="border border-border rounded-lg p-3"
                                      style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                                    >
                                      <span className="caption text-white block mb-2">{item.label}</span>
                                      <p className="caption text-white/80">Historical readiness data not available for this section.</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-input-background border border-border rounded p-3 min-h-[180px]">
                                  <p className="text-white whitespace-pre-wrap" style={{ fontSize: '12px' }}>
                                    {sitrep.sections[activeTab] || 'No content available for this section.'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-input-background border border-border rounded p-3 min-h-[240px] flex items-center justify-center">
                      <p className="caption text-white/70">
                        No historical SITREPs available.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : sitrepViewMode === 'drafts' ? (
              <>
                {/* My Drafts View */}
                <div className="space-y-3">
                  {/* Header with Add Draft button */}
                  <div className="flex items-center justify-between">
                    <Label className="text-white text-sm font-semibold">
                      My Draft SITREPs
                    </Label>
                    {!isAddingDraft && (
                      <button
                        onClick={startNewDraftFromLatest}
                        className="bg-[#01669f] h-[22.75px] rounded-[4px] px-3 hover:bg-[#01669f]/90 transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="text-white text-xs">+</span>
                        <span className="caption text-white">Add Draft</span>
                      </button>
                    )}
                  </div>

                  {/* Add Draft Form */}
                  {isAddingDraft && (
                    <div className="space-y-3 p-3 bg-background/50 border border-border rounded">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <Label className="text-white text-sm">
                          New Draft SITREP for {regions.find(r => r.id === selectedRegion)?.name || 'Unknown Region'}
                        </Label>
                      </div>

                      {/* Draft SITREP Section Selector */}
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Section</Label>
                        <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                          {sitrepSections.map((section) => {
                            const isActive = activeDraftTab === section.id;
                            return (
                              <button
                                key={section.id}
                                onClick={() => setActiveDraftTab(section.id)}
                                className={`relative px-3 py-2 transition-colors whitespace-nowrap ${
                                  isActive ? 'text-accent' : 'text-foreground hover:text-accent'
                                }`}
                              >
                                <span className="caption">{section.label}</span>
                                {isActive && (
                                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Generate Button and Data Sources */}
                      <div className="flex gap-2">
                        {activeDraftTab !== 8 && (
                          <button
                          onClick={() => {
                            const draftByTab: Record<number, string> = {
                              1: 'Contact Information:\nIncident Commander: LCDR Sarah Mitchell [1]\nPrimary Contact: +1-212-555-0147\nEmail: sarah.mitchell@uscg.mil\nLocation: Sector Operations Center\n\nReferences:\n[1] USCG Sector NYC Duty Roster (02/04/2026 1300L)\n[2] ICS-202 Incident Objectives (Op Period 04)',
                              2: 'Executive Summary:\nOperational tempo remains steady with no major incidents in the past 12 hours. Maritime security zones are active and compliance is high. Weather conditions are favorable for continued operations. [1]\n\nReferences:\n[1] Port Ops Summary (02/04/2026 1200L)\n[2] NWS Marine Forecast (02/04/2026 1130L)\n[3] USCG Command Center Log (02/04/2026 0900-1200L)',
                              3: 'Current Situation:\n- Vessel traffic: Moderate (62 commercial vessels monitored) [2]\n- Security zones: 6 of 6 active\n- Personnel: 74 on duty, 18 on standby\n- Weather: Clear skies, seas 2-3 ft, winds SW 10 kts [4]\n\nReferences:\n[1] AIS Traffic Snapshot (02/04/2026 1215L)\n[2] Security Zone Status Report (02/04/2026 1200L)\n[3] Staffing Roll Call (02/04/2026 1230L)\n[4] NWS Marine Obs (02/04/2026 1210L)',
                              4: 'Actions Taken:\n- Conducted perimeter patrols at designated chokepoints [1]\n- Coordinated with port authority on enhanced screening [2]\n- Updated interagency communications plan [3]\n- Verified readiness of response assets\n\nReferences:\n[1] Patrol Logbook Entries (02/04/2026 0800-1200L)\n[2] Port Authority Coordination Call Notes (02/04/2026 1030L)\n[3] Interagency Comms Plan v3.2 (02/04/2026 0900L)',
                              5: 'Forecast / Next 12 Hours:\nExpect increased traffic during evening arrival window. Continue elevated patrol posture. No significant weather impacts anticipated. Maintain readiness for rapid response if conditions change. [1]\n\nReferences:\n[1] Vessel Arrival Forecast (02/04/2026 1300L)\n[2] NWS Marine Forecast (02/04/2026 1200L)\n[3] Ops Planning Outlook (02/04/2026 1230L)'
                            };
                            setDraftTabContents(prev => ({
                              ...prev,
                              [activeDraftTab]: draftByTab[activeDraftTab] || ''
                            }));
                          }}
                          className="bg-white hover:bg-gray-100 text-black border border-white h-[28px] rounded-[4px] px-4 transition-colors flex items-center justify-center gap-2"
                        >
                          <svg 
                            className="w-4 h-4" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              strokeWidth={2} 
                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
                            />
                          </svg>
                          <span className="text-xs font-medium">
                            Generate Draft: {(() => {
                              const labels: Record<number, string> = {
                                1: 'Reporting Unit',
                                2: 'Executive Summary',
                                8: 'Readiness Assessment / Incident Reporting by Category',
                                9: 'Risk to Mission',
                                10: 'Outstanding RFI or RFR',
                                11: 'Previous (14 day or less) Critical Incident Communications or Intelligence Reporting',
                                12: 'General Comments',
                                13: 'Imagery'
                              };
                              return labels[activeDraftTab] || `Tab ${activeDraftTab}`;
                            })()}
                          </span>
                        </button>
                        )}
                        
                        {/* Data Sources Multi-Select */}
                        {activeDraftTab !== 8 && (
                          <Popover open={dataSourcesOpen} onOpenChange={setDataSourcesOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-[28px] justify-start text-left font-normal bg-input-background border-border text-white"
                              >
                                {draftDataSources.length > 0 
                                  ? `${draftDataSources.length} source${draftDataSources.length > 1 ? 's' : ''} selected` 
                                  : 'Select data sources'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-[200px] p-0 bg-[#222529] border-[#6e757c]" style={{ zIndex: 9999 }}>
                              <Command className="bg-[#222529]">
                                <CommandList>
                                  <CommandEmpty className="text-white">No sources found.</CommandEmpty>
                                  <CommandGroup>
                                    {['Web', 'USCG Organization Data', 'Incident Data'].map((source) => (
                                      <CommandItem
                                        key={source}
                                        onSelect={() => {
                                          setDraftDataSources(prev =>
                                            prev.includes(source)
                                              ? prev.filter(s => s !== source)
                                              : [...prev, source]
                                          );
                                        }}
                                        className="text-white"
                                      >
                                        <Checkbox
                                          checked={draftDataSources.includes(source)}
                                          className="mr-2"
                                        />
                                        {source}
                                      </CommandItem>
                                    ))}
                                    
                                    {/* Files Item */}
                                    <div ref={filesItemRef}>
                                      <CommandItem
                                        onSelect={(e) => {
                                          e.preventDefault();
                                        }}
                                        onMouseEnter={() => {
                                          if (filesItemRef.current) {
                                            const rect = filesItemRef.current.getBoundingClientRect();
                                            setSubmenuPosition({
                                              top: rect.top,
                                              left: rect.right + 4
                                            });
                                          }
                                          setFilesSubmenuOpen(true);
                                        }}
                                        className="text-white cursor-pointer"
                                      >
                                        <Checkbox
                                          checked={selectedFiles.length > 0}
                                          className="mr-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const checked = selectedFiles.length === 0;
                                            if (checked) {
                                              setSelectedFiles(['File Alpha', 'File Bravo', 'File Charlie', 'File Delta', 'File Echo']);
                                              if (!draftDataSources.includes('Files')) {
                                                setDraftDataSources(prev => [...prev, 'Files']);
                                              }
                                            } else {
                                              setSelectedFiles([]);
                                              setDraftDataSources(prev => prev.filter(s => s !== 'Files'));
                                            }
                                          }}
                                        />
                                        <span className="flex-1">Files</span>
                                        <ChevronRight className="w-4 h-4 ml-auto" />
                                      </CommandItem>
                                    </div>
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                        
                        {/* Files Submenu - Rendered Outside */}
                        {filesSubmenuOpen && submenuPosition && (
                          <div 
                            data-submenu="files"
                            className="fixed w-[200px] bg-[#222529] border border-[#6e757c] rounded-md shadow-lg"
                            style={{ 
                              zIndex: 10001,
                              left: `${submenuPosition.left}px`,
                              top: `${submenuPosition.top}px`
                            }}
                          >
                            <Command className="bg-[#222529]">
                              <CommandList>
                                <CommandGroup>
                                  {['File Alpha', 'File Bravo', 'File Charlie', 'File Delta', 'File Echo'].map((file) => (
                                    <CommandItem
                                      key={file}
                                      onSelect={() => {
                                        setSelectedFiles(prev => {
                                          const newFiles = prev.includes(file)
                                            ? prev.filter(f => f !== file)
                                            : [...prev, file];
                                          
                                          // Update data sources based on file selection
                                          if (newFiles.length > 0 && !draftDataSources.includes('Files')) {
                                            setDraftDataSources(prevSources => [...prevSources, 'Files']);
                                          } else if (newFiles.length === 0) {
                                            setDraftDataSources(prevSources => prevSources.filter(s => s !== 'Files'));
                                          }
                                          
                                          return newFiles;
                                        });
                                      }}
                                      className="text-white"
                                    >
                                      <Checkbox
                                        checked={selectedFiles.includes(file)}
                                        className="mr-2"
                                      />
                                      <span className="flex-1">{file}</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFilePreviewModal(file);
                                        }}
                                        className="ml-2 p-1 hover:bg-muted/50 rounded transition-colors"
                                        title="Open in modal"
                                      >
                                        <ExternalLink className="w-3 h-3 text-white" />
                                      </button>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </div>
                        )}
                      </div>
                      {activeDraftTab === 8 ? (
                        <div className="space-y-3">
                          {[
                            { key: 'maneuver', label: 'Maneuver & Force' },
                            { key: 'intel', label: 'Intelligence & Info' },
                            { key: 'logistics', label: 'Logistics / Civil Affairs' },
                            { key: 'command', label: 'Command and Control' },
                            { key: 'force', label: 'Force Protection' },
                            { key: 'other', label: 'Other' }
                          ].map((item) => {
                            const isOpen = !!readinessExpanded[item.key];
                            return (
                              <div
                                key={item.key}
                                className="border border-border rounded-lg overflow-hidden"
                                style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                              >
                                <div
                                  className={`p-3 ${isOpen ? 'border-b border-border' : ''} cursor-pointer`}
                                  onClick={() =>
                                    setReadinessExpanded(prev => ({
                                      ...prev,
                                      [item.key]: !isOpen
                                    }))
                                  }
                                >
                                  <div className="flex items-start gap-2">
                                    {isOpen ? (
                                      <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                      <span className="caption text-white">{item.label}</span>
                                    </div>
                                  </div>
                                </div>
                                {isOpen && (
                                  <div className="p-4 space-y-3 bg-card/50">
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <button
                                          onClick={() => {
                                          const key = item.key;
                                            const generated =
                                            item.key === 'maneuver'
                                                ? 'Maneuver & Force:\n- Patrol posture maintained at chokepoints\n- Quick reaction force on 15-minute standby\n- Coordination with partner units ongoing'
                                              : item.key === 'intel'
                                              ? 'Intelligence & Info:\n- No new credible threats reported\n- Open-source monitoring stable\n- Liaison updates pending next intel brief'
                                              : `${item.label}:\n- Placeholder generated draft content`;
                                            setModalDraftContents(prev => ({
                                              ...prev,
                                              [key]: generated
                                            }));
                                          }}
                                          className="bg-white hover:bg-gray-100 text-black border border-white h-[28px] rounded-[4px] px-4 transition-colors flex items-center justify-center gap-2"
                                        >
                                          <svg 
                                            className="w-4 h-4" 
                                            fill="none" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor"
                                          >
                                            <path 
                                              strokeLinecap="round" 
                                              strokeLinejoin="round" 
                                              strokeWidth={2} 
                                              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" 
                                            />
                                          </svg>
                                          <span className="text-xs font-medium">
                                            Generate Draft: {item.label}
                                          </span>
                                        </button>
                                        <Popover
                                          open={readinessDataSourcesOpenKey === item.key}
                                          onOpenChange={(open) =>
                                            setReadinessDataSourcesOpenKey(open ? item.key : null)
                                          }
                                        >
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="h-[28px] justify-start text-left font-normal bg-input-background border-border text-white"
                                            >
                                              {draftDataSources.length > 0 
                                                ? `${draftDataSources.length} source${draftDataSources.length > 1 ? 's' : ''} selected` 
                                                : 'Select data sources'}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent align="start" className="w-[200px] p-0 bg-[#222529] border-[#6e757c]" style={{ zIndex: 9999 }}>
                                            <Command className="bg-[#222529]">
                                              <CommandList>
                                                <CommandEmpty className="text-white">No sources found.</CommandEmpty>
                                                <CommandGroup>
                                                  {['Web', 'USCG Organization Data', 'Incident Data'].map((source) => (
                                                    <CommandItem
                                                      key={source}
                                                      onSelect={() => {
                                                        setDraftDataSources(prev =>
                                                          prev.includes(source)
                                                            ? prev.filter(s => s !== source)
                                                            : [...prev, source]
                                                        );
                                                      }}
                                                      className="text-white"
                                                    >
                                                      <Checkbox
                                                        checked={draftDataSources.includes(source)}
                                                        className="mr-2"
                                                      />
                                                      {source}
                                                    </CommandItem>
                                                  ))}
                                                  <div
                                                    className="text-white"
                                                    style={{
                                                      height: '1px',
                                                      backgroundColor: '#6e757c',
                                                      margin: '4px 8px'
                                                    }}
                                                  />
                                                  <div
                                                    ref={readinessFilesItemRef}
                                                    className="relative"
                                                    onMouseEnter={() => {
                                                      if (readinessFilesItemRef.current) {
                                                        const rect = readinessFilesItemRef.current.getBoundingClientRect();
                                                        setReadinessSubmenuPosition({ top: rect.top, left: rect.right + 4 });
                                                      }
                                                      setReadinessFilesSubmenuOpen(true);
                                                    }}
                                                    onMouseLeave={() => {
                                                      setReadinessFilesSubmenuOpen(true);
                                                    }}
                                                  >
                                                    <div className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-[#14171a] rounded-sm">
                                                      <div className="flex items-center">
                                                        <Checkbox
                                                          checked={selectedFiles.length > 0}
                                                          className="mr-2"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            const checked = selectedFiles.length === 0;
                                                            if (checked) {
                                                              setSelectedFiles(['File Alpha', 'File Bravo', 'File Charlie', 'File Delta', 'File Echo']);
                                                              if (!draftDataSources.includes('Files')) {
                                                                setDraftDataSources(prev => [...prev, 'Files']);
                                                              }
                                                            } else {
                                                              setSelectedFiles([]);
                                                              setDraftDataSources(prev => prev.filter(s => s !== 'Files'));
                                                            }
                                                          }}
                                                        />
                                                        <span>Files</span>
                                                      </div>
                                                      <ChevronRight className="w-4 h-4 text-white/70" />
                                                    </div>
                                                  </div>
                                                </CommandGroup>
                                              </CommandList>
                                            </Command>
                                          </PopoverContent>
                                        </Popover>
                                      </div>
                                      <Textarea
                                        value={modalDraftContents[item.key] || ''}
                                        onChange={(e) => {
                                          const key = item.key;
                                          setModalDraftContents(prev => ({
                                            ...prev,
                                            [key]: e.target.value
                                          }));
                                        }}
                                        placeholder={`Enter content for ${item.label}...`}
                                        className="bg-input-background border-border text-white resize-none"
                                        style={{ minHeight: '140px' }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {readinessFilesSubmenuOpen && readinessSubmenuPosition && (
                            <div
                              data-submenu="files-readiness"
                              className="fixed w-[200px] bg-[#222529] border border-[#6e757c] rounded-md shadow-lg"
                              style={{
                                zIndex: 10001,
                                left: `${readinessSubmenuPosition.left}px`,
                                top: `${readinessSubmenuPosition.top}px`
                              }}
                            >
                              <Command className="bg-[#222529]">
                                <CommandList>
                                  <CommandGroup>
                                    {['File Alpha', 'File Bravo', 'File Charlie', 'File Delta', 'File Echo'].map((file) => (
                                      <CommandItem
                                        key={file}
                                        onSelect={() => {
                                          setSelectedFiles(prev => {
                                            const newFiles = prev.includes(file)
                                              ? prev.filter(f => f !== file)
                                              : [...prev, file];

                                            if (newFiles.length > 0 && !draftDataSources.includes('Files')) {
                                              setDraftDataSources(prevSources => [...prevSources, 'Files']);
                                            } else if (newFiles.length === 0) {
                                              setDraftDataSources(prevSources => prevSources.filter(s => s !== 'Files'));
                                            }

                                            return newFiles;
                                          });
                                        }}
                                        className="text-white"
                                      >
                                        <Checkbox
                                          checked={selectedFiles.includes(file)}
                                          className="mr-2"
                                        />
                                        <span className="flex-1">{file}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setFilePreviewModal(file);
                                          }}
                                          className="ml-2 p-1 hover:bg-muted/50 rounded transition-colors"
                                          title="Open in modal"
                                        >
                                          <ExternalLink className="w-3 h-3 text-white" />
                                        </button>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="relative">
                            <TiptapEditor
                              content={draftTabContents[activeDraftTab] || ''}
                              onChange={(html) => {
                                setDraftTabContents({
                                  ...draftTabContents,
                                  [activeDraftTab]: html
                                });
                              }}
                              onObjectClick={(objectName) => setSelectedDraftObjectName(objectName)}
                              mentionOptions={[
                                'Cutter Vessel 001',
                                'Strike Team Alpha',
                                'Division Bravo'
                              ]}
                              placeholder={(() => {
                                const labels: Record<number, string> = {
                                  1: 'Enter reporting unit information...',
                                  2: 'Enter executive summary...',
                                  3: 'Enter current situation...',
                                  4: 'Enter actions taken...',
                                  5: 'Enter forecast for next 12 hours...',
                                  8: 'Select a category to enter readiness assessment...',
                                  9: 'Enter risk to mission...',
                                  10: 'Enter outstanding RFI or RFR...',
                                  11: 'Enter previous critical incident reporting...',
                                  12: 'Enter general comments...',
                                  13: 'Add imagery information...'
                                };
                                return labels[activeDraftTab] || `Enter content for section ${activeDraftTab}...`;
                              })()}
                              minHeight="240px"
                            />
                          </div>
                          <button
                            onClick={() => {
                              console.log('Add attachment clicked');
                            }}
                            className="mt-2 text-white border border-[#6e757c] rounded-[4px] px-3 py-1.5 hover:bg-[#1a1d21] transition-colors inline-flex items-center gap-1"
                          >
                            <span className="text-lg leading-none">+</span>
                            <span className="text-sm">Add Attachment</span>
                          </button>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button
                          onClick={() => {
                            setIsDraftModalOpen(true);
                          }}
                          className="bg-primary hover:bg-primary/90 px-6 py-0.5 h-auto text-sm"
                        >
                          Submit to Section Chief
                        </Button>
                        <Button
                          onClick={() => {
                            // Save draft logic would go here
                            setIsAddingDraft(false);
                            setDraftTabContents({ 1: '', 2: '', 3: '', 4: '', 5: '' });
                            setActiveDraftTab(1);
                            setSelectedTemplate('');
                          }}
                          className="bg-primary hover:bg-primary/90 px-6 py-0.5 h-auto text-sm"
                        >
                          Save Draft
                        </Button>
                        <Button
                          onClick={() => {
                            setIsAddingDraft(false);
                            setDraftTabContents({ 1: '', 2: '', 3: '', 4: '', 5: '' });
                            setActiveDraftTab(1);
                            setSelectedTemplate('');
                          }}
                          variant="outline"
                          className="border-border px-6 py-0.5 h-auto text-sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Draft SITREPs List */}
                  {draftSitreps.length > 0 ? (
                    <div className="space-y-3">
                      {draftSitreps.map((draft) => (
                        <div key={draft.id} className="border border-border rounded-lg overflow-hidden bg-background/30">
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="caption text-white font-semibold">Draft SITREP</span>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                                    <span className="caption text-amber-500 text-xs">{draft.status}</span>
                                  </div>
                                </div>
                                <span className="caption text-white/70 text-xs block">
                                  Submitted: {draft.submittedDate}
                                </span>
                              </div>
                              <button
                                className="p-1 hover:bg-muted/30 rounded transition-colors"
                                title="Edit Draft"
                              >
                                <Edit2 className="w-4 h-4 text-white" />
                              </button>
                            </div>
                            <div className="bg-input-background border border-border rounded p-3">
                              <p className="caption text-white whitespace-pre-wrap">
                                {draft.content}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-input-background border border-border rounded p-3 min-h-[240px] flex items-center justify-center">
                      <p className="caption text-white/70">
                        No draft SITREPs. Click "+ Add Draft" to create one.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Review Queue View */}
                <div className="space-y-3">
                  <Label className="text-white text-sm font-semibold">
                    Review Queue
                  </Label>

                  <div className="space-y-4">
                    <div className="border border-border rounded-lg overflow-hidden bg-background/30">
                      <div className="p-3 space-y-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-white text-sm font-semibold">
                              SITREP for Incident Alpha: Version 3
                            </Label>
                            {!reviewEditMode && (
                              <button
                                onClick={() => setReviewEditMode(true)}
                                className="p-1 hover:bg-muted/30 rounded transition-colors"
                                title="Edit SITREP"
                              >
                                <Edit2 className="w-3 h-3 text-white" />
                              </button>
                            )}
                          </div>
                          <span className="caption text-white/70 text-xs block">
                            Authored by LT Jackson Chen at 12/16/2025 13:15
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                            {sitrepSections.map((section) => {
                              const isActive = reviewQueueTab === section.id;
                              return (
                                <button
                                  key={section.id}
                                  onClick={() => setReviewQueueTab(section.id)}
                                  className={`relative px-3 py-2 transition-colors whitespace-nowrap ${
                                    isActive ? 'text-accent' : 'text-foreground hover:text-accent'
                                  }`}
                                >
                                  <span className="caption">{section.label}</span>
                                  {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {reviewQueueTab === 8 ? (
                          <div className="space-y-3">
                            {[
                              { key: 'maneuver', label: 'Maneuver & Force' },
                              { key: 'intel', label: 'Intelligence & Info' },
                              { key: 'logistics', label: 'Logistics / Civil Affairs' },
                              { key: 'command', label: 'Command and Control' },
                              { key: 'force', label: 'Force Protection' },
                              { key: 'other', label: 'Other' }
                            ].map((item) => (
                              <div
                                key={item.key}
                                className="border border-border rounded-lg p-3"
                                style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                              >
                                <span className="caption text-white block mb-2">{item.label}</span>
                                <p className="caption text-white/80">Historical readiness data not available for this section.</p>
                              </div>
                            ))}
                          </div>
                        ) : reviewEditMode ? (
                          <Textarea
                            value={reviewEditContents[reviewQueueTab] || ''}
                            onChange={(e) => setReviewEditContents(prev => ({ ...prev, [reviewQueueTab]: e.target.value }))}
                            className="bg-input-background border-border min-h-[180px] resize-none text-white"
                            style={{ fontSize: '12px' }}
                          />
                        ) : (
                          <div className="bg-input-background border border-border rounded p-3 min-h-[180px]">
                            <p className="text-white whitespace-pre-wrap" style={{ fontSize: '12px' }}>
                              {reviewEditContents[reviewQueueTab] || 'No content available for this section.'}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          {reviewEditMode ? (
                            <>
                              <button
                                onClick={() => setReviewEditMode(false)}
                                className="bg-[#01669f] hover:bg-[#01669f]/90 text-white caption px-4 py-1.5 rounded-[4px] transition-colors"
                              >
                                Update Draft
                              </button>
                              <button
                                onClick={() => setReviewEditMode(false)}
                                className="bg-transparent border border-[#6e757c] text-white caption px-4 py-1.5 rounded-[4px] hover:bg-[#222529] transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="bg-[#01669f] hover:bg-[#01669f]/90 text-white caption px-4 py-1.5 rounded-[4px] transition-colors">
                                Approve
                              </button>
                              <button className="bg-black hover:bg-black/80 text-white caption px-4 py-1.5 rounded-[4px] transition-colors border border-[#6e757c]">
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Data Sources List */}
      <div className="space-y-4">
        {filtered.map((source) => {
          const isExpanded = expandedSources.has(source.id);
          const isExpandable = source.id !== 'src0a' && source.id !== 'src0b' && source.id !== 'src0d';
          return (
            <div
              key={source.id}
              className="border border-border rounded-lg overflow-hidden"
              style={{ background: 'linear-gradient(90deg, rgba(2, 163, 254, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
            >
              <div className={`p-3 ${isExpanded ? 'border-b border-border' : ''}`}>
                <div className="flex items-start justify-between">
                  <div
                    className={`flex items-start gap-2 flex-1 ${isExpandable ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (!isExpandable) return;
                      toggleSource(source.id);
                      if (onAddAIContext) {
                        onAddAIContext(source.name);
                      }
                    }}
                  >
                    {isExpandable ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                      )
                    ) : (
                      <div className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <span className="caption text-white">{source.name}</span>
                      {!isExpanded && (
                        <div className="flex items-center gap-3 mt-1">
                          <span className="caption text-white/70">Last updated: {source.lastUpdated}</span>
                        </div>
                      )}
                      {source.id === 'src0a' && (
                        <div className="mt-3">
                          <Popover open={portStatusPopoverOpen} onOpenChange={setPortStatusPopoverOpen}>
                            <PopoverTrigger asChild>
                              <button
                                className="flex-1 w-full bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent flex items-start justify-between py-1"
                                style={{ 
                                  fontFamily: "'Open Sans', sans-serif",
                                  fontSize: '12px',
                                  fontWeight: 400,
                                  lineHeight: '18px'
                                }}
                              >
                                <span className="block whitespace-normal break-words text-left leading-snug pr-2">
                                  {portStatusCondition}
                                </span>
                                <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#222529] border-[#6e757c]"
                              align="start"
                            >
                              <Command className="bg-[#222529]">
                                <CommandInput
                                  placeholder="Search port condition..."
                                  className="h-9 caption text-white"
                                  style={{ 
                                    fontFamily: "'Open Sans', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    lineHeight: '18px'
                                  }}
                                />
                                <CommandList className="max-h-56">
                                  <CommandEmpty className="text-white">No results found.</CommandEmpty>
                                  <CommandGroup>
                                    {portStatusOptions.map((option) => (
                                      <CommandItem
                                        key={option}
                                        value={option}
                                        onSelect={() => {
                                          setPortStatusCondition(option);
                                          setPortStatusPopoverOpen(false);
                                        }}
                                        className="caption text-white w-full max-w-full !whitespace-normal !break-words !h-auto items-start flex-wrap"
                                      >
                                        <span className="block w-full max-w-full !whitespace-normal !break-words text-left leading-snug">
                                          {option}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                      {source.id === 'src0b' && (
                        <div className="mt-3">
                          <div className="caption text-white flex flex-wrap items-center gap-1">
                            <span>{currentRegionName} has achieved HURCON</span>
                            <Popover open={hurconPopoverOpen} onOpenChange={setHurconPopoverOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  className="bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent flex items-center gap-1 h-[24px]"
                                  style={{ 
                                    fontFamily: "'Open Sans', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    lineHeight: '18px'
                                  }}
                                >
                                  <span className="block">{hurconStatus}</span>
                                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#222529] border-[#6e757c]"
                                align="start"
                              >
                                <Command className="bg-[#222529]">
                                  <CommandList className="max-h-56">
                                    <CommandGroup>
                                      {hurconOptions.map((option) => (
                                        <CommandItem
                                          key={option}
                                          value={option}
                                          onSelect={() => {
                                            setHurconStatus(option);
                                            setHurconPopoverOpen(false);
                                          }}
                                          className="caption text-white w-full max-w-full !whitespace-normal !break-words !h-auto items-start flex-wrap"
                                        >
                                          <span className="block w-full max-w-full !whitespace-normal !break-words text-left leading-snug">
                                            {option}
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                      {source.id === 'src0d' && (
                        <div className="mt-3">
                          <div className="caption text-white flex flex-wrap items-center gap-1">
                            <span>{currentRegionName} has achieved COOP</span>
                            <Popover open={coopPopoverOpen} onOpenChange={setCoopPopoverOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  className="bg-transparent border border-[#6e757c] rounded-[4px] px-2 caption text-white focus:outline-none focus:border-accent flex items-center gap-1 h-[24px]"
                                  style={{
                                    fontFamily: "'Open Sans', sans-serif",
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    lineHeight: '18px'
                                  }}
                                >
                                  <span className="block">{coopStatus}</span>
                                  <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent
                                className="w-[var(--radix-popover-trigger-width)] p-0 bg-[#222529] border-[#6e757c]"
                                align="start"
                              >
                                <Command className="bg-[#222529]">
                                  <CommandList className="max-h-56">
                                    <CommandGroup>
                                      {coopOptions.map((option) => (
                                        <CommandItem
                                          key={option}
                                          value={option}
                                          onSelect={() => {
                                            setCoopStatus(option);
                                            setCoopPopoverOpen(false);
                                          }}
                                          className="caption text-white w-full max-w-full !whitespace-normal !break-words !h-auto items-start flex-wrap"
                                        >
                                          <span className="block w-full max-w-full !whitespace-normal !break-words text-left leading-snug">
                                            {option}
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Export data source:', source.name);
                        // Placeholder for export functionality
                      }}
                      className="p-1 hover:bg-muted/30 rounded transition-colors"
                      title="Export data source"
                    >
                      <Download className="w-3 h-3 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Simulate refresh
                        const updatedSources = dataSources.map(s => 
                          s.id === source.id 
                            ? { ...s, lastUpdated: new Date().toLocaleString('en-US', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: false 
                              }).replace(',', '') }
                            : s
                        );
                        persist(updatedSources);
                      }}
                      className="p-1 hover:bg-muted/30 rounded transition-colors"
                      title="Refresh data source"
                    >
                      <RefreshCw className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 space-y-4 bg-card/50">
                  {source.id === 'src0f' ? (
                    <div className="space-y-3">
                      {/* Civil Disturbance Alert - Grist Mill Social Media (clone) */}
                      <div
                        className="border border-border rounded-lg overflow-hidden"
                        style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                      >
                        <div className={`p-3 ${cirAlertExpanded ? 'border-b border-border' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div
                              className="flex items-start gap-2 flex-1 cursor-pointer"
                              onClick={() => setCirAlertExpanded(prev => !prev)}
                            >
                              {cirAlertExpanded ? (
                                <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="caption text-white">Civil Disturbance Emerging Near MetLife Stadium</span>
                                  <span
                                    className="caption px-2 py-0.5 rounded text-xs"
                                    style={{
                                      backgroundColor: '#DC262620',
                                      color: '#DC2626',
                                      border: '1px solid #DC262660'
                                    }}
                                  >
                                    Critical
                                  </span>
                                </div>
                                {!cirAlertExpanded && (
                                  <div className="space-y-2 mt-1">
                                    <div className="flex items-center gap-3">
                                      <span className="caption text-white">Grist Mill via social media</span>
                                      <span className="caption text-white">13:25</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Zoom to alert location');
                                }}
                                className="p-1 hover:bg-muted/30 rounded transition-colors"
                                title="Zoom to alert location"
                              >
                                <Map className="w-3 h-3 text-white" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {cirAlertExpanded && (
                          <div className="p-4 space-y-4 bg-card/50">
                            <div>
                              <label className="text-white mb-1 block">Civil Disturbance Alert</label>
                              <p className="caption text-white">
                                Social media intelligence indicates emerging civil disturbance near MetLife Stadium main entrance on Route 120 / Paterson Plank Road. Crowd size estimated at 200-300 individuals based on multiple geotagged posts. Social media users describe opposition to the Iranian soccer team playing in a match today at 14:00 EST.
                              </p>
                            </div>

                            <div>
                              <label className="text-white mb-1 block">Data Source</label>
                              <p className="caption text-white">Grist Mill via social media</p>
                            </div>

                            <div>
                              <label className="text-white mb-1 block">Location</label>
                              <p className="caption text-white">Vicinity of Metlife Stadium</p>
                            </div>

                            <div>
                              <label className="text-white mb-1 block">Recommended Actions</label>
                              <Button
                                onClick={() => {
                                  console.log('Create Incident & Activate IMT');
                                }}
                                className="bg-primary hover:bg-primary/90 text-white px-3 h-auto text-xs"
                                style={{ paddingTop: '4px', paddingBottom: '4px' }}
                              >
                                Create Incident & Activate IMT
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Only show these sections for non-Active Incidents items */}
                      {source.id !== 'src0' && (
                        <>
                          {source.description && (
                            <div>
                              <label className="text-white mb-1 block">Description</label>
                              <p className="caption text-white">{source.description}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-white mb-1 block">Last Updated</label>
                            <p className="caption text-white">{source.lastUpdated}</p>
                          </div>
                          {source.dataSources && (
                            <div>
                              <label className="text-white mb-1 block">Data Sources</label>
                              <p className="caption text-white">{source.dataSources}</p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                  
                  {/* Child Incidents - Only for Active Incidents item */}
                  {source.id === 'src0' && (
                    <div className="mt-4">
                      <div className="space-y-3">
                        {/* Child Incident 1 */}
                        <div
                          className="border border-border/50 rounded-lg overflow-hidden"
                          style={{ backgroundColor: 'rgba(139, 123, 168, 0.15)' }}
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => toggleChildIncident('child-incident-1')}
                          >
                            <div className="flex items-start gap-2">
                              {expandedChildIncidents.has('child-incident-1') ? (
                                <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 flex items-center justify-between">
                                <span className="caption text-white">Platform Charlie Gas Leak — Block 892 Production Facility</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Show on map clicked');
                                  }}
                                  className="p-1 hover:bg-muted/30 rounded transition-colors ml-2"
                                  title="Show on map"
                                >
                                  <Map className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {expandedChildIncidents.has('child-incident-1') && (
                            <div className="p-3 space-y-3 bg-card/30">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Incident Workspace clicked');
                                }}
                                className="bg-[#01669f] h-[22.75px] rounded-[4px] px-4 hover:bg-[#01669f]/90 transition-colors flex items-center justify-center mb-3"
                              >
                                <p className="caption text-nowrap text-white">Incident Workspace</p>
                              </button>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="caption text-white/70 mb-1 block">Incident Category</label>
                                  <p className="caption text-white">Offshore Production Facility Emergency</p>
                                </div>
                                <div>
                                  <label className="caption text-white/70 mb-1 block">Operational Period</label>
                                  <p className="caption text-white">OP-4: 12/20/2025 06:00 - 12/20/2025 18:00</p>
                                </div>
                              </div>
                              
                              {/* SITREP Section */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <label className="caption text-white/70">Latest Approved SITREP - Published 12/20/2025 13:45</label>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSitrepModalOpen('child-incident-1');
                                      setSitrepModalTab(1);
                                    }}
                                    className="p-1 hover:bg-muted/30 rounded transition-colors"
                                    title="Open in modal"
                                  >
                                    <ExternalLink className="w-3 h-3 text-white/70" />
                                  </button>
                                </div>
                                <div>
                                  {/* SITREP Tabs */}
                                  <div className="flex items-center gap-1 border-b border-border px-3 pt-3">
                                    {[1, 2, 3, 4, 5].map((tabNum) => {
                                      const isActive = tabNum === childIncident1SitrepTab;
                                      return (
                                        <button
                                          key={tabNum}
                                          onClick={() => setChildIncident1SitrepTab(tabNum)}
                                          className={`relative px-3 py-1.5 transition-colors whitespace-nowrap text-xs ${
                                            isActive
                                              ? 'text-accent'
                                              : 'text-foreground hover:text-accent'
                                          }`}
                                        >
                                          <span className="caption">Tab {tabNum}</span>
                                          {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="p-3 space-y-3">
                                    {childIncident1SitrepTab === 1 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Contact Information</label>
                                        <p className="caption text-white text-xs">Incident Commander: Robert Martinez, ExxonMobil | Contact: +1-504-555-0147 | Location: Block 892 Platform Charlie</p>
                                      </div>
                                    )}
                                    {childIncident1SitrepTab === 2 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Executive Summary</label>
                                        <p className="caption text-white text-xs">At 08:45 local time, Platform Charlie experienced a catastrophic natural gas leak from Well #3 production manifold. Emergency shutdown procedures were activated immediately. All 47 personnel successfully evacuated to secondary platform. USCG Sector New Orleans dispatched to establish 2-nautical mile safety zone. Production operations suspended across Block 892 facilities. No injuries reported. Environmental assessment teams en route.</p>
                                      </div>
                                    )}
                                    {childIncident1SitrepTab === 3 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Current Situation</label>
                                        <p className="caption text-white text-xs">Gas leak rate estimated at 2,400 cubic feet per minute from compromised wellhead valve. Platform control systems indicate pressure anomalies in production manifold. Emergency response vessels maintaining perimeter at 2nm. Prevailing winds SSW at 12 knots dispersing gas cloud offshore. Air quality monitoring shows no hazardous readings at adjacent platforms. Well control specialists mobilizing from Houston with specialized equipment estimated arrival 16:00 hours.</p>
                                      </div>
                                    )}
                                    {childIncident1SitrepTab === 4 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Actions Taken</label>
                                        <p className="caption text-white text-xs">- Emergency shutdown system activated 08:46<br/>- All personnel evacuated to Platform Delta by 09:15<br/>- USCG notified and safety zone established 09:30<br/>- Adjacent platforms (Bravo, Delta, Echo) on elevated alert status<br/>- Environmental monitoring initiated<br/>- Well control team dispatched from Houston<br/>- Marine traffic advisories issued via VHF Channel 16</p>
                                      </div>
                                    )}
                                    {childIncident1SitrepTab === 5 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Forecast / Next 12 Hours</label>
                                        <p className="caption text-white text-xs">Well control specialists expected on location 16:00 to assess valve integrity and develop intervention plan. Weather forecast favorable with continued offshore winds through operational period. If valve can be isolated, production restart possible within 48 hours pending safety inspection. Alternative scenario: If wellhead intervention required, expect 7-10 day response timeline. Environmental impact assessment will determine any remediation requirements.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Child Incident 2 */}
                        <div
                          className="border border-border/50 rounded-lg overflow-hidden"
                          style={{ backgroundColor: 'rgba(139, 123, 168, 0.15)' }}
                        >
                          <div
                            className="p-3 cursor-pointer"
                            onClick={() => toggleChildIncident('child-incident-2')}
                          >
                            <div className="flex items-start gap-2">
                              {expandedChildIncidents.has('child-incident-2') ? (
                                <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 flex items-center justify-between">
                                <span className="caption text-white">Subsea Pipeline Inspection — Deepwater Export Line 7</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    console.log('Show on map clicked');
                                  }}
                                  className="p-1 hover:bg-muted/30 rounded transition-colors ml-2"
                                  title="Show on map"
                                >
                                  <Map className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {expandedChildIncidents.has('child-incident-2') && (
                            <div className="p-3 space-y-3 bg-card/30">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Incident Workspace clicked');
                                }}
                                className="bg-[#01669f] h-[22.75px] rounded-[4px] px-4 hover:bg-[#01669f]/90 transition-colors flex items-center justify-center mb-3"
                              >
                                <p className="caption text-nowrap text-white">Incident Workspace</p>
                              </button>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="caption text-white/70 mb-1 block">Incident Category</label>
                                  <p className="caption text-white">Subsea Infrastructure Inspection</p>
                                </div>
                                <div>
                                  <label className="caption text-white/70 mb-1 block">Operational Period</label>
                                  <p className="caption text-white">OP-4: 12/20/2025 06:00 - 12/20/2025 18:00</p>
                                </div>
                              </div>
                              
                              {/* SITREP Section */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <label className="caption text-white/70">SITREP #5 - Published 12/20/2025 12:15</label>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSitrepModalOpen('child-incident-2');
                                      setSitrepModalTab(1);
                                    }}
                                    className="p-1 hover:bg-muted/30 rounded transition-colors"
                                    title="Open in modal"
                                  >
                                    <ExternalLink className="w-3 h-3 text-white/70" />
                                  </button>
                                </div>
                                <div>
                                  {/* SITREP Tabs */}
                                  <div className="flex items-center gap-1 border-b border-border px-3 pt-3">
                                    {[1, 2, 3, 4, 5].map((tabNum) => {
                                      const isActive = tabNum === childIncident2SitrepTab;
                                      return (
                                        <button
                                          key={tabNum}
                                          onClick={() => setChildIncident2SitrepTab(tabNum)}
                                          className={`relative px-3 py-1.5 transition-colors whitespace-nowrap text-xs ${
                                            isActive
                                              ? 'text-accent'
                                              : 'text-foreground hover:text-accent'
                                          }`}
                                        >
                                          <span className="caption">Tab {tabNum}</span>
                                          {isActive && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  
                                  <div className="p-3 space-y-3">
                                    {childIncident2SitrepTab === 1 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Contact Information</label>
                                        <p className="caption text-white text-xs">Operations Manager: Jennifer Chen, ExxonMobil | Contact: +1-504-555-0198 | Location: Deepwater Export Line 7, Mile Marker 47</p>
                                      </div>
                                    )}
                                    {childIncident2SitrepTab === 2 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Executive Summary</label>
                                        <p className="caption text-white text-xs">Routine integrity survey of Deepwater Export Line 7 detected minor coating degradation at multiple locations between MM 45-52. ROV inspection commenced 06:00 to assess extent and severity. Line remains operational at reduced pressure (800 PSI, normal 1,200 PSI). No leaks detected. Cathodic protection readings within acceptable parameters. Survey completion expected by 18:00 today.</p>
                                      </div>
                                    )}
                                    {childIncident2SitrepTab === 3 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Current Situation</label>
                                        <p className="caption text-white text-xs">ROV unit conducting detailed video survey and ultrasonic wall thickness measurements. Five locations showing coating loss 15-25% of protective layer. Pipeline structural integrity maintained with wall thickness readings 92-96% of specification. No active corrosion detected. Flow rate reduced to 45,000 barrels/day (normal 65,000) as precautionary measure. Downstream facilities adjusted for reduced throughput.</p>
                                      </div>
                                    )}
                                    {childIncident2SitrepTab === 4 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Actions Taken</label>
                                        <p className="caption text-white text-xs">- ROV mobilized and survey initiated at 06:00<br/>- Pipeline pressure reduced to 800 PSI at 06:30<br/>- Production platforms notified of flow restrictions<br/>- Cathodic protection survey completed, systems normal<br/>- Engineering team reviewing preliminary ROV data<br/>- Repair contractor on standby pending assessment<br/>- USCG and BSEE notifications filed per regulations</p>
                                      </div>
                                    )}
                                    {childIncident2SitrepTab === 5 && (
                                      <div>
                                        <label className="caption text-white/70 text-xs block mb-1">Forecast / Next 12 Hours</label>
                                        <p className="caption text-white text-xs">ROV survey completion expected 18:00 with full engineering analysis by 22:00. Based on preliminary findings, anticipate coating repair requirement within 30-day window per regulations. If repairs can be scheduled during next maintenance period (Feb 2026), no production impact. Emergency repair not indicated - pipeline safe for continued operation at reduced pressure. Will resume normal operating pressure upon engineering approval of survey results.</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {source.id !== 'src0' && source.id !== 'src0f' && (
                    <div>
                      <label className="text-white mb-1 block">Placeholder Field for Data</label>
                      <p className="caption text-white">Placeholder content</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Data Source Side Panel */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[640px] bg-card overflow-y-auto px-6">
          <SheetHeader>
            <SheetTitle>{editingSourceId ? 'Edit Data Source' : 'Add Data Source'}</SheetTitle>
            <SheetDescription>
              {editingSourceId ? 'Update data source details.' : 'Add a new data source to track.'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6 pb-6">
            <div className="space-y-2">
              <Label className="text-foreground">Name <span className="text-destructive">*</span></Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="bg-input-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Provider <span className="text-destructive">*</span></Label>
              <Input value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })} className="bg-input-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Update Frequency</Label>
              <Input value={formData.updateFrequency} onChange={(e) => setFormData({ ...formData, updateFrequency: e.target.value })} className="bg-input-background border-border" placeholder="e.g., Every 5 minutes" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Coverage</Label>
              <Input value={formData.coverage} onChange={(e) => setFormData({ ...formData, coverage: e.target.value })} className="bg-input-background border-border" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Reliability</Label>
              <Input value={formData.reliability} onChange={(e) => setFormData({ ...formData, reliability: e.target.value })} className="bg-input-background border-border" placeholder="e.g., 99.9% uptime" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="bg-input-background border-border min-h-[120px] resize-none" />
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={saveSource} className="flex-1 bg-primary hover:bg-primary/90">{editingSourceId ? 'Update Source' : 'Add Source'}</Button>
              <Button onClick={() => setIsSheetOpen(false)} variant="outline" className="flex-1 border-border">Cancel</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {selectedDraftObjectName !== null && (
        <div className="fixed left-0 top-0 z-50 h-screen w-[33.33vw] flex items-center justify-center p-4 overflow-y-auto" style={{ isolation: 'isolate' }}>
          <div className="absolute inset-0" style={{ zIndex: 0, backgroundColor: 'rgba(0, 0, 0, 0.42)', backdropFilter: 'blur(2px)' }} />
          {(() => {
            const detailsByResource: Record<string, {
              name: string;
              description: string;
              identifier: string;
              quantity: string;
              status: 'Onsite' | 'In Transit' | 'Deployed';
              dateOrdered: string;
              eta: string;
              incidentAssignment: string;
              location: string;
              assignees: string;
            }> = {
              'Cutter Vessel 001': {
                name: 'USCG Cutter Vessel 001',
                description: 'Multi-mission cutter assigned to harbor patrol, interdiction, and rapid response support for Sector New York operations.',
                identifier: 'Cutter Patrol Unit',
                quantity: '1 vessel + 14 crew',
                status: 'Deployed',
                dateOrdered: '02/12/2026 07:20',
                eta: 'On station',
                incidentAssignment: 'Maritime Interdiction Patrol - Sector New York',
                location: 'Upper New York Bay, Grid NY-17',
                assignees: 'LT Morgan Hayes, BM1 Carla Ruiz, MK2 Aaron Kim'
              },
              'Strike Team Alpha': {
                name: 'Strike Team Alpha',
                description: 'Rapid deployment strike team configured for waterfront response, perimeter reinforcement, and coordinated law-enforcement support.',
                identifier: 'Rapid Response Team',
                quantity: '9 personnel',
                status: 'In Transit',
                dateOrdered: '02/12/2026 08:05',
                eta: 'Next 35 min',
                incidentAssignment: 'Rapid Response / Pier Security Reinforcement',
                location: 'Port Newark Security Zone',
                assignees: 'Sgt. Emily Park, PO1 Daniel Ortiz, PO2 Kevin Shaw'
              },
              'Division Bravo': {
                name: 'Division Bravo',
                description: 'Command and coordination division responsible for incident liaison, routing updates, and synchronization with district operations.',
                identifier: 'Command Division',
                quantity: '6 officers',
                status: 'Onsite',
                dateOrdered: '02/12/2026 06:50',
                eta: 'Now',
                incidentAssignment: 'Incident Command Liaison and Traffic Control',
                location: 'Sector Operations Center - South Annex',
                assignees: 'LCDR Sarah Mitchell, LT Jackson Chen, CWO Lena Patel'
              }
            };

            const details = detailsByResource[selectedDraftObjectName] || {
              name: selectedDraftObjectName,
              description: 'Resource details pending confirmation from operations.',
              identifier: 'Resource',
              quantity: 'TBD',
              status: 'In Transit' as const,
              dateOrdered: 'TBD',
              eta: 'TBD',
              incidentAssignment: 'Pending assignment',
              location: 'Location TBD',
              assignees: 'No assignees'
            };

            const statusColor =
              details.status === 'Onsite'
                ? '#12B76A'
                : details.status === 'Deployed'
                  ? '#72D4D4'
                  : '#FEC84B';

            return (
              <div
                className="relative z-10 border border-border rounded-lg overflow-hidden"
                style={{
                  width: 'calc(33.33vw - 3rem)',
                  maxWidth: 'calc(33.33vw - 3rem)',
                  background: 'linear-gradient(90deg, rgba(2, 163, 254, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)'
                }}
              >
                <button
                  onClick={() => setSelectedDraftObjectName(null)}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-muted/30 transition-colors text-white/80 hover:text-white"
                  aria-label="Close resource list item"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="p-3 border-b border-border pr-9">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="caption text-white block !whitespace-normal !break-words">{details.name}</span>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="caption text-white !whitespace-normal !break-words min-w-0">
                          {details.identifier} • Qty: {details.quantity}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: statusColor }}
                          />
                          <span className="caption" style={{ color: statusColor }}>
                            {details.status}
                          </span>
                          <button
                            className="p-0.5 hover:bg-muted/30 rounded transition-colors"
                            title="Show on map"
                          >
                            <Map className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 space-y-4 bg-card/50">
                  <div>
                    <label className="text-white mb-1 block">Description</label>
                    <p className="caption text-white !whitespace-normal !break-words">{details.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">Date/Time Ordered</label>
                      <p className="caption text-white !whitespace-normal !break-words">{details.dateOrdered}</p>
                    </div>
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">ETA</label>
                      <p className="caption text-white !whitespace-normal !break-words">{details.eta}</p>
                    </div>
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">Incident Assignment</label>
                      <p className="caption text-white !whitespace-normal !break-words">{details.incidentAssignment}</p>
                    </div>
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">Location</label>
                      <p className="caption text-white !whitespace-normal !break-words">{details.location}</p>
                    </div>
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">Assignees</label>
                      <p className="caption text-white !whitespace-normal !break-words">{details.assignees}</p>
                    </div>
                    <div className="min-w-0">
                      <label className="text-white mb-1 block">Symbology</label>
                      <div className="mt-1">
                        <span
                          style={{
                            display: 'inline-block',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            position: 'relative',
                            zIndex: 10,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* SITREP Popout Modal */}
      <Dialog open={sitrepPopoutOpen} onOpenChange={setSitrepPopoutOpen}>
        <DialogContent
          className="bg-[#222529] border-[#6e757c] text-white max-w-none max-h-none"
          style={{ width: '56.25vw', minWidth: '56.25vw' }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              SITREP for {filterMode === 'region' ? selectedRegionName : selectedIncidentName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="space-y-1">
                <span className="caption text-white/70 text-xs block">
                  Authored by LCDR Sarah Mitchell at 14:30 UTC 19 DEC 2025
                </span>
                <span className="caption text-white/70 text-xs block">
                  Approved by CDR Thomas Bradley at 15:00 UTC 19 DEC 2025
                </span>
              </div>
              {/* SITREP Section Selector */}
              <div className="space-y-2">
                <Label className="text-white text-sm">Section</Label>
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
                  {sitrepSections.map((section) => {
                    const isActive = sitrepPopoutSection === section.id;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setSitrepPopoutSection(section.id)}
                        className={`relative px-3 py-2 transition-colors whitespace-nowrap ${
                          isActive ? 'text-accent' : 'text-foreground hover:text-accent'
                        }`}
                      >
                        <span className="caption">{section.label}</span>
                        {isActive && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {sitrepPopoutSection === 8 ? (
              <div className="space-y-3">
                {[
                  { key: 'maneuver', label: 'Maneuver & Force' },
                  { key: 'intel', label: 'Intelligence & Info' },
                  { key: 'logistics', label: 'Logistics / Civil Affairs' },
                  { key: 'command', label: 'Command and Control' },
                  { key: 'force', label: 'Force Protection' },
                  { key: 'other', label: 'Other' }
                ].map((item) => {
                  const isOpen = !!readinessExpandedPopout[item.key];
                  const approvedContent: Record<string, string> = {
                    maneuver: 'Patrol posture maintained at primary chokepoints. QRF remains on 15‑minute standby. Partner unit coordination ongoing with no deviations reported.',
                    intel: 'No new credible threats reported in the last 12 hours. Open‑source monitoring stable. Liaison updates pending next intel brief.',
                    logistics: 'Supply status green. Fuel and maintenance logs updated. Civil affairs coordination continuing with local agencies and port authority.',
                    command: 'Command post fully staffed. Communications checks complete across all channels. Incident action plan updates distributed to section leads.',
                    force: 'Force protection posture remains elevated. Access control measures in place. No security violations or perimeter breaches reported.',
                    other: 'No additional readiness concerns reported. Monitoring continues with standard reporting cadence.'
                  };
                  return (
                    <div
                      key={item.key}
                      className="border border-border rounded-lg overflow-hidden"
                      style={{ background: 'linear-gradient(90deg, rgba(104, 118, 238, 0.08) 0%, rgba(0, 0, 0, 0) 100%), linear-gradient(90deg, rgb(20, 23, 26) 0%, rgb(20, 23, 26) 100%)' }}
                    >
                      <div
                        className={`p-3 ${isOpen ? 'border-b border-border' : ''} cursor-pointer`}
                        onClick={() =>
                          setReadinessExpandedPopout(prev => ({
                            ...prev,
                            [item.key]: !isOpen
                          }))
                        }
                      >
                        <div className="flex items-start gap-2">
                          {isOpen ? (
                            <ChevronDown className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <span className="caption text-white">{item.label}</span>
                          </div>
                        </div>
                      </div>
                      {isOpen && (
                        <div className="p-4 space-y-3 bg-card/50">
                          <p className="caption text-white whitespace-pre-wrap">
                            {approvedContent[item.key]}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-input-background border border-border rounded p-3 min-h-[240px]">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => setSitrepPopoutFontSize((prev) => Math.max(10, prev - 1))}
                    className="w-12 h-6 rounded border border-border text-white hover:bg-muted/30 transition-colors"
                    title="Decrease font size"
                  >
                    -
                  </button>
                  <button
                    onClick={() => setSitrepPopoutFontSize((prev) => Math.min(40, prev + 1))}
                    className="w-12 h-6 rounded border border-border text-white hover:bg-muted/30 transition-colors"
                    title="Increase font size"
                  >
                    +
                  </button>
                  <span className="text-xs text-white/70">Font size: {sitrepPopoutFontSize}px</span>
                </div>
                <p className="text-white whitespace-pre-wrap" style={{ fontSize: `${sitrepPopoutFontSize}px` }}>
                  {sitrepPopoutSection === 1 && 'Reporting Unit: Sector Operations Center. Primary POC LCDR Sarah Mitchell. Staffing at 92% with full watch rotation coverage.'}
                  {sitrepPopoutSection === 2 && 'Executive Summary: Operational tempo remains steady. Maritime security zones active with high compliance. No significant incidents reported in the last 12 hours.'}
                  {sitrepPopoutSection === 9 && 'Risk to Mission: Low. No credible threats or disruptions anticipated. Monitoring continues with elevated readiness posture.'}
                  {sitrepPopoutSection === 10 && 'Outstanding RFI/RFR: None at this time. All pending requests resolved in current operational period.'}
                  {sitrepPopoutSection === 11 && 'Previous 14‑day Critical Incident Reporting: No critical incidents requiring follow‑on reporting. Prior advisories have been closed.'}
                  {sitrepPopoutSection === 12 && 'General Comments: Interagency coordination remains strong. Next brief scheduled for 1800L.'}
                  {sitrepPopoutSection === 13 && 'Imagery: No new imagery submitted. Last update includes routine aerial reconnaissance set dated 02/03/2026.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Child Incident SITREP Modal */}
      <Dialog open={sitrepModalOpen !== null} onOpenChange={() => setSitrepModalOpen(null)}>
        <DialogContent 
          className="bg-[#222529] border-[#6e757c] text-white !w-[calc(100vw-4rem)] !max-w-none"
          style={{ width: 'calc(100vw - 4rem)', maxWidth: 'none' }}
        >
          <DialogHeader>
            <DialogTitle className="text-white">
              {sitrepModalOpen === 'child-incident-1' 
                ? 'SITREP for Platform Charlie Gas Leak' 
                : 'SITREP for Subsea Pipeline Inspection'}
            </DialogTitle>
            <p className="caption text-white/70 text-sm mt-2">
              {sitrepModalOpen === 'child-incident-1'
                ? 'Published at 12/20/2025 13:45'
                : 'Latest Approved SITREP for Subsea Pipeline Inspection: Published at 12/20/2025 12:15'}
            </p>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* SITREP Tabs */}
            <div className="flex items-center gap-1 border-b border-border">
              {[1, 2, 3, 4, 5].map((tabNum) => {
                const isActive = tabNum === sitrepModalTab;
                return (
                  <button
                    key={tabNum}
                    onClick={() => setSitrepModalTab(tabNum)}
                    className={`relative px-4 py-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'text-accent'
                        : 'text-foreground hover:text-accent'
                    }`}
                  >
                    <span className="caption">Tab {tabNum}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent" />
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* SITREP Content */}
            <div className="min-h-[300px]">
              {sitrepModalOpen === 'child-incident-1' && (
                <>
                  {sitrepModalTab === 1 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Contact Information</label>
                      <p className="caption text-white">Incident Commander: Robert Martinez, ExxonMobil | Contact: +1-504-555-0147 | Location: Block 892 Platform Charlie</p>
                    </div>
                  )}
                  {sitrepModalTab === 2 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Executive Summary</label>
                      <p className="caption text-white">At 08:45 local time, Platform Charlie experienced a catastrophic natural gas leak from Well #3 production manifold. Emergency shutdown procedures were activated immediately. All 47 personnel successfully evacuated to secondary platform. USCG Sector New Orleans dispatched to establish 2-nautical mile safety zone. Production operations suspended across Block 892 facilities. No injuries reported. Environmental assessment teams en route.</p>
                    </div>
                  )}
                  {sitrepModalTab === 3 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Current Situation</label>
                      <p className="caption text-white">Gas leak rate estimated at 2,400 cubic feet per minute from compromised wellhead valve. Platform control systems indicate pressure anomalies in production manifold. Emergency response vessels maintaining perimeter at 2nm. Prevailing winds SSW at 12 knots dispersing gas cloud offshore. Air quality monitoring shows no hazardous readings at adjacent platforms. Well control specialists mobilizing from Houston with specialized equipment estimated arrival 16:00 hours.</p>
                    </div>
                  )}
                  {sitrepModalTab === 4 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Actions Taken</label>
                      <p className="caption text-white">- Emergency shutdown system activated 08:46<br/>- All personnel evacuated to Platform Delta by 09:15<br/>- USCG notified and safety zone established 09:30<br/>- Adjacent platforms (Bravo, Delta, Echo) on elevated alert status<br/>- Environmental monitoring initiated<br/>- Well control team dispatched from Houston<br/>- Marine traffic advisories issued via VHF Channel 16</p>
                    </div>
                  )}
                  {sitrepModalTab === 5 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Forecast / Next 12 Hours</label>
                      <p className="caption text-white">Well control specialists expected on location 16:00 to assess valve integrity and develop intervention plan. Weather forecast favorable with continued offshore winds through operational period. If valve can be isolated, production restart possible within 48 hours pending safety inspection. Alternative scenario: If wellhead intervention required, expect 7-10 day response timeline. Environmental impact assessment will determine any remediation requirements.</p>
                    </div>
                  )}
                </>
              )}
              
              {sitrepModalOpen === 'child-incident-2' && (
                <>
                  {sitrepModalTab === 1 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Contact Information</label>
                      <p className="caption text-white">Operations Manager: Jennifer Chen, ExxonMobil | Contact: +1-504-555-0198 | Location: Deepwater Export Line 7, Mile Marker 47</p>
                    </div>
                  )}
                  {sitrepModalTab === 2 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Executive Summary</label>
                      <p className="caption text-white">Routine integrity survey of Deepwater Export Line 7 detected minor coating degradation at multiple locations between MM 45-52. ROV inspection commenced 06:00 to assess extent and severity. Line remains operational at reduced pressure (800 PSI, normal 1,200 PSI). No leaks detected. Cathodic protection readings within acceptable parameters. Survey completion expected by 18:00 today.</p>
                    </div>
                  )}
                  {sitrepModalTab === 3 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Current Situation</label>
                      <p className="caption text-white">ROV unit conducting detailed video survey and ultrasonic wall thickness measurements. Five locations showing coating loss 15-25% of protective layer. Pipeline structural integrity maintained with wall thickness readings 92-96% of specification. No active corrosion detected. Flow rate reduced to 45,000 barrels/day (normal 65,000) as precautionary measure. Downstream facilities adjusted for reduced throughput.</p>
                    </div>
                  )}
                  {sitrepModalTab === 4 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Actions Taken</label>
                      <p className="caption text-white">- ROV mobilized and survey initiated at 06:00<br/>- Pipeline pressure reduced to 800 PSI at 06:30<br/>- Production platforms notified of flow restrictions<br/>- Cathodic protection survey completed, systems normal<br/>- Engineering team reviewing preliminary ROV data<br/>- Repair contractor on standby pending assessment<br/>- USCG and BSEE notifications filed per regulations</p>
                    </div>
                  )}
                  {sitrepModalTab === 5 && (
                    <div>
                      <label className="caption text-white/70 text-sm block mb-2">Forecast / Next 12 Hours</label>
                      <p className="caption text-white">ROV survey completion expected 18:00 with full engineering analysis by 22:00. Based on preliminary findings, anticipate coating repair requirement within 30-day window per regulations. If repairs can be scheduled during next maintenance period (Feb 2026), no production impact. Emergency repair not indicated - pipeline safe for continued operation at reduced pressure. Will resume normal operating pressure upon engineering approval of survey results.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft SITREP Modal */}
      <Dialog open={isDraftModalOpen} onOpenChange={setIsDraftModalOpen}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white overflow-hidden flex flex-col" style={{ maxWidth: '71vw', maxHeight: '71vh', width: '71vw' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Confirm SITREP Submission</DialogTitle>
            <p className="text-white/70 text-sm mt-2">
              Do you want to submit your SITREP draft for Sector New York to the Section Chief?
            </p>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* Preview Approval Workflow */}
            <div className="space-y-3">
              <Label className="text-white text-sm">Preview Approval Workflow</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-sm"
                    style={{ backgroundColor: '#60a5fa' }}
                  >
                    1
                  </div>
                  <span className="text-sm text-white font-medium">Draft Creation</span>
                </div>
                <div className="flex-1 h-[2px] bg-border"></div>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-sm"
                    style={{ backgroundColor: '#6b7280' }}
                  >
                    2
                  </div>
                  <span className="text-sm text-white/70">Section Chief</span>
                </div>
                <div className="flex-1 h-[2px] bg-border"></div>
                <div className="flex items-center gap-2">
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-full text-white font-medium text-sm"
                    style={{ backgroundColor: '#6b7280' }}
                  >
                    3
                  </div>
                  <span className="text-sm text-white/70">Incident Commander</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  // Save draft logic would go here
                  setIsDraftModalOpen(false);
                  setModalDraftContents({ 1: '', 2: '', 3: '', 4: '', 5: '' });
                  setModalDraftTab(1);
                }}
                className="bg-primary hover:bg-primary/90 px-6 py-0.5 h-auto text-sm"
              >
                Confirm Submission
              </Button>
              <Button
                onClick={() => {
                  setIsDraftModalOpen(false);
                  setModalDraftContents({ 1: '', 2: '', 3: '', 4: '', 5: '' });
                  setModalDraftTab(1);
                }}
                variant="outline"
                className="border-border px-6 py-0.5 h-auto text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      <Dialog open={filePreviewModal !== null} onOpenChange={() => setFilePreviewModal(null)}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{filePreviewModal}</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-white/70">Placeholder for PDF preview</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Preview Modal for Document Alpha */}
      <Dialog open={pdfPreviewModalOpen} onOpenChange={setPdfPreviewModalOpen}>
        <DialogContent className="bg-[#222529] border-[#6e757c] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Document Alpha.pdf</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-white/70">placeholder for PDF preview of document</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
