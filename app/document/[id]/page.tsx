"use client";
import React, { useEffect, useCallback } from "react";
import { YDocProvider } from "@y-sweet/react";
import { usePathname } from "next/navigation";
import { SlateEditor } from "../../../components/slate/SlateEditor";
import { Button } from "../../../components/ui/button";
import EditableDocTitle from "../../../components/document/editable-doc-title";
import CopyLink from "../../../components/document/copy-link";
import PermissionsToggle from "../../../components/document/permissions-toggle";
import InviteByEmail from "../../../components/document/invite-by-email";
import { getDocMetadata, saveDocumentVersion } from "@/utils/supabase/queries";
import Loading from "@/components/loading";

export type DocumentMetadata = {
  name: string;
  id: string;
  doc_id: string;
  is_public?: boolean;
  owner_name?: string;
  owner_email?: string;
  last_editor?: string;
  updated_at?: string;
};

export default function DocumentPage() {
  const pathname = usePathname();
  const docId = pathname.split("/").pop();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [toolTipMessage, setToolTipMessage] = React.useState("");
  const [docMetadata, setDocMetadata] = React.useState<DocumentMetadata | null>(
    null,
  );
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    async function fetchDocMetadata() {
      if (!docId) return;

      let { data: docsData, error } = await getDocMetadata(docId);

      if (error || !docsData) {
        setError(error ?? "Document not found");
        setLoading(false);
        return;
      }

      if (docsData) {
        setDocMetadata({
          name: docsData.name ?? "Untitled Document",
          id: docsData.id,
          doc_id: docsData.doc_id,
          is_public: docsData.is_public,
          owner_name: docsData.owner_name,
          owner_email: docsData.owner_email,
          last_editor: docsData.last_editor,
          updated_at: docsData.updated_at
        });
        setLoading(false);
      }
    }

    fetchDocMetadata();
  }, [docId]);

  const handleSaveVersion = useCallback(async (documentContent: string) => {
    if (!docId) return;
    
    try {
      const result = await saveDocumentVersion(docId, documentContent);
      if (result?.error) {
        console.error("Error saving version:", result.error);
        setToolTipMessage(`Error: ${result.error}`);
      } else if (result?.data) {
        setToolTipMessage(`Version ${result.data.version_number} saved!`);
        setTimeout(() => setToolTipMessage(""), 2000);
      }
    } catch (err) {
      console.error("Failed to save version:", err);
    }
  }, [docId]);

  const handleManualSave = useCallback(async () => {
    // This is a placeholder for manual saves
    // In a real implementation, you would extract the content from the editor
    handleSaveVersion("Manual save triggered");
  }, [handleSaveVersion]);

  if (loading) {
    return <Loading />;
  } else if (!docId || error) {
    return <div>{error ?? "Document not found"}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center py-3 text-sm">
        <div>
          <EditableDocTitle
            docId={docId}
            setDocMetadata={setDocMetadata}
            docMetadata={docMetadata}
          />
          {docMetadata?.owner_name && (
            <div className="text-xs text-muted-foreground">
              Created by {docMetadata.owner_name} 
              {docMetadata.last_editor && ` • Last edited by ${docMetadata.last_editor}`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleManualSave} variant="outline">
            Save Version
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>Share</Button>
        </div>
      </div>
      <YDocProvider docId={docId} authEndpoint="/api/auth">
        <SlateEditor onContentChange={handleSaveVersion} />
      </YDocProvider>
      {isModalOpen && docMetadata && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative bg-white rounded-lg p-6 w-full max-w-lg text-black ">
            <h2 className="text-2xl mb-4">Share document</h2>
            <InviteByEmail
              id={docMetadata.id}
              setToolTipMessage={setToolTipMessage}
            />
            <PermissionsToggle
              docId={docId}
              documentMetadata={docMetadata}
              setDocumentMetadata={setDocMetadata}
              setToolTipMessage={setToolTipMessage}
            />
            <div className="flex gap-4 pt-6">
              <CopyLink docId={docId} setToolTipMessage={setToolTipMessage} />
              <button onClick={() => setIsModalOpen(false)}>Done</button>
              {toolTipMessage && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-800 text-white text-sm py-1 px-3 rounded shadow-lg">
                  {toolTipMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
