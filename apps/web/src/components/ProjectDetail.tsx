import { useEffect, useState } from "react";
import type { AiInsight, ProjectDetail as ProjectDetailType } from "../api/types";
import { api, ApiError } from "../api/client";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { HealthScorePanel } from "./HealthScorePanel";
import { formatBytes } from "../lib/formatBytes";

interface Props {
  project: ProjectDetailType;
  /** Optional: notified when an AI explain call starts/finishes, so a host view (e.g.
   * Graph Mode's central core) can reflect real in-flight activity — never fabricated. */
  onExplainInFlightChange?: (inFlight: boolean) => void;
}

export function ProjectDetail({ project, onExplainInFlightChange }: Props) {
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [explainState, setExplainState] = useState<"idle" | "loading" | "error">("idle");
  const [explainError, setExplainError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInsights([]);
    api
      .listInsights(project.id)
      .then((list) => {
        if (!cancelled) setInsights(list);
      })
      .catch(() => {
        /* non-fatal: insights history is a convenience, not required for the page to work */
      });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  async function handleExplain() {
    setExplainState("loading");
    setExplainError(null);
    onExplainInFlightChange?.(true);
    try {
      const insight = await api.explainProject(project.id);
      setInsights((prev) => [insight, ...prev]);
      setExplainState("idle");
    } catch (err) {
      setExplainState("error");
      setExplainError(err instanceof ApiError ? err.message : "Could not generate an explanation.");
    } finally {
      onExplainInFlightChange?.(false);
    }
  }

  const latestScan = project.scanResults[0];

  return (
    <div className="project-detail">
      <h2>{project.name}</h2>
      <p className="project-path">{project.rootPath}</p>

      {latestScan && (
        <p className="scan-size-line">
          {latestScan.fileCount} files scanned · {formatBytes(latestScan.totalSizeBytes)}
          {latestScan.truncated && " · scan truncated at safety limit"}
          {" · "}
          <span title="node_modules, .git, build output, vendor/dependency folders, and other excluded paths are skipped by default and not counted here.">
            excludes build/dependency folders (why?)
          </span>
        </p>
      )}

      <section>
        <h3>Project Health Score</h3>
        <HealthScorePanel healthScore={project.healthScore} />
      </section>

      {project.technologies.length > 0 && (
        <div className="tech-stack-pills">
          {project.technologies.map((t) => (
            <span key={t.id} className={`tech-pill tech-pill-${t.kind}`}>
              {t.name}
            </span>
          ))}
        </div>
      )}

      <section>
        <h3>Facts detected from files</h3>
        {project.evidence.length === 0 ? (
          <p className="empty-state-hint">No deterministic evidence recorded.</p>
        ) : (
          <ul className="evidence-list">
            {project.evidence.map((e) => (
              <li key={e.id}>
                <strong>{e.key}:</strong> {e.value} <ConfidenceBadge confidence={e.confidence} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3>AI interpretation (rule-based, not model-generated)</h3>
        {project.intelligenceProfile ? (
          <div className="intelligence-profile">
            <p>
              {project.intelligenceProfile.description} <ConfidenceBadge confidence={project.intelligenceProfile.confidence} />
            </p>
            <p>{project.intelligenceProfile.architectureSummary}</p>
            <p>{project.intelligenceProfile.healthSummary}</p>
          </div>
        ) : (
          <p className="empty-state-hint">No intelligence profile yet — rescan the workspace.</p>
        )}
      </section>

      {project.recommendations.length > 0 && (
        <section>
          <h3>Recommendations</h3>
          <ul>
            {project.recommendations.map((r) => (
              <li key={r.id}>
                {r.text} <ConfidenceBadge confidence={r.confidence} />
                <div className="recommendation-rationale">{r.rationale}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>AI explanation</h3>
        <button type="button" onClick={handleExplain} disabled={explainState === "loading"}>
          {explainState === "loading" ? "Asking AI…" : "Explain this project"}
        </button>
        {explainState === "error" && <p className="error-banner">{explainError}</p>}
        {insights.length === 0 && explainState !== "loading" && (
          <p className="empty-state-hint">No AI explanation generated yet for this project.</p>
        )}
        <ul className="insight-list">
          {insights.map((insight) => (
            <li key={insight.id}>
              <p>
                {insight.outputText} <ConfidenceBadge confidence={insight.confidence} />
              </p>
              <span className="insight-meta">
                provider: {insight.providerMode} · {new Date(insight.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
