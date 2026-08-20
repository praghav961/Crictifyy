const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';",
  "import { HashRouter as Router, Routes, Route } from 'react-router-dom';"
);

fs.writeFileSync('src/App.tsx', code);
