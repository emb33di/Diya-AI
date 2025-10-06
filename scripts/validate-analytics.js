const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read events catalog
const eventsPath = path.join(__dirname, '..', 'docs', 'analytics', 'events.json');
const eventsCatalog = JSON.parse(fs.readFileSync(eventsPath, 'utf8'));
const validEvents = new Set(eventsCatalog.events.map(e => e.name));

// Read analytics.ts
const analyticsPath = path.join(__dirname, '..', 'src', 'utils', 'analytics.ts');
const analyticsSource = fs.readFileSync(analyticsPath, 'utf8');

// Parse TypeScript
const sourceFile = ts.createSourceFile(
  'analytics.ts',
  analyticsSource,
  ts.ScriptTarget.Latest,
  true
);

const foundEvents = new Set();
const errors = [];

// Visit nodes recursively
function visit(node) {
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'trackEvent'
  ) {
    const args = node.arguments;
    if (args.length > 0) {
      // Get the event name
      let eventName;
      if (ts.isStringLiteral(args[0])) {
        eventName = args[0].text;
      } else if (ts.isPropertyAccessExpression(args[0])) {
        eventName = args[0].name.text;
      }
      
      if (eventName) {
        foundEvents.add(eventName);
        if (!validEvents.has(eventName)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          errors.push(`Line ${line + 1}: Event "${eventName}" not found in events.json`);
        }
      }
    }
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

// Check for unused events
for (const event of validEvents) {
  if (!foundEvents.has(event)) {
    errors.push(`Warning: Event "${event}" in events.json is never used`);
  }
}

if (errors.length > 0) {
  console.error('❌ Analytics validation failed:');
  errors.forEach(err => console.error('  ' + err));
  process.exit(1);
} else {
  console.log('✅ Analytics validation passed');
  console.log(`Found ${foundEvents.size} events, all documented in events.json`);
}
