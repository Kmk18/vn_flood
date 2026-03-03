import React, { useState } from 'react';

export const App: React.FC = () => {
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePing = async () => {
    try {
      setLoading(true);
      setError(null);
      setPingResult(null);
      const res = await fetch('/api/ping');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setPingResult(`${data.message} @ ${data.time}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>vnFlood</h1>
        <p>Flood prediction & community hub (framework setup)</p>
      </header>
      <main className="app-main">
        <section className="card">
          <h2>Real-time Flood Risk</h2>
          <p>
            This module will show AI-powered flood risk predictions and live
            status for your area.
          </p>
        </section>
        <section className="card">
          <h2>Community Forum</h2>
          <p>
            This module will host discussions, alerts, and reports from local
            residents.
          </p>
        </section>
        <section className="card">
          <h2>Mobile App Companion</h2>
          <p>
            A dedicated mobile client will connect to the same backend and AI
            services.
          </p>
        </section>
        <section className="card">
          <h2>Backend Connectivity Test</h2>
          <p>Click the button to call the Node backend at `/api/ping`.</p>
          <button
            type="button"
            className="primary-btn"
            onClick={handlePing}
            disabled={loading}
          >
            {loading ? 'Pinging…' : 'Ping backend'}
          </button>
          {pingResult && <p className="status success">Result: {pingResult}</p>}
          {error && <p className="status error">Error: {error}</p>}
        </section>
      </main>
    </div>
  );
};

