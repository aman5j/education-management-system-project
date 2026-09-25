import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const formatCurrency = (value) => {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(value);
};

const FeeCollection = ({
  data = [],
}) => {
  return (
    <section className="dashboard-panel dashboard-chart-panel">
      <div className="panel-header">
        <div>
          <h3>Fee Collection</h3>

          <p>
            Monthly fee collection overview
          </p>
        </div>

        <span className="panel-period">
          This year
        </span>
      </div>

      <div className="chart-wrapper">
        {data.length > 0 ? (
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <AreaChart data={data}>
              <defs>
                <linearGradient
                  id="feeCollectionGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.24}
                  />

                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                stroke="#eef1f6"
                vertical={false}
              />

              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 12,
                }}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 12,
                }}
                tickFormatter={(value) =>
                  value >= 1000
                    ? `${value / 1000}k`
                    : value
                }
              />

              <Tooltip
                formatter={(value) =>
                  formatCurrency(value)
                }
              />

              <Area
                type="monotone"
                dataKey="collected"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#feeCollectionGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="dashboard-empty-chart">
            No fee collection data available.
          </div>
        )}
      </div>
    </section>
  );
};

export default FeeCollection;