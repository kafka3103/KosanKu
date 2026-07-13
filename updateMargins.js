const fs = require('fs');

const files = [
  'src/screens/owner/PropertyListScreen.jsx',
  'src/screens/owner/InvoiceListScreen.jsx',
  'src/screens/shared/NotificationScreen.jsx',
  'src/screens/shared/ProfileScreen.jsx',
  'src/screens/tenant/FavoriteScreen.jsx',
  'src/screens/tenant/MyRentScreen.jsx',
  'src/screens/tenant/SearchScreen.jsx',
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/marginLeft:\s*36/g, 'marginLeft: 48');
    fs.writeFileSync(file, content);
    console.log('Updated margins in', file);
  }
});
