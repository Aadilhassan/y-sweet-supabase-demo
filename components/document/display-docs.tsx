"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getDocs } from "@/utils/supabase/queries";
import Loading from "@/components/loading";
import { formatDistanceToNow } from "date-fns";

type Docs = {
  doc_id: string;
  name: string;
  owner_name?: string;
  is_owner?: boolean;
  updated_at?: string;
};

export default function DisplayDocs() {
  const [docs, setDocs] = useState<Docs[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      let { data, error } = await getDocs();
      if (error || !data) {
        console.error(error);
        setLoading(false);
        return;
      }

      setDocs(data);
      setLoading(false);
    }
    fetchDocs();
  }, []);

  function formatDate(dateString?: string) {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return dateString;
    }
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold mb-4 w-fit">Recent Documents</h2>
      <div className="flex flex-col gap-4">
        {loading && <Loading />}
        {!loading && docs.length === 0 ? (
          <p className="text-gray-500">
            No documents found. Start by creating a new document!
          </p>
        ) : (
          docs.map((doc) => (
            <Link
              href={`/document/${doc.doc_id}`}
              key={doc.doc_id}
              className="w-full flex justify-between items-center gap-3 py-3 border-b border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-200 transition-all"
            >
              <div className="flex flex-col">
                <span className="font-medium">{doc.name ?? "Untitled Document"}</span>
                <span className="text-xs text-neutral-500">
                  {doc.is_owner ? "You own this document" : `Owned by ${doc.owner_name}`} • 
                  Updated {formatDate(doc.updated_at)}
                </span>
              </div>
              <span>{`->`}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
