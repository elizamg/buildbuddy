/* 
key concept
id
title
body
code segment
quiz schema
title
points per question 
questions
chat
id
message
chat type: freeform or pill
quiz question
prompt
choices
correct index
theme spec
*/
export type KeyConcept = {
    id: string;
    title: string;
    body: string;
    codeSegment: string;
} 

export type KeyConceptsProps = {
    keyConcepts: KeyConcept[];
}

export type Question = {
    id: string;
    prompt: string;
    choices: string[];
    correctIndex: number;
}

export type Quiz = {
    title: string;
    pointsPerQuestion: number;
    questions: Question[];
}

export type Chat = {
    id: string;
    message: string;
    chatType: "freeform" | "pill";
    sender: "user" | "assistant";
}

export type CurrentChats = Chat[];

export type BuilderShellProps = {
    header: React.ReactNode;
    leftPanel: React.ReactNode;
    topRight: React.ReactNode;
    bottomRight: React.ReactNode;
    middleRight: React.ReactNode;
}

export type CodeBoxProps = {
    code: string;
}

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
    variant: ButtonVariant;
    size: ButtonSize;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
}

export type CodeEditorProps = {
    editorText: string;
    onChange: (code: string) => void;
    onReset: () => void;
    error?: string | null;
}

export type CodeDisplayProps = {
    quizSpec: Quiz;
}

export type QuestionCardProps = {
    question: Question;
    correctIndex: number;
}

export type ChatProps = {
    currentChats: CurrentChats;
    presetPillOptions: Chat[];
    onAddChat: (chat: Chat) => void;
}