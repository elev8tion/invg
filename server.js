const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Determine build directory path
const buildPath = path.join(__dirname, 'build');

// Serve static files from the React app
app.use(express.static(buildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Serving files from: ${buildPath}`);
});