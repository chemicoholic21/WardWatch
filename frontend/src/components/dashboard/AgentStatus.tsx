'use client';

import { useState } from 'react';
import { Bot, Ghost, Shield, Route, BarChart3, FileText, Play, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  type: string;
  description: string;
  icon: React.ElementType;
  status: 'idle' | 'running' | 'completed';
  lastRun?: string;
  color: string;
  metrics?: {
    tasksCompleted: number;
    avgDuration: string;
  };
}

const agents: Agent[] = [
  {
    id: 'ghost-hunter',
    name: 'Ghost Hunter',
    type: 'ghost-hunter',
    description: 'Detects unresponsive government offices using complaint patterns',
    icon: Ghost,
    status: 'completed',
    lastRun: '5 minutes ago',
    color: 'from-purple-500 to-pink-500',
    metrics: { tasksCompleted: 156, avgDuration: '2.3s' },
  },
  {
    id: 'scam-detector',
    name: 'TrustLens Detector',
    type: 'scam-detector',
    description: 'Analyzes messages for scam indicators and impersonation',
    icon: Shield,
    status: 'running',
    lastRun: 'Just now',
    color: 'from-red-500 to-orange-500',
    metrics: { tasksCompleted: 234, avgDuration: '1.8s' },
  },
  {
    id: 'escalation-tracer',
    name: 'Escalation Tracer',
    type: 'escalation-tracer',
    description: 'Traces complaint escalation paths like distributed system traces',
    icon: Route,
    status: 'idle',
    lastRun: '10 minutes ago',
    color: 'from-blue-500 to-cyan-500',
    metrics: { tasksCompleted: 89, avgDuration: '3.1s' },
  },
  {
    id: 'civic-analyzer',
    name: 'Civic Analyzer',
    type: 'civic-analyzer',
    description: 'Provides civic health scores and performance analytics',
    icon: BarChart3,
    status: 'idle',
    lastRun: '15 minutes ago',
    color: 'from-green-500 to-emerald-500',
    metrics: { tasksCompleted: 67, avgDuration: '4.5s' },
  },
  {
    id: 'rti-drafter',
    name: 'RTI Drafter',
    type: 'rti-drafter',
    description: 'Generates RTI applications based on complaint patterns',
    icon: FileText,
    status: 'idle',
    lastRun: '1 hour ago',
    color: 'from-yellow-500 to-amber-500',
    metrics: { tasksCompleted: 23, avgDuration: '5.2s' },
  },
];

interface Props {
  fullView?: boolean;
}

export function AgentStatus({ fullView = false }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const displayAgents = fullView ? agents : agents.slice(0, 4);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold">OpenClaw Agents</h2>
            <p className="text-sm text-muted-foreground">AI-powered civic intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400">
              {agents.filter(a => a.status === 'running').length} Running
            </span>
          </span>
        </div>
      </div>

      {/* Agent Grid */}
      <div className={cn(
        'p-4 grid gap-4',
        fullView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 md:grid-cols-4'
      )}>
        {displayAgents.map((agent) => {
          const Icon = agent.icon;
          const isSelected = selectedAgent === agent.id;

          return (
            <div
              key={agent.id}
              className={cn(
                'p-4 rounded-xl border transition-all cursor-pointer',
                isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                agent.status === 'running' && 'ring-2 ring-green-500/20'
              )}
              onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={cn(
                  'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center',
                  agent.color
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
                  agent.status === 'running' && 'bg-green-500/20 text-green-400',
                  agent.status === 'completed' && 'bg-blue-500/20 text-blue-400',
                  agent.status === 'idle' && 'bg-gray-500/20 text-gray-400'
                )}>
                  {agent.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {agent.status === 'completed' && <Check className="w-3 h-3" />}
                  {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                </div>
              </div>

              <h3 className="font-semibold mb-1">{agent.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {agent.description}
              </p>

              {agent.metrics && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{agent.metrics.tasksCompleted} tasks</span>
                  <span>Avg: {agent.metrics.avgDuration}</span>
                </div>
              )}

              {agent.lastRun && (
                <p className="text-xs text-muted-foreground mt-2">
                  Last run: {agent.lastRun}
                </p>
              )}

              {/* Quick Action */}
              {fullView && (
                <button
                  className={cn(
                    'mt-4 w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all',
                    agent.status === 'running'
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-primary/20 text-primary hover:bg-primary/30'
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle agent action
                  }}
                >
                  {agent.status === 'running' ? (
                    <>Stop</>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Task
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {!fullView && (
        <div className="p-4 border-t border-border text-center">
          <button className="text-sm text-primary hover:underline">
            Manage All Agents →
          </button>
        </div>
      )}
    </div>
  );
}
