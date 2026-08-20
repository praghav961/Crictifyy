const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', 'utf8');

const importReplacement = `import { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';`;
code = code.replace(/import \{ useState, useEffect \} from 'react';\nimport \{ collection, query, getDocs, doc, setDoc, deleteDoc \} from 'firebase\/firestore';/, importReplacement);

const newGroupCode = `
  const [newGroupName, setNewGroupName] = useState('');
  
  const handleAddGroup = async () => {
    if (!newGroupName.trim() || !isHostOrAdmin) return;
    const currentGroups = tournament.groups || [];
    if (currentGroups.includes(newGroupName.trim())) {
      alert("Group already exists.");
      return;
    }
    const updatedGroups = [...currentGroups, newGroupName.trim()];
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), { groups: updatedGroups });
      tournament.groups = updatedGroups; // Optimistic update
      setNewGroupName('');
    } catch(err) {
      console.error(err);
      alert("Failed to add group");
    }
  };

  const handleRemoveGroup = async (groupToRemove: string) => {
    if (!isHostOrAdmin || !window.confirm('Remove this group? Teams in this group will not be deleted but their group assignment might become invalid.')) return;
    const currentGroups = tournament.groups || [];
    const updatedGroups = currentGroups.filter(g => g !== groupToRemove);
    try {
      await updateDoc(doc(db, 'tournaments', tournament.id), { groups: updatedGroups });
      tournament.groups = updatedGroups;
      
      // Update any teams that were in this group
      const affectedTeams = tournamentTeams.filter(t => t.groupId === groupToRemove);
      for (const t of affectedTeams) {
        await updateDoc(doc(db, \`tournaments/\${tournament.id}/teams\`, t.id), { groupId: null });
        t.groupId = undefined; // Optimistic
      }
      setTournamentTeams([...tournamentTeams]);
    } catch(err) {
      console.error(err);
    }
  };
`;

code = code.replace(/const \[newTeamShortName, setNewTeamShortName\] = useState\(''\);/, "const [newTeamShortName, setNewTeamShortName] = useState('');" + newGroupCode);


const groupUI = `
      {isHostOrAdmin && (
        <Card className="mb-6 border-primary/20">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-lg">Group Management</CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              {(tournament.groups || []).map(g => (
                <div key={g} className="flex items-center gap-2 bg-surface-hover px-3 py-1.5 rounded-full border border-border">
                  <span className="text-sm font-bold">{g}</span>
                  <button onClick={() => handleRemoveGroup(g)} className="text-error/70 hover:text-error"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
              {(tournament.groups || []).length === 0 && <span className="text-sm text-foreground-muted">No groups created.</span>}
            </div>
            <div className="flex gap-2 w-full max-w-sm">
              <Input placeholder="New Group Name (e.g. Group A)" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
              <Button onClick={handleAddGroup}>Add Group</Button>
            </div>
          </CardContent>
        </Card>
      )}
`;

code = code.replace(/(<CardHeader className="pb-3 border-b border-border">[\s\S]*?<CardTitle>Teams<\/CardTitle>)/, groupUI + "\n      $1");

fs.writeFileSync('src/pages/tournaments/TournamentTeamsTab.tsx', code);
