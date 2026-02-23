import { Check, Clock, ChevronDown, ArrowLeft, Calendar, BarChart3, FileText, Settings, Bell, AlertTriangle, MapPin, Box, Layers } from 'lucide-react';
import { DisasterPhase } from '../types/disaster';
import { Button } from './ui/button';

interface PlanningPStepperProps {
  phases: DisasterPhase[];
  currentPhaseId: string;
  onPhaseSelect: (phaseId: string) => void;
  operationalPeriodNumber?: number;
  showHeader?: boolean;
  notificationCount?: number;
  incidentNotificationCount?: number;
}

export function PlanningPStepper({ phases, currentPhaseId, onPhaseSelect, operationalPeriodNumber = 0, showHeader = true, notificationCount = 0, incidentNotificationCount = 0 }: PlanningPStepperProps) {
  
  return (
    <div className="px-4 bg-card border-b border-border">
      {/* Horizontal Tab Navigation */}
      <div className="flex items-center justify-center gap-1 overflow-x-auto">
        {phases.map((phase) => {
          const isActive = phase.id === currentPhaseId;

          // Get descriptive text for Operational Period 0 phases
          const getDescriptiveText = () => {
            if (operationalPeriodNumber !== 0) return null;
            if (phase.id === 'overview') return 'ICS-201';
            if (phase.id === 'objectives-actions') return 'ICS-202';
            if (phase.id === 'incident-roster') return 'ICS-203';
            if (phase.id === 'safety-analysis') return 'ICS-208';
            return null;
          };

          const descriptiveText = getDescriptiveText();

          return (
            <button
              key={phase.id}
              onClick={() => onPhaseSelect(phase.id)}
              className={`relative px-4 py-3 transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-accent'
                  : 'text-foreground hover:text-accent'
              }`}
              title={phase.shortName}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  {phase.id === 'alerts' && notificationCount > 0 && (
                    <div 
                      className="rounded-full text-white"
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: '#ef4444',
                        zIndex: 9999,
                        position: 'relative',
                        border: '2px solid #ef4444',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '20px'
                      }}
                    >
                      {notificationCount}
                    </div>
                  )}
                  {phase.id === 'alerts' && <Bell className="w-4 h-4" />}
                  {phase.id === 'overview' && <FileText className="w-4 h-4" />}
                  {phase.id === 'objectives-actions' && incidentNotificationCount > 0 && (
                    <div 
                      className="rounded-full text-white"
                      style={{ 
                        width: '20px', 
                        height: '20px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: '#ef4444',
                        zIndex: 9999,
                        position: 'relative',
                        border: '2px solid #ef4444',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        lineHeight: '20px'
                      }}
                    >
                      {incidentNotificationCount}
                    </div>
                  )}
                  {phase.id === 'objectives-actions' && <AlertTriangle className="w-4 h-4" />}
                  {phase.id === 'incident-roster' && <MapPin className="w-4 h-4" />}
                  {phase.id === 'resources' && <Box className="w-4 h-4" />}
                  {phase.id === 'layers' && <Layers className="w-4 h-4" />}
                  {phase.id === 'planning-p' && <span className="w-4 h-4 flex items-center justify-center font-bold text-xs">P</span>}
                </div>
                
                {/* Descriptive text for Operational Period 0 */}
                {descriptiveText && (
                  <span className="caption text-muted-foreground/60">
                    {descriptiveText}
                  </span>
                )}
              </div>
              
              {/* Active indicator line */}
              {isActive && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}