// Test the regex pattern
const testResponse = `\`\`\`json
{
  "essay_prompts": [
    {
      "college_name": "Princeton University"
    }
  ]
}
\`\`\``;

console.log('Test response:', testResponse);
console.log('Response starts with:', testResponse.substring(0, 10));

// Test different regex patterns
const patterns = [
  /```json\s*\n?([\s\S]*?)\n?\s*```/,
  /```json\n([\s\S]*?)\n```/,
  /```json([\s\S]*?)```/,
  /```json\s*([\s\S]*?)\s*```/
];

patterns.forEach((pattern, index) => {
  const match = testResponse.match(pattern);
  console.log(`Pattern ${index + 1}:`, match ? 'MATCHED' : 'NO MATCH');
  if (match) {
    console.log('Captured:', match[1].substring(0, 50) + '...');
  }
});
