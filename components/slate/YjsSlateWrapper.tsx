"use client";

import React from "react";
import { YDocProvider } from "@y-sweet/react";
import { SlateEditor } from "./SlateEditor";

export default function YjsSlateWrapper({
  docId,
  onContentChange
}: {
  docId: string;
  onContentChange?: (content: string) => void;
}) {
  return (
    <YDocProvider docId={docId} authEndpoint="/api/auth">
      <SlateEditor onContentChange={onContentChange} />
    </YDocProvider>
  );
}
