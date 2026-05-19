import * as React from "react";
import { ChatMessage } from "..";
import {
  FaImage,
  FaInfoCircle,
  FaPlay,
  FaRobot,
  FaUser,
  FaWrench,
} from "react-icons/fa";

import ReactMarkdown from "react-markdown";

type MessageComponentProps = ChatMessage & {
  showHandle?: boolean;
  groupedWithPrevious?: boolean;
};

function MessageComponent({
  source,
  content,
  kind,
  title,
  showHandle = true,
  groupedWithPrevious = false,
  activityItems,
}: MessageComponentProps) {
  const isAI = source === "api";
  const messageKind = kind ?? "text";

  const activityTrace = React.useMemo(() => {
    if (!isAI || messageKind !== "text" || !activityItems?.length) {
      return null;
    }

    const latest = activityItems[activityItems.length - 1];
    const count = activityItems.length;

    const kindLabel = (value: "tool_call" | "workflow_start" | "workflow_step") => {
      if (value === "tool_call") return "Tool";
      if (value === "workflow_start") return "Workflow start";
      return "Workflow step";
    };

    const stepsLabel = `${count} ${count === 1 ? "step" : "steps"}`;
    const latestLabel = `${kindLabel(latest.kind)}: ${latest.title}`;

    return (
      <details className="mb-2 rounded-xl border border-white/15 bg-white/5" open={false}>
        <summary className="cursor-pointer select-none list-none px-3 py-2 marker:hidden">
          <div className="flex items-center gap-2 text-xs text-white/90">
            <span className="text-white/60">▸</span>
            <span className="uppercase tracking-wide text-white/60">Activity</span>
            <span className="text-white/70">{stepsLabel}</span>
            <span className="text-white/40">•</span>
            <span className="truncate text-white/85">latest: {latestLabel}</span>
          </div>
        </summary>

        <div className="space-y-2 border-t border-white/10 px-3 py-2">
          {activityItems.map((activity, index) => (
            <div key={`${activity.kind}-${activity.timestamp}-${index}`} className="rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="mb-1 text-[11px] uppercase tracking-wide text-white/60">
                {kindLabel(activity.kind)}
              </div>
              <div className="text-sm text-white">{activity.title}</div>
              {activity.details ? (
                <div className="mt-1 text-xs text-white/75 whitespace-pre-wrap">{activity.details}</div>
              ) : null}
            </div>
          ))}
        </div>
      </details>
    );
  }, [activityItems, isAI, messageKind]);

  const renderBody = () => {
    if (messageKind === "image") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sky-200/80">
            <FaImage />
            <span>{title ?? "Imagen"}</span>
          </div>
          <img
            src={content}
            alt={title ?? "Imagen"}
            className="max-h-80 rounded-xl border border-white/10 object-cover shadow-lg"
          />
        </div>
      );
    }

    if (messageKind === "tool_call") {
      return (
        <div className="space-y-2">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-amber-50/90">
            {content}
          </pre>
        </div>
      );
    }

    if (messageKind === "workflow_start" || messageKind === "workflow_step") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-emerald-200/80">
            <FaPlay />
            <span>
              {title ??
                (messageKind === "workflow_start"
                  ? "Workflow started"
                  : "Workflow step")}
            </span>
          </div>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    }

    if (messageKind === "system") {
      return (
        <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-neutral-200">
          <FaInfoCircle className="mt-0.5 text-sky-300" />
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-sky-200/80">
              {title ?? "System"}
            </div>
            <div>{content}</div>
          </div>
        </div>
      );
    }

    return <ReactMarkdown>{content}</ReactMarkdown>;
  };

  return (
    <div
      className={`z-100 w-full flex ${isAI ? "justify-start" : "justify-end"
        } transition-all duration-300 ${groupedWithPrevious ? "mt-1" : "mt-4"}`}
    >
      <div
        className={`flex flex-col max-w-[80%] md:max-w-[70%] ${isAI ? "items-start" : "items-end"
          }`}
      >
        {showHandle && (
          <div
            className={`flex items-center gap-2 mb-1 text-xs ${isAI ? "flex-row" : "flex-row-reverse"
              }`}
          >
            {isAI ? (
              <FaRobot className="text-blue-400" />
            ) : (
              <FaUser className="text-gray-900" />
            )}
            <span className="text-gray-900">{isAI ? "PumAI" : "Tú"}</span>
          </div>
        )}

        {isAI && (
          <div className="w-full bg-white rounded-2xl text-neutral-900 px-4 py-3 text-sm leading-relaxed shadow-sm">
            {activityTrace}
            {renderBody()}
          </div>
        )}

        {!isAI && (
          <div
            className={`
            px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
            ${isAI
                ? "bg-white border border-white/10 text-neutral-900 rounded-tl-none"
                : "bg-[#1e3976] rounded-tr-none"
              }
            transition-all duration-300
          `}
          >
            {renderBody()}
          </div>
        )}
      </div>
    </div>
  );
}

export default MessageComponent;
