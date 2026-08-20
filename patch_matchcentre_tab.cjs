const fs = require('fs');
let code = fs.readFileSync('src/pages/matches/MatchCentre.tsx', 'utf8');

// Set default activeTab to ANALYTICS (which we will rename to Dashboard)
code = code.replace(/const \[activeTab, setActiveTab\] = useState\('SUMMARY'\);/, "const [activeTab, setActiveTab] = useState('ANALYTICS');");

// Rename tabs
code = code.replace(/<TabsTrigger value="ANALYTICS" isActive=\{activeTab === 'ANALYTICS'\}>Analytics<\/TabsTrigger>/, '<TabsTrigger value="ANALYTICS" isActive={activeTab === "ANALYTICS"}>Dashboard</TabsTrigger>');
code = code.replace(/<TabsTrigger value="SUMMARY" isActive=\{activeTab === 'SUMMARY'\}>Summary<\/TabsTrigger>/, '<TabsTrigger value="SUMMARY" isActive={activeTab === "SUMMARY"}>Overview</TabsTrigger>');

fs.writeFileSync('src/pages/matches/MatchCentre.tsx', code);
