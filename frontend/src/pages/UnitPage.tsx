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

  // Refresh unit-related queries when background processing ends
  useEffect(() => {
    if (
      processingStatus?.status === "completed" ||
      processingStatus?.status === "failed"
    ) {
      refetch(); // refetch unit detail (updates is_processed flag)
      // Invalidate quiz and resources so they refetch with fresh data
      queryClient.invalidateQueries({ queryKey: ["units", unitId, "quiz"] });
      queryClient.invalidateQueries({ queryKey: ["units", unitId, "resources"] });
    }
  }, [processingStatus?.status, refetch, queryClient, unitId]);

  // Auto-mark as in_progress when visiting for the first time
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
      <p className="py-12 text-center text-red-600">
        Failed to load unit details.
      </p>
    );
  }

  const showProcessing = processUnit.isPending || processingStatus?.status === "processing";

  return (
    <div ref={shellRef}>
      <button
        onClick={() => navigate(`/books/${unit.book_id}`)}
        className="mb-4 text-sm text-gray-600 hover:text-gray-800"
      >
        &larr; Back to Roadmap
      </button>

      <div data-animate className="rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-950">{unit.title}</h1>
            <p className="meta-font mt-1 text-xs uppercase tracking-wide text-gray-500">
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
          <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm text-teal-900">
              This unit hasn't been processed yet. Process it to generate a quiz
              and find video resources.
            </p>
            <button
              onClick={() => processUnit.mutate(unitId!)}
              disabled={processUnit.isPending}
              className="mt-3 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
            >
              {processUnit.isPending ? "Starting..." : "Process Unit"}
            </button>
          </div>
        )}

        {/* Processing spinner */}
        {showProcessing && (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-xl bg-amber-50 p-8">
            <Spinner className="h-10 w-10" />
            <p className="text-sm font-medium text-gray-800">
              Processing unit...
            </p>
            <p className="text-xs text-gray-600">
              Generating quiz questions and finding video resources
            </p>
          </div>
        )}

        {/* Processing failed */}
        {processingStatus?.status === "failed" && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">
              Processing failed: {processingStatus.error || "Unknown error"}
            </p>
            <button
              onClick={() => processUnit.mutate(unitId!)}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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
                  ? "bg-teal-700 text-white"
                  : "bg-white/90 text-gray-600 hover:text-gray-900"
              }`}
            >
              Quiz
            </button>
            <button
              onClick={() => setActiveTab("resources")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "resources"
                  ? "bg-teal-700 text-white"
                  : "bg-white/90 text-gray-600 hover:text-gray-900"
              }`}
            >
              Video Resources
            </button>
          </div>

          <div className="mt-6">
            {activeTab === "quiz" && (
              <div>
                {quiz ? (
                  <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.8)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {quiz.questions.length} Questions
                        </h3>
                        <div className="mt-1 flex gap-4 text-sm text-gray-600">
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
                        className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
                      >
                        {quiz.attempt_count > 0 ? "Retake Quiz" : "Start Quiz"}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No quiz available.</p>
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
                  <p className="text-sm text-gray-500">
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
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
}
