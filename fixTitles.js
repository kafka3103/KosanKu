const fs = require('fs');
const files = [
  'src/screens/owner/PropertyListScreen.jsx',
  'src/screens/shared/NotificationScreen.jsx',
  'src/screens/shared/ProfileScreen.jsx',
  'src/screens/tenant/FavoriteScreen.jsx',
  'src/screens/tenant/MyRentScreen.jsx',
  'src/screens/tenant/SearchScreen.jsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/[\r\n\s]*marginLeft: 36, \/\/ Added for DrawerButton[\r\n\s]*\},/, 
`
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginLeft: 36, // Added for DrawerButton
  },`);
    
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
});

const invoiceFile = 'src/screens/owner/InvoiceListScreen.jsx';
if (fs.existsSync(invoiceFile)) {
  let content = fs.readFileSync(invoiceFile, 'utf8');
  content = content.replace(/[\r\n\s]*marginLeft: 36, \/\/ Added for DrawerButton[\r\n\s]*\},/, 
`
  headerTitle: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.white,
    marginBottom: SPACING[3],
    marginLeft: 36, // Added for DrawerButton
  },`);
  fs.writeFileSync(invoiceFile, content);
  console.log('Fixed', invoiceFile);
}
