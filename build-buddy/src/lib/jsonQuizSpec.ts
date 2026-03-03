import { KeyConcept } from "./types";
import { Quiz } from "./types";
import { Chat as ChatType } from "./types";
import { CurrentChats } from "./types";


export const KeyConceptsJsonQuizSpec: KeyConcept[] = [
    {
        id: "1",
        title: "Arrays of Objects",
        body: "* questions is an array — a list of items \n* Each item is an object with prompt, choices, correctIndex \n* You can add or remove items from the list \n* You can add or remove items from the list",
        codeSegment: "\"questions\": [\n  { \"prompt\": \"...\", \"choices\": [...] }\n]",
    },
    {
        id: "2",
        title: "Rendering Choices",
        body: "* We loop over the choices array with .map() \n* Each choice becomes a clickable button \n* The index tells us which button was clicked, \n* The index tells us which button was clicked",
        codeSegment: "choices.map((choice, i) =>\n  <button onClick={() => pick(i)}>\n    {choice}\n  </button>\n)",
    }
]

export const initialEditorText: string = `{
    // --- Quiz Metadata ---
    // "title" stores the name of your quiz.
    "title": "Animal Quiz 🐾",
  
    // "pointsPerQuestion" controls how many points
    // a user earns for each correct answer.
    "pointsPerQuestion": 10,
  
    // --- Questions ---
    // "questions" is an ARRAY (a list) of question objects.
    // Each object represents one question in the quiz.
    "questions": [
      {
        // Unique identifier for this question
        "id": "q-cat",
  
        // The question prompt shown to the user
        "prompt": "What sound does a cat make?",
  
        // Possible answer choices (an array of strings)
        "choices": ["Woof", "Meow", "Moo", "Quack"],
  
        // 0-based index of the correct answer
        "correctIndex": 1
      },
      {
        "id": "q-spider",
        "prompt": "How many legs does a spider have?",
        "choices": ["6", "8", "10", "4"],
        "correctIndex": 1
      },
      {
        "id": "q-tallest",
        "prompt": "Which animal is the tallest?",
        "choices": ["Elephant", "Giraffe", "Bear", "Horse"],
        "correctIndex": 1
      }
    ]
  }`

  export const initialQuizSpec: Quiz = {
    title: "Animal Quiz 🐾",
    pointsPerQuestion: 10,
  
    questions: [
      {
        id: "q-cat",
        prompt: "What sound does a cat make?",
        choices: ["Woof", "Meow", "Moo", "Quack"],
        correctIndex: 1,
      },
      {
        id: "q-spider",
        prompt: "How many legs does a spider have?",
        choices: ["6", "8", "10", "4"],
        correctIndex: 1,
      },
      {
        id: "q-tallest",
        prompt: "Which animal is the tallest?",
        choices: ["Elephant", "Giraffe", "Bear", "Horse"],
        correctIndex: 1,
      },
    ],
  };

  export const presetPillOptions: ChatType[] = [
    {
        id: "1",
        message: "Add a new question",
        chatType: "pill",
        sender: "user",
    },
    {
        id: "2",
        message: "Change the quiz title",
        chatType: "pill",
        sender: "user",
    },
    {
        id: "3",
        message: "Add a new choice to each question",
        chatType: "pill",
        sender: "user",
    },
    {
        id: "4",
        message: "Change the correct answer for the first question",
        chatType: "pill",
        sender: "user",
    }
]