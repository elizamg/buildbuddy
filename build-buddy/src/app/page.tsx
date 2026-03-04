import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import BuilderClient from "./components/BuilderClient";
import {
  initialEditorText,
  initialQuizSpec,
} from "@/lib/jsonQuizSpec";
import { Quiz, Chat as ChatType } from "@/lib/types";

export default async function Home() {
  // Use session client only for auth — admin client for all DB ops (bypasses RLS)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();

  // Load or create a project for this user
  let { data: project } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!project) {
    const { data: newProject, error: insertError } = await admin
      .from("projects")
      .insert({ user_id: user.id })
      .select("id")
      .single();
    if (insertError) {
      throw new Error(`Failed to create project: ${insertError.message} (code: ${insertError.code})`);
    }
    project = newProject;
  }

  if (!project) {
    throw new Error("Failed to load or create project");
  }

  // Load or create project state
  let { data: projectState } = await admin
    .from("project_state")
    .select("editor_text, spec_json")
    .eq("project_id", project.id)
    .maybeSingle();

  if (!projectState) {
    await admin.from("project_state").insert({
      project_id: project.id,
      user_id: user.id,
      editor_text: initialEditorText,
      spec_json: initialQuizSpec,
    });
    projectState = { editor_text: initialEditorText, spec_json: initialQuizSpec };
  }

  // Load last 20 chat messages
  const { data: chatRows } = await admin
    .from("chat_messages")
    .select("id, content, role, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const chatMessages: ChatType[] = (chatRows ?? []).map((row) => ({
    id: row.id,
    message: row.content,
    chatType: "freeform" as const,
    sender: row.role === "user" ? "user" : "assistant",
  }));

  return (
    <BuilderClient
      projectId={project.id}
      initialEditorText={projectState.editor_text ?? initialEditorText}
      initialQuizSpec={(projectState.spec_json as Quiz) ?? initialQuizSpec}
      initialChats={chatMessages}
    />
  );
}
