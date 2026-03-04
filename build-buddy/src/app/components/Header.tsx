"use client";

type HeaderProps = {
  onSave: () => void;
  onResetLesson: () => void;
  isSaving: boolean;
  saveError: string | null;
};

export default function Header({ onSave, onResetLesson, isSaving, saveError }: HeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-gradient-to-r from-header-from to-header-to text-white p-4 flex items-center justify-between">
      <div className="font-bold">BuildBuddy</div>
      <div className="flex items-center gap-3">
        {saveError && (
          <span className="text-xs text-red-200">{saveError}</span>
        )}
        <button
          onClick={onResetLesson}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-colors"
        >
          Reset Lesson
        </button>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg px-4 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 active:scale-[0.98] transition-colors disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <div className="font-bold">JSON Quiz</div>
      </div>
    </div>
  );
}
