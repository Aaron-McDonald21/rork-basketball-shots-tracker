import { BasketballStats } from "@/types/stats";
import { Session } from "@/types/player";
import colors from "@/constants/colors";

export const generateStatsHTML = (stats: BasketballStats, title: string, sessions?: Session[]) => {
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  const totalMakes = 
    stats.freeThrows.makes + 
    stats.threePointers.makes + 
    stats.midrange.makes + 
    stats.layups.makes;
    
  const totalShots = 
    stats.freeThrows.total + 
    stats.threePointers.total + 
    stats.midrange.total + 
    stats.layups.total;

  const overallPercentage = totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;

  const createRow = (label: string, data: { makes: number; misses: number; total: number; percentage: number }) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${label}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${data.makes}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${data.misses}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${data.total}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${data.percentage}%</td>
    </tr>
  `;

  const completedSessions = sessions?.filter(s => s.endTime !== null).reverse() || [];
  const sessionPercentages = completedSessions.map(session => {
    const totalMakes = 
      session.stats.freeThrows.makes + 
      session.stats.threePointers.makes + 
      session.stats.midrange.makes + 
      session.stats.layups.makes;
    const totalShots = 
      session.stats.freeThrows.total + 
      session.stats.threePointers.total + 
      session.stats.midrange.total + 
      session.stats.layups.total;
    return totalShots > 0 ? Math.round((totalMakes / totalShots) * 100) : 0;
  });

  const hasSessionData = sessionPercentages.length > 0;
  const maxPercentage = Math.max(...sessionPercentages, 100);
  const minPercentage = Math.min(...sessionPercentages, 0);
  const chartHeight = 250;
  const chartWidth = 600;
  const padding = { top: 30, right: 40, bottom: 40, left: 50 };
  const graphHeight = chartHeight - padding.top - padding.bottom;
  const graphWidth = chartWidth - padding.left - padding.right;

  const createLineGraph = () => {
    if (!hasSessionData) return '';

    const yScale = (value: number) => {
      const range = maxPercentage - minPercentage || 100;
      return padding.top + graphHeight - ((value - minPercentage) / range) * graphHeight;
    };

    const xScale = (index: number) => {
      const step = graphWidth / Math.max(sessionPercentages.length - 1, 1);
      return padding.left + index * step;
    };

    const points = sessionPercentages.map((pct, i) => 
      `${xScale(i)},${yScale(pct)}`
    ).join(' ');

    const yGridLines = [0, 25, 50, 75, 100].map(val => `
      <line x1="${padding.left}" y1="${yScale(val)}" x2="${padding.left + graphWidth}" y2="${yScale(val)}" 
        stroke="#e0e0e0" stroke-width="1" stroke-dasharray="4,4" />
      <text x="${padding.left - 10}" y="${yScale(val) + 4}" 
        text-anchor="end" font-size="11" fill="#666">${val}%</text>
    `).join('');

    const dataPoints = sessionPercentages.map((pct, i) => `
      <circle cx="${xScale(i)}" cy="${yScale(pct)}" r="5" fill="${colors.palette.primary}" stroke="white" stroke-width="2" />
      <text x="${xScale(i)}" y="${yScale(pct) - 12}" 
        text-anchor="middle" font-size="11" font-weight="bold" fill="${colors.palette.primary}">${pct}%</text>
    `).join('');

    const xLabels = sessionPercentages.map((_, i) => `
      <text x="${xScale(i)}" y="${chartHeight - padding.bottom + 20}" 
        text-anchor="middle" font-size="11" fill="#666">Session ${i + 1}</text>
    `).join('');

    return `
      <div style="margin-top: 40px; padding: 24px; background-color: #f9f9f9; border-radius: 12px;">
        <h2 style="color: ${colors.palette.text}; margin-bottom: 16px; font-size: 20px;">Progress Over Time</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 20px;">Overall Shooting Percentage by Session</p>
        <svg width="${chartWidth}" height="${chartHeight}" style="display: block; margin: 0 auto;">
          ${yGridLines}
          <polyline points="${points}" fill="none" stroke="${colors.palette.primary}" stroke-width="3" />
          ${dataPoints}
          ${xLabels}
          <text x="${chartWidth / 2}" y="${chartHeight - 5}" 
            text-anchor="middle" font-size="12" font-weight="600" fill="#666">Session Number</text>
          <text x="${padding.left - 35}" y="${padding.top + graphHeight / 2}" 
            text-anchor="middle" font-size="12" font-weight="600" fill="#666" 
            transform="rotate(-90, ${padding.left - 35}, ${padding.top + graphHeight / 2})">Shooting %</text>
        </svg>
      </div>
    `;
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: ${colors.palette.text}; }
          h1 { color: ${colors.palette.primary}; margin-bottom: 8px; }
          .header { margin-bottom: 40px; border-bottom: 2px solid ${colors.palette.primary}; padding-bottom: 20px; }
          .meta { color: #666; font-size: 14px; }
          .summary-card { background-color: #f5f5f5; border-radius: 12px; padding: 24px; margin-bottom: 40px; text-align: center; }
          .big-stat { font-size: 48px; font-weight: bold; color: ${colors.palette.primary}; margin: 10px 0; }
          .stat-label { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; padding: 12px; border-bottom: 2px solid #ddd; color: #666; font-size: 12px; text-transform: uppercase; }
          .footer { margin-top: 60px; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <div class="meta">Generated on ${date} at ${time}</div>
        </div>

        <div class="summary-card">
          <div class="stat-label">Overall Shooting</div>
          <div class="big-stat">${overallPercentage}%</div>
          <div>${totalMakes} Makes / ${totalShots} Shots</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align: center;">Makes</th>
              <th style="text-align: center;">Misses</th>
              <th style="text-align: center;">Total</th>
              <th style="text-align: right;">%</th>
            </tr>
          </thead>
          <tbody>
            ${createRow("Free Throws", stats.freeThrows)}
            ${createRow("Three Pointers", stats.threePointers)}
            ${createRow("Midrange", stats.midrange)}
            ${createRow("Layups", stats.layups)}
          </tbody>
        </table>

        ${createLineGraph()}

        <div class="footer">
          Generated by Swish Stats
        </div>
      </body>
    </html>
  `;
};
