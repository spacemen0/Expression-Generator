import { useState, useEffect, useRef } from 'react';
import './App.css';

// Type definition for Pyodide
interface PyodideInterface {
  runPython: (code: string) => unknown;
  globals: {
    get: (key: string) => (arg?: string) => string;
  };
}

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<PyodideInterface>;
  }
}

function App() {
  const [expression, setExpression] = useState('');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const isInitializing = useRef(false);

  const examples = [
    '(a + b) * c',
    'x ^ 2 + y ^ 2',
    '(1 + 2) * (3 / 4)',
    'a + b * c + d',
  ];

  useEffect(() => {
    if (isInitializing.current) return;
    isInitializing.current = true;

    async function initPyodide() {
      try {
        // Load Pyodide from CDN for simplicity and reliability in browser
        const pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });

        // Load Python logic from file and execute it in Pyodide
        const logicResponse = await fetch('/logic.py');
        if (!logicResponse.ok) {
          throw new Error('Failed to load logic.py');
        }
        const logicCode = await logicResponse.text();
        await pyodideInstance.runPython(logicCode);

        setPyodide(pyodideInstance);
      } catch (err) {
        console.error("Failed to load Pyodide", err);
        setError("Failed to load Python environment");
      } finally {
        setLoading(false);
      }
    }

    initPyodide();
  }, []);

  const generateTree = (exprToUse?: string) => {
    const expr = exprToUse || expression;
    if (!expr.trim() || !pyodide) return;

    try {
      setError(null);
      // Execute the Python function we defined earlier
      const generate_svg = pyodide.globals.get('generate_svg_string');
      const result = generate_svg(expr);
      setSvg(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during generation');
      setSvg(null);
    }
  };

  const handleDownload = () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expression_tree_${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <header>
        <h1>Expression Tree Generator</h1>
        <p>Run entirely in your browser using Python + WebAssembly.</p>
      </header>

      <main>
        <div className="input-section">
          <form onSubmit={(e) => { e.preventDefault(); generateTree(); }} className="input-row">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              placeholder={loading ? "Initializing Python..." : "e.g., (a + b) * c ^ 2"}
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Generate Tree'}
            </button>
          </form>

          <div className="examples">
            {examples.map((ex) => (
              <span
                key={ex}
                className="example-tag"
                onClick={() => {
                  setExpression(ex);
                }}
              >
                {ex}
              </span>
            ))}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {svg && (
          <div className="actions">
            <button onClick={handleDownload} className="secondary" disabled={loading}>
              Download SVG
            </button>
          </div>
        )}

        <div className="output-section">
          {svg ? (
            <div
              className="svg-container"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            !loading && <div className="placeholder">Your tree will appear here</div>
          )}
        </div>
      </main>

      <footer>
        <p>Supports: +, -, *, /, ^, parentheses, numbers, and variables.</p>
      </footer>
    </div>
  );
}

export default App;
