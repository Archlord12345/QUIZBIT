import React from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AvatarBadge } from '../AvatarBadge.jsx';
import { safeDate } from '../lib/format.js';
import { EmptyState, Panel } from './ui.jsx';

const CHART_TOOLTIP_STYLE = {
  background: '#ffffff',
  border: '1px solid #dfe7f5',
  color: '#0f1c44',
};

const CHART_HEIGHT = {
  lg: 280,
  md: 240,
};

function DashboardChart({ children, size = 'lg' }) {
  const height = CHART_HEIGHT[size] || CHART_HEIGHT.lg;
  return (
    <div
      className={`dashboard-chart dashboard-chart-${size}`}
      style={{ '--dashboard-chart-height': `${height}px` }}
    >
      <ResponsiveContainer width="100%" height={height} minWidth={0}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function Kpi({ index, label, value }) {
  return (
    <motion.div
      className="kpi-card glass-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </motion.div>
  );
}

export function Dashboard({ analytics, stats, users = [], usersById = {} }) {
  const kpis = [
    ['Players', stats.players],
    ['Quizzes', stats.quizzes],
    ['Scores', stats.scores],
    ['Battle Rooms', stats.battleRooms],
    ['Avg Score', analytics.averageScore],
  ];
  const roomData = [
    { name: 'Waiting', value: analytics.waitingRooms, color: '#f59e0b' },
    { name: 'Active', value: analytics.activeRooms, color: '#38bdf8' },
    { name: 'Finished', value: analytics.finishedRooms, color: '#94a3c4' },
  ];
  const scoreData = analytics.topScores.map(score => ({
    name: score.displayName || 'Player',
    score: Number(score.score || 0),
  }));

  return (
    <div className="dashboard-grid">
      <div className="kpi-grid">
        {kpis.map(([label, value], index) => (
          <Kpi key={label} label={label} value={value} index={index} />
        ))}
      </div>
      <Panel title="Top scores" className="wide">
        <DashboardChart size="lg">
          <BarChart data={scoreData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(37,99,235,.12)"
            />
            <XAxis dataKey="name" stroke="#5a6b8c" tick={{ fontSize: 12 }} />
            <YAxis stroke="#5a6b8c" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Bar dataKey="score" fill="#2563eb" radius={[8, 8, 0, 0]} />
          </BarChart>
        </DashboardChart>
      </Panel>
      <Panel title="Battle rooms">
        <DashboardChart size="lg">
          <PieChart>
            <Pie
              data={roomData}
              dataKey="value"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={5}
            >
              {roomData.map(entry => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          </PieChart>
        </DashboardChart>
      </Panel>
      <Panel title="Score split">
        <DashboardChart size="md">
          <AreaChart
            data={[
              { name: 'Solo', value: analytics.soloScores },
              { name: 'Battle', value: analytics.battleScores },
            ]}
          >
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.75} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="name" stroke="#5a6b8c" tick={{ fontSize: 12 }} />
            <YAxis stroke="#5a6b8c" tick={{ fontSize: 12 }} />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              fill="url(#scoreGradient)"
            />
          </AreaChart>
        </DashboardChart>
      </Panel>
      <Panel title="Profils joueurs" className="wide">
        <div className="profile-grid">
          {users.length ? (
            users.map(user => (
              <div className="profile-card" key={user.id}>
                <AvatarBadge
                  avatarUrl={user.avatarUrl}
                  seed={user.id}
                  displayName={user.displayName || user.email || 'Player'}
                  size={52}
                />
                <div className="profile-card-meta">
                  <strong>{user.displayName || 'Player'}</strong>
                  <span className="avatar-cell-sub">{user.email || '—'}</span>
                </div>
              </div>
            ))
          ) : (
            <EmptyState label="Aucun profil charge." />
          )}
        </div>
      </Panel>
      <Panel title="Activity" className="wide">
        <div className="activity-list">
          {analytics.recentActivity.length ? (
            analytics.recentActivity.map((row, index) => (
              <motion.div
                className="activity-row"
                key={`${row.type}-${row.label}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                {row.userId ? (
                  <AvatarBadge
                    avatarUrl={
                      row.avatarUrl || usersById[row.userId]?.avatarUrl
                    }
                    seed={row.userId}
                    displayName={row.displayName || 'Player'}
                    size={32}
                  />
                ) : (
                  <span className="activity-type">{row.type}</span>
                )}
                <div className="activity-row-copy">
                  <span className="activity-type">{row.type}</span>
                  <strong>{row.label}</strong>
                </div>
                <small>{safeDate(row.date)}</small>
              </motion.div>
            ))
          ) : (
            <EmptyState label="Aucune activite chargee." />
          )}
        </div>
      </Panel>
    </div>
  );
}
