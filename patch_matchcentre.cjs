const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/MatchCentre.tsx', 'utf8');

const replacement = `
      {/* Dark Theme Score Header matching reference UI */}
      <Card className="bg-[#1a1c23] border-[#2a2d35] overflow-hidden mb-6 rounded-2xl shadow-lg">
        <CardContent className="p-0">
          <div className="bg-[#21242d] px-6 py-3 border-b border-[#2a2d35] flex items-center gap-2">
            <span className="text-[#00e676] text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse"></span>
              {match.status === 'LIVE' ? 'Live Match' : match.status}
            </span>
            <span className="text-[#6b7280] text-sm mx-2">|</span>
            <span className="text-white text-sm font-medium">{match.team1Name} vs {match.team2Name}</span>
            <span className="text-[#6b7280] text-sm mx-2">|</span>
            <span className="text-[#9ca3af] text-sm">{match.matchType || 'ODI'}</span>
          </div>
          
          <div className="p-8 flex justify-between items-center bg-gradient-to-b from-[#1a1c23] to-[#15171e]">
            {/* Team 1 */}
            <div className="flex items-center gap-4 w-1/3">
              <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent">
                {match.team1Logo ? (
                  <img src={match.team1Logo} alt={match.team1ShortName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2a2d35] text-white flex items-center justify-center font-bold text-sm">
                    {match.team1ShortName || match.team1Name.substring(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-wider">{match.team1ShortName || match.team1Name.substring(0, 3).toUpperCase()}</h2>
            </div>
            
            {/* Scores Center */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-6">
                <div className="text-right">
                  <div className="text-3xl font-black text-[#00e676] tracking-tight">{match.team1Score || '0/0'}</div>
                  <div className="text-xs text-[#9ca3af] font-medium mt-1">{match.team1Overs || '0.0'} Overs</div>
                </div>
                
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#21242d] border border-[#2a2d35] text-[#9ca3af] font-bold text-xs">
                  VS
                </div>
                
                <div className="text-left">
                  <div className="text-3xl font-black text-[#ff9800] tracking-tight">{match.team2Score || '0/0'}</div>
                  <div className="text-xs text-[#9ca3af] font-medium mt-1">{match.team2Overs || '0.0'} Overs</div>
                </div>
              </div>
              
              {match.result && (
                <div className="mt-4 px-4 py-1.5 bg-[#00e676]/10 text-[#00e676] text-sm font-semibold rounded-full border border-[#00e676]/20">
                  {match.result}
                </div>
              )}
            </div>
            
            {/* Team 2 */}
            <div className="flex items-center justify-end gap-4 w-1/3">
              <h2 className="text-3xl font-extrabold text-white tracking-wider">{match.team2ShortName || match.team2Name.substring(0, 3).toUpperCase()}</h2>
              <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden shrink-0 border-2 border-transparent">
                {match.team2Logo ? (
                  <img src={match.team2Logo} alt={match.team2ShortName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#2a2d35] text-white flex items-center justify-center font-bold text-sm">
                    {match.team2ShortName || match.team2Name.substring(0, 3).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
`;

code = code.replace(/\{\/\* Match Score Header \*\/\}[\s\S]*?<\/Card>/, replacement);

fs.writeFileSync('src/pages/matches/MatchCentre.tsx', code);
