const solc = require('solc');
const fs   = require('fs');
const path = require('path');

const contracts = ['SimpleToken', 'MerkleDistributor'];

for (const name of contracts) {
  console.log(`⚙️  Compiling ${name}.sol...`);
  const src = fs.readFileSync(path.join(__dirname, `../contracts/${name}.sol`), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [`${name}.sol`]: { content: src } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors || []).filter(e => e.severity === 'error');
  if (errors.length) {
    console.error('Errors:', errors.map(e => e.formattedMessage).join('\n'));
    process.exit(1);
  }
  (out.errors || []).filter(e => e.severity === 'warning').forEach(w => console.warn('⚠', w.message));
  const contract = out.contracts[`${name}.sol`][name];
  const ts = `// AUTO-GENERATED — run: npm run compile\n/* eslint-disable */\nexport const ${name.toUpperCase()}_ABI = ${JSON.stringify(contract.abi, null, 2)} as const;\nexport const ${name.toUpperCase()}_BYTECODE = '0x${contract.evm.bytecode.object}' as \`0x\${string}\`;\n`;
  fs.mkdirSync(path.join(__dirname, '../lib/contracts'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, `../lib/contracts/${name}.ts`), ts);
  console.log(`✅ ${name} → lib/contracts/${name}.ts | functions: ${contract.abi.filter(f => f.type === 'function').map(f => f.name).join(', ')}`);
}
