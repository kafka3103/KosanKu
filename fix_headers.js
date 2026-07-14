const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.jsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('./src/screens');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Ensure useSafeAreaInsets is imported and used if we are going to modify
  let willModify = false;
  if (content.includes('header: {') && (content.includes('style={styles.header}') || content.includes('style={[styles.header'))) {
    if (content.match(/header:\s*\{[^}]*paddingTop:\s*SPACING\[\d+\],?/)) {
      willModify = true;
    }
  }

  if (willModify) {
    if (!content.includes('useSafeAreaInsets')) {
      content = content.replace(/import React[^;]*;/m, match => match + "\nimport { useSafeAreaInsets } from 'react-native-safe-area-context';");
    }
    
    if (!content.includes('const insets = useSafeAreaInsets()')) {
      const componentRegex = /const\s+([A-Z][a-zA-Z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*\{/;
      content = content.replace(componentRegex, match => match + "\n  const insets = useSafeAreaInsets();");
    }

    // 2. Fix StyleSheet header paddingTop
    content = content.replace(/header:\s*\{([^}]*)paddingTop:\s*SPACING\[\d+\],?/g, (match, p1) => {
      return `header: {${p1}`;
    });

    // 3. Add padding to style={styles.header}
    content = content.replace(/<View\s+style=\{styles\.header\}>/g, "<View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) }]}>");
    
    // 4. Add padding to style={[styles.header, ...]
    content = content.replace(/<View\s+style=\{\[\s*styles\.header\s*,/g, "<View style={[styles.header, { paddingTop: Math.max((insets?.top || 0) + 16, 48) },");
    
    fs.writeFileSync(file, content, 'utf8');
    modifiedCount++;
    console.log(`Modified ${file}`);
  }
});

console.log(`Done. Modified ${modifiedCount} files.`);
