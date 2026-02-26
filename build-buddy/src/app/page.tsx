import Chat from "./components/Chat";
import Header from "./components/Header";
import KeyConcepts from "./components/KeyConcepts";
import CodeEditor from "./components/CodeEditor";
import CodeDisplay from "./components/CodeDisplay";

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-background">
      <div>
        <Header />
        <KeyConcepts />
        <CodeEditor />
        <CodeDisplay />
        <Chat />
      </div>
    </main>
  );
}
