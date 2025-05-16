
import DieCutEditor from "@/components/DieCutEditor";
import { Square } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b p-4 bg-white">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Square className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">Image Edge Craft</h1>
          </div>
          <div className="text-sm text-muted-foreground">Die-cut Image Generator</div>
        </div>
      </header>
      
      <main className="flex-1 py-8">
        <DieCutEditor />
      </main>
      
      <footer className="mt-auto border-t py-6 bg-white">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
          <p>Image Edge Craft - Create beautiful die-cut images with ease</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
