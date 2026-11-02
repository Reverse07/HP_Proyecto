const fs = require('fs');
const path = require('path');

const { spawnSync } = require('node:child_process');
const date = new Intl.DateTimeFormat('es-PE', {timeZone:'America/Lima',dateStyle:'full',timeStyle:'medium'}).format(new Date());
const reportPath = path.join(__dirname, '..', 'docs', 'REPORTE_PRUEBAS.md');

const resultsDir = path.join(__dirname,'..','docs','.test-results');
fs.mkdirSync(resultsDir,{recursive:true});
const lines = [`# Reporte de pruebas`, '', `Fecha: ${date} (America/Lima)`, '', 'Pruebas ejecutadas contra PostgreSQL aislado `terra_brasa_test` y SMTP MailHog.', '', '| Suite | Caso | Resultado |', '| --- | --- | --- |'];
let failed = false;
for (const workspace of ['backend','frontend']) {
  const output=path.join(resultsDir,`${workspace}.json`);
  if(fs.existsSync(output))fs.unlinkSync(output);
  const executable=path.join(__dirname,'..','node_modules','vitest','vitest.mjs');
  const result=spawnSync(process.execPath,[executable,'run','--reporter=json',`--outputFile=${output}`],{cwd:path.join(__dirname,'..',workspace),stdio:'inherit'});
  if(result.status!==0)failed=true;
  if(!fs.existsSync(output)){lines.push(`| ${workspace} | No se pudo ejecutar la suite | Fallido |`);continue;}
  const data=JSON.parse(fs.readFileSync(output,'utf8'));
  for(const file of data.testResults||[]) {
    if(!file.assertionResults?.length)lines.push(`| ${workspace} | Error de suite | Fallido |`);
    for(const test of file.assertionResults||[])lines.push(`| ${workspace} | ${test.title.replaceAll('|','/')} | ${test.status==='passed'?'Aprobado':test.status==='pending'?'No ejecutado':'Fallido'} |`);
  }
}
lines.push('',failed?'Resultado global: **Fallido**.':'Resultado global: **Aprobado**.','');
const content=lines.join('\n');

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, content, 'utf8');
console.log(`Reporte generado en ${reportPath}`);
process.exitCode=failed?1:0;
