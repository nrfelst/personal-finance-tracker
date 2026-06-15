import React, { useState } from 'react';
import { FileCode, Folder, Copy, Check, Terminal, ShieldAlert } from 'lucide-react';
import { JAVA_CODEBASE, JavaFile } from '../javaCodebase';

export default function JavaRepositoryViewer() {
  const [selectedFile, setSelectedFile] = useState<JavaFile>(JAVA_CODEBASE[2]); // Default to Application entry-point
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="java-viewer-container" className="space-y-6 max-w-xl mx-auto pb-8">
      
      {/* Visual Title */}
      <div>
        <h2 className="font-sans font-bold text-slate-900 text-2xl tracking-tight">Spring Boot Explorer</h2>
        <p className="text-xs text-slate-500 font-sans mt-0.5">Explore the production Java Spring Boot REST API source code files</p>
      </div>

      {/* Info banner */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start space-x-2.5 shadow-xs">
        <Terminal className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          The code displayed here lives on disk inside this project workspace. Since the AI environment executes on a **Node.js/Vite Cloud Run architecture**, the live app is powered by a matching Node.js SQLite API, while the actual Spring Boot target workspace is fully integrated for rapid export, ZIP compilation or local Java IDE execution.
        </p>
      </div>

      {/* Code Browser Matrix Layout */}
      <div className="bg-[#1e293b] text-slate-300 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col md:flex-row h-[550px]">
        
        {/* Left sidebar: Directory tree */}
        <div className="w-full md:w-56 bg-[#0f172a] border-b md:border-b-0 md:border-r border-slate-800 p-4 space-y-4 overflow-y-auto shrink-0">
          <div className="flex items-center space-x-2 text-slate-400">
            <Folder className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono">Workspace Files</span>
          </div>
          
          <div className="space-y-1">
            {JAVA_CODEBASE.map((file, idx) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={idx}
                  id={`java-file-tab-${file.name.replace(/\./g, '-')}`}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left transition-all font-mono text-xs cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' 
                      : 'hover:bg-white/5 text-slate-400'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Code Editor Container */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Header toolbar */}
          <div className="px-5 py-3.5 bg-[#0f172a] border-b border-slate-850 flex items-center justify-between">
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-slate-450 font-mono tracking-tighttruncate">Path: {selectedFile.path}</span>
            </div>
            <button
              id="copy-java-code-btn"
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-bold text-white rounded-md transition-all focus:outline-hidden cursor-pointer"
              title="Copy code to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-slate-400" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Actual Code Listing Block */}
          <div className="flex-1 overflow-auto p-5 font-mono text-[11px] sm:text-xs leading-relaxed flex bg-[#0f172a]/50">
            {/* Simulated Line numbers */}
            <div className="text-slate-600 pr-4 select-none border-r border-slate-800 text-right space-y-0.5 font-semibold shrink-0">
              {selectedFile.code.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code presentation */}
            <pre className="pl-4 text-indigo-50/90 whitespace-pre scrollbar-thin select-text overflow-x-auto w-full">
              <code>{selectedFile.code}</code>
            </pre>
          </div>

        </div>

      </div>

    </div>
  );
}
