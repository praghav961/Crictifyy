const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/CreateTournament.tsx', 'utf8');

// Add visibility to initial state
code = code.replace(
  "format: 'Round Robin' as TournamentFormat,",
  "format: 'Single Round Robin' as TournamentFormat,\n    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY',"
);

// Add visibility to submit
code = code.replace(
  "format: formData.format,",
  "format: formData.format,\n        visibility: formData.visibility,"
);

// Add visibility UI and format options UI
const formatOptions = `<select 
                  value={formData.format} 
                  onChange={e => setFormData({...formData, format: e.target.value as any})}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                >
                  <option value="Single Round Robin">Single Round Robin</option>
                  <option value="Double Round Robin">Double Round Robin</option>
                  <option value="Group Stage">Group Stage</option>
                  <option value="Group + Knockout">Group + Knockout</option>
                  <option value="League + Playoffs">League + Playoffs</option>
                  <option value="Knockout">Knockout</option>
                  <option value="Custom">Custom</option>
                  {/* Legacy */}
                  <option value="Round Robin">Round Robin (Legacy)</option>
                </select>`;

code = code.replace(/<select\s+value=\{formData\.format\}[\s\S]*?<\/select>/, formatOptions);

const visibilityUI = `              <div className="space-y-1">
                <label className="text-sm font-medium">Visibility</label>
                <select 
                  value={formData.visibility} 
                  onChange={e => setFormData({...formData, visibility: e.target.value as any})}
                  className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                  <option value="INVITE_ONLY">Invite Only</option>
                </select>
              </div>`;

code = code.replace(/(<div className="space-y-1">\s*<label className="text-sm font-medium">Status<\/label>[\s\S]*?<\/select>\s*<\/div>)/, "$1\n" + visibilityUI);

fs.writeFileSync('src/pages/tournaments/CreateTournament.tsx', code);
