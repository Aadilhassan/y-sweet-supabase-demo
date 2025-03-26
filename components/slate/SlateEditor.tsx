"use client";

import { useYDoc, useYjsProvider, useAwareness } from "@y-sweet/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import Loading from "@/components/loading";
import RichtextSlateEditor from "./RichtextSlateEditor";
import { debounce } from "lodash"; // You'll need to install lodash

export function SlateEditor({ onContentChange }: { onContentChange?: (content: string) => void }) {
  const [connected, setConnected] = useState(false);

  const yDoc = useYDoc();
  const provider = useYjsProvider();
  const awareness = useAwareness();

  const sharedType = useMemo(() => {
    return yDoc.get("content", Y.XmlText) as Y.XmlText;
  }, [yDoc]);

  // Debounced function to save content
  const debouncedContentChange = useMemo(() => 
    debounce((content: string) => {
      if (onContentChange) {
        onContentChange(content);
      }
    }, 5000), // Save after 5 seconds of inactivity
    [onContentChange]
  );

  useEffect(() => {
    const handleSync = (isSynced: boolean) => setConnected(isSynced);
    provider.on("sync", handleSync);
    return () => provider.off("sync", handleSync);
  }, [provider]);

  // Observe changes to the document and save
  useEffect(() => {
    if (!sharedType || !onContentChange) return;
    
    // Set up observer to detect changes
    const observer = () => {
      // Extract content as JSON or string
      const contentString = sharedType.toString();
      debouncedContentChange(contentString);
    };

    sharedType.observe(observer);

    return () => {
      sharedType.unobserve(observer);
      debouncedContentChange.cancel();
    };
  }, [sharedType, debouncedContentChange, onContentChange]);

  if (!connected) return <Loading />;

  return (
    <div className="rounded-lg">
      <RichtextSlateEditor sharedType={sharedType} awareness={awareness} />
    </div>
  );
}
