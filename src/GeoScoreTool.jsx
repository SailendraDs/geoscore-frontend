import React, { useState, useRef, useEffect } from 'react';

export default function GeoScoreTool() {
  const [url, setUrl] = useState('');
  const [scoreData, setScoreData] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastCalculatedUrl, setLastCalculatedUrl] = useState('');
  const [error, setError] = useState('');
  const reportRef = useRef();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const extractBrandName = (inputUrl) => {
    try {
      const urlObj = new URL(inputUrl);
      const hostname = urlObj.hostname.replace('www.', '');
      const parts = hostname.split('.');
      return parts.length >= 2 ? parts[0] : hostname;
    } catch {
      return inputUrl.toLowerCase().split('.')[0];
    }
  };

  const fetchLogo = (inputUrl) => {
    try {
      const urlObj = new URL(inputUrl);
      const domain = urlObj.hostname;
      return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
    } catch {
      return '';
    }
  };

  const calculateScore = async () => {
    if (isCalculating || url === lastCalculatedUrl) return;
    
    setIsCalculating(true);
    setError('');
    setLastCalculatedUrl(url);

    try {
      const response = await fetch('/api/check-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_name: extractBrandName(url),
          url: url
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to calculate score');
      }

      const data = await response.json();
      setScoreData(data);
      setLogoUrl(fetchLogo(url));
    } catch (err) {
      console.error('Error calculating score:', err);
      setError(err.message || 'An error occurred while calculating the score');
      // Fallback to local calculation if API fails
      await calculateLocalScore();
    } finally {
      setIsCalculating(false);
    }
  };

  // Fallback calculation if API is not available
  const calculateLocalScore = async () => {
    const brand = extractBrandName(url);
    const logo = fetchLogo(url);
    setLogoUrl(logo);

    const recall = Math.floor(Math.random() * 25) + 10;
    const wiki = await checkWikipedia(brand);
    const schemaScore = await checkSchemaMarkup(url);
    const seo = Math.floor(Math.random() * 10) + 10;
    const platforms = Math.min(15, Math.floor(Math.random() * 5) + 5 + schemaScore);
    const total = recall + wiki + seo + platforms;

    setScoreData({ 
      brand, 
      recall, 
      wiki, 
      seo, 
      platforms, 
      total,
      breakdown: {
        recall,
        wiki,
        seo,
        platforms
      },
      suggestions: [],
      history_links: []
    });
  };

  const checkWikipedia = async (brand) => {
    try {
      const response = await fetch(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${brand}`);
      const data = await response.json();
      const pages = data.query.pages;
      return !pages || Object.keys(pages)[0] === '-1' ? 0 : 20;
    } catch {
      return 0;
    }
  };

  const checkSchemaMarkup = async (inputUrl) => {
    try {
      const res = await fetch(`https://cors-anywhere.herokuapp.com/${inputUrl}`);
      const text = await res.text();
      return text.includes('schema.org') ? 5 : 0;
    } catch {
      return 0;
    }
  };

  const resetScore = () => {
    setUrl('');
    setScoreData(null);
    setLogoUrl('');
    setLastCalculatedUrl('');
    setError('');
  };

  const renderScoreCard = () => {
    if (!scoreData) return null;

    return (
      <div className="mt-6 p-4 bg-white rounded-lg shadow" ref={reportRef}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            {logoUrl && <img src={logoUrl} alt="Website logo" className="w-12 h-12 mr-3" />}
            <div>
              <h2 className="text-xl font-bold">{scoreData.brand || 'Your Brand'}</h2>
              <p className="text-sm text-gray-600">{new URL(url).hostname}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{scoreData.total || '--'}<span className="text-lg">/100</span></div>
            <div className="text-sm text-gray-600">GEO Score</div>
          </div>
        </div>

        {scoreData.breakdown && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Score Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(scoreData.breakdown).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="capitalize">{key.replace('_', ' ')}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scoreData.suggestions && scoreData.suggestions.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Suggestions</h3>
            <ul className="list-disc pl-5 space-y-1">
              {scoreData.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {scoreData.history_links && scoreData.history_links.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">History</h3>
            <ul className="space-y-1">
              {scoreData.history_links.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {link.title || link.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-3xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-6">🧠 Generative Engine Optimization (GEO) Score Tool</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Website URL</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="e.g., https://example.com"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={calculateScore}
          disabled={isCalculating || !url}
          className={`px-4 py-2 rounded text-white ${isCalculating || !url ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isCalculating ? 'Calculating...' : 'Calculate Score'}
        </button>
        <button
          onClick={resetScore}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Reset
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      {renderScoreCard()}
    </div>
  );
}
