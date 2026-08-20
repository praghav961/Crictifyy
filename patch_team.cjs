const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', 'utf8');

const target = `            {tournamentTeams.map(team => (
              <div key={team.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-surface relative">
                {isHostOrAdmin && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveTeam(team.id); }}
                    className="absolute top-2 right-2 p-1.5 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {team.logoUrl ? (
                  <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-12 h-12 rounded-lg object-contain bg-white" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-hover flex items-center justify-center text-foreground-muted font-bold">
                    {team.shortName}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-foreground">{team.name}</h4>
                  </div>
                <div className="flex flex-col gap-1 w-full mt-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setSelectedTeamView(team)}>Manage Team</Button>
                </div>
              </div>
            ))}`;

const replacement = `            {tournamentTeams.map(team => (
              <div key={team.id} className="flex flex-col items-center text-center gap-3 p-6 rounded-xl border border-border bg-surface relative hover:bg-surface-hover transition-colors">
                {isHostOrAdmin && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveTeam(team.id); }}
                    className="absolute top-2 right-2 p-1.5 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {team.logoUrl ? (
                  <img loading="lazy" src={team.logoUrl} alt={team.name} className="w-16 h-16 rounded-full object-cover bg-white border-2 border-border shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                    {team.shortName}
                  </div>
                )}
                <div className="w-full flex-1 mt-1 mb-2">
                  <h4 className="font-bold text-base text-foreground truncate">{team.name}</h4>
                  <p className="text-[10px] font-bold text-foreground-muted mt-1 uppercase tracking-wider">{team.shortName}</p>
                </div>
                <div className="w-full pt-4 mt-auto border-t border-border">
                  <Button variant="outline" size="sm" className="w-full border-border hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all font-bold" onClick={() => setSelectedTeamView(team)}>Manage Squad</Button>
                </div>
              </div>
            ))}`;

code = code.replace(target, replacement);
fs.writeFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', code);
