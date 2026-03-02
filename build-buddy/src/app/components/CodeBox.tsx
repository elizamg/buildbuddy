import { CodeBoxProps as CodeBoxProps } from "@/lib/types";

export default function CodeBox(
    { code }: CodeBoxProps
) {
    return (
      <div className="flex flex-col gap-4 rounded-md p-4 bg-foreground text-background">
        <pre className="text-sm font-mono">{code}</pre>
      </div>
    );
  }

  CodeBox.defaultProps = {
    code: "No code provided",
  }