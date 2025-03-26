"use client";

import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { getDocumentVersions, restoreDocumentVersion } from "@/utils/supabase/queries";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import Loading from "@/components/loading";

type DocumentVersion = {
  id: string;
  document_id: string;
  version_number: number;
  created_at: string;
  created_by: string;
  profiles: {
    display_name: string;
    email: string;
  };
};

interface DocumentHistoryProps {
  docId: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  setToolTipMessage: (message: string) => void;
  onVersionRestore: (content: string) => void;
}

export default function DocumentHistory({
  docId,
  isOpen,
  setIsOpen,
  setToolTipMessage,
  onVersionRestore,
}: DocumentHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      if (!isOpen) return;
      
      setLoading(true);
      const { data, error } = await getDocumentVersions(docId);
      
      if (error || !data) {
        setError(error || "Failed to load document history");
        setLoading(false);
        return;
      }
      
      setVersions(
        data.map((version: any) => ({
          ...version,
          profiles: Array.isArray(version.profiles) ? version.profiles[0] : version.profiles,
        }))
      );
      setLoading(false);
    }

    fetchVersions();
  }, [docId, isOpen]);

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  };

  const handleRestore = async (versionId: string) => {
    setLoading(true);
    const { data, error } = await restoreDocumentVersion(docId, versionId);
    
    if (error || !data) {
      setToolTipMessage(`Error: ${error || "Failed to restore version"}`);
      setLoading(false);
      return;
    }
    
    setToolTipMessage(`Version restored successfully!`);
    onVersionRestore(data.content);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Document History</DialogTitle>
          <DialogDescription>
            View and restore previous versions of this document.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loading />
          </div>
        ) : error ? (
          <div className="text-red-500 py-4">{error}</div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No version history available for this document.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr>
                  <th className="py-2 text-left">Version</th>
                  <th className="py-2 text-left">Created by</th>
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {versions.map((version) => (
                  <tr key={version.id} className="border-b">
                    <td className="py-2">Version {version.version_number}</td>
                    <td className="py-2">{version.profiles?.display_name || "Unknown"}</td>
                    <td className="py-2">{formatDate(version.created_at)}</td>
                    <td className="py-2 text-right">
                      <Button 
                        onClick={() => handleRestore(version.id)} 
                        size="sm" 
                        variant="outline"
                      >
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="flex justify-end gap-2 pt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}