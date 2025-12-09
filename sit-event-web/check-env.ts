import * as fs from 'fs';

// 1. รับชื่อไฟล์เป้าหมายจาก Command Line Argument (ตัวที่ 2)
// ถ้าไม่มีการส่งค่ามา ให้ใช้ค่าเริ่มต้นเป็น '.env'
const targetEnvFile = process.argv[2] || '.env';

console.log(`🔍 Checking environment variables in: ${targetEnvFile}`);

// 2. ตรวจสอบว่าไฟล์มีอยู่จริงไหม
if (!fs.existsSync(targetEnvFile)) {
  console.error(`❌ Error: File "${targetEnvFile}" not found.`);
  console.error(`   Please create "${targetEnvFile}" before running this command.`);
  process.exit(1);
}

// 3. อ่านไฟล์ตามชื่อที่รับมา
const envConfig: string = fs.readFileSync(targetEnvFile, 'utf-8');
const envExample: string = fs.readFileSync('.env.example', 'utf-8');

const getKeys = (content: string): string[] => {
  return content.split('\n')
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => line.split('=')[0].trim());
};

const currentKeys: string[] = getKeys(envConfig);
const exampleKeys: string[] = getKeys(envExample);

const missingKeys: string[] = exampleKeys.filter((key) => !currentKeys.includes(key));

if (missingKeys.length > 0) {
  console.error(`⚠️  Warning: Missing keys in ${targetEnvFile}:`);
  missingKeys.forEach((key) => console.error(` - ${key}`));
  process.exit(1);
} else {
  console.log(`✅ ${targetEnvFile} matches .env.example`);
}