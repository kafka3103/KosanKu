const fs = require('fs');
const files = [
  'src/screens/owner/DashboardScreen.jsx',
  'src/screens/owner/PropertyListScreen.jsx',
  'src/screens/owner/InvoiceListScreen.jsx',
  'src/screens/shared/NotificationScreen.jsx',
  'src/screens/shared/ProfileScreen.jsx',
  'src/screens/tenant/SearchScreen.jsx',
  'src/screens/tenant/FavoriteScreen.jsx',
  'src/screens/tenant/MyRentScreen.jsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('paddingLeft: 60')) {
      content = content.replace(/(header:\s*\{[^}]*)paddingHorizontal:\s*SPACING\[5\],/g, '$1paddingRight: SPACING[5],\n    paddingLeft: 60,');
      fs.writeFileSync(file, content);
      console.log('Updated', file);
    }
  }
});
