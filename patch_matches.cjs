const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', 'utf8');

// Add states
if (!code.includes('editingMatchId')) {
  code = code.replace(
    'const [customMatch, setCustomMatch] = useState',
    'const [editingMatchId, setEditingMatchId] = useState<string | null>(null);\n  const [customMatch, setCustomMatch] = useState'
  );
}

// Add Edit Icon import
if (!code.includes('Edit,')) {
  code = code.replace('Trash2, Plus }', 'Trash2, Plus, Edit }');
}

const handleEditFunc = `
  const handleEditMatch = (match: Match) => {
    setEditingMatchId(match.id);
    setCustomMatch({
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      matchType: match.matchType || '',
      date: new Date(match.scheduledAt).toISOString().split('T')[0]
    });
    setIsAddingCustom(true);
  };
`;

if (!code.includes('handleEditMatch')) {
    code = code.replace("const handleAddCustomMatch", handleEditFunc + "\n  const handleAddCustomMatch");
}

const handleAddCustomMatchMod = `
  const handleAddCustomMatch = async () => {
    if (!customMatch.team1Id || !customMatch.team2Id) return;
    if (customMatch.team1Id === customMatch.team2Id) {
      alert("Please select different teams.");
      return;
    }

    const t1 = tournamentTeams.find(t => t.id === customMatch.team1Id) || { id: 'TBD1', name: 'TBD', shortName: 'TBD', logoUrl: '' };
    const t2 = tournamentTeams.find(t => t.id === customMatch.team2Id) || { id: 'TBD2', name: 'TBD', shortName: 'TBD', logoUrl: '' };

    const newMatch: Match = {
      ...(editingMatchId ? matches.find(m => m.id === editingMatchId) : {}),
      id: editingMatchId || uuidv4(),
      tournamentId: tournament.id,
      matchType: customMatch.matchType,
      team1Id: t1.id,
      team2Id: t2.id,
      team1Name: t1.name,
      team2Name: t2.name,
      team1ShortName: t1.shortName,
      team2ShortName: t2.shortName,
      team1Logo: t1.logoUrl || null,
      team2Logo: t2.logoUrl || null,
      status: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.status || 'UPCOMING') : 'UPCOMING',
      scheduledAt: new Date(customMatch.date).getTime(),
      createdAt: editingMatchId ? (matches.find(m => m.id === editingMatchId)?.createdAt || Date.now()) : Date.now(),
      overs: tournament.overs
    } as Match;

    // Only validate if it's a new match or we are changing teams (skip warning for same teams)
    if (!editingMatchId || matches.find(m => m.id === editingMatchId)?.team1Id !== newMatch.team1Id || matches.find(m => m.id === editingMatchId)?.team2Id !== newMatch.team2Id) {
      const valResult = validateFixtures([newMatch], matches.filter(m => m.id !== editingMatchId));
      if (!valResult.valid) {
        alert("Validation Failed:\\n" + valResult.errors.join("\\n"));
        return;
      }
      if (valResult.warnings.length > 0) {
        if (!window.confirm("Validation Warnings:\\n" + valResult.warnings.join("\\n") + "\\n\\nDo you still want to proceed?")) {
          return;
        }
      }
    }

    try {
      if (editingMatchId) {
        await updateDoc(doc(db, 'matches', newMatch.id), newMatch as any);
        setMatches(matches.map(m => m.id === editingMatchId ? newMatch : m).sort((a, b) => a.scheduledAt - b.scheduledAt));
      } else {
        await setDoc(doc(db, 'matches', newMatch.id), newMatch);
        setMatches([...matches, newMatch].sort((a, b) => a.scheduledAt - b.scheduledAt));
      }
      setIsAddingCustom(false);
      setEditingMatchId(null);
      setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
      alert('Failed to save match');
    }
  };
`;

code = code.replace(/const handleAddCustomMatch = async \(\) => \{[\s\S]*?alert\('Failed to add custom match'\);\s*\}/, handleAddCustomMatchMod);

// Update cancel button
code = code.replace(
  `onClick={() => setIsAddingCustom(false)}>Cancel`,
  `onClick={() => { setIsAddingCustom(false); setEditingMatchId(null); setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] }); }}>Cancel`
);

// Update add match form title
code = code.replace(
  `<h4 className="font-bold text-sm">Manually Add Match</h4>`,
  `<h4 className="font-bold text-sm">{editingMatchId ? 'Edit Match' : 'Manually Add Match'}</h4>`
);

// Add edit button next to trash
const editBtn = `
                    <div className="flex gap-1">
                      <button onClick={() => handleEditMatch(match)} className="p-2 text-foreground-muted hover:text-primary hover:bg-primary/10 rounded transition-colors" title="Edit Match">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleRemoveMatch(match.id)} className="p-2 text-foreground-muted hover:text-error hover:bg-error/10 rounded transition-colors" title="Delete Match">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
`;
code = code.replace(
  /<button onClick=\{\(\) => handleRemoveMatch[\s\S]*?<\/button>/,
  editBtn
);

// Fix add match button logic to reset edit state
code = code.replace(
  `onClick={() => setIsAddingCustom(!isAddingCustom)}`,
  `onClick={() => { setIsAddingCustom(true); setEditingMatchId(null); setCustomMatch({ team1Id: '', team2Id: '', matchType: 'Custom Match', date: new Date().toISOString().split('T')[0] }); }}`
);

fs.writeFileSync('src/pages/tournaments/TournamentMatchesTab.tsx', code);
