import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, X, Bell, Search, Activity, DollarSign, BarChart3, Eye } from 'lucide-react';

// Load API key from environment (create .env file with REACT_APP_ALPHA_VANTAGE_KEY=yourkey)
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY;


const StockTracker = () => {
  const [stocks, setStocks] = useState({});
  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT']);
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [newStock, setNewStock] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [priceHistory, setPriceHistory] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const intervalRef = useRef(null);

  // Fetch stock data from Alpha Vantage
  const fetchStockData = async (symbol) => {
    try {
      // Quote (price, volume, etc.)
      const quoteRes = await fetch(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
      );
      const quoteData = await quoteRes.json();

      const q = quoteData["Global Quote"];
      if (!q) return null;

      const stock = {
        symbol: q["01. symbol"],
        price: parseFloat(q["05. price"]),
        change: parseFloat(q["09. change"]),
        changePercent: parseFloat(q["10. change percent"]),
        open: parseFloat(q["02. open"]),
        high: parseFloat(q["03. high"]),
        low: parseFloat(q["04. low"]),
        volume: parseInt(q["06. volume"]),
      };

      // Intraday history (for chart)
      const histRes = await fetch(
        `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${API_KEY}`
      );
      const histData = await histRes.json();
      const timeSeries = histData["Time Series (5min)"];

      let labels = [];
      let prices = [];
      let volumes = [];

      if (timeSeries) {
        labels = Object.keys(timeSeries).slice(0, 20).reverse();
        prices = labels.map((t) => parseFloat(timeSeries[t]["4. close"]));
        volumes = labels.map((t) => parseInt(timeSeries[t]["5. volume"]));
      }

      return { stock, history: { labels, prices, volumes } };
    } catch (err) {
      console.error("Error fetching stock data:", err);
      return null;
    }
  };

  // Load all stocks in watchlist
  const loadAllStocks = async () => {
    setIsConnected(true);
    const newStocks = {};
    const newHistory = {};
    for (let symbol of watchlist) {
      const data = await fetchStockData(symbol);
      if (data) {
        newStocks[symbol] = data.stock;
        newHistory[symbol] = data.history;
      }
    }
    setStocks(newStocks);
    setPriceHistory(newHistory);
    setLastUpdate(new Date());
  };

  // Initial + auto refresh
  useEffect(() => {
    loadAllStocks();
    intervalRef.current = setInterval(loadAllStocks, 60000); // refresh every 1 min
    return () => clearInterval(intervalRef.current);
  }, [watchlist]);

  const addToWatchlist = () => {
    if (newStock && !watchlist.includes(newStock.toUpperCase())) {
      setWatchlist([...watchlist, newStock.toUpperCase()]);
      setNewStock('');
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  // Custom SVG Chart Component (unchanged)
  const CustomChart = ({ data, type = 'line', height = 200 }) => {
    const svgRef = useRef(null);
    useEffect(() => {
      if (!data || !data.length) return;
      const svg = svgRef.current;
      const width = svg.clientWidth;
      const padding = 20;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      svg.innerHTML = '';

      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      gradient.id = 'priceGradient';
      gradient.setAttribute('x1', '0%');
      gradient.setAttribute('y1', '0%');
      gradient.setAttribute('x2', '0%');
      gradient.setAttribute('y2', '100%');
      const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop1.setAttribute('offset', '0%');
      stop1.setAttribute('stop-color', data[data.length - 1] >= data[0] ? '#10B981' : '#EF4444');
      stop1.setAttribute('stop-opacity', '0.3');
      const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop2.setAttribute('offset', '100%');
      stop2.setAttribute('stop-color', data[data.length - 1] >= data[0] ? '#10B981' : '#EF4444');
      stop2.setAttribute('stop-opacity', '0.05');
      gradient.appendChild(stop1);
      gradient.appendChild(stop2);
      defs.appendChild(gradient);
      svg.appendChild(defs);

      const minValue = Math.min(...data) * 0.999;
      const maxValue = Math.max(...data) * 1.001;
      const valueRange = maxValue - minValue;

      if (type === 'line') {
        let pathData = '';
        let fillPathData = '';
        data.forEach((value, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          if (index === 0) {
            pathData += `M ${x} ${y}`;
            fillPathData += `M ${x} ${height - padding} L ${x} ${y}`;
          } else {
            pathData += ` L ${x} ${y}`;
            fillPathData += ` L ${x} ${y}`;
          }
        });
        fillPathData += ` L ${padding + chartWidth} ${height - padding} Z`;
        const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fillPath.setAttribute('d', fillPathData);
        fillPath.setAttribute('fill', 'url(#priceGradient)');
        svg.appendChild(fillPath);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', data[data.length - 1] >= data[0] ? '#10B981' : '#EF4444');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        svg.appendChild(path);
      } else if (type === 'bar') {
        const barWidth = chartWidth / data.length * 0.8;
        data.forEach((value, index) => {
          const x = padding + (index / data.length) * chartWidth + barWidth * 0.1;
          const barHeight = (value / Math.max(...data)) * chartHeight;
          const y = padding + chartHeight - barHeight;
          const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          rect.setAttribute('x', x);
          rect.setAttribute('y', y);
          rect.setAttribute('width', barWidth);
          rect.setAttribute('height', barHeight);
          rect.setAttribute('fill', 'rgba(59, 130, 246, 0.6)');
          svg.appendChild(rect);
        });
      }
    }, [data, type, height]);
    return <svg ref={svgRef} width="100%" height={height} className="w-full" style={{ minHeight: `${height}px` }} />;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold">Stock Market Tracker</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-400">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <div className="text-sm text-gray-400">Last update: {lastUpdate.toLocaleTimeString()}</div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(stocks).map(([symbol, data]) => (
            <div key={symbol}
              className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-700 ${selectedStock === symbol ? 'ring-2 ring-blue-400' : ''}`}
              onClick={() => setSelectedStock(symbol)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{symbol}</span>
                <Eye className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold mb-1">${data.price.toFixed(2)}</div>
              <div className={`flex items-center space-x-1 ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {data.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm">{data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">{selectedStock} Price Chart</h2>
              </div>
              <div className="h-64">
                {priceHistory[selectedStock] && priceHistory[selectedStock].prices.length > 0 && (
                  <CustomChart data={priceHistory[selectedStock].prices} type="line" height={256} />
                )}
              </div>
            </div>

            {/* Volume Chart */}
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Volume</h3>
              <div className="h-32">
                {priceHistory[selectedStock] && priceHistory[selectedStock].volumes.length > 0 && (
                  <CustomChart data={priceHistory[selectedStock].volumes} type="bar" height={128} />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Watchlist */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" /> Watchlist
              </h3>
              <div className="space-y-2 mb-4">
                {watchlist.map(symbol => (
                  <div key={symbol} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{symbol}</span>
                      {stocks[symbol] && <span className="text-sm text-gray-400">${stocks[symbol].price.toFixed(2)}</span>}
                    </div>
                    <button onClick={() => removeFromWatchlist(symbol)} className="text-red-400 hover:text-red-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="Add stock (e.g., TSLA)"
                  className="flex-1 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button onClick={addToWatchlist} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stock Details */}
            {stocks[selectedStock] && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2" /> {selectedStock} Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-gray-400">Open</span><span>${stocks[selectedStock].open.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">High</span><span className="text-green-400">${stocks[selectedStock].high.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Low</span><span className="text-red-400">${stocks[selectedStock].low.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Volume</span><span>{stocks[selectedStock].volume.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">Change</span><span className={stocks[selectedStock].change >= 0 ? 'text-green-400' : 'text-red-400'}>{stocks[selectedStock].change >= 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)} ({stocks[selectedStock].changePercent.toFixed(2)}%)</span></div>
                </div>
              </div>
            )}

            {/* Market Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" /> Market Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-gray-400">Status</span><span className="text-green-400 font-medium">Open</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-400">Next Close</span><span className="text-gray-300">4:00 PM EST</span></div>
                <div className="flex items-center justify-between"><span className="text-gray-400">Timezone</span><span className="text-gray-300">EST</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTracker;
