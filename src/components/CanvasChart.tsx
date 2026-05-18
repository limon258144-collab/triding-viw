import React, { useEffect, useRef, useState } from 'react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  price: number;
  isNewCandle?: boolean;
}

interface Trade {
  id: string;
  entryPrice: number;
  entryTime: number;
  type: 'higher' | 'lower';
  amount: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface CanvasChartProps {
  data: Candle[];
  currentPrice: number;
  activeTrades: Trade[];
  tradeHistory: any[];
  marketTimer: { timeLeft: number; purchaseDeadline: number; expirationTime: number };
}

export default function CanvasChart({ data, currentPrice, activeTrades, tradeHistory, marketTimer }: CanvasChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>();
  const lerpPriceRef = useRef(currentPrice);
  const particlesRef = useRef<Particle[]>([]);
  const lastProcessedTradeId = useRef<string | null>(null);
  
  // Sync lerp price immediately if it's zero or too far off (helps on asset switch)
  useEffect(() => {
    if (lerpPriceRef.current === 0 || Math.abs(lerpPriceRef.current - currentPrice) > currentPrice * 0.5) {
      lerpPriceRef.current = currentPrice;
    }
  }, [currentPrice]);

  const dataRef = useRef(data);
  const currentPriceRef = useRef(currentPrice);
  const activeTradesRef = useRef(activeTrades);
  const tradeHistoryRef = useRef(tradeHistory);
  const marketTimerRef = useRef(marketTimer);

  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { currentPriceRef.current = currentPrice; }, [currentPrice]);
  useEffect(() => { activeTradesRef.current = activeTrades; }, [activeTrades]);
  
  useEffect(() => { 
    // Detect new trade result for explosion effect
    if (tradeHistory.length > 0) {
      const latest = tradeHistory[0];
      if (latest.id !== lastProcessedTradeId.current) {
        lastProcessedTradeId.current = latest.id;
        // Trigger explosion if it's a recent conclusion (within 10s)
        if (Date.now() - latest.time < 10000) {
          triggerExplosion(latest);
        }
      }
    }
    tradeHistoryRef.current = tradeHistory; 
  }, [tradeHistory]);

  const pendingExplosions = useRef<any[]>([]);

  const triggerExplosion = (trade: any) => {
    pendingExplosions.current.push(trade);
  };

  useEffect(() => { marketTimerRef.current = marketTimer; }, [marketTimer]);

