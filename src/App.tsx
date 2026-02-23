import { useState, useEffect, useRef } from 'react';
import { PlanningPStepper } from './components/PlanningPStepper';
import { InitialUCMeetingPhase } from './components/phases/InitialUCMeetingPhase';
import { ICUCObjectivesPhase } from './components/phases/ICUCObjectivesPhase';
import { IncidentBriefingPhase } from './components/phases/IncidentBriefingPhase';
import { OverviewPhase } from './components/phases/OverviewPhase';
import { AlertsPhase } from './components/phases/AlertsPhase';
import { ObjectivesActionsPhase } from './components/phases/ObjectivesActionsPhase';
import { IncidentRosterPhase } from './components/phases/IncidentRosterPhase';
import { SafetyAnalysisPhase } from './components/phases/SafetyAnalysisPhase';
import { ResourcesPhase } from './components/phases/ResourcesPhase';
import { LayersPhase } from './components/phases/LayersPhase';
import { GenericPhase } from './components/phases/GenericPhase';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Switch } from './components/ui/switch';
import { Label } from './components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './components/ui/dialog';
// Removed unused Popover imports after eliminating orange dot overlays
import { Input } from './components/ui/input';
import { DisasterPhase, OperationalPeriod, OPERATIONAL_PERIOD_PHASES } from './types/disaster';
import { RefreshCw, Clock, CheckCircle, Menu, HelpCircle, Search, FileText, Download, Map, ChevronUp, ChevronDown, MoreHorizontal, Send, X, Bot, User, AlertTriangle, Users, MapPin, Calendar, Box, ChevronLeft, ChevronRight, Layers, ExternalLink, Paperclip } from 'lucide-react';
import svgPaths from './imports/svg-4ab4ujrm1u';
import exportSvgPaths from './imports/svg-o6fjxj41li';
import imgCapsule from "figma:asset/371be526cb6c078a2a123792205d9842b99edd6d.png";
import imgCapsule1 from "figma:asset/eae313a48883a46e7a2a60ee806e73a8052191be.png";
import { Toaster } from './components/ui/sonner';
import { DataLayers } from './components/DataLayers';

export default function App() {
  const [currentOperationalPeriod, setCurrentOperationalPeriod] = useState<OperationalPeriod>({
    id: '2',
    number: 2,
    startTime: new Date(),
    phases: OPERATIONAL_PERIOD_PHASES.map(phase => ({
      ...phase,
      completed: false,
      data: {}
    }))
  });

  const [pastOperationalPeriods, setPastOperationalPeriods] = useState<OperationalPeriod[]>([]);
  const [viewingPastPeriod, setViewingPastPeriod] = useState<OperationalPeriod | null>(null);
  const [currentPhaseId, setCurrentPhaseId] = useState<string>('overview');
  const [incidentNotificationCount, setIncidentNotificationCount] = useState(0);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);

  const [copCollapsed, setCopCollapsed] = useState(false);
  const [copModalOpen, setCopModalOpen] = useState(false);
  const [showMapPanel, setShowMapPanel] = useState(false);
  const [showCopCard, setShowCopCard] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showActionPoints, setShowActionPoints] = useState(false);
  const [showFullscreenMap, setShowFullscreenMap] = useState(false);
  const [showMapChat, setShowMapChat] = useState(false);
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [selectedMapContext, setSelectedMapContext] = useState<Array<{ type: 'point'; x: number; y: number; label: string }>>([]);
  const [mapPanelDock, setMapPanelDock] = useState<'left' | 'bottom'>('left');
  // Drag-to-bottom disabled
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isChatDragging, setIsChatDragging] = useState(false);
  const chatDragStart = useRef<{ x: number; y: number } | null>(null);
  const [chatFloatingBottom, setChatFloatingBottom] = useState(false);
  const [awaitingInfraOverlay, setAwaitingInfraOverlay] = useState(false);
  const [mapCenter, setMapCenter] = useState<string>('-80.16200440365937,25.87478023462914');
  const [mapScale, setMapScale] = useState<string>('577790.554289');
  const [mapMarkers, setMapMarkers] = useState<Array<{ id: string; lat: number; lon: number; color: string }>>([]);

  // Removed simulated sample resources and related chat helper

  // Dock dragging disabled

  const onChatHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!(mapPanelDock === 'left' && showMapChat)) return;
    setIsChatDragging(true);
    chatDragStart.current = { x: e.clientX, y: e.clientY };
    window.addEventListener('pointermove', onChatPointerMove);
    window.addEventListener('pointerup', onChatPointerUp);
  };
  const onChatPointerMove = (_e: PointerEvent) => {
    // no-op for now (we only check distance on release)
  };
  const onChatPointerUp = (e: PointerEvent) => {
    const start = chatDragStart.current;
    if (start) {
      const dy = e.clientY - start.y;
      // If dragged downward enough, float chat to bottom of screen
      if (dy > 60) {
        setChatFloatingBottom(true);
      }
    }
    setIsChatDragging(false);
    chatDragStart.current = null;
    window.removeEventListener('pointermove', onChatPointerMove);
    window.removeEventListener('pointerup', onChatPointerUp);
  };
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Pratus AI, your assistant for event and incident management. I can help with planning phases, ICS forms, operational procedures, and any questions about incident response. How can I assist you today?',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [aiContextItems, setAiContextItems] = useState<string[]>([]);
  const [contextModalOpen, setContextModalOpen] = useState(false);
  const [selectedContextItem, setSelectedContextItem] = useState<string | null>(null);
  const [incidentViewSet, setIncidentViewSet] = useState(false);
  const [dataLayerRegionFilter, setDataLayerRegionFilter] = useState<string[]>([]);
  const [dataLayerIncidentFilter, setDataLayerIncidentFilter] = useState<string[]>([]);
  // Removed: auto-swap map behavior after Tesoro prompt



  // Mock incident data - Updated for Oil Spill Alpha
  const [incidentData] = useState({
    name: 'Oil Spill Alpha',
    type: 'Special Event',
    location: 'AT&T Stadium, Arlington, TX',
    startTime: new Date('2026-06-11T10:00:00'),
    icName: 'Captain Maria Rodriguez',
    status: 'Active',
    priority: 'High',
    capacity: '80,000 attendees',
    security: '85% complete',
    venues: {
      primary: 'AT&T Stadium',
      coverage: '16 host venues nationwide'
    }
  });

  const currentPhase = currentOperationalPeriod.phases.find(p => p.id === currentPhaseId);
  const currentPhaseIndex = currentOperationalPeriod.phases.findIndex(p => p.id === currentPhaseId);

  const handlePhaseDataChange = (data: Record<string, any>) => {
    setCurrentOperationalPeriod(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === currentPhaseId
          ? { ...phase, data }
          : phase
      )
    }));
  };

  const handlePhaseComplete = () => {
    setCurrentOperationalPeriod(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === currentPhaseId
          ? { ...phase, completed: true }
          : phase
      )
    }));

    // Move to next phase or show completion
    const nextPhaseIndex = currentPhaseIndex + 1;
    if (nextPhaseIndex < currentOperationalPeriod.phases.length) {
      setCurrentPhaseId(currentOperationalPeriod.phases[nextPhaseIndex].id);
    } else {
      setShowCompletionSummary(true);
    }
  };

  const handlePreviousPhase = () => {
    const previousPhaseIndex = currentPhaseIndex - 1;
    if (previousPhaseIndex >= 0) {
      setCurrentPhaseId(currentOperationalPeriod.phases[previousPhaseIndex].id);
    }
  };

  const advanceOperationalPeriod = () => {
    // Save current period to past periods before advancing
    setPastOperationalPeriods(prev => [...prev, { 
      ...currentOperationalPeriod, 
      endTime: new Date() 
    }]);
    
    const newPeriodNumber = currentOperationalPeriod.number + 1;
    
    setCurrentOperationalPeriod(prev => ({
      id: (parseInt(prev.id) + 1).toString(),
      number: newPeriodNumber,
      startTime: new Date(),
      endTime: undefined,
      phases: OPERATIONAL_PERIOD_PHASES.map(phase => ({
        ...phase,
        completed: false,
        data: {}
      }))
    }));
    setCurrentPhaseId('overview');
    setShowCompletionSummary(false);
    setViewingPastPeriod(null); // Return to current period
  };

  const handleViewPastPeriod = (periodId: string) => {
    if (periodId === 'current') {
      setViewingPastPeriod(null);
    } else {
      const pastPeriod = pastOperationalPeriods.find(p => p.id === periodId);
      if (pastPeriod) {
        setViewingPastPeriod(pastPeriod);
        setCurrentPhaseId('overview');
      }
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    let contentToSend = chatInput;
    if (showFullscreenMap && showMapChat && selectedMapContext.length > 0) {
      const ctx = selectedMapContext
        .map((c, i) => `#${i + 1} ${c.type} at (${Math.round(c.x)}, ${Math.round(c.y)})`)
        .join('; ');
      contentToSend += `\n\n[Map Selected: ${ctx}]`;
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: contentToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setSelectedMapContext([]);
    setIsSelectingOnMap(false);

    if (awaitingInfraOverlay) {
      setAwaitingInfraOverlay(false);
      const followUp = {
        id: (Date.now() + 3).toString(),
        role: 'assistant' as const,
        content:
          'Dependency detail: Kaneohe Marine Corps Base Headquarters (MCBH) receives grid power primarily through transmission line A12BC (138 kV) spanning central-to-windward Oahu. Line A12BC depends on generation sourced from the Tesoro Hawaii Power Plant corridor under normal dispatch. Operational notes: A12BC includes wind‑exposed spans that require vegetation clearance and rapid crew access during adverse weather. A loss at Tesoro forces re‑dispatch that can reduce voltage headroom toward the windward feeders. If MCBH transitions to emergency power, projected runtime is ~24 hours at current critical loads without resupply; recommend pre‑positioned fuel and portable voltage support, plus a contingency switching plan for A12BC to maintain stability.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, followUp]);
    }

    // Simulate AI response after a short delay
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        role: 'assistant' as const,
        content: generateAIResponse(chatInput),
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
       if (aiResponse.content.includes('Would you like me to describe the dependencies further?')) {
         setAwaitingInfraOverlay(true);
       }
    }, 1000);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('ics') || input.includes('form')) {
      return 'I can help you with ICS forms! The Incident Command System uses standardized forms for documentation and communication. For the Oil Spill Alpha incident, key forms include ICS-202 (Incident Objectives), ICS-203 (Organization Assignment List), and ICS-204 (Assignment List). Would you like me to explain any specific form or help you fill one out?';
    }
    
    if (input.includes('objective') || input.includes('goal')) {
      return 'For incident objectives, remember they should be SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. For the Oil Spill Alpha incident, typical objectives might include containment and recovery, environmental protection, public safety, and coordinating with response agencies. What specific objectives are you working on?';
    }
    
    if (input.includes('planning') || input.includes('phase')) {
      return 'The Planning-P process has 8 key phases in our operational workflow. You\'re currently in the IC/UC Objectives Meeting phase. This phase focuses on establishing incident priorities, objectives, and critical information requirements. Each phase builds upon the previous one to create a comprehensive Incident Action Plan (IAP). What aspect of the planning process would you like to discuss?';
    }
    
    if (input.includes('threat') || input.includes('risk')) {
      return 'Critical infrastructure dependencies identified: multiple regional assets draw power and fuel support from the Tesoro Hawaii Power Plant. Kaneohe Marine Corps Base Headquarters relies on this plant for primary power. If an adversary destroyed the Tesoro facility, Kaneohe MCB HQ would have only enough backup power to operate for approximately 24 hours before essential command and control functions would be impacted. Consider immediate continuity planning, fuel resupply coordination, and prioritization of backup generation. Would you like me to describe the dependencies further?';
    }
    
    // When in map view and PRATUS AI is open, provide context about Tesoro and Kaneohe HQ
    if (showFullscreenMap && showMapChat) {
      return 'Critical infrastructure dependencies identified: multiple regional assets draw power and fuel support from the Tesoro Hawaii Power Plant. Kaneohe Marine Corps Base Headquarters relies on this plant for primary power. If an adversary destroyed the Tesoro facility, Kaneohe MCB HQ would have only enough backup power to operate for approximately 24 hours before essential command and control functions would be impacted. Consider immediate continuity planning, fuel resupply coordination, and prioritization of backup generation. Would you like me to describe the dependencies further?';
    }
    
    return 'Observed activity from 1.178.9.0 during the current cyber incident: high‑volume credential spray attempts against VPN and Microsoft 365 (≈450 failures across 32 accounts), broad SMB/445 and RDP/3389 probing across member subnets, and periodic HTTPS beacons (~60s interval) to two newly registered domains. Web logs show repeated auth bypass payloads targeting /owa/auth and /wp-login.php. One workstation attempted to download a DLL from 1.178.9.0 followed by lateral movement via WMI; the endpoint was quarantined. Would you like the host list and timeline of events?';
  };

  // Add context item from list clicks
  const addAIContext = (itemName: string) => {
    if (!aiContextItems.includes(itemName)) {
      setAiContextItems(prev => [...prev, itemName]);
    }
  };

  // Remove context item
  const removeAIContext = (itemName: string) => {
    setAiContextItems(prev => prev.filter(item => item !== itemName));
  };

  // Get the period currently being displayed (either current or past)
  const displayedPeriod = viewingPastPeriod || currentOperationalPeriod;
  const displayedPhase = displayedPeriod.phases.find(p => p.id === currentPhaseId);
  const displayedPhaseIndex = displayedPeriod.phases.findIndex(p => p.id === currentPhaseId);

  const renderCurrentPhase = () => {
    if (!displayedPhase) return null;

    // If viewing a past period, make it read-only
    const isReadOnly = viewingPastPeriod !== null;

    const commonProps = {
      data: displayedPhase.data,
      onDataChange: isReadOnly ? () => {} : handlePhaseDataChange,
      onComplete: isReadOnly ? () => {} : handlePhaseComplete,
      onPrevious: displayedPhaseIndex > 0 ? handlePreviousPhase : undefined,
      onAddAIContext: showFullscreenMap && showMapChat ? addAIContext : undefined,
    };

    switch (displayedPhase.id) {
      case 'alerts':
        return <AlertsPhase 
          {...commonProps}
          onZoomToLocation={(center: string, scale: string) => {
            if (showFullscreenMap) {
              setMapCenter(center);
              setMapScale(scale);
            }
          }}
          onShowMapMarker={(id: string, lat: number, lon: number, color: string) => {
            setMapMarkers([{ id, lat, lon, color }]);
          }}
          onIncidentNotification={(count: number) => setIncidentNotificationCount(count)}
        />;
      case 'overview':
        return <OverviewPhase {...commonProps} />;
      case 'objectives-actions':
        return <ObjectivesActionsPhase 
          {...commonProps} 
          onRecommendActions={() => setShowActionPoints(true)}
          onZoomToLocation={(center: string, scale: string) => {
            if (showFullscreenMap) {
              setMapCenter(center);
              setMapScale(scale);
            }
          }}
          onApplyDataLayerFilter={(incident: string) => {
            setDataLayerRegionFilter([]); // Clear region filter (select all)
            setDataLayerIncidentFilter([incident]);
          }}
        />;
      case 'incident-roster':
        return <IncidentRosterPhase 
          {...commonProps} 
          isMapExpanded={showCopCard}
          onZoomToLocation={(center: string, scale: string) => {
            if (showFullscreenMap) {
              setMapCenter(center);
              setMapScale(scale);
            }
          }}
        />;
      case 'resources':
        return <ResourcesPhase {...commonProps} />;
      case 'layers':
        return <LayersPhase {...commonProps} />;
      case 'planning-p':
        return <div className="flex-1 overflow-auto p-6" />;
      case 'safety-analysis':
        return <SafetyAnalysisPhase {...commonProps} />;
      default:
        return (
          <GenericPhase 
            phase={displayedPhase}
            isFirst={displayedPhaseIndex === 0}
            {...commonProps} 
          />
        );
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'default';
      case 'Ongoing':
        return 'destructive';
      case 'Scheduled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  // Common Operating Picture Content Component
  const COPContent = ({ showMap = true }: { showMap?: boolean }) => (
    <>
      {showMap && (
        <div className="w-full h-[300px] border border-border rounded-lg overflow-hidden">
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
    </>
  );

  if (showCompletionSummary) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h1>Operational Period {currentOperationalPeriod.number} Complete</h1>
              <p className="text-muted-foreground mt-2">
                All planning phases have been completed successfully
              </p>
            </div>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Phase Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentOperationalPeriod.phases.map((phase) => (
                    <div key={phase.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{phase.shortName}</div>
                        <div className="text-xs text-muted-foreground truncate">{phase.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={advanceOperationalPeriod}
                size="lg"
                className="bg-primary hover:bg-primary/90 flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Start New Operational Period
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top Navigation Bar - Imported Design */}
      <div className="relative bg-black h-16 w-full flex-shrink-0">
        {/* Left Control */}
        <div className="absolute content-stretch flex gap-4 items-center justify-start left-0 top-0 h-16">
          {/* Menu Icon Logo */}
          <div className="bg-gradient-to-r box-border content-stretch flex flex-col from-[#02a3fe] from-[8.524%] gap-8 items-center justify-center overflow-clip p-[8px] relative shrink-0 size-16 to-[#6876ee] to-[94.739%]">
            <div className="content-stretch flex flex-col gap-11 items-start justify-start relative shrink-0">
              <div className="relative shrink-0 size-14">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                  <g id="Capsule">
                    <path d={svgPaths.p29a8a500} fill="white" id="Vector" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Right Control */}
        <div className="absolute content-stretch flex gap-4 h-16 items-center justify-end right-4 top-0">
          {/* Top Bar Action Buttons */}
          <div className="flex items-center gap-3">
            {/* Map Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullscreenMap(true)}
              className={`flex items-center gap-2 transition-all duration-200 ${
                showFullscreenMap
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90'
                  : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Map className="w-4 h-4" />
              Map View
            </Button>

            {/* AI Chat Toggle Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChatPanel(!showChatPanel)}
              className={`flex items-center gap-2 transition-all duration-200 ${
                showChatPanel
                  ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90'
                  : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                <path d={svgPaths.p29a8a500} fill="currentColor" />
              </svg>
              PRATUS AI
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className={`${showChatPanel ? 'flex-1' : 'w-full'} flex flex-col overflow-hidden`}>
          {/* Map View block removed */}

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Planning Content */}
            {/* Planning Stepper */}
            <div className="border-b border-border flex-shrink-0">
              <PlanningPStepper
                phases={displayedPeriod.phases}
                currentPhaseId={currentPhaseId}
                onPhaseSelect={setCurrentPhaseId}
                operationalPeriodNumber={displayedPeriod.number}
                notificationCount={0}
                incidentNotificationCount={incidentNotificationCount}
              />
            </div>
            
            {/* Planning Content - 50/50 Split Layout */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className={`flex-1 flex gap-6 overflow-hidden transition-all duration-300`}>
                {/* Planning Phase Content - Left Side - Scrollable */}
                <div className={`flex flex-col overflow-hidden ${showCopCard ? 'w-1/2' : 'w-full'}`}>
                  <div className="flex-1 overflow-y-auto pr-2">
                    {renderCurrentPhase()}
                  </div>
                  
                </div>
                
                {/* Common Operating Picture Card - Right Side - Fixed */}
                {showCopCard && (
                  <div className="w-1/2 flex flex-col overflow-hidden">
                    <Card className="flex flex-col h-full overflow-hidden">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Common Operating Picture
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowCopCard(false)}
                            className="hover:bg-muted flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Hide
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-4">
                        {/* Map */}
                        <div className="w-full border border-border rounded-lg overflow-hidden bg-card relative" style={{ height: '600px', width: '700px' }}>
                          <arcgis-embedded-map
                            style={{ height: '600px', width: '100%', display: 'block' }}
                            item-id="c1a7e5587f4941f49d340d49dc7a0000"
                            theme="light"
                            center="-74.03131343667845,40.761717806888804"
                            scale="72223.819286"
                            portal-url="https://disastertech.maps.arcgis.com"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {showChatPanel && (
          <div className="bg-card border-l border-border flex flex-col h-screen" style={{ width: '540px' }}>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-accent-foreground" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                        <path d={svgPaths.p29a8a500} fill="currentColor" />
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-accent text-accent-foreground ml-auto' 
                      : 'bg-muted/30 text-card-foreground'
                  }`}>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Prompt Templates */}
            <div className="px-4 py-3 border-t border-border">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Quick Actions</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatInput('Generate a comprehensive SITREP for the current operational period including status, objectives, resources, and next steps.')}
                className="w-full justify-start gap-2 border-border text-card-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <FileText className="w-4 h-4" />
                Generate SITREP
              </Button>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask me about incident management..."
                  className="flex-1 bg-input-background border-border text-card-foreground"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={!chatInput.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Common Operating Picture Modal */}
      <Dialog open={copModalOpen} onOpenChange={setCopModalOpen}>
        <DialogContent className="max-w-none w-[80vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Common Operating Picture
            </DialogTitle>
            <DialogDescription>
              Expanded view of the real-time situational awareness and incident overview for {incidentData.name}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <COPContent />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Toast Notifications */}
      <Toaster />

          {/* (Removed) full-screen resource modal; replaced with anchored popovers on the map dots */}

      {/* Fullscreen ArcGIS Map Overlay */}
      {showFullscreenMap && (
        <div className="fixed inset-0 z-50 bg-black">
          <div className="absolute inset-0">
            <arcgis-embedded-map
              style={{ height: '100%', width: '100%', display: 'block' }}
              item-id="c1a7e5587f4941f49d340d49dc7a0000"
              theme="light"
              center={mapCenter}
              scale={mapScale}
              portal-url="https://disastertech.maps.arcgis.com"
            />
          </div>
          
          {/* Pulse Animation CSS */}
          <style>{`
            @keyframes pulse {
              0%, 100% {
                opacity: 0.6;
                transform: scale(1);
              }
              50% {
                opacity: 0.9;
                transform: scale(1.1);
              }
            }
          `}</style>
          
          {/* Map Markers Overlay */}
          {mapMarkers.map(marker => {
            // Convert lat/lon to screen position
            // This is a simplified projection calculation
            const [centerLon, centerLat] = mapCenter.split(',').map(Number);
            const scale = parseFloat(mapScale);
            
            // Approximate pixels per degree at this scale
            const metersPerPixel = scale / 96 * 0.0254; // Convert scale to meters per pixel
            const degreesPerMeter = 1 / 111320; // Approximate at equator
            const pixelsPerDegree = 1 / (metersPerPixel * degreesPerMeter);
            
            // Calculate offset from center
            const deltaLon = marker.lon - centerLon;
            const deltaLat = marker.lat - centerLat;
            
            // Convert to screen coordinates (center of screen is 50%, 50%)
            const screenX = 50 + (deltaLon * pixelsPerDegree / window.innerWidth * 100);
            const screenY = 50 - (deltaLat * pixelsPerDegree / window.innerHeight * 100);
            
            return (
              <div
                key={marker.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${screenX}%`,
                  top: `${screenY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 45,
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: marker.color,
                    opacity: 0.6,
                    boxShadow: `0 0 20px ${marker.color}, 0 0 40px ${marker.color}`,
                    animation: marker.id.startsWith('nexrad-location-') ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
                  }}
                />
              </div>
            );
          })}
          
          {/* My Sector and Exit Map Button - positioned above map and data layers */}
          <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
            <div 
              className="px-4 py-2 rounded-lg border border-purple-500/50 text-white font-medium flex items-center gap-2"
              style={{
                backgroundColor: '#2d1b4e',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.2), 0 0 40px rgba(147, 51, 234, 0.1)'
              }}
            >
              <span>Incident: San Francisco FIFA World Cup</span>
            </div>
            <div 
              className="px-4 py-2 rounded-lg border border-purple-500/50 text-white font-medium flex items-center gap-2"
              style={{
                backgroundColor: '#2d1b4e',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.2), 0 0 40px rgba(147, 51, 234, 0.1)'
              }}
            >
              <span>My Role: IC</span>
            </div>
            <div 
              className="px-4 py-2 rounded-lg border border-purple-500/50 text-white font-medium flex items-center gap-2"
              style={{
                backgroundColor: '#2d1b4e',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.2), 0 0 40px rgba(147, 51, 234, 0.1)'
              }}
            >
              <span>Phase: Tactics Meeting</span>
            </div>
            {/* My Sector Component */}
            <div 
              className="px-4 py-2 rounded-lg border border-purple-500/50 text-white font-medium flex items-center gap-2"
              style={{
                backgroundColor: '#2d1b4e',
                boxShadow: '0 0 20px rgba(147, 51, 234, 0.2), 0 0 40px rgba(147, 51, 234, 0.1)'
              }}
            >
              <span>Sector San Francisco</span>
              <button
                onClick={() => {
                  setMapCenter('-122.4194,37.7749');
                  setMapScale('144447.638572');
                }}
                className="hover:bg-purple-600/30 rounded p-1 transition-colors"
                title="Zoom to San Francisco"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
            
            {/* Exit Map Button */}
            <Button
              onClick={() => setShowFullscreenMap(false)}
              variant="outline"
              className="border-border hover:bg-muted/20"
              style={{ backgroundColor: 'black' }}
            >
              <X className="w-4 h-4 mr-2" />
              Exit Map
            </Button>
          </div>
          
          {/* Data Layers overlay with collapse/expand (right side) */}
          {!rightPanelCollapsed && (
            <div className="absolute right-4 z-40" style={{ top: '116px', width: '360px' }}>
              <div className="relative">
                <DataLayers
                  className="border border-border rounded-md shadow-sm"
                  style={{ height: '540px', backgroundColor: 'black' }}
                  onCollapse={() => setRightPanelCollapsed(true)}
                  regionFilter={dataLayerRegionFilter}
                  setRegionFilter={setDataLayerRegionFilter}
                  incidentFilter={dataLayerIncidentFilter}
                  setIncidentFilter={setDataLayerIncidentFilter}
                  onStartDraftingRadarPrecipitation={() => {
                    // Update layers phase to start drafting
                    const updatedPhases = displayedPeriod.phases.map(p => 
                      p.id === 'layers' 
                        ? { 
                            ...p, 
                            data: { 
                              ...p.data, 
                              isDraftingNewVersion: true, 
                              draftingLayerName: 'Radar Precipitation' 
                            } 
                          }
                        : p
                    );
                    if (viewingPastPeriod) {
                      // Read-only mode, do nothing
                      return;
                    }
                    setCurrentOperationalPeriod(prev => ({ ...prev, phases: updatedPhases }));
                    // Switch to Layers tab
                    setCurrentPhaseId('layers');
                  }}
                  onStartDraftingNewDataLayer={() => {
                    // Update layers phase to start drafting new data layer
                    const updatedPhases = displayedPeriod.phases.map(p => 
                      p.id === 'layers' 
                        ? { 
                            ...p, 
                            data: { 
                              ...p.data, 
                              isDraftingNewDataLayer: true
                            } 
                          }
                        : p
                    );
                    if (viewingPastPeriod) {
                      // Read-only mode, do nothing
                      return;
                    }
                    setCurrentOperationalPeriod(prev => ({ ...prev, phases: updatedPhases }));
                    // Switch to Layers tab
                    setCurrentPhaseId('layers');
                  }}
                />
              </div>
            </div>
          )}
          {rightPanelCollapsed && (
            <div
              className="absolute z-40 cursor-pointer opacity-80 hover:opacity-100"
              style={{ top: '116px', right: 0, height: '540px', width: '32px', backgroundColor: '#000000' }}
              onClick={() => setRightPanelCollapsed(false)}
              title="Expand data layers"
            >
              <div className="w-full flex justify-center" style={{ paddingTop: '10px' }}>
                <Layers className="w-4 h-4 text-white opacity-90" aria-hidden />
              </div>
            </div>
          )}
          {/* Bottom-dock highlight overlay removed */}
          {/* Removed clickable orange points overlay */}
          {/* Floating PRATUS AI chat (when dragged out) */}
          {mapPanelDock === 'left' && showMapChat && chatFloatingBottom && (
            <div
              className="absolute z-40 bg-card border border-border rounded-md shadow-lg flex flex-col overflow-hidden"
              style={{ left: 'calc(33.33vw + 16px)', bottom: '16px', width: '1069px', maxWidth: 'calc(66.67vw - 32px)' }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab"
                   title="Drag back into panel"
                   onPointerDown={(e) => {
                     // Simple gesture: drag up to return to panel
                     const startY = e.clientY;
                     const onMove = (ev: PointerEvent) => {};
                     const onUp = (ev: PointerEvent) => {
                       if (startY - ev.clientY > 40) {
                         setChatFloatingBottom(false);
                       }
                       window.removeEventListener('pointermove', onMove);
                       window.removeEventListener('pointerup', onUp);
                     };
                     window.addEventListener('pointermove', onMove);
                     window.addEventListener('pointerup', onUp);
                   }}>
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                    <path d={svgPaths.p29a8a500} fill="currentColor" />
                  </svg>
                  PRATUS AI
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setChatFloatingBottom(false)}
                    className="hover:bg-muted flex items-center gap-2"
                  >
                    Return
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowMapChat(false)}
                    className="hover:bg-muted flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Hide
                  </Button>
                </div>
              </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' && (
                      <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-accent-foreground" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                          <path d={svgPaths.p29a8a500} fill="currentColor" />
                        </svg>
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-md px-3 py-2 ${message.role === 'user' ? 'bg-accent text-accent-foreground ml-auto' : 'bg-muted/30 text-card-foreground'}`}>
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <div className="text-[10px] opacity-70 mt-1.5">
                        {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border">
                {isSelectingOnMap && (
                  <div className="mb-2 text-xs text-white">
                    Click on the map to add a polygon or point to your message.
                  </div>
                )}
                {selectedMapContext.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="text-white">Selected:</div>
                    {selectedMapContext.map((item, idx) => (
                      <span
                        key={`${item.label}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-white bg-muted/30"
                        title={`${item.type} ${item.label ?? ''}`}
                      >
                        {item.label || item.type}
                        <button
                          className="ml-1 rounded hover:text-destructive"
                          onClick={() =>
                            setSelectedMapContext(prev => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove context item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {aiContextItems.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="text-white text-sm">Context:</div>
                    {aiContextItems.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-1 text-accent bg-accent/10"
                      >
                        {item}
                        <button
                          className="ml-1 rounded hover:text-accent/80"
                          onClick={() => {
                            setSelectedContextItem(item);
                            setContextModalOpen(true);
                          }}
                          aria-label="View aligned data"
                          title="View aligned data"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          className="ml-1 rounded hover:text-destructive"
                          onClick={() => removeAIContext(item)}
                          aria-label="Remove context item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-input-background border-border text-card-foreground"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      // File upload functionality placeholder
                      console.log('File upload clicked');
                    }}
                    size="sm"
                    variant="outline"
                    className="border-border"
                    title="Upload file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setIsSelectingOnMap((prev) => !prev)}
                    size="sm"
                    variant={isSelectingOnMap ? "default" : "outline"}
                    className={isSelectingOnMap ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border"}
                    title="Select polygon or point on map"
                  >
                    <Box className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    size="sm"
                    className="bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={!chatInput.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          {/* Click-capture overlay for selecting polygons/points on the map */}
          {isSelectingOnMap && (
            <div
              className="absolute cursor-crosshair z-20"
              style={
                mapPanelDock === 'left'
                  ? (leftPanelCollapsed ? { top: 0, left: '5vw', right: 0, bottom: 0 } : { top: 0, right: 0, bottom: 0, left: '33.33vw' })
                  : { top: 0, left: 0, right: 0, height: '50vh' }
              }
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                setSelectedMapContext(prev => [
                  ...prev,
                  { type: 'point', x, y, label: 'Tesoro Hawaii Power Plant' }
                ]);
                setIsSelectingOnMap(false);
              }}
              title="Click on the map to select a polygon or point"
            />
          )}
          
          {/* Click-capture overlay for drawing NEXRAD location */}
          {(() => {
            const layersPhase = displayedPeriod.phases.find(p => p.id === 'layers');
            if (layersPhase?.data?.drawingNexradLocation) {
              return (
                <div
                  className="absolute cursor-crosshair z-20"
                  style={
                    mapPanelDock === 'left'
                      ? (leftPanelCollapsed ? { top: 0, left: '5vw', right: 0, bottom: 0 } : { top: 0, right: 0, bottom: 0, left: '33.33vw' })
                      : { top: 0, left: 0, right: 0, height: '50vh' }
                  }
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Calculate approximate lat/lon from screen position (simplified)
                    const [centerLon, centerLat] = mapCenter.split(',').map(Number);
                    const scale = parseFloat(mapScale);
                    const metersPerPixel = scale / 96 / 39.37;
                    const mapWidth = rect.width;
                    const mapHeight = rect.height;
                    
                    const offsetX = x - mapWidth / 2;
                    const offsetY = mapHeight / 2 - y;
                    
                    const lat = centerLat + (offsetY * metersPerPixel / 111320);
                    const lon = centerLon + (offsetX * metersPerPixel / (111320 * Math.cos(centerLat * Math.PI / 180)));
                    
                    // Add pulsing blue marker
                    const markerId = `nexrad-location-${Date.now()}`;
                    setMapMarkers(prev => [
                      ...prev.filter(m => !m.id.startsWith('nexrad-location-')),
                      { id: markerId, lat, lon, color: '#3b82f6' }
                    ]);
                    
                    // Update the layers phase data with coordinates
                    const updatedPhases = displayedPeriod.phases.map(p => 
                      p.id === 'layers' 
                        ? { ...p, data: { ...p.data, drawingNexradLocation: false, nexradLat: lat.toFixed(4), nexradLon: lon.toFixed(4) } }
                        : p
                    );
                    setCurrentOperationalPeriod(prev => ({ ...prev, phases: updatedPhases }));
                  }}
                  title="Click on the map to place NEXRAD station"
                />
              );
            }
            return null;
          })()}
          {/* Panel overlay: Stepper + content over the map (dock: left or bottom) */}
          {mapPanelDock === 'left' ? (
            <>
              {!leftPanelCollapsed && (
                <div className="absolute bottom-0 left-0 border-r border-border" style={{ top: '0', width: '33.33vw', overflow: 'hidden', backgroundColor: 'black' }}>
                  <div className="relative h-full flex flex-col" style={{ overflow: 'hidden', backgroundColor: 'black' }}>
                    <div className="border-b border-border flex-shrink-0" style={{ position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'black' }}>
                      <style>{`
                        .planning-stepper-map-view .bg-card {
                          background-color: black !important;
                          border-bottom: none !important;
                        }
                        .planning-stepper-map-view .justify-center {
                          justify-content: flex-start !important;
                        }
                        .planning-stepper-map-view button::after {
                          display: none !important;
                        }
                      `}</style>
                      <div className="flex items-center justify-between planning-stepper-map-view">
                        <div style={{ flex: 1, marginRight: '8px' }}>
                          <PlanningPStepper
                            phases={displayedPeriod.phases}
                            currentPhaseId={currentPhaseId}
                            onPhaseSelect={setCurrentPhaseId}
                            operationalPeriodNumber={displayedPeriod.number}
                            notificationCount={(() => {
                              const alertsPhase = displayedPeriod.phases.find(p => p.id === 'alerts');
                              const alertsData = alertsPhase?.data?.alerts || [];
                              const boomDataLayerArchived = alertsPhase?.data?.boomDataLayerArchived || false;
                              const sitrepArchived = alertsPhase?.data?.sitrepArchived || false;
                              const safetyCheckArchived = alertsPhase?.data?.safetyCheckArchived || false;
                              const incidentActivationResponded = alertsPhase?.data?.incidentActivationResponded || false;
                              let customNotifications = 4; // civil disturbance, boom data layer review, SITREP review, safety check, acknowledgement (minus archived/responded)
                              if (boomDataLayerArchived) customNotifications--;
                              if (sitrepArchived) customNotifications--;
                              if (safetyCheckArchived) customNotifications--;
                              if (incidentActivationResponded) customNotifications--;
                              return (alertsData.length || 4) + customNotifications; // default to 4 dynamic alerts if not loaded
                            })()}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-muted"
                          onClick={() => setLeftPanelCollapsed(true)}
                          title="Collapse panel"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
              {/* Planning content - fills remaining space above fixed chat */}
              <div className="flex-1 overflow-hidden" style={{ position: 'relative', zIndex: 1 }}>
                <div className="h-full overflow-y-auto p-6">
                  {renderCurrentPhase()}
                </div>
              </div>
               {/* Bottom area of left panel: PRATUS AI toggle and chat */}
              <div
                className="flex-none border-t border-border bg-muted/20 overflow-hidden"
                 style={{ height: showMapChat && !chatFloatingBottom ? '60%' : 'auto' }}
              >
                 {showMapChat && !chatFloatingBottom ? (
                  <div className="h-full flex flex-col">
                     <div
                       className="flex items-center justify-between px-3 py-2 border-b border-border cursor-grab"
                       onPointerDown={onChatHeaderPointerDown}
                       title="Drag out to bottom"
                     >
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                          <path d={svgPaths.p29a8a500} fill="currentColor" />
                        </svg>
                        PRATUS AI
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowMapChat(false)}
                        className="hover:bg-muted flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Hide
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((message) => (
                        <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {message.role === 'assistant' && (
                            <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                              <svg className="w-3.5 h-3.5 text-accent-foreground" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                                <path d={svgPaths.p29a8a500} fill="currentColor" />
                              </svg>
                            </div>
                          )}
                          <div className={`max-w-[75%] rounded-md px-3 py-2 ${message.role === 'user' ? 'bg-accent text-accent-foreground ml-auto' : 'bg-muted/30 text-card-foreground'}`}>
                            <p className="text-sm leading-relaxed">{message.content}</p>
                            <div className="text-[10px] opacity-70 mt-1.5">
                              {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-border">
                      {isSelectingOnMap && (
                        <div className="mb-2 text-xs text-white">
                          Click on the map to add a polygon or point to your message.
                        </div>
                      )}
                      {selectedMapContext.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                          <div className="text-white">Selected:</div>
                          {selectedMapContext.map((item, idx) => (
                            <span
                              key={`${item.label}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-white bg-muted/30"
                              title={`${item.type} ${item.label ?? ''}`}
                            >
                              {item.label || item.type}
                              <button
                                className="ml-1 rounded hover:text-destructive"
                                onClick={() =>
                                  setSelectedMapContext(prev => prev.filter((_, i) => i !== idx))
                                }
                                aria-label="Remove context item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {aiContextItems.length > 0 && (
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                          <div className="text-white">Context:</div>
                          {aiContextItems.map((item, idx) => (
                            <span
                              key={`${item}-${idx}`}
                              className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-1 text-accent bg-accent/10"
                            >
                              {item}
                              <button
                                className="ml-1 rounded hover:text-accent/80"
                                onClick={() => {
                                  setSelectedContextItem(item);
                                  setContextModalOpen(true);
                                }}
                                aria-label="View aligned data"
                                title="View aligned data"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </button>
                              <button
                                className="ml-1 rounded hover:text-destructive"
                                onClick={() => removeAIContext(item)}
                                aria-label="Remove context item"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                <div className="flex gap-2">
                  <Input
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 bg-input-background border-border text-card-foreground"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSendMessage();
                            }
                          }}
                        />
                  <Button
                    onClick={() => {
                      // File upload functionality placeholder
                      console.log('File upload clicked');
                    }}
                    size="sm"
                    variant="outline"
                    className="border-border"
                    title="Upload file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setIsSelectingOnMap((prev) => !prev)}
                    size="sm"
                    variant={isSelectingOnMap ? "default" : "outline"}
                    className={isSelectingOnMap ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border"}
                    title="Select polygon or point on map"
                  >
                    <Box className="w-4 h-4" />
                  </Button>
                        <Button
                          onClick={handleSendMessage}
                          size="sm"
                          className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          disabled={!chatInput.trim()}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                 ) : (
                  <div className="p-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMapChat(true)}
                      className="flex items-center gap-2 border-border hover:bg-accent hover:text-accent-foreground"
                    >
                      <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                        <path d={svgPaths.p29a8a500} fill="currentColor" />
                      </svg>
                      PRATUS AI
                    </Button>
                  </div>
                 )}
              </div>
                  </div>
                </div>
              )}
              {leftPanelCollapsed && (
                <div
                  className="absolute bottom-0 left-0 z-40 cursor-pointer opacity-80 hover:opacity-100"
                  style={{ top: '0', width: '5vw', backgroundColor: '#000000' }}
                  onClick={() => setLeftPanelCollapsed(false)}
                  title="Expand panel"
                />
              )}
            </>
          ) : (
            <div className="absolute left-0 right-0 bottom-0 border-t border-border">
              <div className="relative flex flex-col bg-background" style={{ height: '50vh' }}>
                {/* Drag-to-bottom handle removed */}
                <div className="border-b border-border flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <PlanningPStepper
                      phases={displayedPeriod.phases}
                      currentPhaseId={currentPhaseId}
                      onPhaseSelect={setCurrentPhaseId}
                      operationalPeriodNumber={displayedPeriod.number}
                      notificationCount={(() => {
                        const alertsPhase = displayedPeriod.phases.find(p => p.id === 'alerts');
                        const alertsData = alertsPhase?.data?.alerts || [];
                        const boomDataLayerArchived = alertsPhase?.data?.boomDataLayerArchived || false;
                        const sitrepArchived = alertsPhase?.data?.sitrepArchived || false;
                        const safetyCheckArchived = alertsPhase?.data?.safetyCheckArchived || false;
                        const incidentActivationResponded = alertsPhase?.data?.incidentActivationResponded || false;
                        let customNotifications = 4; // civil disturbance, boom data layer review, SITREP review, safety check, acknowledgement (minus archived/responded)
                        if (boomDataLayerArchived) customNotifications--;
                        if (sitrepArchived) customNotifications--;
                        if (safetyCheckArchived) customNotifications--;
                        if (incidentActivationResponded) customNotifications--;
                        return (alertsData.length || 4) + customNotifications; // default to 4 dynamic alerts if not loaded
                      })()}
                    />
                    <div className="mr-20">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMapChat(!showMapChat)}
                        className={`flex items-center gap-2 transition-all duration-200 ${showMapChat ? 'bg-accent text-accent-foreground border-accent hover:bg-accent/90' : 'border-border text-foreground hover:bg-accent hover:text-accent-foreground'}`}
                      >
                        <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                          <path d={svgPaths.p29a8a500} fill="currentColor" />
                        </svg>
                        PRATUS AI
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  {showMapChat ? (
                    <div className="h-full flex overflow-hidden">
                      <div className="flex-1 min-w-0 overflow-y-auto p-6">
                        {renderCurrentPhase()}
                      </div>
                      <div className="w-1/3 bg-card border-l border-border flex flex-col">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                              <path d={svgPaths.p29a8a500} fill="currentColor" />
                            </svg>
                            PRATUS AI
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowMapChat(false)}
                            className="hover:bg-muted flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Hide
                          </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {chatMessages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              {message.role === 'assistant' && (
                                <div className="w-7 h-7 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                                  <svg className="w-3.5 h-3.5 text-accent-foreground" fill="none" preserveAspectRatio="none" viewBox="0 0 56 56">
                                    <path d={svgPaths.p29a8a500} fill="currentColor" />
                                  </svg>
                                </div>
                              )}
                              <div className={`max-w-[75%] rounded-md px-3 py-2 ${message.role === 'user' ? 'bg-accent text-accent-foreground ml-auto' : 'bg-muted/30 text-card-foreground'}`}>
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                <div className="text-[10px] opacity-70 mt-1.5">
                                  {message.timestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 border-t border-border">
                          {isSelectingOnMap && (
                            <div className="mb-2 text-xs text-white">
                              Click on the map to add a polygon or point to your message.
                            </div>
                          )}
                {selectedMapContext.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="text-white">Selected:</div>
                    {selectedMapContext.map((item, idx) => (
                      <span
                        key={`${item.label}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-white bg-muted/30"
                        title={`${item.type} ${item.label ?? ''}`}
                      >
                        {item.label || item.type}
                        <button
                          className="ml-1 rounded hover:text-destructive"
                          onClick={() =>
                            setSelectedMapContext(prev => prev.filter((_, i) => i !== idx))
                          }
                          aria-label="Remove context item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                {aiContextItems.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <div className="text-white text-sm">Context:</div>
                    {aiContextItems.map((item, idx) => (
                      <span
                        key={`${item}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-accent px-2 py-1 text-accent bg-accent/10"
                      >
                        {item}
                        <button
                          className="ml-1 rounded hover:text-destructive"
                          onClick={() => removeAIContext(item)}
                          aria-label="Remove context item"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                          <div className="flex gap-2">
                            <Input
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Type a message..."
                              className="flex-1 bg-input-background border-border text-card-foreground"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSendMessage();
                                }
                              }}
                            />
                            <Button
                              onClick={() => setIsSelectingOnMap((prev) => !prev)}
                              size="sm"
                              variant={isSelectingOnMap ? "default" : "outline"}
                              className={isSelectingOnMap ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border"}
                              title="Select polygon or point on map"
                            >
                              <Box className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={handleSendMessage}
                              size="sm"
                              className="bg-accent hover:bg-accent/90 text-accent-foreground"
                              disabled={!chatInput.trim()}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto p-6">
                      {renderCurrentPhase()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context Item Modal */}
      <Dialog open={contextModalOpen} onOpenChange={setContextModalOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{selectedContextItem}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Aligned Data
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 text-center text-foreground">
            <p>Placeholder for aligned data</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}