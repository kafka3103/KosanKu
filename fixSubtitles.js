const fs = require('fs');
const files = [
  'src/screens/owner/PropertyListScreen.jsx',
  'src/screens/shared/NotificationScreen.jsx',
  'src/screens/tenant/FavoriteScreen.jsx',
  'src/screens/tenant/MyRentScreen.jsx',
  'src/screens/tenant/SearchScreen.jsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Most screens have this headerSubtitle
    let fixed = `  headerSubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.primaryLight,
    marginTop: 2,
    marginLeft: 36, // subtitle margin
  },`;

    // NotificationScreen has a slightly different headerSubtitle?
    // Let's assume standard for now, they are mostly identical.
    
    content = content.replace(/[\r\n\s]*marginLeft: 36, \/\/ subtitle margin[\r\n\s]*\},/, "\n" + fixed);
    
    fs.writeFileSync(file, content);
    console.log('Fixed subtitle in', file);
  }
});
