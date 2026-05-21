"use client";

import { format, subDays, startOfWeek, getDay } from "date-fns";

interface Props {
  data: { date: string; total: number }[];
}

export function SpendingHeatmap({ data }: Props) {
  // Build a map of the last 90 days
  const today = new Date();
  const days: { date: string; total: number; dayOfWeek: number; weekIndex: number }[] = [];

  const startDate = startOfWeek(subDays(today, 77)); // ~11 weeks back, aligned to week start
  const totalDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const dataMap = new Map(data.map((d) => [d.date, d.total]));

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date);
    const weekIndex = Math.floor(i / 7);
    days.push({ date: dateStr, total: dataMap.get(dateStr) || 0, dayOfWeek, weekIndex });
  }

  const maxSpend = Math.max(...days.map((d) => d.total), 1);
  const numWeeks = Math.max(...days.map((d) => d.weekIndex)) + 1;

  const getColor = (amount: number) => {
    if (amount === 0) return "bg-gray-100";
    const intensity = amount / maxSpend;
    if (intensity < 0.2) return "bg-green-100";
    if (intensity < 0.4) return "bg-green-200";
    if (intensity < 0.6) return "bg-yellow-200";
    if (intensity < 0.8) return "bg-orange-300";
    return "bg-red-400";
  };

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="bg-white border rounded-xl p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">Spending Heatmap</h3>
      <div className="flex gap-1">
        <div className="flex flex-col gap-1 mr-1">
          {dayLabels.map((label, i) => (
            <div key={label} className="h-4 text-[10px] text-gray-400 flex items-center">
              {i % 2 === 1 ? label : ""}
            </div>
          ))}
        </div>
        {Array.from({ length: numWeeks }, (_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const cell = days.find((d) => d.weekIndex === weekIdx && d.dayOfWeek === dayIdx);
              if (!cell) return <div key={dayIdx} className="w-4 h-4" />;
              return (
                <div
                  key={dayIdx}
                  className={`w-4 h-4 rounded-sm ${getColor(cell.total)}`}
                  title={`${cell.date}: $${cell.total.toFixed(0)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
        <span>Less</span>
        <div className="w-3 h-3 rounded-sm bg-gray-100" />
        <div className="w-3 h-3 rounded-sm bg-green-100" />
        <div className="w-3 h-3 rounded-sm bg-green-200" />
        <div className="w-3 h-3 rounded-sm bg-yellow-200" />
        <div className="w-3 h-3 rounded-sm bg-orange-300" />
        <div className="w-3 h-3 rounded-sm bg-red-400" />
        <span>More</span>
      </div>
    </div>
  );
}
