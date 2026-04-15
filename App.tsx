import React, { useState, useEffect } from 'react';
import { minifyHTML, getGzipSize } from './lib/minifier';
import { StatsPanel } from './components/StatsPanel';
import { CopyIcon, CheckIcon, TrashIcon, DownloadIcon, FlaskIcon } from './components/Icons';

// Demo code including standard comments, SSI, and CSS that needs minification
const DEMO_CODE = `<!--#include virtual = "version.inc"-->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SSI Minification Demo</title>
  <!-- This standard comment will be removed -->
  <style type="text/css">
    /* Main body styles - Should be removed */
    body {
      background: #000;
      color: #fff;
      font-family: sans-serif;
    }
    
    /* Container layout - Should be removed */
    .container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }

    h1 {
      text-align: center;
      color: #a78bfa;
    }
  </style>
  <script type="text/javascript">
    console.log("Hello World");
  </script>
</head>
<body>
  <div class="container">
      <h1>  Hello   World  </h1>
      
      <!--#config timefmt="%Y-%m-%d" -->
      <p>
        Current date: 
        <!--#echo var="DATE_LOCAL" -->
      </p>

      <input type="text" readonly="readonly" value="Read Only Input">
      <input type="checkbox" checked="checked" disabled>

      <!-- Standard comment with loose syntax - Should be removed -->
      <!-- loose comment - - >
      
      <!-- SSI with loose syntax - Should be kept -->
      <!--#include virtual="footer.inc" - - >
  </div>
</body>
</html>`;

export default function App() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  
  // Stats State
  const [gzipOriginal, setGzipOriginal] = useState(0);
  const [gzipMinified, setGzipMinified] = useState(0);
  
  const [copied, setCopied] = useState(false);
  
  // Real-time minification and compression analysis
  useEffect(() => {
    // 1. Minify
    const minified = minifyHTML(input);
    setOutput(minified);

    // 2. Calculate Gzip Stats (Async)
    const calculateGzip = async () => {
      const gOriginal = await getGzipSize(input);
      const gMinified = await getGzipSize(minified);
      setGzipOriginal(gOriginal);
      setGzipMinified(gMinified);
    };
    
    // Debounce slightly for performance if input is huge
    const timer = setTimeout(calculateGzip, 300);
    return () => clearTimeout(timer);

  }, [input]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleClear = () => {
    if (input.length === 0) return;
    if (window.confirm('Clear the editor?')) {
      setInput('');
    }
  };

  const handleLoadDemo = () => {
    setInput(DEMO_CODE);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minified.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 flex flex-col font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
              &lt;/&gt;
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">HTML壓縮器</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none">Dark Mode Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadDemo}
              className="text-xs bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-400 px-3 py-1.5 rounded-md border border-gray-700 transition-all flex items-center gap-2"
            >
              <FlaskIcon /> Load Demo
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 md:p-6 max-w-7xl mx-auto w-full gap-6">
        
        {/* Editor Area */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-[500px]">
          
          {/* Input Pane */}
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-end px-1 pb-1">
              <label className="text-sm font-medium text-gray-400">Input HTML</label>
              <button 
                onClick={handleClear}
                disabled={input.length === 0}
                className={`text-xs flex items-center gap-1 transition-all ${input.length === 0 ? 'opacity-0 pointer-events-none' : 'text-red-400 hover:text-red-300 opacity-75 hover:opacity-100'}`}
              >
                <TrashIcon /> Clear
              </button>
            </div>
            <div className="flex-1 relative group rounded-xl overflow-hidden bg-gray-900 border border-gray-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="<!-- Paste your HTML here -->"
                className="w-full h-full bg-transparent p-4 font-mono text-sm leading-relaxed text-gray-300 focus:outline-none resize-none placeholder-gray-700"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output Pane */}
          <div className="flex-1 flex flex-col gap-2">
             <div className="flex justify-between items-end px-1 pb-1">
              <label className="text-sm font-medium text-gray-400">Minified Output</label>
              <div className="flex items-center gap-2">
                {output.length > 0 && (
                  <>
                  <button
                    onClick={handleDownload}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors rounded-md"
                    title="Download .html file"
                  >
                    <DownloadIcon />
                  </button>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all shadow-lg ${
                      copied 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20 hover:shadow-indigo-500/30'
                    }`}
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 relative group rounded-xl overflow-hidden bg-gray-900/50 border border-gray-800 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all shadow-inner">
              <textarea
                readOnly
                value={output}
                placeholder="Minified code will appear here..."
                className="w-full h-full bg-transparent p-4 font-mono text-sm leading-relaxed text-indigo-100 focus:outline-none resize-none placeholder-gray-700"
                spellCheck={false}
              />
            </div>
          </div>
        </div>

        {/* Stats Footer */}
        <StatsPanel 
          originalSize={new Blob([input]).size} 
          minifiedSize={new Blob([output]).size} 
          gzipOriginalSize={gzipOriginal}
          gzipMinifiedSize={gzipMinified}
        />
        
        <div className="text-center mt-2 pb-4">
           <p className="text-gray-600 text-[11px] max-w-2xl mx-auto">
             <strong>Advanced features enabled:</strong> Attribute quote removal, boolean attribute collapsing, redundant default attribute removal.
             <br/>
             Preserves SSI tags while aggressively optimizing HTML/CSS structure.
           </p>
        </div>
      </main>
    </div>
  );
}