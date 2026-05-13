type Props = {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  className?: string;
};

export default function Sparkline({
  data,
  color = "#10b981",
  width = 100,
  height = 32,
  className,
}: Props) {
  if (data.length < 2) {
    return <div className={className} style={{ width, height }} />;
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaPath = `M0,${height} L${points.split(" ").join(" L")} L${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color})`} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={
          height - ((data[data.length - 1] - min) / range) * (height - 2) - 1
        }
        r="2"
        fill={color}
      />
    </svg>
  );
}
