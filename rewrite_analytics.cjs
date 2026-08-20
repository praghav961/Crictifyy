const fs = require('fs');

const code = `
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { Match } from '../../../types';
import { InningsState, BallEvent, BatterStats, BowlerStats } from '../../../lib/scoring/types';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

export function AnalyticsTab({ match }: { match: Match }) {
  const [inningsList, setInningsList] = useState<InningsState[]>([]);
  const [balls, setBalls] = useState<Record<string, BallEvent[]>>({});

  useEffect(() => {
    if (!match?.id) return;
    const q = query(collection(db, 'matches', match.id, 'innings'), orderBy('inningId', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const data: InningsState[] = [];
      snap.forEach(d => data.push(d.data() as InningsState));
      setInningsList(data);
    });
    return () => unsub();
  }, [match?.id]);

  useEffect(() => {
    if (!match?.id || inningsList.length === 0) return;
    const unsubs = inningsList.map(inning => {
      const q = query(
        collection(db, 'matches', match.id, 'innings', inning.inningId, 'balls'),
        orderBy('timestamp', 'asc')
      );
      return onSnapshot(q, (snap) => {
        const b: BallEvent[] = [];
        snap.forEach(d => b.push(d.data() as BallEvent));
        setBalls(prev => ({ ...prev, [inning.inningId]: b }));
      });
    });
    return () => unsubs.forEach(fn => fn());
  }, [match?.id, inningsList.length]);

  const { overData, currentPartnership, recentWickets, battingTeam, bowlingTeam, radarData } = useMemo(() => {
    if (inningsList.length === 0) return { overData: [], currentPartnership: [], recentWickets: [], battingTeam: [], bowlingTeam: [], radarData: [] };
    
    const currentInning = inningsList[inningsList.length - 1];
    const b = balls[currentInning.inningId] || [];

    // Over Data for Worm & Area
    const overMap: Record<number, any> = {};
    b.forEach(ball => {
      const overNum = ball.overNumber + 1;
      if (!overMap[overNum]) overMap[overNum] = { over: overNum, runs: 0, cumulative: 0 };
      overMap[overNum].runs += ball.runs + (ball.extras ? 1 : 0);
    });
    let cum = 0;
    const overData = Object.values(overMap).map(o => {
      cum += o.runs;
      return { ...o, cumulative: cum };
    });

    // Current Partnership
    const striker = currentInning.batterStats[currentInning.currentStrikerId || ''];
    const nonStriker = currentInning.batterStats[currentInning.currentNonStrikerId || ''];
    const currentPartnership = [];
    if (striker) currentPartnership.push(striker);
    if (nonStriker) currentPartnership.push(nonStriker);

    // Recent Wickets
    const recentWickets = b.filter(ball => ball.wickets && ball.wickets.length > 0).slice(-3).reverse();

    // Batting & Bowling Arrays
    const battingTeam = Object.values(currentInning.batterStats);
    const bowlingTeam = Object.values(currentInning.bowlerStats);

    // Radar Data
    const radarData = battingTeam.slice(0, 5).map(batter => ({
      subject: batter.name || batter.id,
      A: batter.runs,
      B: batter.ballsFaced,
      fullMark: 100,
    }));

    return { overData, currentPartnership, recentWickets, battingTeam, bowlingTeam, radarData };
  }, [inningsList, balls]);

  if (inningsList.length === 0) {
    return <div className="p-8 text-center text-[#9ca3af]">Match has not started yet.</div>;
  }

  const currentInning = inningsList[inningsList.length - 1];

  const CardHeader = ({ title }: { title: string }) => (
    <div className="px-6 py-4 border-b border-[#2a2d35]">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Column 1 */}
      <div className="space-y-6">
        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Run Rate Progression" />
          <div className="p-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                <XAxis dataKey="over" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#21242d', border: '1px solid #2a2d35', color: '#fff' }} />
                <Line type="monotone" dataKey="runs" stroke="#00e676" strokeWidth={2} dot={{ r: 4, fill: '#00e676' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Detailed Batting" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#9ca3af] uppercase bg-[#21242d] border-b border-[#2a2d35]">
                <tr>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium text-right">R</th>
                  <th className="px-4 py-3 font-medium text-right">B</th>
                  <th className="px-4 py-3 font-medium text-right">4s</th>
                  <th className="px-4 py-3 font-medium text-right">SR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d35]">
                {battingTeam.map(b => (
                  <tr key={b.id} className="hover:bg-[#21242d] transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{b.name || b.id}</td>
                    <td className="px-4 py-3 text-right text-white font-semibold">{b.runs}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{b.ballsFaced}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{b.fours}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{(b.ballsFaced > 0 ? (b.runs / b.ballsFaced * 100).toFixed(1) : '0.0')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Column 2 */}
      <div className="space-y-6">
        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Match Summary" />
          <div className="p-4 h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={overData}>
                <defs>
                  <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e676" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d35" vertical={false} />
                <XAxis dataKey="over" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#21242d', border: '1px solid #2a2d35', color: '#fff' }} />
                <Area type="monotone" dataKey="cumulative" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorCum)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Bowling" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[#9ca3af] uppercase bg-[#21242d] border-b border-[#2a2d35]">
                <tr>
                  <th className="px-4 py-3 font-medium">Player</th>
                  <th className="px-4 py-3 font-medium text-right">O</th>
                  <th className="px-4 py-3 font-medium text-right">M</th>
                  <th className="px-4 py-3 font-medium text-right">R</th>
                  <th className="px-4 py-3 font-medium text-right">W</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2d35]">
                {bowlingTeam.map(b => (
                  <tr key={b.id} className="hover:bg-[#21242d] transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{b.name || b.id}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{b.overs}.{b.balls}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{b.maidens}</td>
                    <td className="px-4 py-3 text-right text-[#9ca3af]">{b.runs}</td>
                    <td className="px-4 py-3 text-right text-[#00e676] font-bold">{b.wickets}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Column 3 */}
      <div className="space-y-6">
        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Current Partnership" />
          <div className="p-6 space-y-4">
            {currentPartnership.map((p, idx) => (
              <div key={p.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#21242d] flex items-center justify-center text-xs font-bold text-white">
                    {p.name ? p.name.charAt(0) : 'P'}
                  </div>
                  <span className="text-sm text-white font-medium">{p.name || p.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#ff9800] font-bold">{p.runs}</span>
                  <div className="w-16 h-1.5 bg-[#2a2d35] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ff9800] rounded-full" style={{ width: \`\${Math.min((p.runs / 100) * 100, 100)}%\` }}></div>
                  </div>
                </div>
              </div>
            ))}
            {currentPartnership.length === 0 && <p className="text-sm text-[#9ca3af] text-center">No active partnership</p>}
          </div>
        </div>

        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Recent Wickets" />
          <div className="p-4 space-y-2">
            {recentWickets.map(w => (
              <div key={w.eventId} className="flex items-center justify-between p-3 bg-[#21242d] rounded-lg border border-[#2a2d35]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#ff5252]/10 text-[#ff5252] flex items-center justify-center text-xs font-bold">
                    W
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">{w.wickets![0].batterId}</p>
                    <p className="text-xs text-[#9ca3af]">b {w.bowlerId}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-white bg-[#1a1c23] px-2 py-1 rounded">
                  {w.overNumber}.{w.ballNumber}
                </span>
              </div>
            ))}
            {recentWickets.length === 0 && <p className="text-sm text-[#9ca3af] text-center py-2">No recent wickets</p>}
          </div>
        </div>

        <div className="bg-[#1a1c23] border border-[#2a2d35] rounded-xl overflow-hidden shadow-sm">
          <CardHeader title="Player Performance" />
          <div className="p-4 h-[250px]">
            {radarData.length > 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#2a2d35" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                  <Radar name="Runs" dataKey="A" stroke="#00e676" fill="#00e676" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-[#9ca3af]">Need more players for radar chart</div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}
`;

fs.writeFileSync('src/pages/matches/tabs/AnalyticsTab.tsx', code);
