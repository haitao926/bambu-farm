"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { getStreamMp4Url } from "@/lib/streams";

interface VideoStreamProps {
  streamName?: string | null;
  label?: string;
  className?: string;
  placeholderText?: string;
  emptyText?: string;
}

export function VideoStream({
  streamName,
  label,
  className,
  placeholderText,
  emptyText,
}: VideoStreamProps) {
  const [hasError, setHasError] = useState(false);
  const streamUrl = streamName ? getStreamMp4Url(streamName) : null;
  const showPlaceholder = !streamUrl || hasError;

  return (
    <div
      className={cn(
        "aspect-video w-full overflow-hidden rounded-lg border border-border/50 bg-black/90 relative",
        className
      )}
    >
      {!showPlaceholder && (
        <video
          className="h-full w-full object-cover"
          src={streamUrl}
          autoPlay
          muted
          playsInline
          controls
          onError={() => setHasError(true)}
        />
      )}
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground font-mono">
          {streamName
            ? placeholderText ?? "[ NO SIGNAL ]"
            : emptyText ?? "[ NO STREAM ]"}
        </div>
      )}
      {label && (
        <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-mono text-green-300/90">
          {label}
        </div>
      )}
    </div>
  );
}
