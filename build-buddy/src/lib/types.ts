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

export type Question = {
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
}

export type BuilderShellProps = {
    header: React.ReactNode;
    leftPanel: React.ReactNode;
    topRight: React.ReactNode;
    bottomRight: React.ReactNode;
}