import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useUnitDetail,
  useProcessUnit,
  useProcessingStatus,
  useUpdateUnitStatus,
} from "../hooks/useUnits";
import { useQuiz } from "../hooks/useQuiz";
import { useResources } from "../hooks/useResources";
import ResourceCard from "../components/ResourceCard";
import Badge from "../components/ui/Badge";
import Spinner from "../components/ui/Spinner";
import { loadGsap } from "../utils/gsap";
import usePageTitle from "../hooks/usePageTitle";

type Tab = "quiz" | "resources";

export default function UnitPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("quiz");
  const shellRef = useRef<HTMLDivElement | null>(null);
  const autoStatusRequestedRef = useRef<string | null>(null);

  const { data: unit, isLoading, isError, refetch } = useUnitDetail(unitId!);
  const processUnit = useProcessUnit();
  const {
    mutate: mutateUnitStatus,
    isPending: isStatusUpdatePending,
  } = useUpdateUnitStatus();

  const { data: processingStatus } = useProcessingStatus(
    unitId!,
    !!unitId && !(unit?.is_processed ?? true),
  );
  const unitStatus = unit?.status;
  const unitDataId = unit?.id;

  const { data: quiz } = useQuiz(unitId!, unit?.is_processed ?? false);
  const { data: resources } = useResources(unitId!, unit?.is_processed ?? false);
  usePageTitle(unit?.title ? `${unit.title} - Unit Deep Dive` : "Unit Deep Dive");

  useEffect(() => {
    if (
      processingStatus?.status === "completed" ||
      processingStatus?.status === "failed"
    ) {
      refetch();
      queryClient.invalidateQueries({ queryKey: ["units", unitId, "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["units", unitId, "resources"] });
    }
  }, [processingStatus?.status, refetch, queryClient, unitId]);

  useEffect(() => {
    if (!unitDataId || unitStatus !== "not_started") return;
    if (autoStatusRequestedRef.current === unitDataId || isStatusUpdatePending) {
      return;
    }
    autoStatusRequestedRef.current = unitDataId;
    mutateUnitStatus({ unitId: unitDataId, status: "in_progress" });
  }, [unitDataId, unitStatus, isStatusUpdatePending, mutateUnitStatus]);

  useEffect(() => {
    const runningTweens: Array<{ kill: () => void }> = [];
    let isCancelled = false;

    void loadGsap().then((gsap) => {
      if (!gsap || isCancelled || !shellRef.current) return;
      const sections = shellRef.current.querySelectorAll("[data-animate]");
      if (!sections.length) return;

      runningTweens.push(
        gsap.fromTo(
          sections,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            stagger: 0.08,
            ease: "power2.out",
          },
        ),
      );
    });

    return () => {
      isCancelled = true;
      runningTweens.forEach((tween) => tween.kill());
    };
  }, [unitId, unit?.is_processed, activeTab]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !unit) {
    return (
      <p className="py-12 text-center text-[var(--error)]">
        Failed to load unit details.
      </p>
    );
  }

  const showProcessing = processUnit.isPending || processingStatus?.status === "processing";

  return (
    <div ref={shellRef}>
      <button
        onClick={() => navigate(`/books/${unit.book_id}`)}
        className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        &larr; Back to Roadmap
      </button>

      <div data-animate className="surface-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{unit.title}</h1>
            <p className="meta-font mt-1 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              Pages {unit.start_page} - {unit.end_page}
            </p>
          </div>
          <Badge
            variant={
              unit.status === "completed"
                ? "green"
                : unit.status === "in_progress"
                  ? "yellow"
                  : "gray"
            }
          >
            {unit.status.replace("_", " ")}
          </Badge>
        </div>

        {/* Processing trigger */}
        {!unit.is_processed && !showProcessing && (
          <div className="mt-6 rounded-xl border border-[var(--primary-muted)] bg-[var(--primary-soft)] p-4">
            <p className="text-sm text-[var(--text-primary)]">
              This unit hasn't been processed yet. Process it to generate a quiz
              and find video resources.
            </p>
            <button
              onClick={() => processUnit.mutate(unitId!)}
              disabled={processUnit.isPending}
              className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {processUnit.isPending ? "Starting..." : "Process Unit"}
            </button>
          </div>
        )}

        {/* Processing spinner */}
        {showProcessing && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-[var(--warning-soft)] p-8">
            <Spinner className="h-10 w-10" />
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Processing unit...
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              Generating quiz questions and finding video resources
            </p>
          </div>
        )}

        {/* Processing failed */}
        {processingStatus?.status === "failed" && (
          <div className="mt-6 rounded-xl border border-[var(--error-soft)] bg-[var(--error-soft)] p-4">
            <p className="text-sm text-[var(--error)]">
              Processing failed: {processingStatus.error || "Unknown error"}
            </p>
            <button
              onClick={() => processUnit.mutate(unitId!)}
              className="mt-3 rounded-lg bg-[var(--error)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {unit.is_processed && (
        <div data-animate className="mt-8">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("quiz")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "quiz"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Quiz
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "resources"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              Video Resources
            </button>
          </div>

          <div className="mt-6">
            {activeTab === "quiz" && (
              <div>
                {quiz ? (
                  <div className="surface-card p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text-primary)]">
                          {quiz.questions.length} Questions
                        </h3>
                        <div className="mt-1 flex gap-4 text-sm text-[var(--text-secondary)]">
                          {quiz.best_score != null && (
                            <span>
                              Best Score: {Math.round(quiz.best_score)}%
                            </span>
                          )}
                          <span>{quiz.attempt_count} attempt(s)</span>
                        </div>
                      </div>
                      <Link
                        to={`/units/${unitId}/quiz`}
                        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
                      >
                        {quiz.attempt_count > 0 ? "Retake Quiz" : "Start Quiz"}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">No quiz available.</p>
                )}
              </div>
            )}

            {activeTab === "resources" && (
              <div className="space-y-4">
                {resources && resources.length > 0 ? (
                  resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-tertiary)]">
                    No video resources found.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mark complete button */}
      {unit.is_processed && unit.status !== "completed" && (
        <div data-animate className="mt-8 flex justify-end">
          <button
            onClick={() =>
              mutateUnitStatus({ unitId: unit.id, status: "completed" })
            }
            className="rounded-lg bg-[var(--success)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
}
