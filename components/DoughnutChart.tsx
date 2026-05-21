"use client";

const COLORS = ["#0179FE", "#4893FF", "#6172F3", "#3538CD", "#039855"];

const DoughnutChart = ({ accounts }: DoughnutChartProps) => {
  if (!accounts?.length) {
    return (
      <div
        className="flex size-[100px] items-center justify-center rounded-full border border-dashed border-gray-200 text-center text-xs text-gray-500 sm:size-[120px]"
        aria-hidden
      >
        —
      </div>
    );
  }

  const total =
    accounts.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0) || 1;
  let acc = 0;
  const segments = accounts.map((a, i) => {
    const start = (acc / total) * 360;
    acc += a.currentBalance ?? 0;
    const end = (acc / total) * 360;
    const color = COLORS[i % COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  });

  return (
    <div
      className="size-[100px] shrink-0 rounded-full sm:size-[120px]"
      style={{ background: `conic-gradient(${segments.join(", ")})` }}
      title="Balance distribution"
    />
  );
};

export default DoughnutChart;
