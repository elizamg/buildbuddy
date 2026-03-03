"use client";
import { CodeEditorProps as CodeEditorProps } from "@/lib/types";
import { json } from "@codemirror/lang-json";
import CodeMirror from "@uiw/react-codemirror";
import Button from "./Buttons";

export default function CodeEditor(
  { editorText, onChange, onReset, error }: CodeEditorProps
) {
  return (
    <div className="rounded-xl border border-border bg-panel p-3">
      <div className="flex justify-between items-center p-3">
      <h1 className="text-xl font-bold bg-gradient-to-r from-header-from to-header-to bg-clip-text text-transparent">
        Code Editor
      </h1>
        <Button variant="primary" size="md" onClick={onReset}>Reset to Original</Button>
      </div>
      <div className="rounded-xl border border-border bg-panel p-3">
        {error && <div className="text-red-500">{error}</div>}
        <CodeMirror
          value={editorText}
          height="320px"
          extensions={[json()]}
          onChange={(nextValue) => onChange(nextValue)}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
          }}
        />
      </div>
    </div>
  );
}
