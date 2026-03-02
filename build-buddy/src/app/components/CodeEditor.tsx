import Image from "next/image";
import { CodeEditorProps as CodeEditorProps } from "@/lib/types";

export default function CodeEditor(
  { editorText, onChange, error }: CodeEditorProps
) {
  return (
    <div className="flex flex-col gap-4 rounded-md p-4 bg-panel text-foreground">
      <h1 className="text-xl text-header-from font-bold">Code Editor</h1>

    </div>
  );
}
