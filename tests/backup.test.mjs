import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
test('online backup is independently readable and preserves rows',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'palm-backup-'));const path=join(dir,'live.sqlite'),destination=join(dir,'snapshot.sqlite');
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; CREATE TABLE sample(value TEXT); INSERT INTO sample VALUES(\'preserved\');');
 try{await promisify(execFile)(process.execPath,['scripts/backup.mjs'],{env:{...process.env,DB_PATH:path,BACKUP_PATH:destination}});const restored=new DatabaseSync(destination,{readOnly:true});try{assert.equal(restored.prepare('SELECT value FROM sample').get().value,'preserved');}finally{restored.close();}}finally{db.close();await rm(dir,{recursive:true,force:true});}
});
