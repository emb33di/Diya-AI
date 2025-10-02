console.log('Testing imports...');

try {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  console.log('✅ GoogleGenerativeAI imported successfully');
  
  const fs = await import('fs-extra');
  console.log('✅ fs-extra imported successfully');
  
  const path = await import('path');
  console.log('✅ path imported successfully');
  
  const { fileURLToPath } = await import('url');
  console.log('✅ fileURLToPath imported successfully');
  
  console.log('✅ All imports successful!');
} catch (error) {
  console.error('❌ Import error:', error.message);
}
