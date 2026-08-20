const fs = require('fs');
let code = fs.readFileSync('src/pages/tournaments/TournamentDashboard.tsx', 'utf8');

const importAdd = `import { TournamentOverviewTab } from './TournamentOverviewTab';`;
code = code.replace(/import \{ TournamentCompletionTab \} from '\.\/TournamentCompletionTab';/, "import { TournamentCompletionTab } from './TournamentCompletionTab';\n" + importAdd);

const newContent = `<TabsContent value="ABOUT" activeValue={activeTab}>
              <TournamentOverviewTab tournament={tournament} />
            </TabsContent>`;

code = code.replace(/<TabsContent value="ABOUT" activeValue=\{activeTab\}>[\s\S]*?<\/TabsContent>/, newContent);

// Also I should rename ABOUT to OVERVIEW on the trigger!
code = code.replace(/<TabsTrigger value="ABOUT" isActive=\{activeTab === 'ABOUT'\}.*?>ABOUT<\/TabsTrigger>/, `<TabsTrigger value="ABOUT" isActive={activeTab === 'ABOUT'} className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1">OVERVIEW</TabsTrigger>`);

fs.writeFileSync('src/pages/tournaments/TournamentDashboard.tsx', code);
