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
  X,
  Loader2,
  Workflow,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
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
    <header className="h-14 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-5 select-none z-20 shrink-0 gap-2">
      {/* Left: Workflow metadata */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl border border-border bg-secondary text-foreground flex items-center justify-center shrink-0 shadow-sm">
          <Workflow className="w-4 h-4" />
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs font-semibold text-foreground tracking-tight truncate max-w-[120px] sm:max-w-none">
            {workflowName || graph.name}
          </h1>

          {/* Unsaved changes badge */}
          {isDirty && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="hidden sm:inline">unsaved changes</span>
            </span>
          )}

          {/* Hash badge */}
          {semanticHash && (
            <span
              className="text-[10px] font-mono text-muted-foreground bg-secondary border border-border px-2 py-0.5 rounded-full hidden sm:inline-block"
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
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>published v{publishSuccess}</span>
          </span>
        )}

        {/* Save Draft */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary bg-card border border-border transition-all disabled:opacity-40 cursor-pointer shadow-sm"
        >
          {isSaving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Draft'}</span>
        </button>

        {/* Validate */}
        <button
          type="button"
          onClick={handleValidate}
          disabled={isValidating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary bg-card border border-border transition-all disabled:opacity-40 cursor-pointer shadow-sm"
        >
          {isValidating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">{isValidating ? 'Validating...' : 'Validate'}</span>
        </button>

        {/* Publish */}
        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary bg-card border border-border transition-all disabled:opacity-40 cursor-pointer shadow-sm"
        >
          {isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
          )}
          <span className="hidden sm:inline">{isPublishing ? 'Publishing...' : 'Publish'}</span>
        </button>

        {/* Run */}
        <button
          type="button"
          onClick={() => setIsRunModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer shadow-md"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run</span>
        </button>
      </div>

      {/* Radix UI Dialog Run Modal */}
      <Dialog.Root open={isRunModalOpen} onOpenChange={setIsRunModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-150" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl focus:outline-none animate-in fade-in-0 zoom-in-95 duration-150 text-foreground">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl border border-border bg-secondary text-foreground flex items-center justify-center shadow-sm">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
                <div>
                  <Dialog.Title className="text-sm font-semibold text-foreground tracking-tight">
                    Run Workflow
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                    Provide initial input for the workflow. Each step will execute in real-time.
                  </Dialog.Description>
                </div>
              </div>

              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {/* Input payload textarea */}
            <div className="mt-5 space-y-1.5">
              <label className="block text-[11px] font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                Input Payload (JSON)
              </label>
              <textarea
                rows={5}
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder='{\n  "ticket": "Customer issue..."\n}'
                className="w-full bg-secondary border border-border rounded-xl p-3 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-white/20 transition-all resize-none"
              />
            </div>

            {/* Modal Footer */}
            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-border">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </Dialog.Close>

              <button
                type="button"
                disabled={isStartingRun}
                onClick={handleStartRun}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-md"
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
