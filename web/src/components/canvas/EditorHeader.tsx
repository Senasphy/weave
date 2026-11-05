'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditorStore } from '@/store/editorStore';
import { api } from '@/lib/api';
import {
  Save,
  Check,
  Play,
  Upload,
  ShieldCheck,
  Sparkles,
  X,
  Loader2,
  Workflow,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function EditorHeader() {
  const router = useRouter();
  const {
    workflowId,
    workflowName,
    graph,
    isDirty,
    setIsDirty,
    setDiagnostics,
    semanticHash,
  } = useEditorStore();

  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<number | null>(null);

  // Run modal state
  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [runInput, setRunInput] = useState('{\n  "ticket": "Customer requested $150 refund for damaged item."\n}');
  const [isStartingRun, setIsStartingRun] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.saveWorkflowDraft(workflowId, graph);
      setIsDirty(false);
    } catch (err: any) {
      alert(`Failed to save draft: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const res = await api.validateWorkflow(workflowId, graph);
      setDiagnostics(res.diagnostics, res.semantic_hash);
    } catch (err: any) {
      alert(`Validation request failed: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      // Save draft first
      await api.saveWorkflowDraft(workflowId, graph);
      setIsDirty(false);

      const ver = await api.publishWorkflow(workflowId);
      setPublishSuccess(ver.version_number);
      setTimeout(() => setPublishSuccess(null), 4000);
    } catch (err: any) {
      // Run validation to show errors in panel
      const res = await api.validateWorkflow(workflowId, graph);
      setDiagnostics(res.diagnostics, res.semantic_hash);
      alert(`Cannot publish: ${err.message}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleStartRun = async () => {
    setIsStartingRun(true);
    try {
      let parsedInput = {};
      try {
        parsedInput = JSON.parse(runInput);
      } catch {
        alert('Invalid JSON input syntax');
        setIsStartingRun(false);
        return;
      }

      // Fetch or publish version 1
      let versions = await api.listVersions(workflowId);
      if (versions.length === 0) {
        // Automatically publish draft as version 1
        await handlePublish();
        versions = await api.listVersions(workflowId);
      }

      const latestVersion = versions[0];
      const run = await api.createRun(workflowId, latestVersion.version_number, {
        input: parsedInput,
      });

      router.push(`/runs/${run.id}`);
    } catch (err: any) {
      alert(`Failed to start run: ${err.message}`);
      setIsStartingRun(false);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-5 select-none z-20 shrink-0">
      {/* Left: Workflow metadata */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded border border-border bg-slate-50 text-slate-700 flex items-center justify-center shrink-0">
          <Workflow className="w-3.5 h-3.5 text-slate-500" />
        </div>

        <div className="flex items-center gap-2.5">
          <h1 className="text-xs font-semibold text-foreground tracking-tight">
            {workflowName || graph.name}
          </h1>

          {/* Unsaved changes badge */}
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>unsaved changes</span>
            </span>
          )}

          {/* Hash badge */}
          {semanticHash && (
            <span
              className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
              title={`Semantic Hash: ${semanticHash}`}
            >
              hash: {semanticHash.slice(0, 8)}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Published success banner */}
        {publishSuccess && (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>published v{publishSuccess}</span>
          </span>
        )}

        {/* Save Draft */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-border transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        {/* Validate */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={isValidating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-border transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isValidating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{isValidating ? 'Validating...' : 'Validate'}</span>
        </button>

        {/* Publish */}
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-white hover:bg-slate-50 text-slate-900 border border-border transition-colors disabled:opacity-40 cursor-pointer"
        >
          {isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{isPublishing ? 'Publishing...' : 'Publish Version'}</span>
        </button>

        {/* Run */}
        <button
          type="button"
          onClick={() => setIsRunModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run</span>
        </button>
      </div>

      {/* Radix UI Dialog Run Modal */}
      <Dialog.Root open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in-0 duration-150" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-white border border-border rounded p-5 shadow-modal focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded border border-border bg-slate-50 text-slate-700 flex items-center justify-center">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-semibold text-foreground tracking-tight">
                    Run Workflow
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    Provide initial input for the workflow. Each step will execute and update in real-time.
                  </Dialog.Description>
                </div>
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Input payload textarea */}
            <div className="mt-4 space-y-1.5">
              <label className="block text-[11px] font-medium text-slate-700">
                Input Payload (JSON)
              </label>
              <textarea
                rows={5}
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder='{\n  "ticket": "Customer issue..."\n}'
                className="w-full bg-slate-50 border border-border rounded p-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-slate-400 focus:bg-white transition-colors resize-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>

              <button
                type="button"
                disabled={isStartingRun}
                onClick={handleStartRun}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isStartingRun ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Triggering Run...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Execute Run</span>
                  </>
                )}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
}
