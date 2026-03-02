import { BuilderShellProps as BuilderShellProps } from "@/lib/types";

export default function BuilderShell(
    { header, leftPanel, topRight, bottomRight, middleRight }: BuilderShellProps
) {
  return (
    <div>
        {header}
        <div className="grid grid-cols-[360px_1fr] gap-4">
            {leftPanel}
            <div className="flex flex-col gap-4 py-4 px-4">
                {topRight}
                {middleRight}
                {bottomRight}
            </div>
        </div>
    </div>
  );
}
