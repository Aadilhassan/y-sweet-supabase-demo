"use server";

import { createClient } from "./server";

// This function will need to be created in your Supabase database as a stored procedure
export async function createDocumentVersionRPC() {
  const supabase = createClient();
  
  // Execute the SQL directly since it doesn't exist yet
  const { error } = await supabase.rpc('create_function_if_not_exists', {
    function_name: 'create_document_version',
    function_definition: `
    CREATE OR REPLACE FUNCTION create_document_version(
      doc_id UUID,
      doc_content TEXT,
      version_num INTEGER,
      user_id UUID
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      -- Insert the new version
      INSERT INTO document_versions (
        document_id,
        content,
        version_number,
        created_by
      ) VALUES (
        doc_id,
        doc_content,
        version_num,
        user_id
      );
      
      -- Update the document record with the new version count and last edited info
      UPDATE documents 
      SET 
        version_count = version_num,
        last_edited_by = user_id,
        updated_at = now()
      WHERE id = doc_id;
      
      -- Optionally, update document content in the documents table if needed
      -- UPDATE documents SET content = doc_content WHERE id = doc_id;
    END;
    $$;
    `
  });

  if (error) {
    console.error('Error creating stored procedure:', error);
    return false;
  }
  
  return true;
}
