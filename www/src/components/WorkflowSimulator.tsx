"use client";

import React, { useState, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Bot,
  GitBranch,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
} from "lucide-react";

interface StepData {
  id: string;
  name: string;
  type: "agent" | "router" | "gate" | "tool";
  modelOrRule: string;
  tokens: number;
  cost: number;
  latencyMs: number;
  status: "idle" | "running" | "waiting_human" | "completed";
  outputPreview: string;
}

const steps: StepData[] = [
  {
    id: "classify_ticket",
    name: "01 Extract & Classify",
    type: "agent",
    modelOrRule: "gemini-3.8-flash",
    tokens: 840,
    cost: 0.0084,
    latencyMs: 310,
    status: "completed",
    outputPreview: '{"category": "billing", "refund_amount": 150.00}',
  },
  {
    id: "check_threshold",
    name: "02 Routing Condition",
    type: "router",
    modelOrRule: "CEL: out.refund_amount > 100",
    tokens: 0,
    cost: 0.0,
    latencyMs: 1.2,
    status: "completed",
    outputPreview: 'Branch evaluated: true -> "manager_approval_gate"',
  },
  {
    id: "manager_approval_gate",
    name: "03 Human Gate",
    type: "gate",
    modelOrRule: "timeout: 86400s (fail-safe)",
    tokens: 0,
    cost: 0.0,
    latencyMs: 0,
    status: "waiting_human",
    outputPreview: "Run suspended. Worker lease freed until manager approves.",
  },
  {
    id: "stripe_refund",
    name: "04 Execute Action",
    type: "tool",
    modelOrRule: "tool: stripe_issue_refund",
    tokens: 0,
    cost: 0.005,
    latencyMs: 184,
    status: "idle",
    outputPreview: '{"status": "succeeded", "charge_id": "ch_3N8x7..."}',
  },
];

