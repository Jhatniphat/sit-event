import * as fs from 'fs';

// อ่านไฟล์ .env และ .env.example
const envConfig: string = fs.readFileSync('.env', 'utf-8');
const envExample: string = fs.readFileSync('.env.example', 'utf-8');

// ฟังก์ชันสำหรับดึง Key ออกมาจากเนื้อหาไฟล์ (ระบุ Type รับ string คืนค่าเป็น string[])
const getKeys = (content: string): string[] => {
  return content.split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());
};

const currentKeys: string[] = getKeys(envConfig);
const exampleKeys: string[] = getKeys(envExample);

// หา key ที่มีใน example แต่ไม่มีใน .env
const missingKeys: string[] = exampleKeys.filter((key) => !currentKeys.includes(key));

if (missingKeys.length > 0) {
  console.error('⚠️  Warning: Missing keys in .env file:');
  missingKeys.forEach((key) => console.error(` - ${key}`));
  process.exit(1); // จบการทำงานด้วย Error Code
} else {
  console.log('✅ .env matches .env.example');
}