  const [zoom, setZoom] = useState(1.5); // Default zoom to show more candles
  const [scrollOffset, setScrollOffset] = useState(0);
  const zoomRef = useRef(zoom);
  const scrollOffsetRef = useRef(scrollOffset);
  
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { scrollOffsetRef.current = scrollOffset; }, [scrollOffset]);

  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastTouchX = useRef<number | null>(null);
  const lastTouchDistance = useRef<number | null>(null);
  
  // LERP constant (lower value = slower, smoother movement)
  const LERP_FACTOR = 0.03;
  const vibrationRef = useRef(0);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomDelta = e.deltaY > 0 ? 0.1 : -0.1;
    setZoom(prev => Math.max(0.2, Math.min(10, prev + zoomDelta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouseX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    
    const deltaX = e.clientX - lastMouseX.current;
    lastMouseX.current = e.clientX;
    
    setScrollOffset(prev => {
      const next = prev + deltaX;
      return Math.min(0, next);
    });
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastTouchX.current = e.touches[0].clientX;
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging.current && lastTouchX.current !== null) {
      const deltaX = e.touches[0].clientX - lastTouchX.current;
      lastTouchX.current = e.touches[0].clientX;
      setScrollOffset(prev => Math.min(0, prev + deltaX));
    } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastTouchDistance.current;
      lastTouchDistance.current = dist;
      
      setZoom(prev => {
        const next = prev * (1 - delta * 0.01);
        return Math.min(10, Math.max(0.1, next));
      });
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    lastTouchDistance.current = null;
    lastTouchX.current = null;
  };

  const draw = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const currentData = dataRef.current;
    const currentPriceVal = currentPriceRef.current;
    const currentActiveTrades = activeTradesRef.current;
    const currentHistory = tradeHistoryRef.current;
    const currentZoom = zoomRef.current;
    const currentScrollOffset = scrollOffsetRef.current;

    if (currentData.length === 0) {
      if (currentPriceVal > 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#0b0e11';
        ctx.fillRect(0, 0, width, height);
        
        ctx.fillStyle = '#00b97a';
        const centerY = height / 2;
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText("Waiting for market data...", width / 2, centerY - 20);
      }
      return;
    }

    // Smoothly interpolate price
    lerpPriceRef.current += (currentPriceVal - lerpPriceRef.current) * LERP_FACTOR;
    
    // Add a tiny bit of "live" vibration
    vibrationRef.current += 0.1;
    const vibration = Math.sin(vibrationRef.current) * 0.000003;
    const displayPrice = lerpPriceRef.current + vibration;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = '#0b0e11'; 
    ctx.fillRect(0, 0, width, height);

    // Chart parameters
    const candleWidth = Math.max(1.5, 5 / currentZoom);
    const candleGap = Math.max(0.5, 1.5 / currentZoom);
    const totalCandleWidth = candleWidth + candleGap;
    const paddingRight = 100;
    const bottomAxisHeight = 25;
    const chartHeight = height - bottomAxisHeight;

    const getX = (index: number) => {
      const offset = (currentData.length - 1 - index) * totalCandleWidth;
      return width - paddingRight - offset + currentScrollOffset;
    };

    const getY = (price: number, min: number, max: number) => {
      return chartHeight - ((price - min) / (max - min || 1)) * chartHeight;
    };

    // Helper for rounded rectangles
    const drawRoundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // VIRTUAL WINDOWING: Calculate visible indices
    const rightmostVisibleIndex = currentData.length - 1 - Math.floor((currentScrollOffset - paddingRight) / totalCandleWidth);
    const leftmostVisibleIndex = currentData.length - 1 - Math.ceil((width - paddingRight + currentScrollOffset) / totalCandleWidth);
    
    // Clamp indices
    const startIndex = Math.max(0, leftmostVisibleIndex - 10); 
    const endIndex = Math.min(currentData.length - 1, rightmostVisibleIndex + 10);

    if (startIndex > endIndex) return;

    // Calculate price range for visible candles
    const visibleCandles = currentData.slice(startIndex, endIndex + 1);
    if (visibleCandles.length === 0) return;

    let minPrice = Math.min(...visibleCandles.map(c => c.low));
    let maxPrice = Math.max(...visibleCandles.map(c => c.high));
    
    if (!isFinite(minPrice) || !isFinite(maxPrice) || minPrice === maxPrice) {
      const base = displayPrice || 1.1;
      minPrice = base * 0.9995;
      maxPrice = base * 1.0005;
    }

    // Include current price in scaling if it's on screen
    const liveX = getX(currentData.length - 1);
    if (liveX >= 0 && liveX <= width) {
      minPrice = Math.min(minPrice, displayPrice);
      maxPrice = Math.max(maxPrice, displayPrice);
    }

    const priceRange = maxPrice - minPrice;
    const margin = priceRange > 0 ? priceRange * 0.4 : minPrice * 0.001;
    minPrice -= margin;
    maxPrice += margin;

    // Handle Pending Explosions
    while (pendingExplosions.current.length > 0) {
      const trade = pendingExplosions.current.shift();
      const exitPrice = trade.exitPrice || trade.entryPrice;
      const exY = getY(exitPrice, minPrice, maxPrice);
      const exX = liveX; // Exit happens at the current time (live edge)
      const color = trade.win ? '#00b97a' : '#ff3b57';
      
      // Spawn particles
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          x: exX,
          y: exY,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          life: 1.0,
          color,
          size: Math.random() * 4 + 2
        });
      }
    }

    // Update and Draw Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1; // gravity
      p.life -= 0.02;
      
      if (p.life > 0) {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return true;
      }
      return false;
    });

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;
    const gridStepX = 60 / currentZoom;
    const gridStepY = 40;
    
    const gridOffsetX = currentScrollOffset % gridStepX;
    for (let x = width - paddingRight + gridOffsetX; x > 0; x -= gridStepX) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }
    
    for (let y = chartHeight; y > 0; y -= gridStepY) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Time Axis (Bottom)
    ctx.fillStyle = '#0b0e11';
    ctx.fillRect(0, chartHeight, width, bottomAxisHeight);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(0, chartHeight);
    ctx.lineTo(width, chartHeight);
    ctx.stroke();

    // Draw Vertical Deadline Line
    const deadlineX = getX(currentData.length - 1);
    if (deadlineX >= 0 && deadlineX <= width) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(deadlineX, 0);
      ctx.lineTo(deadlineX, chartHeight);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Candles
    for (let i = startIndex; i <= endIndex; i++) {
      const candle = currentData[i];
      const x = getX(i);

      const isLast = i === currentData.length - 1;
      const open = candle.open;
      const close = isLast ? displayPrice : candle.close;
      const high = isLast ? Math.max(candle.high, displayPrice) : candle.high;
      const low = isLast ? Math.min(candle.low, displayPrice) : candle.low;
      
      const isUp = close >= open;
      const color = isUp ? '#00b97a' : '#ff3b57';
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, getY(high, minPrice, maxPrice));
      ctx.lineTo(x, getY(low, minPrice, maxPrice));
      ctx.stroke();
      
      ctx.fillStyle = color;
      const bodyTop = getY(Math.max(open, close), minPrice, maxPrice);
      const bodyBottom = getY(Math.min(open, close), minPrice, maxPrice);
      const bodyHeight = Math.max(2, bodyBottom - bodyTop);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);

      if (i % Math.ceil(15 * currentZoom) === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        const date = new Date(candle.time);
        const timeStr = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, x, height - 10);
      }

      if (i % Math.ceil(40 * currentZoom) === 0 && !isLast) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        drawRoundRect(x - 25, chartHeight - 40, 50, 18, 4);
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(candle.close.toFixed(4), x, chartHeight - 28);
      }
    }

    // Draw Active Trades
    currentActiveTrades.forEach(trade => {
      const y = getY(trade.entryPrice, minPrice, maxPrice);
      const isCall = trade.type === 'higher';
      // Determine if current status is winning
      const isWinning = isCall ? displayPrice > trade.entryPrice : displayPrice < trade.entryPrice;
      const statusColor = isWinning ? '#00b97a' : '#ff3b57';
      
      ctx.setLineDash([12, 6]);
      ctx.strokeStyle = isWinning ? 'rgba(0, 185, 122, 0.4)' : 'rgba(255, 59, 87, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      const entryTime = trade.entryTime;
      const entryIndex = currentData.findIndex(c => Math.abs(c.time - entryTime) < 30000); 
      let markerX = entryIndex !== -1 ? getX(entryIndex) : getX(currentData.length - 1);

      if (markerX >= 0 && markerX <= width) {
        const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
        
        ctx.save();
        // Dynamic Glow
        ctx.shadowBlur = 10 + pulse * 15;
        ctx.shadowColor = statusColor;
        
        ctx.fillStyle = statusColor;
        ctx.beginPath();
        ctx.arc(markerX, y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0; 
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner arrow
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.font = 'bold 8px Inter';
        ctx.fillText(isCall ? '↑' : '↓', markerX, y + 3);
        
        // Entry Tag
        ctx.fillStyle = statusColor + 'E6'; // 90% opacity
        drawRoundRect(markerX + 12, y - 10, 45, 20, 6);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(isCall ? 'CALL' : 'PUT', markerX + 34.5, y + 4);
        ctx.restore();
      }
    });

    // Draw Result Popups (History)
    currentHistory.slice(0, 1).forEach((result) => {
      const age = Date.now() - result.time;
      const popupDuration = 2500;
      
      if (age < popupDuration) { 
        const progress = age / popupDuration;
        const opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;
        const yOffset = -20 * Math.sin(progress * Math.PI);
        
        ctx.save();
        ctx.globalAlpha = opacity;
        
        const popupW = 200;
        const popupH = 100;
        const popupX = (width - 100) / 2 - popupW / 2;
        const popupY = chartHeight / 2 - popupH / 2 + yOffset;
        
        ctx.shadowBlur = 30;
        ctx.shadowColor = result.win ? 'rgba(0, 185, 122, 0.5)' : 'rgba(255, 59, 87, 0.5)';
        
        ctx.fillStyle = '#1c2029';
        drawRoundRect(popupX, popupY, popupW, popupH, 12);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = result.win ? '#00b97a' : '#ff3b57';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.textAlign = 'center';
        ctx.fillStyle = result.win ? '#00b97a' : '#ff3b57';
        ctx.font = '900 24px Inter';
        ctx.fillText(result.win ? 'WINNER' : 'LOSS', popupX + popupW / 2, popupY + 45);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px JetBrains Mono';
        const profitValue = result.win ? result.profit : (result.amount || 0);
        ctx.fillText(`${result.win ? '+' : '-'}$${Math.abs(profitValue).toFixed(2)}`, popupX + popupW / 2, popupY + 75);
        ctx.restore();
      }
    });

    const liveY = getY(displayPrice, minPrice, maxPrice);
    const lastOpen = currentData[currentData.length - 1]?.open || displayPrice;
    const isPriceUp = displayPrice >= lastOpen;
    const priceColor = isPriceUp ? '#00b97a' : '#ff3b57';

    ctx.setLineDash([2, 2]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, liveY);
    ctx.lineTo(width - paddingRight, liveY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Price Badge on Y-Axis
    ctx.fillStyle = priceColor;
    drawRoundRect(width - paddingRight, liveY - 10, paddingRight, 20, 0);
    ctx.fill();
    
    // Vibrant edge for live price
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - paddingRight, liveY - 10);
    ctx.lineTo(width - paddingRight, liveY + 10);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.font = 'bold 11px JetBrains Mono';
    ctx.fillText(displayPrice.toFixed(4), width - paddingRight + 10, liveY + 4);

    // Y-Axis Static Labels
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '9px JetBrains Mono';
    const labelCount = 8;
    for (let i = 0; i <= labelCount; i++) {
      const price = minPrice + (maxPrice - minPrice) * (i / labelCount);
      const labelY = getY(price, minPrice, maxPrice);
      
      // Don't draw if too close to live price badge or off screen
      if (Math.abs(labelY - liveY) > 15 && labelY > 0 && labelY < chartHeight) {
        ctx.fillText(price.toFixed(4), width - paddingRight + 10, labelY + 3);
        
        // Small tick mark
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(width - paddingRight, labelY);
        ctx.lineTo(width - paddingRight + 5, labelY);
        ctx.stroke();
      }
    }
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    try {
      draw(ctx, rect.width, rect.height);
    } catch (err) {
      // Quietly handle errors to avoid spamming console during fast updates
    }
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Only start once

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative overflow-hidden cursor-crosshair touch-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