export function WorkflowSimulator() {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2); // Start at Gate
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [gateApproved, setGateApproved] = useState<boolean>(false);

  // Auto-play animation when playing
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev === 2 && !gateApproved) {
          // Pause at gate until approved
          setIsPlaying(false);
          return 2;
        }
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);

    return () => clearInterval(timer);
  }, [isPlaying, gateApproved]);

  const currentStep = steps[activeStepIndex];

  // Calculate cumulative tokens and spend
  const currentTokens = steps
    .slice(0, activeStepIndex + 1)
    .reduce((sum, s) => sum + s.tokens, 0);

  const currentCost = steps
    .slice(0, activeStepIndex + 1)
    .reduce((sum, s) => sum + s.cost, 0);

  const maxBudget = 0.5;
  const budgetPercent = Math.min(100, (currentCost / maxBudget) * 100);

  const handleApproveGate = () => {
    setGateApproved(true);
    setActiveStepIndex(3); // advance to tool step
  };

  const handleReset = () => {
    setActiveStepIndex(0);
    setGateApproved(false);
    setIsPlaying(false);
  };

  return (
    <div className="relative w-full rounded-2xl border border-umber-800/12 dark:border-cloud-100/12 bg-cloud-100/40 dark:bg-umber-950/40 p-4 sm:p-6 backdrop-blur-md shadow-card dark:shadow-card-dark">
      {/* Top HUD: Engine Telemetry & Budget Cap Meter */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-umber-800/10 dark:border-cloud-100/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full size-2 bg-umber-800 dark:bg-cloud-200"></span>
            <span className="text-[12px] font-mono font-medium text-umber-900 dark:text-cloud-100">
              {activeStepIndex === 2 && !gateApproved
                ? "RUN SUSPENDED • WAITING_HUMAN"
                : activeStepIndex === 3
                ? "RUN COMPLETED • 200 OK"
                : "STEP EXECUTING"}
            </span>
          </div>

          <span className="text-umber-400 dark:text-cloud-700">/</span>

          <span className="text-[12px] font-mono text-umber-600 dark:text-cloud-400">
            Compute Thread: {activeStepIndex === 2 && !gateApproved ? "Released (0 thread cost)" : "Active"}
          </span>
        </div>

        {/* Spend Cap Guard Pill */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] font-mono text-umber-500 dark:text-cloud-400">
              Budget: <span className="text-umber-900 dark:text-cloud-50 font-semibold">${currentCost.toFixed(4)}</span> / ${maxBudget.toFixed(2)}
            </div>
            <div className="mt-1 h-1.5 w-28 overflow-hidden rounded-full bg-umber-800/10 dark:bg-cloud-100/15">
              <div
                className="h-full bg-lilac-500 transition-all duration-300"
                style={{ width: `${Math.max(8, budgetPercent)}%` }}
              />
            </div>
          </div>

          {/* Scrubber Controls */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-umber-800/10 dark:border-cloud-100/10">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className="inline-flex size-7 items-center justify-center rounded-md border border-umber-800/15 dark:border-cloud-100/15 bg-cloud-50 dark:bg-umber-800 text-umber-800 dark:text-cloud-100 hover:bg-umber-800/5 transition-colors"
              title={isPlaying ? "Pause" : "Play step simulation"}
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex size-7 items-center justify-center rounded-md border border-umber-800/15 dark:border-cloud-100/15 bg-cloud-50 dark:bg-umber-800 text-umber-800 dark:text-cloud-100 hover:bg-umber-800/5 transition-colors"
              title="Reset simulation"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Step Track (Scrubber Nodes) */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {steps.map((step, idx) => {
          const isActive = idx === activeStepIndex;
          const isPast = idx < activeStepIndex;
          const isGateWaiting = idx === 2 && !gateApproved && idx <= activeStepIndex;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                setActiveStepIndex(idx);
                setIsPlaying(false);
              }}
              className={`text-left p-3 rounded-xl border transition-all duration-200 relative ${
                isActive
                  ? "border-lilac-500 bg-cloud-50 dark:bg-umber-900 shadow-sm ring-1 ring-lilac-500/50"
                  : isPast
                  ? "border-umber-800/15 dark:border-cloud-100/15 bg-cloud-50/70 dark:bg-umber-900/40 opacity-90"
                  : "border-umber-800/8 dark:border-cloud-100/8 bg-transparent opacity-60 hover:opacity-80"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono text-umber-500 dark:text-cloud-400 mb-1.5">
                <span className="flex items-center gap-1">
                  {step.type === "agent" && <Bot className="size-3 text-lilac-500" />}
                  {step.type === "router" && <GitBranch className="size-3 text-amber-500" />}
                  {step.type === "gate" && <ShieldAlert className="size-3 text-rose-500" />}
                  {step.type === "tool" && <Wrench className="size-3 text-umber-700 dark:text-cloud-300" />}
                  {step.type.toUpperCase()}
                </span>
                {isPast ? (
                  <CheckCircle2 className="size-3 text-umber-700 dark:text-cloud-300" />
                ) : isGateWaiting ? (
                  <Clock className="size-3 text-amber-500" />
                ) : null}
              </div>

              <div className="text-[13px] font-semibold text-umber-900 dark:text-cloud-50 truncate">
                {step.name.replace(/^\d+\s*/, "")}
              </div>

              <div className="mt-1 text-[11px] font-mono text-umber-600 dark:text-cloud-400 truncate">
                {step.modelOrRule}
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Inspector & Live Payload View */}
      <div className="mt-4 rounded-xl border border-umber-800/10 dark:border-cloud-100/10 bg-cloud-50 dark:bg-umber-900 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-umber-800/8 dark:border-cloud-100/8 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-medium text-umber-900 dark:text-cloud-50">
              Step Inspector: {currentStep.name}
            </span>
            <span className="rounded-md bg-lilac-500/15 px-1.5 py-0.5 text-[10px] font-mono text-lilac-700 dark:text-lilac-300">
              seq #{activeStepIndex + 1}
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-umber-600 dark:text-cloud-400">
            <span>Tokens: {currentStep.tokens}</span>
            <span>Cost: ${currentStep.cost.toFixed(4)}</span>
            <span>Latency: {currentStep.latencyMs}ms</span>
          </div>
        </div>

        {/* Payload / Action Box */}
        <div className="mt-3">
          <div className="text-[11px] font-mono text-umber-500 dark:text-cloud-400 mb-1">
            Deterministic Output Event:
          </div>
          <pre className="overflow-x-auto rounded-lg bg-umber-950 p-3 text-[12px] font-mono text-lilac-200 leading-relaxed">
            <code>{currentStep.outputPreview}</code>
          </pre>
        </div>

        {/* Human Gate Action Banner (when paused at gate) */}
        {activeStepIndex === 2 && !gateApproved && (
          <div className="mt-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="size-4.5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <div className="text-[12.5px] font-medium text-amber-900 dark:text-amber-200">
                  Manager Approval Required for Refund ($150.00 &gt; $100.00 cap)
                </div>
                <div className="text-[11px] text-amber-700 dark:text-amber-300/80">
                  Worker released compute resources. The workflow safely sleeps until a human approves.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApproveGate}
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-[12px] font-medium text-white shadow-xs transition-colors shrink-0"
            >
              <UserCheck className="size-3.5" />
              <span>Approve &amp; Resume</span>
            </button>
          </div>
        )}

        {/* Completed Run Summary (when step 3 is reached) */}
        {activeStepIndex === 3 && (
          <div className="mt-3.5 flex items-center justify-between gap-3 rounded-lg border border-cloud-300 dark:border-cloud-50/20 bg-cloud-100/60 dark:bg-umber-900/60 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-umber-800 dark:text-cloud-200 shrink-0" />
              <div className="text-[12px] font-medium text-umber-900 dark:text-cloud-100">
                Run Succeeded. All events saved to cloud log. $0.0134 total spent.
              </div>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-[11px] font-mono text-umber-800 dark:text-cloud-200 hover:underline"
            >
              Replay Trace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
