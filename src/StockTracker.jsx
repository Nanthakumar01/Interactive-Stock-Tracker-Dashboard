import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, X, Bell, Search, Activity, DollarSign, BarChart3, Eye } from 'lucide-react';

const StockTracker = () => {
  const [stocks, setStocks] = useState({
    AAPL: { price: 150.25, change: 2.15, changePercent: 1.45, volume: 45234567, high: 152.30, low: 148.90, open: 149.50 },
    GOOGL: { price: 2750.80, change: -15.30, changePercent: -0.55, volume: 1234567, high: 2780.20, low: 2740.15, open: 2765.10 },
    MSFT: { price: 305.45, change: 8.75, changePercent: 2.95, volume: 32145678, high: 308.20, low: 301.85, open: 302.20 },
    TSLA: { price: 245.67, change: -12.45, changePercent: -4.82, volume: 78456123, high: 258.90, low: 243.20, open: 256.80 },
    AMZN: { price: 3245.90, change: 45.20, changePercent: 1.41, volume: 2345678, high: 3260.45, low: 3210.75, open: 3220.30 },
    NVDA: { price: 450.85, change: 22.35, changePercent: 5.22, volume: 56789012, high: 455.20, low: 430.60, open: 435.75 }
  });

  const [watchlist, setWatchlist] = useState(['AAPL', 'GOOGL', 'MSFT']);
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [newStock, setNewStock] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [priceHistory, setPriceHistory] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const wsRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize price history
  useEffect(() => {
    const initHistory = {};
    Object.keys(stocks).forEach(symbol => {
      initHistory[symbol] = {
        labels: [],
        prices: [],
        volumes: []
      };
    });
    setPriceHistory(initHistory);
  }, []);

  // Simulate WebSocket connection with real-time price updates
  useEffect(() => {
    const connectWebSocket = () => {
      setIsConnected(true);
      
      // Simulate real-time price updates
      intervalRef.current = setInterval(() => {
        setStocks(prevStocks => {
          const updatedStocks = { ...prevStocks };
          const now = new Date();
          
          Object.keys(updatedStocks).forEach(symbol => {
            const stock = updatedStocks[symbol];
            const volatility = symbol === 'TSLA' ? 0.02 : 0.01;
            const changePercent = (Math.random() - 0.5) * volatility;
            const newPrice = stock.price * (1 + changePercent);
            const priceChange = newPrice - stock.price;
            
            updatedStocks[symbol] = {
              ...stock,
              price: parseFloat(newPrice.toFixed(2)),
              change: parseFloat(priceChange.toFixed(2)),
              changePercent: parseFloat((changePercent * 100).toFixed(2)),
              volume: stock.volume + Math.floor(Math.random() * 100000),
              high: Math.max(stock.high, newPrice),
              low: Math.min(stock.low, newPrice)
            };
          });
          
          // Update price history
          setPriceHistory(prevHistory => {
            const newHistory = { ...prevHistory };
            Object.keys(updatedStocks).forEach(symbol => {
              if (!newHistory[symbol]) {
                newHistory[symbol] = { labels: [], prices: [], volumes: [] };
              }
              
              const timeLabel = now.toLocaleTimeString();
              newHistory[symbol].labels.push(timeLabel);
              newHistory[symbol].prices.push(updatedStocks[symbol].price);
              newHistory[symbol].volumes.push(updatedStocks[symbol].volume);
              
              // Keep only last 20 data points
              if (newHistory[symbol].labels.length > 20) {
                newHistory[symbol].labels.shift();
                newHistory[symbol].prices.shift();
                newHistory[symbol].volumes.shift();
              }
            });
            return newHistory;
          });
          
          setLastUpdate(now);
          return updatedStocks;
        });
      }, 2000); // Update every 2 seconds
    };

    connectWebSocket();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsConnected(false);
    };
  }, []);

  const addToWatchlist = () => {
    if (newStock && !watchlist.includes(newStock.toUpperCase())) {
      const symbol = newStock.toUpperCase();
      if (stocks[symbol]) {
        setWatchlist([...watchlist, symbol]);
        setNewStock('');
      }
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  // Custom SVG Chart Component
  const CustomChart = ({ data, type = 'line', height = 200 }) => {
    const svgRef = useRef(null);
    
    useEffect(() => {
      if (!data || !data.length) return;
      
      const svg = svgRef.current;
      const width = svg.clientWidth;
      const padding = 20;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      
      // Clear previous content
      svg.innerHTML = '';
      
      // Create gradients
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
      
      // Calculate scales
      const minValue = Math.min(...data) * 0.999;
      const maxValue = Math.max(...data) * 1.001;
      const valueRange = maxValue - minValue;
      
      // Create path for line chart
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
        
        // Create fill area
        const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        fillPath.setAttribute('d', fillPathData);
        fillPath.setAttribute('fill', 'url(#priceGradient)');
        svg.appendChild(fillPath);
        
        // Create line
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('stroke', data[data.length - 1] >= data[0] ? '#10B981' : '#EF4444');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
        
        // Add data points
        data.forEach((value, index) => {
          const x = padding + (index / (data.length - 1)) * chartWidth;
          const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
          
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x);
          circle.setAttribute('cy', y);
          circle.setAttribute('r', '0');
          circle.setAttribute('fill', data[data.length - 1] >= data[0] ? '#10B981' : '#EF4444');
          circle.setAttribute('class', 'hover:r-2 transition-all duration-200');
          
          // Add hover effect
          circle.addEventListener('mouseenter', () => {
            circle.setAttribute('r', '4');
            // You could add a tooltip here
          });
          circle.addEventListener('mouseleave', () => {
            circle.setAttribute('r', '0');
          });
          
          svg.appendChild(circle);
        });
      } else if (type === 'bar') {
        // Create bars for volume chart
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
          rect.setAttribute('rx', '2');
          svg.appendChild(rect);
        });
      }
      
    }, [data, type, height]);
    
    return (
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="w-full"
        style={{ minHeight: `${height}px` }}
      />
    );
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
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {Object.entries(stocks).map(([symbol, data]) => (
            <div 
              key={symbol}
              className={`bg-gray-800 rounded-lg p-4 cursor-pointer transition-all hover:bg-gray-700 ${
                selectedStock === symbol ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => setSelectedStock(symbol)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-lg">{symbol}</span>
                <Eye className="w-4 h-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold mb-1">
                ${data.price.toFixed(2)}
              </div>
              <div className={`flex items-center space-x-1 ${
                data.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {data.change >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {data.change >= 0 ? '+' : ''}{data.change.toFixed(2)} ({data.changePercent.toFixed(2)}%)
                </span>
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
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-400">
                    High: ${stocks[selectedStock].high.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Low: ${stocks[selectedStock].low.toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="h-64">
                {priceHistory[selectedStock] && priceHistory[selectedStock].prices.length > 0 && (
                  <CustomChart 
                    data={priceHistory[selectedStock].prices} 
                    type="line" 
                    height={256}
                  />
                )}
              </div>
            </div>

            {/* Volume Chart */}
            <div className="bg-gray-800 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold mb-4">Volume</h3>
              <div className="h-32">
                {priceHistory[selectedStock] && priceHistory[selectedStock].volumes.length > 0 && (
                  <CustomChart 
                    data={priceHistory[selectedStock].volumes} 
                    type="bar" 
                    height={128}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Watchlist */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Watchlist
              </h3>
              <div className="space-y-2 mb-4">
                {watchlist.map(symbol => (
                  <div key={symbol} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium">{symbol}</span>
                      <span className="text-sm text-gray-400">
                        ${stocks[symbol].price.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(symbol)}
                      className="text-red-400 hover:text-red-300"
                    >
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
                <button
                  onClick={addToWatchlist}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stock Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                {selectedStock} Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Open</span>
                  <span>${stocks[selectedStock].open.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">High</span>
                  <span className="text-green-400">${stocks[selectedStock].high.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Low</span>
                  <span className="text-red-400">${stocks[selectedStock].low.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Volume</span>
                  <span>{stocks[selectedStock].volume.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Change</span>
                  <span className={stocks[selectedStock].change >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {stocks[selectedStock].change >= 0 ? '+' : ''}{stocks[selectedStock].change.toFixed(2)} 
                    ({stocks[selectedStock].changePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Market Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Market Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 font-medium">Open</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Next Close</span>
                  <span className="text-gray-300">4:00 PM EST</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Timezone</span>
                  <span className="text-gray-300">EST</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockTracker;