"use server";

import { createClient } from "./server";
import { manager } from "../y-sweet-document-manager";

export async function addUserToDoc(userEmail: string, docId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return "User not authenticated";
  }

  // Get the document to check ownership/permissions
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select("owner_id, collaborators")
    .eq("id", docId)
    .single();

  if (docError || !docData) {
    console.error("Document not found", docError);
    return "Document not found";
  }

  // Check if the current user is the document owner
  if (docData.owner_id !== user.id && !docData.collaborators.includes(user.id)) {
    return "You don't have permission to add collaborators to this document";
  }

  // Find the user to be added by email
  const { data: userToAdd, error: userError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", userEmail)
    .single();

  if (userError || !userToAdd) {
    console.error("User not found", userError);
    return "User not found";
  }

  // Check if user is already a collaborator
  if (docData.collaborators.includes(userToAdd.id)) {
    return "User is already a collaborator";
  }

  // Add the user to collaborators array
  const { error: updateError } = await supabase
    .from("documents")
    .update({ 
      collaborators: [...docData.collaborators, userToAdd.id],
      updated_at: new Date().toISOString()
    })
    .eq("id", docId);

  if (updateError) {
    console.error("Failed to update collaborators", updateError);
    return "Failed to add user as collaborator";
  }

  return null;
}

export async function editDocTitle(docId: string, newTitle: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return "User not authenticated";
  }

  // Check document access
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select("owner_id, collaborators")
    .eq("id", docId)
    .single();

  if (docError || !docData) {
    console.error("Document not found", docError);
    return "Document not found";
  }

  // Check if the user has permission to edit
  if (docData.owner_id !== user.id && !docData.collaborators.includes(user.id)) {
    return "You don't have permission to edit this document";
  }

  // Update the document title
  const { error } = await supabase
    .from("documents")
    .update({ 
      title: newTitle,
      updated_at: new Date().toISOString(),
      last_edited_by: user.id
    })
    .eq("id", docId);

  if (error) {
    console.error("Failed to update document title", error);
    return "Failed to update document title";
  }

  return null;
}

export async function changeDocVisibility(isPublic: boolean, docId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return "User not authenticated";
  }

  const { data: permissionsData, error: permError } = await supabase
    .from("permissions")
    .select("*")
    .eq("doc_id", docId)
    .eq("user_id", user.id);

  if (permError || !permissionsData?.length) {
    console.error(
      "User does not have access to change visibility of this document",
      permError,
    );
    return "User does not have access to change visibility of this document";
  }

  const { error } = await supabase
    .from("docs")
    .update({ is_public: isPublic })
    .eq("id", docId);

  if (error) {
    console.error("Failed to update doc visibility", error);
    return "Failed to update doc visibility";
  }
}

export async function getDocMetadata(docId: string) {
  const supabase = createClient();

  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select(`
      id, 
      title, 
      owner_id, 
      collaborators,
      created_at,
      updated_at,
      last_edited_by,
      profiles:owner_id (display_name, email),
      editor:last_edited_by (display_name)
    `)
    .eq("id", docId)
    .single();

  if (!docData || docError) {
    console.error("Document not found", docError);
    return {
      data: null,
      error: "Document not found",
    };
  }

  // Check if the user is authenticated
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  
  if (!user?.id || authError) {
    return {
      data: null,
      error: "User not authenticated",
    };
  }

  // Check if user has access to this document
  const hasAccess = docData.owner_id === user.id || docData.collaborators.includes(user.id);
  
  if (!hasAccess) {
    return {
      data: null,
      error: "You don't have access to this document",
    };
  }

  return {
    data: {
      id: docData.id,
      name: docData.title,
      doc_id: docData.id,
      is_public: false, // This would need to be added to your schema if needed
      owner_name: docData.profiles.display_name,
      owner_email: docData.profiles.email,
      last_editor: docData.editor?.display_name,
      updated_at: docData.updated_at,
    },
    error: null,
  };
}

export async function getDocs() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: "User not authenticated",
    };
  }

  // Get documents where user is owner or collaborator
  const { data: docsData, error: docsError } = await supabase
    .from("documents")
    .select(`
      id,
      title,
      owner_id,
      updated_at,
      profiles:owner_id (display_name)
    `)
    .or(`owner_id.eq.${user.id},collaborators.cs.{${user.id}}`)
    .order("updated_at", { ascending: false });

  if (docsError) {
    console.error("Error fetching documents:", docsError);
    return {
      data: null,
      error: "Error fetching documents",
    };
  }

  const transformedDocs = docsData?.map((doc) => ({
    doc_id: doc.id,
    name: doc.title || "Untitled Document",
    owner_name: doc.profiles.display_name,
    is_owner: doc.owner_id === user.id,
    updated_at: doc.updated_at
  }));

  return {
    data: transformedDocs,
    error: null,
  };
}

export async function createDoc() {
  const supabase = createClient();
  const ysweetDoc = await manager.createDoc();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      data: null,
      error: "User not authenticated",
    };
  }

  // Create new document with y-sweet doc ID as the UUID
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .insert([{ 
      id: ysweetDoc.docId,
      title: "Untitled Document", 
      owner_id: user.id,
      last_edited_by: user.id
    }])
    .select();

  if (docError) {
    return {
      data: null,
      error: `Failed to create document: ${docError.message}`,
    };
  }

  return {
    data: ysweetDoc.docId,
    error: null,
  };
}

// Add a function to save document versions
export async function saveDocumentVersion(docId: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user?.id) {
    return {
      data: null,
      error: "User not authenticated"
    };
  }

  // Get document first to check permissions and get version count
  const { data: docData, error: docError } = await supabase
    .from("documents")
    .select("owner_id, collaborators, version_count")
    .eq("id", docId)
    .single();

  if (docError || !docData) {
    return {
      data: null,
      error: "Document not found"
    };
  }

  // Verify user has access to the document
  if (docData.owner_id !== user.id && !docData.collaborators.includes(user.id)) {
    return {
      data: null,
      error: "You don't have permission to save versions of this document"
    };
  }

  const newVersionNumber = docData.version_count + 1;

  // Start a transaction to update both tables
  const { error: versionError } = await supabase.rpc('create_document_version', {
    doc_id: docId,
    doc_content: content,
    version_num: newVersionNumber,
    user_id: user.id
  });

  if (versionError) {
    return {
      data: null,
      error: `Failed to create document version: ${versionError.message}`
    };
  }

  return {
    data: {
      version_number: newVersionNumber
    },
    error: null
  };
}
