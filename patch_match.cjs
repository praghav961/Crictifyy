const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

const target = `            {matches.map(match => (
              <div key={match.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-border bg-surface gap-4">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0 w-full">
                  <div className="text-xs font-bold text-primary mb-2 uppercase tracking-wider">
                    {match.matchType || 'Match'} • {new Date(match.scheduledAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-4 w-full">
                    <div className="flex flex-col items-center gap-1 w-20">
                      {match.team1Logo ? (
                        <img loading="lazy" src={match.team1Logo} alt={match.team1ShortName || match.team1Name} className="w-10 h-10 object-contain bg-white rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-surface-hover rounded flex items-center justify-center text-xs font-bold text-center leading-tight overflow-hidden text-ellipsis whitespace-nowrap p-1">{match.team1ShortName || match.team1Name.substring(0,3)}</div>
                      )}
                      <span className="text-xs font-bold text-center leading-tight line-clamp-2">{match.team1ShortName || match.team1Name}</span>
                    </div>
                    <div className="text-sm font-bold text-foreground-muted px-2">VS</div>
                    <div className="flex flex-col items-center gap-1 w-20">
                      {match.team2Logo ? (
                        <img loading="lazy" src={match.team2Logo} alt={match.team2ShortName || match.team2Name} className="w-10 h-10 object-contain bg-white rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-surface-hover rounded flex items-center justify-center text-xs font-bold text-center leading-tight overflow-hidden text-ellipsis whitespace-nowrap p-1">{match.team2ShortName || match.team2Name.substring(0,3)}</div>
                      )}
                      <span className="text-xs font-bold text-center leading-tight line-clamp-2">{match.team2ShortName || match.team2Name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center justify-end gap-2 shrink-0">
                  
                  <div className={\`text-xs font-bold px-2 py-1 rounded w-24 text-center \${match.status === 'LIVE' ? 'bg-error/10 text-error' : match.status === 'COMPLETED' ? 'bg-success/10 text-success' : 'bg-surface-hover text-foreground-muted'}\`}>
                    {match.status}
                  </div>
                  
                  <div className="flex gap-2 w-full justify-center sm:justify-end mt-2 sm:mt-0">
                    <Link to={\`/matches/\${match.id}\`} className="text-xs font-bold px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      {match.status === 'COMPLETED' ? 'Scorecard' : 'Match Centre'}
                    </Link>
                    {isHostOrAdmin && match.status !== 'COMPLETED' && (
                      <Link to={\`/matches/\${match.id}/scoring\`} className="text-xs font-bold px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors">
                        Score Match
                      </Link>
                    )}
                  </div>
                  
                  {isHostOrAdmin && (
                    
                    <div className="flex gap-1">
                      <button onClick={() => handleEditMatch(match)} className="p-2 text-foreground-muted hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit Match">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveMatch(match.id); }} className="p-2 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors" title="Delete Match">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}`;

const replacement = `            {matches.map(match => (
              <div key={match.id} className="group flex flex-col sm:flex-row items-center justify-between p-5 rounded-2xl border border-border bg-surface hover:border-border hover:bg-surface-hover transition-all gap-6 shadow-sm">
                <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-2.5 py-1 rounded-sm">
                      {match.matchType || 'Match'}
                    </span>
                    <span className="text-xs font-medium text-foreground-muted">
                      {new Date(match.scheduledAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-6 w-full">
                    <div className="flex flex-col items-center gap-2 w-24">
                      {match.team1Logo ? (
                        <img loading="lazy" src={match.team1Logo} alt={match.team1ShortName || match.team1Name} className="w-14 h-14 object-cover bg-white rounded-full border-2 border-border shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 bg-surface-hover border border-border rounded-full flex items-center justify-center text-sm font-black text-foreground shadow-sm">{match.team1ShortName || match.team1Name.substring(0,3)}</div>
                      )}
                      <span className="text-[11px] font-bold text-foreground text-center leading-tight line-clamp-2 uppercase tracking-wider">{match.team1ShortName || match.team1Name}</span>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center px-2">
                      <span className="text-[10px] font-black text-foreground-muted bg-surface-hover border border-border px-2 py-1 rounded uppercase">VS</span>
                    </div>
                    
                    <div className="flex flex-col items-center gap-2 w-24">
                      {match.team2Logo ? (
                        <img loading="lazy" src={match.team2Logo} alt={match.team2ShortName || match.team2Name} className="w-14 h-14 object-cover bg-white rounded-full border-2 border-border shadow-sm" />
                      ) : (
                        <div className="w-14 h-14 bg-surface-hover border border-border rounded-full flex items-center justify-center text-sm font-black text-foreground shadow-sm">{match.team2ShortName || match.team2Name.substring(0,3)}</div>
                      )}
                      <span className="text-[11px] font-bold text-foreground text-center leading-tight line-clamp-2 uppercase tracking-wider">{match.team2ShortName || match.team2Name}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-center sm:items-end justify-between h-full gap-4 shrink-0 mt-4 sm:mt-0 w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-border pt-4 sm:pt-0 sm:pl-6">
                  
                  <div className={\`text-[10px] font-black px-3 py-1.5 rounded-sm uppercase tracking-wider text-center \${match.status === 'LIVE' ? 'bg-error/10 text-error' : match.status === 'COMPLETED' ? 'bg-[#00e676]/10 text-[#00e676]' : 'bg-surface-hover text-foreground-muted'}\`}>
                    {match.status}
                  </div>
                  
                  <div className="flex flex-col gap-2 w-full sm:w-32">
                    <Link to={\`/matches/\${match.id}\`} className="w-full text-center text-xs font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors">
                      {match.status === 'COMPLETED' ? 'Scorecard' : 'Match Centre'}
                    </Link>
                    {isHostOrAdmin && match.status !== 'COMPLETED' && (
                      <Link to={\`/matches/\${match.id}/scoring\`} className="w-full text-center text-xs font-bold px-4 py-2 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-hover transition-colors">
                        Score Match
                      </Link>
                    )}
                  </div>
                  
                  {isHostOrAdmin && (
                    <div className="flex gap-2 w-full justify-center sm:justify-end pt-2">
                      <button onClick={() => handleEditMatch(match)} className="p-2 text-foreground-muted hover:text-white hover:bg-surface-hover rounded-lg transition-colors" title="Edit Match">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveMatch(match.id); }} className="p-2 text-foreground-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors" title="Delete Match">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
